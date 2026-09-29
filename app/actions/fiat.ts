"use server";

import { Pool } from 'pg';
import { cookies } from 'next/headers';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

export async function submitFiatPurchaseRequest(data: {
  fiatAmount: number;
  fiatCurrency: string;
  cryptoSymbol: string;
  cryptoAmount: number;
  paymentMethod: string;
}): Promise<{ success: boolean; message: string }> {
  const cookieStore = await cookies();
  const session = cookieStore.get('citadel_session');
  if (!session?.value) return { success: false, message: 'Unauthorized. Please log in.' };

  const userId = parseInt(session.value, 10);
  if (isNaN(userId)) return { success: false, message: 'Invalid session data.' };

  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    // 1. Verify user exists
    const userRes = await client.query('SELECT id FROM users WHERE id = $1 LIMIT 1', [userId]);
    if (userRes.rows.length === 0) {
      await client.query('ROLLBACK');
      return { success: false, message: 'User account not found.' };
    }

    const addedBalanceUsd = data.fiatCurrency === 'NGN' ? data.fiatAmount / 1500 : data.fiatAmount;

    // 2. Log order as PENDING for admin verification
    await client.query(
      `INSERT INTO transactions (user_id, type, asset, amount, status, network, created_at) 
       VALUES ($1, 'Buy Crypto', $2, $3, 'Pending', $4, NOW())`,
      [
        userId, 
        `${data.cryptoSymbol} via ${data.fiatCurrency}`, 
        `+$${addedBalanceUsd.toFixed(2)}`, 
        data.paymentMethod
      ]
    );

    await client.query('COMMIT');
    return { 
      success: true, 
      message: `Purchase order submitted! Please complete payment via ${data.paymentMethod}. Once verified by our treasury desk, your balance will be credited.` 
    };
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Fiat purchase request error:', error);
    return { success: false, message: 'Failed to submit buy order.' };
  } finally {
    client.release();
  }
}
"use server";

import { Pool } from 'pg';
import { cookies } from 'next/headers';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

export interface WalletData {
  balance: number;
  unrealizedPnL: number;
  country: string;
  email: string;
}

export interface TransactionRecord {
  id: string;
  type: string;
  asset: string;
  amount: string;
  status: string;
  created_at: string;
  tx_hash: string;
}

// Helper to get currently logged in user ID from session cookie
async function getCurrentUserId(): Promise<number | null> {
  const cookieStore = await cookies();
  const session = cookieStore.get('citadel_session');
  if (!session?.value) return null;
  const userId = parseInt(session.value, 10);
  return isNaN(userId) ? null : userId;
}

// 1. Fetch Real Logged-In User Wallet Balances
export async function getWalletOverview(): Promise<WalletData | null> {
  try {
    const userId = await getCurrentUserId();
    if (!userId) return null;

    const { rows } = await pool.query(
      'SELECT balance, country, email FROM users WHERE id = $1 LIMIT 1',
      [userId]
    );

    if (rows.length > 0) {
      const rawBalance = rows[0].balance;
      const parsedBalance = typeof rawBalance === 'number' ? rawBalance : parseFloat(rawBalance || '0.00');

      return {
        balance: isNaN(parsedBalance) ? 0.00 : parsedBalance,
        unrealizedPnL: 0.00,
        country: rows[0].country || 'Nigeria',
        email: rows[0].email,
      };
    }
    return null;
  } catch (error) {
    console.error('Error fetching wallet balance:', error);
    return null;
  }
}

// 2. Fetch Real Logged-In User Transaction History
export async function getTransactionHistory(): Promise<TransactionRecord[]> {
  try {
    const userId = await getCurrentUserId();
    if (!userId) return [];

    const { rows } = await pool.query(
      `SELECT id, type, asset, amount, status, created_at, tx_hash 
       FROM transactions 
       WHERE user_id = $1 
       ORDER BY created_at DESC 
       LIMIT 20`,
      [userId]
    );

    return rows.map(r => ({
      id: `TXN-${r.id}`,
      type: r.type,
      asset: r.asset,
      amount: r.amount,
      status: r.status,
      created_at: new Date(r.created_at).toLocaleString('en-US', {
        dateStyle: 'medium',
        timeStyle: 'short'
      }),
      tx_hash: r.tx_hash || 'Pending'
    }));
  } catch (error) {
    console.error('Error fetching transactions:', error);
    return [];
  }
}

// 3. Submit Withdrawal Request for Active Logged-In User
export async function createWithdrawalRequest(data: {
  asset: string;
  network: string;
  address: string;
  amount: number;
}): Promise<{ success: boolean; message: string }> {
  const userId = await getCurrentUserId();
  if (!userId) {
    return { success: false, message: 'Unauthorized. Please log in.' };
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Check balance for specific user
    const userRes = await client.query('SELECT balance FROM users WHERE id = $1 LIMIT 1', [userId]);
    if (userRes.rows.length === 0) {
      await client.query('ROLLBACK');
      return { success: false, message: 'User account not found.' };
    }

    const rawBalance = userRes.rows[0].balance;
    const currentBalance = typeof rawBalance === 'number' ? rawBalance : parseFloat(rawBalance || '0.00');

    if (data.amount > currentBalance) {
      await client.query('ROLLBACK');
      return { success: false, message: 'Insufficient balance for this withdrawal.' };
    }

    // Deduct balance
    const newBalance = currentBalance - data.amount;
    await client.query('UPDATE users SET balance = $1 WHERE id = $2', [newBalance.toFixed(2), userId]);

    // Insert transaction record for current user
    await client.query(
      `INSERT INTO transactions (user_id, type, asset, amount, status, destination_address, network, created_at) 
       VALUES ($1, 'Withdrawal', $2, $3, 'Pending', $4, $5, NOW())`,
      [userId, `${data.asset} (${data.network})`, `-$${data.amount.toFixed(2)}`, data.address, data.network]
    );

    await client.query('COMMIT');
    return { success: true, message: 'Withdrawal request processed successfully.' };
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Withdrawal error:', error);
    return { success: false, message: 'Failed to execute withdrawal transaction.' };
  } finally {
    client.release();
  }
}
"use server";

import { Pool } from 'pg';
import { cookies } from 'next/headers';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

export interface StatementItem {
  id: string;
  date: string;
  type: string;
  asset: string;
  amount: string;
  balance: string;
  status: string;
}

export interface StatementSummary {
  totalDeposits: number;
  totalWithdrawals: number;
  netPnL: number;
  totalFees: number;
}

async function getCurrentUserId(): Promise<number | null> {
  const cookieStore = await cookies();
  const session = cookieStore.get('citadel_session');
  if (!session?.value) return null;
  const userId = parseInt(session.value, 10);
  return isNaN(userId) ? null : userId;
}

export async function getUserAccountStatement(): Promise<{ summary: StatementSummary; records: StatementItem[] }> {
  try {
    const userId = await getCurrentUserId();
    if (!userId) {
      return {
        summary: { totalDeposits: 0, totalWithdrawals: 0, netPnL: 0, totalFees: 0 },
        records: []
      };
    }

    const { rows } = await pool.query(
      `SELECT id, type, asset, amount, status, created_at 
       FROM transactions 
       WHERE user_id = $1 
       ORDER BY created_at DESC`,
      [userId]
    );

    let totalDeposits = 0;
    let totalWithdrawals = 0;

    const records: StatementItem[] = rows.map((r) => {
      const parsedAmount = Math.abs(parseFloat(r.amount.replace(/[^0-9.-]+/g, ""))) || 0;
      
      if (r.type === 'Deposit' || r.type === 'Buy Crypto') {
        totalDeposits += parsedAmount;
      } else if (r.type === 'Withdrawal') {
        totalWithdrawals += parsedAmount;
      }

      return {
        id: `TXN-${r.id}`,
        date: new Date(r.created_at).toLocaleString('en-US', {
          dateStyle: 'short',
          timeStyle: 'short'
        }),
        type: r.type,
        asset: r.asset,
        amount: r.amount,
        balance: "$0.00",
        status: r.status
      };
    });

    return {
      summary: {
        totalDeposits,
        totalWithdrawals,
        netPnL: 0.00,
        totalFees: 0.00
      },
      records
    };
  } catch (error) {
    console.error('Error fetching account statement:', error);
    return {
      summary: { totalDeposits: 0, totalWithdrawals: 0, netPnL: 0, totalFees: 0 },
      records: []
    };
  }
}
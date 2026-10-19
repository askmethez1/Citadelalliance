// PATH: app/actions/copytrading.ts

"use server";

import { Pool } from 'pg';
import { cookies } from 'next/headers';
import { getUserRole } from './auth';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

// PROTOTYPE / SIMULATION SETTINGS (non-exported: "use server" files may only export async functions)
// Keep SIM_RATE_PER_CYCLE and CYCLE_MS in sync with copy-trading/active/page.tsx
const MIN_ALLOCATION = 500;
const SIM_RATE_PER_CYCLE = 0.25;           // simulated 25% over one cycle
const CYCLE_MS = 24 * 60 * 60 * 1000;      // 24h cycle

export interface MasterTraderRecord {
  id: number;
  name: string;
  avatar: string;
  strategy: string;
  winRate: number;
  totalProfit: number;
  monthlyReturn: number;
  activeTrade: {
    pair: string;
    type: 'LONG' | 'SHORT';
    leverage: number;
  };
}

export interface CopyTradingOverview {
  userBalance: number;
  traders: MasterTraderRecord[];
  totalTraders: number;
}

// Same session approach as wallet.ts
async function getCurrentUserId(): Promise<number | null> {
  const cookieStore = await cookies();
  const session = cookieStore.get('citadel_session');
  if (!session?.value) return null;
  const userId = parseInt(session.value, 10);
  return isNaN(userId) ? null : userId;
}

export async function getCopyTradingData(page: number = 1, limit: number = 9): Promise<CopyTradingOverview> {
  try {
    const userId = await getCurrentUserId();

    let userBalance = 0.00;

    if (userId) {
      const userRes = await pool.query('SELECT balance FROM users WHERE id = $1 LIMIT 1', [userId]);
      userBalance = userRes.rows.length > 0 ? parseFloat(userRes.rows[0].balance || '0.00') : 0.00;
    }

    const countRes = await pool.query('SELECT COUNT(*) FROM master_traders');
    let totalTraders = parseInt(countRes.rows[0].count, 10);

    const offset = (page - 1) * limit;

    const { rows } = await pool.query(
      `SELECT id, name, strategy, win_rate, total_profit, monthly_return, active_pair, trade_type, leverage
       FROM master_traders
       ORDER BY id ASC
       LIMIT $1 OFFSET $2`,
      [limit, offset]
    );

    let traders: MasterTraderRecord[] = [];

    if (rows.length > 0) {
      traders = rows.map(r => ({
        id: r.id,
        name: r.name,
        avatar: `https://api.dicebear.com/7.x/bottts/svg?seed=${r.name.replace(/ /g, '')}`,
        strategy: r.strategy,
        winRate: parseFloat(r.win_rate),
        totalProfit: parseFloat(r.total_profit),
        monthlyReturn: parseFloat(r.monthly_return),
        activeTrade: {
          pair: r.active_pair,
          type: r.trade_type as 'LONG' | 'SHORT',
          leverage: r.leverage
        }
      }));
    } else {
      totalTraders = 50;
      const names = [
        "Wall Street Alpha", "Quantum Equities", "Tech Swing Pro", "S&P 500 Arbitrage", "Blue Chip Momentum",
        "Nasdaq HFT", "Dividend Growth Bot", "Alpha Algo", "MegaCap Scalper", "Equity Vanguard",
        "Chronos Swing", "Silicon Valley Bot", "Titan Macro", "Eclipse Leveraged", "Nebula Delta",
        "Cipher Pulse", "Vortex Equities", "Quantum Breakout", "Aura Momentum", "Aether Mean-Revert"
      ];
      const pairs = ["AAPL", "NVDA", "TSLA", "MSFT", "AMZN", "SPY", "QQQ", "META", "VOO", "IBIT"];

      const fallbackList = Array.from({ length: 50 }).map((_, idx) => {
        const name = names[idx % names.length] + (idx >= names.length ? ` #${Math.floor(idx / names.length) + 1}` : '');
        const isLong = idx % 2 === 0;
        return {
          id: idx + 1,
          name,
          avatar: `https://api.dicebear.com/7.x/bottts/svg?seed=${name.replace(/ /g, '')}`,
          strategy: idx % 3 === 0 ? "Neural HFT" : idx % 3 === 1 ? "Macro Swing" : "Grid Arbitrage",
          winRate: parseFloat((78 + (idx % 20) * 0.9).toFixed(1)),
          totalProfit: 12000 + (idx * 1450),
          monthlyReturn: parseFloat((14.5 + (idx % 12) * 1.8).toFixed(1)),
          activeTrade: {
            pair: pairs[idx % pairs.length],
            type: (isLong ? 'LONG' : 'SHORT') as 'LONG' | 'SHORT',
            leverage: ((idx % 5) + 1) * 10
          }
        };
      });

      traders = fallbackList.slice(offset, offset + limit);
    }

    return { userBalance, traders, totalTraders };
  } catch (error) {
    return { userBalance: 0.00, traders: [], totalTraders: 0 };
  }
}

// Open a (simulated) copy. Atomic: balance check + deduction + insert happen together or not at all.
export async function createActiveCopy(
  traderId: number,
  amount: number,
  entryPrice: number,
  sl: number | null,
  tp: number | null
): Promise<{ success: boolean; error?: string }> {
  const userId = await getCurrentUserId();
  if (!userId) return { success: false, error: 'Unauthorized. Please log in.' };

  // Never trust client input
  if (!Number.isFinite(amount) || amount < MIN_ALLOCATION) {
    return { success: false, error: `Minimum allocation is $${MIN_ALLOCATION}.` };
  }
  if (!Number.isFinite(entryPrice) || entryPrice <= 0) {
    return { success: false, error: 'Invalid entry price.' };
  }
  if (!Number.isInteger(traderId) || traderId <= 0) {
    return { success: false, error: 'Invalid trader.' };
  }
  const safeSl = sl !== null && Number.isFinite(sl) && sl > 0 ? sl : null;
  const safeTp = tp !== null && Number.isFinite(tp) && tp > 0 ? tp : null;

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Deduct only if enough REAL balance (bonus funds are not used for copy trading)
    const deducted = await client.query(
      'UPDATE users SET balance = balance - $1 WHERE id = $2 AND balance >= $1 RETURNING balance',
      [amount, userId]
    );
    if (deducted.rowCount === 0) {
      await client.query('ROLLBACK');
      return { success: false, error: 'Insufficient real balance. Bonus funds cannot be used for copy trading.' };
    }

    await client.query(
      `INSERT INTO active_copies (user_id, trader_id, amount, entry_price, sl, tp)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [userId, traderId, amount, entryPrice, safeSl, safeTp]
    );

    await client.query('COMMIT');
    return { success: true };
  } catch (error: any) {
    await client.query('ROLLBACK');
    console.error('createActiveCopy error:', error);
    return { success: false, error: error.message || 'Database error.' };
  } finally {
    client.release();
  }
}

export async function getActiveCopies() {
  try {
    const userId = await getCurrentUserId();
    if (!userId) return { success: false, error: 'Unauthorized' };

    const { rows } = await pool.query(
      'SELECT * FROM active_copies WHERE user_id = $1 ORDER BY created_at DESC',
      [userId]
    );

    return { success: true, data: rows };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

// ADMIN ONLY: every active copy trade across all users.
// Server actions are public endpoints, so the admin check MUST happen here, not just in the UI.
export async function getAllActiveCopiesAdmin() {
  try {
    const role = await getUserRole();
    if (role !== 'admin') return { success: false, error: 'Forbidden: admin access required.', data: [] };

    // Join the users table so every copy trade carries the owner's profile name (first_name / last_name)
    try {
      const { rows } = await pool.query(
        `SELECT ac.*, u.first_name, u.last_name, u.email AS user_email
         FROM active_copies ac
         LEFT JOIN users u ON u.id = ac.user_id
         ORDER BY ac.created_at DESC`
      );
      return { success: true, data: rows };
    } catch (joinError) {
      // If the users columns are named differently, fall back to plain rows so the monitor still works
      console.error('getAllActiveCopiesAdmin join failed, falling back:', joinError);
      const { rows } = await pool.query('SELECT * FROM active_copies ORDER BY created_at DESC');
      return { success: true, data: rows };
    }
  } catch (error: any) {
    return { success: false, error: error.message, data: [] };
  }
}

// Close a (simulated) copy. Profit is computed HERE from the trade's age; the client no longer sends it.
export async function closeActiveCopy(
  id: number
): Promise<{ success: boolean; profit?: number; error?: string }> {
  const userId = await getCurrentUserId();
  if (!userId) return { success: false, error: 'Unauthorized. Please log in.' };

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // DELETE ... RETURNING makes closing idempotent: a second call finds nothing and cannot double-credit
    const del = await client.query(
      'DELETE FROM active_copies WHERE id = $1 AND user_id = $2 RETURNING amount, created_at',
      [id, userId]
    );
    if (del.rowCount === 0) {
      await client.query('ROLLBACK');
      return { success: false, error: 'Trade not found or already closed.' };
    }

    const amount = parseFloat(del.rows[0].amount) || 0;
    const startedAt = new Date(del.rows[0].created_at).getTime();
    const elapsed = Math.min(Math.max(Date.now() - startedAt, 0), CYCLE_MS);
    const profit = parseFloat((amount * SIM_RATE_PER_CYCLE * (elapsed / CYCLE_MS)).toFixed(2));

    await client.query(
      'UPDATE users SET balance = balance + $1 WHERE id = $2',
      [amount + profit, userId]
    );

    await client.query('COMMIT');
    return { success: true, profit };
  } catch (error: any) {
    await client.query('ROLLBACK');
    console.error('closeActiveCopy error:', error);
    return { success: false, error: error.message || 'Database error.' };
  } finally {
    client.release();
  }
}

export async function updateCopySLTP(id: number, sl: number, tp: number) {
  try {
    const userId = await getCurrentUserId();
    if (!userId) return { success: false, error: 'Unauthorized' };

    await pool.query(
      'UPDATE active_copies SET sl = $1, tp = $2 WHERE id = $3 AND user_id = $4',
      [sl > 0 ? sl : null, tp > 0 ? tp : null, id, userId]
    );

    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

// ADMIN ONLY: Force-close any user's active copy trade and immediately credit their balance
export async function closeCopyTradeAdmin(
  id: number
): Promise<{ success: boolean; profit?: number; error?: string }> {
  // 1. Verify admin role
  const role = await getUserRole();
  if (role !== 'admin') {
    return { success: false, error: 'Forbidden: admin access required.' };
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // 2. Delete the trade and retrieve its initial allocation, start time, and owner
    const del = await client.query(
      'DELETE FROM active_copies WHERE id = $1 RETURNING amount, created_at, user_id',
      [id]
    );
    
    if (del.rowCount === 0) {
      await client.query('ROLLBACK');
      return { success: false, error: 'Trade not found or already closed.' };
    }

    const amount = parseFloat(del.rows[0].amount) || 0;
    const ownerId = del.rows[0].user_id;
    const startedAt = new Date(del.rows[0].created_at).getTime();
    
    // 3. Calculate simulated profit capped at 1 cycle (matches the frontend simulation perfectly)
    const elapsed = Math.min(Math.max(Date.now() - startedAt, 0), CYCLE_MS);
    const profit = parseFloat((amount * SIM_RATE_PER_CYCLE * (elapsed / CYCLE_MS)).toFixed(2));

    // 4. Refund principal + profit to the owner's balance
    await client.query(
      'UPDATE users SET balance = balance + $1 WHERE id = $2',
      [amount + profit, ownerId]
    );

    await client.query('COMMIT');
    return { success: true, profit };
  } catch (error: any) {
    await client.query('ROLLBACK');
    console.error('closeCopyTradeAdmin error:', error);
    return { success: false, error: error.message || 'Database error.' };
  } finally {
    client.release();
  }
}
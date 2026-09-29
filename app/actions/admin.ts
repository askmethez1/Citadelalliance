"use server";

import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

// --- USER MANAGEMENT & BALANCE CONTROL ---

export async function getAllUsersAdmin() {
  try {
    const { rows } = await pool.query(
      `SELECT id, email, first_name, last_name, balance, country, role, is_banned, created_at 
       FROM users ORDER BY id ASC`
    );
    // Properly map to camelCase for the frontend UI
    return rows.map(r => ({
      id: r.id,
      email: r.email,
      firstName: r.first_name,
      lastName: r.last_name,
      balance: parseFloat(r.balance || '0.00'),
      country: r.country,
      role: r.role,
      isBanned: r.is_banned || false,
      created_at: new Date(r.created_at).toLocaleString()
    }));
  } catch (error) {
    console.error('Error fetching admin users:', error);
    return [];
  }
}

export async function updateUserBalanceAdmin(userId: number, newBalance: number) {
  try {
    await pool.query('UPDATE users SET balance = $1 WHERE id = $2', [newBalance.toFixed(2), userId]);
    return { success: true, message: `Balance updated to $${newBalance.toFixed(2)}` };
  } catch (error) {
    console.error('Error updating balance:', error);
    return { success: false, message: 'Failed to update user balance.' };
  }
}

export async function creditUserDepositAdmin(userId: number, amount: number, note: string) {
  if (!amount || isNaN(amount) || amount <= 0) {
    return { success: false, message: 'Invalid credit amount.' };
  }

  try {
    await pool.query(
      'UPDATE users SET balance = balance + $1 WHERE id = $2', 
      [amount, userId]
    );

    await pool.query(
      `INSERT INTO activity_logs (user_id, action, metadata) VALUES ($1, 'DEPOSIT', $2)`,
      [userId, note || `System credit: $${amount.toFixed(2)}`]
    );

    try {
      await pool.query(
        `INSERT INTO transactions (user_id, type, asset, amount, status, created_at)
         VALUES ($1, 'Deposit', 'USDT', $2, 'Completed', NOW())`,
        [userId, `+$${amount.toFixed(2)}`]
      );
    } catch (e) {
      console.warn("Transactions insert skipped due to schema constraints, but balance was credited.");
    }

    return { success: true, message: `Credited $${amount.toFixed(2)} to user account.` };
  } catch (error) {
    console.error('Error crediting user:', error);
    return { success: false, message: 'Failed to credit account. Database error.' };
  }
}

// --- USER BAN MANAGEMENT ---

export async function toggleUserBanAdmin(userId: number, currentBanStatus: boolean) {
  try {
    const newStatus = !currentBanStatus;
    await pool.query('UPDATE users SET is_banned = $1 WHERE id = $2', [newStatus, userId]);
    return { 
      success: true, 
      message: `User has been successfully ${newStatus ? 'BANNED' : 'UNBANNED'}.` 
    };
  } catch (error) {
    console.error('Error toggling user ban:', error);
    return { success: false, message: 'Failed to update user ban status.' };
  }
}

// --- PENDING TRANSACTIONS APPROVAL ---

export async function getPendingTransactionsAdmin() {
  try {
    const { rows } = await pool.query(
      `SELECT t.id, t.user_id, u.email, u.first_name, u.last_name, t.type, t.asset, t.amount, t.status, t.created_at 
       FROM transactions t
       JOIN users u ON t.user_id = u.id
       WHERE t.status = 'Pending'
       ORDER BY t.created_at DESC`
    );
    // Extract and map snake_case to camelCase to prevent UI length errors
    return rows.map(r => ({
      id: r.id,
      userId: r.user_id,
      email: r.email,
      firstName: r.first_name,
      lastName: r.last_name,
      type: r.type,
      asset: r.asset,
      amount: r.amount,
      status: r.status,
      createdAt: r.created_at
    }));
  } catch (error) {
    console.error('Error fetching pending transactions:', error);
    return [];
  }
}

export async function approveTransactionAdmin(txId: number) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const txRes = await client.query('SELECT user_id, amount, status FROM transactions WHERE id = $1',[txId]);
    if (txRes.rows.length === 0 || txRes.rows[0].status !== 'Pending') {
      await client.query('ROLLBACK');
      return { success: false, message: 'Transaction not found or already processed.' };
    }

    const { user_id, amount } = txRes.rows[0];
    const parsedAmount = Math.abs(parseFloat(amount.replace(/[^0-9.-]+/g, "")));

    await client.query('UPDATE users SET balance = COALESCE(balance, 0) + $1 WHERE id = $2', [parsedAmount, user_id]);
    await client.query("UPDATE transactions SET status = 'Completed' WHERE id = $1", [txId]);

    await client.query('COMMIT');
    return { success: true, message: `Transaction #${txId} approved and balance updated.` };
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error approving transaction:', error);
    return { success: false, message: 'Failed to approve transaction.' };
  } finally {
    client.release();
  }
}

export async function rejectTransactionAdmin(txId: number) {
  try {
    await pool.query("UPDATE transactions SET status = 'Failed' WHERE id = $1", [txId]);
    return { success: true, message: `Transaction #${txId} rejected.` };
  } catch (error) {
    console.error('Error rejecting transaction:', error);
    return { success: false, message: 'Failed to reject transaction.' };
  }
}

// --- MASTER TRADER CREATION ---

export async function createMasterTraderAdmin(data: {
  name: string;
  strategy: string;
  winRate: number;
  totalProfit: number;
  monthlyReturn: number;
  activePair: string;
  tradeType: string;
  leverage: number;
}) {
  try {
    await pool.query(
      `INSERT INTO master_traders (name, strategy, win_rate, total_profit, monthly_return, active_pair, trade_type, leverage)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [
        data.name, data.strategy, data.winRate, 
        data.totalProfit, data.monthlyReturn, 
        data.activePair, data.tradeType, data.leverage
      ]
    );
    return { success: true, message: `Master Trader "${data.name}" published!` };
  } catch (error) {
    console.error('Error creating master trader:', error);
    return { success: false, message: 'Failed to create Master Trader.' };
  }
}

// --- SIGNALS CREATION ---

export async function createSignalAdmin(data: {
  pair: string;
  type: string;
  entryPrice: string;
  targetPrice1: string;
  targetPrice2: string;
  stopLoss: string;
  timeframe: string;
  riskLevel: string;
  notes: string;
}) {
  try {
    await pool.query(
      `INSERT INTO signals (pair, type, entry_price, target_price_1, target_price_2, stop_loss, timeframe, risk_level, notes)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
      [
        data.pair, data.type, data.entryPrice,
        data.targetPrice1, data.targetPrice2, data.stopLoss,
        data.timeframe, data.riskLevel, data.notes
      ]
    );
    return { success: true, message: `Signal for ${data.pair} broadcasted live!` };
  } catch (error) {
    console.error('Error publishing signal:', error);
    return { success: false, message: 'Failed to publish signal.' };
  }
}

// --- DEPOSIT WALLET CONFIGURATION (RAW SQL PG POOL) ---

export async function getSystemAddresses() {
  try {
    const { rows } = await pool.query(
      `SELECT key, value FROM system_settings WHERE key IN ('address_BTC', 'address_ETH', 'address_USDT')`
    );
    const addresses = { BTC: '', ETH: '', USDT_TRC20: '' };
    
    rows.forEach(record => {
      if (record.key === 'address_BTC') addresses.BTC = record.value;
      if (record.key === 'address_ETH') addresses.ETH = record.value;
      if (record.key === 'address_USDT') addresses.USDT_TRC20 = record.value;
    });
    
    return addresses;
  } catch (error) {
    console.error("Error fetching system addresses:", error);
    return { BTC: '', ETH: '', USDT_TRC20: '' };
  }
}

export async function updateSystemAddress(addresses: { BTC: string, ETH: string, USDT_TRC20: string }) {
  try {
    const keys = [
      { key: 'address_BTC', value: addresses.BTC },
      { key: 'address_ETH', value: addresses.ETH },
      { key: 'address_USDT', value: addresses.USDT_TRC20 }
    ];

    for (const item of keys) {
      await pool.query(
        `INSERT INTO system_settings (key, value) 
         VALUES ($1, $2) 
         ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value`,
        [item.key, item.value]
      );
    }

    return { success: true };
  } catch (error: any) {
    console.error("Error updating system addresses:", error);
    return { success: false, message: error.message };
  }
}
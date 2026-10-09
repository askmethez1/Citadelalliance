"use server";

import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

// --- USER MANAGEMENT & BALANCE CONTROL ---

export async function getAllUsersAdmin() {
  try {
    // 1. Fetch all users (including Pro tracking columns if they exist, mapped safely)
    const { rows: users } = await pool.query(
      `SELECT id, email, first_name, last_name, balance, country, role, is_banned, created_at, 
              (SELECT column_name FROM information_schema.columns WHERE table_name='users' AND column_name='is_pro') as has_pro
       FROM users ORDER BY id ASC`
    );

    // Dynamic query for Pro columns to avoid crashing if columns aren't created yet
    const hasProColumns = users.length > 0 && users[0].has_pro !== null;
    let fullUsers = users;
    
    if (hasProColumns) {
       const { rows } = await pool.query(`SELECT id, is_pro, pro_plan_type, pro_expiry FROM users`);
       fullUsers = users.map(u => {
         const match = rows.find(r => r.id === u.id);
         return { ...u, is_pro: match?.is_pro, pro_plan_type: match?.pro_plan_type, pro_expiry: match?.pro_expiry };
       });
    }

    // 2. Fetch all open trades safely
    let openTrades: any[] = [];
    try {
      const { rows: trades } = await pool.query(
        `SELECT * FROM trades WHERE close_price IS NULL OR UPPER(status) IN ('OPEN', 'ACTIVE')`
      );
      openTrades = trades;
    } catch (e) {
      console.warn("Warning: Could not fetch open trades:", e);
    }

    // 3. Map users and attach their active trades 
    return fullUsers.map((r: any) => {
      const userIdStr = String(r.id);

      const userTrades = openTrades
        .filter(t => String(t.user_id) === userIdStr)
        .map(t => {
          const vol = Number(t.volume) || 0;
          const op = Number(t.open_price) || 0;
          const lev = Number(t.leverage) || 10;
          
          return {
            id: String(t.id),
            symbol: t.symbol,
            type: t.trade_type || t.order_type || 'BUY',
            leverage: lev,
            openPrice: op,
            volume: vol,
            margin: (vol * op) / lev, 
            sl: t.sl ? Number(t.sl) : undefined,
            tp: t.tp ? Number(t.tp) : undefined,
            createdAt: t.open_time
          };
        });

      return {
        id: r.id,
        email: r.email,
        firstName: r.first_name,
        lastName: r.last_name,
        balance: Number(r.balance) || 0,
        tradingBalance: 0, 
        country: r.country,
        role: r.role,
        isBanned: r.is_banned || false,
        isPro: r.is_pro || false,
        proPlanType: r.pro_plan_type || null,
        proExpiry: r.pro_expiry ? new Date(r.pro_expiry).toLocaleDateString() : null,
        created_at: new Date(r.created_at).toLocaleString(),
        openTrades: userTrades 
      };
    });
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
      'UPDATE users SET balance = COALESCE(balance, 0) + $1 WHERE id = $2', 
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

// --- USER ROLE & BAN MANAGEMENT ---

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

export async function updateUserRoleAdmin(userId: number, newRole: string) {
  try {
    await pool.query('UPDATE users SET role = $1 WHERE id = $2', [newRole, userId]);
    return { 
      success: true, 
      message: `User role successfully updated to ${newRole.toUpperCase()}.` 
    };
  } catch (error) {
    console.error('Error updating user role:', error);
    return { success: false, message: 'Failed to update user role.' };
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

    const txRes = await client.query('SELECT user_id, amount, status FROM transactions WHERE id = $1', [txId]);
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

// --- PRO SUBSCRIPTIONS MANAGEMENT ---

export async function getProSubscriptionsAdmin() {
  try {
    const checkCol = await pool.query(
      `SELECT column_name FROM information_schema.columns WHERE table_name='users' AND column_name='is_pro'`
    );

    if (checkCol.rows.length === 0) {
      console.warn("is_pro column does not exist yet. Returning empty subscriptions list.");
      return [];
    }

    const { rows } = await pool.query(
      `SELECT id, email, first_name, last_name, pro_plan_type, pro_expiry, created_at 
       FROM users 
       WHERE is_pro = true 
       ORDER BY pro_expiry DESC NULLS LAST`
    );

    return rows.map((r: any) => {
      const isAnnual = r.pro_plan_type === 'annual' || r.pro_plan_type === 'Annual';
      const expiryDate = r.pro_expiry ? new Date(r.pro_expiry) : new Date();
      const isActive = expiryDate > new Date();

      return {
        id: `SUB-${r.id}`,
        userId: String(r.id),
        name: `${r.first_name || ''} ${r.last_name || ''}`.trim() || 'Unknown User',
        email: r.email,
        planType: isAnnual ? 'Annual' : 'Monthly',
        amount: isAnnual ? 960 : 100,
        startDate: new Date(r.created_at).toISOString().split('T')[0],
        expiryDate: expiryDate.toISOString().split('T')[0],
        status: isActive ? 'Active' : 'Expired'
      };
    });
  } catch (error) {
    console.error("Failed to fetch subscriptions:", error);
    return [];
  }
}

// --- MASTER TRADER CREATION ---

export async function createMasterTraderAdmin(data: {
  name: string; strategy: string; winRate: number; totalProfit: number;
  monthlyReturn: number; activePair: string; tradeType: string; leverage: number;
}) {
  try {
    await pool.query(
      `INSERT INTO master_traders (name, strategy, win_rate, total_profit, monthly_return, active_pair, trade_type, leverage)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [data.name, data.strategy, data.winRate, data.totalProfit, data.monthlyReturn, data.activePair, data.tradeType, data.leverage]
    );
    return { success: true, message: `Master Trader "${data.name}" published!` };
  } catch (error) {
    console.error('Error creating master trader:', error);
    return { success: false, message: 'Failed to create Master Trader.' };
  }
}

// --- SIGNALS CREATION ---

export async function createSignalAdmin(data: {
  pair: string; type: string; entryPrice: string; targetPrice1: string;
  targetPrice2: string; stopLoss: string; timeframe: string; riskLevel: string; notes: string;
}) {
  try {
    await pool.query(
      `INSERT INTO signals (pair, type, entry_price, target_price_1, target_price_2, stop_loss, timeframe, risk_level, notes)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
      [data.pair, data.type, data.entryPrice, data.targetPrice1, data.targetPrice2, data.stopLoss, data.timeframe, data.riskLevel, data.notes]
    );
    return { success: true, message: `Signal for ${data.pair} broadcasted live!` };
  } catch (error) {
    console.error('Error publishing signal:', error);
    return { success: false, message: 'Failed to publish signal.' };
  }
}

// --- DEPOSIT WALLET CONFIGURATION ---

export async function getSystemAddresses() {
  try {
    const { rows } = await pool.query(
      `SELECT key, value FROM system_settings WHERE key IN ('address_BTC', 'address_ETH', 'address_USDT', 'address_SOL')`
    );
    const addresses = { BTC: '', ETH: '', USDT_TRC20: '', SOL: '' };
    
    rows.forEach(record => {
      if (record.key === 'address_BTC') addresses.BTC = record.value || '';
      if (record.key === 'address_ETH') addresses.ETH = record.value || '';
      if (record.key === 'address_USDT') addresses.USDT_TRC20 = record.value || '';
      if (record.key === 'address_SOL') addresses.SOL = record.value || '';
    });
    
    return addresses;
  } catch (error) {
    console.error("Error fetching system addresses:", error);
    return { BTC: '', ETH: '', USDT_TRC20: '', SOL: '' };
  }
}

export async function updateSystemAddress(addresses: { BTC?: string; ETH?: string; USDT_TRC20?: string; SOL?: string }) {
  try {
    const keys = [
      { key: 'address_BTC', value: addresses.BTC || '' },
      { key: 'address_ETH', value: addresses.ETH || '' },
      { key: 'address_USDT', value: addresses.USDT_TRC20 || '' },
      { key: 'address_SOL', value: addresses.SOL || '' }
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
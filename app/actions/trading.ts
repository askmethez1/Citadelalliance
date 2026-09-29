"use server";

import { Pool } from 'pg';
import { cookies } from 'next/headers';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

async function getCurrentUserId(): Promise<number | null> {
  const cookieStore = await cookies();
  const session = cookieStore.get('citadel_session');
  if (!session?.value) return null;
  const userId = parseInt(session.value, 10);
  return isNaN(userId) ? null : userId;
}

export async function getTradingData() {
  const userId = await getCurrentUserId();
  if (!userId) return null;

  try {
    const userRes = await pool.query(`SELECT balance FROM users WHERE id = $1`, [userId]);
    const rawBalance = parseFloat(userRes.rows[0]?.balance || "0");
    const balance = Math.max(0, rawBalance); // Negative Balance Protection Clamp

    const tradesRes = await pool.query(
      `SELECT * FROM trades WHERE user_id = $1 ORDER BY open_time DESC`, 
      [userId]
    );
    
    return {
      balance,
      trades: tradesRes.rows.map(r => ({
        id: r.ticket,
        symbol: r.symbol,
        type: r.trade_type,
        orderType: r.order_type || 'MARKET',
        marginMode: r.margin_mode || 'CROSS',
        leverage: r.leverage ? parseInt(r.leverage, 10) : 10,
        volume: parseFloat(r.volume),
        openPrice: parseFloat(r.open_price),
        closePrice: r.close_price ? parseFloat(r.close_price) : null,
        sl: parseFloat(r.sl) || 0,
        tp: parseFloat(r.tp) || 0,
        fee: parseFloat(r.fee) || 0,
        pnl: r.pnl ? parseFloat(r.pnl) : 0,
        status: r.status,
        openTime: new Date(r.open_time).toLocaleString(),
        closeTime: r.close_time ? new Date(r.close_time).toLocaleString() : null
      }))
    };
  } catch (error) {
    console.error("Error fetching trading data:", error);
    return null;
  }
}

export async function openTrade(trade: { 
  symbol: string; 
  type: string; 
  orderType: string;
  marginMode: string;
  leverage: number;
  volume: number; 
  openPrice: number; 
  sl: number; 
  tp: number;
  fee: number;
}) {
  const userId = await getCurrentUserId();
  if (!userId) return { success: false };

  const ticket = Math.floor(Math.random() * 100000000).toString();

  // CALCULATE EXACT MARGIN REQUIRED FOR THE TRADE
  const margin = (trade.openPrice * trade.volume) / trade.leverage;
  const totalDeduction = margin + trade.fee;

  try {
    await pool.query('BEGIN');

    // 1. Lock the user row and verify they have enough balance
    const userRes = await pool.query(`SELECT balance FROM users WHERE id = $1 FOR UPDATE`, [userId]);
    const currentBalance = parseFloat(userRes.rows[0].balance || "0");

    if (currentBalance < totalDeduction) {
      await pool.query('ROLLBACK');
      console.error("Insufficient balance to open trade. Need:", totalDeduction, "Have:", currentBalance);
      return { success: false, error: 'Insufficient balance' };
    }

    // 2. Deduct Margin + Fee from Available Balance
    await pool.query(
      `UPDATE users SET balance = balance - $1 WHERE id = $2`,
      [totalDeduction, userId]
    );

    // 3. Insert the trade ticket
    await pool.query(
      `INSERT INTO trades (user_id, ticket, symbol, trade_type, order_type, margin_mode, leverage, volume, open_price, sl, tp, fee, status) 
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, 'OPEN')`,
      [
        userId, ticket, trade.symbol, trade.type, trade.orderType, 
        trade.marginMode, trade.leverage, trade.volume, trade.openPrice, 
        trade.sl, trade.tp, trade.fee
      ]
    );

    await pool.query('COMMIT');
    return { success: true, ticket };
  } catch (error) {
    await pool.query('ROLLBACK');
    console.error("Error opening trade:", error);
    return { success: false };
  }
}

export async function updateTradeSLTP(ticket: string, sl: number, tp: number) {
  const userId = await getCurrentUserId();
  if (!userId) return { success: false };

  try {
    await pool.query(
      `UPDATE trades SET sl = $1, tp = $2 WHERE ticket = $3 AND user_id = $4 AND status = 'OPEN'`,
      [sl, tp, ticket, userId]
    );
    return { success: true };
  } catch (error) {
    console.error("Error updating SL/TP:", error);
    return { success: false };
  }
}

export async function closeTrade(ticket: string, closePrice: number, pnl: number) {
  const userId = await getCurrentUserId();
  if (!userId) return { success: false };

  try {
    await pool.query('BEGIN');

    // 1. Fetch the trade to dynamically calculate the margin to return
    const tradeRes = await pool.query(
      `SELECT open_price, volume, leverage, status FROM trades WHERE ticket = $1 AND user_id = $2 FOR UPDATE`,
      [ticket, userId]
    );

    if (tradeRes.rows.length === 0 || tradeRes.rows[0].status === 'CLOSED') {
      await pool.query('ROLLBACK');
      return { success: false, error: 'Trade already closed' };
    }

    const t = tradeRes.rows[0];
    const margin = (parseFloat(t.open_price) * parseFloat(t.volume)) / parseFloat(t.leverage);
    const totalReturn = margin + pnl; // Principal ± Profit/Loss

    // 2. Mark Trade as Closed
    await pool.query(
      `UPDATE trades SET status = 'CLOSED', close_price = $1, pnl = $2, close_time = NOW() WHERE ticket = $3 AND user_id = $4`,
      [closePrice, pnl, ticket, userId]
    );

    // 3. Return Margin + Realized PnL to the User's Balance
    await pool.query(
      `UPDATE users SET balance = GREATEST(0, balance + $1) WHERE id = $2`,
      [totalReturn, userId]
    );

    // 4. Log the transaction
    await pool.query(
      `INSERT INTO activity_logs (user_id, action, metadata) VALUES ($1, 'TRADE_CLOSED', $2)`,
      [userId, `Closed ${ticket} with PnL: $${pnl.toFixed(2)}`]
    );

    await pool.query('COMMIT');
    
    // Return fresh balance to the UI
    const updated = await pool.query(`SELECT balance FROM users WHERE id = $1`, [userId]);
    const finalBalance = Math.max(0, parseFloat(updated.rows[0].balance || "0"));
    return { success: true, newBalance: finalBalance };
  } catch (error) {
    await pool.query('ROLLBACK');
    console.error("Error closing trade:", error);
    return { success: false };
  }
}
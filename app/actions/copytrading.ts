"use server";

import { Pool } from 'pg';
import { cookies } from 'next/headers';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

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

export async function getCopyTradingData(page: number = 1, limit: number = 9): Promise<CopyTradingOverview> {
  try {
    const cookieStore = await cookies();
    const session = cookieStore.get('citadel_session');
    const userId = session?.value ? parseInt(session.value, 10) : null;

    let userBalance = 0.00;

    // 1. Fetch real user balance securely
    if (userId && !isNaN(userId)) {
      const userRes = await pool.query('SELECT balance FROM users WHERE id = $1 LIMIT 1', [userId]);
      userBalance = userRes.rows.length > 0 ? parseFloat(userRes.rows[0].balance || '0.00') : 0.00;
    }

    // 2. Count total master traders
    const countRes = await pool.query('SELECT COUNT(*) FROM master_traders');
    let totalTraders = parseInt(countRes.rows[0].count, 10);

    const offset = (page - 1) * limit;

    // 3. Fetch paginated traders
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
      // Fallback generator when DB hasn't been seeded yet
      totalTraders = 50;
      const names = [
        "Aegis Quantum", "Nexus Alpha", "Solana Whale AI", "Hyperion Algo", "Satoshi Sentinel",
        "Vanguard Trend", "Sigma Grid", "Apex Scalper", "Orion High-Freq", "Zeus Arbitrage",
        "Chronos Swing", "Krypton Bot", "Titan Macro", "Eclipse Leveraged", "Nebula Delta",
        "Cipher Pulse", "Vortex HFT", "Quantum Breakout", "Aura Momentum", "Aether Mean-Revert"
      ];
      const pairs = ["BTC/USDT", "ETH/USDT", "SOL/USDT", "AVAX/USDT", "BNB/USDT"];

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

    return {
      userBalance,
      traders,
      totalTraders
    };
  } catch (error) {
    console.error('Error fetching copy trading data:', error);
    return { userBalance: 0.00, traders: [], totalTraders: 0 };
  }
}
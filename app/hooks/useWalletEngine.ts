"use client";

import { useState, useEffect, useMemo, useCallback } from 'react';
import { getTradingData } from '@/app/actions/trading';
import { usePricingEngine } from './usePricingEngine';
import { calculatePnL } from '@/app/utils/tradingEngine';

export interface Trade {
  id: string;
  symbol: string;
  type: 'BUY' | 'SELL';
  marginMode: string;
  leverage: number;
  volume: number;
  openPrice: number;
  tp: number;
  sl: number;
  status: string;
}

export function useWalletEngine() {
  const { getLivePrice } = usePricingEngine();
  
  const [balance, setBalance] = useState<number>(0);
  const [openTrades, setOpenTrades] = useState<Trade[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Core Ledger Sync
  const fetchLedger = useCallback(async () => {
    try {
      const data = await getTradingData();
      if (data) {
        if (data.balance !== undefined) setBalance(Number(data.balance) || 0);
        if (data.trades) {
          setOpenTrades(data.trades.filter((t: any) => t.status === 'OPEN'));
        }
      }
    } catch (error) {
      console.error("[Wallet Engine] Sync failed:", error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Poll database strictly every 5 seconds
  useEffect(() => {
    fetchLedger();
    const interval = setInterval(fetchLedger, 5000);
    return () => clearInterval(interval);
  }, [fetchLedger]);

  // Universal Accounting Formulas
  const walletStats = useMemo(() => {
    let floatingPnL = 0;
    let lockedMargin = 0;
    let activeCopiers = 0;

    // Safely retrieve AI Copy Trading metadata
    let aiMeta: Record<string, any> = {};
    if (typeof window !== 'undefined') {
      try {
        aiMeta = JSON.parse(localStorage.getItem('ai_copy_meta') || '{}');
      } catch (e) {}
    }

    openTrades.forEach(trade => {
      const livePrice = getLivePrice(trade.symbol) || trade.openPrice;
      
      // Calculate floating profit/loss
      floatingPnL += calculatePnL(trade.type, trade.openPrice, livePrice, trade.volume);
      
      // Calculate locked principal (Margin)
      lockedMargin += (trade.openPrice * trade.volume) / trade.leverage;

      // Count if it's an AI trade
      if (aiMeta[trade.id]) activeCopiers += 1;
    });

    // The Golden Formula
    const liveEquity = balance + lockedMargin + floatingPnL;
    const marginUtilized = liveEquity > 0 ? (lockedMargin / liveEquity) * 100 : 0;

    return {
      balance,
      lockedMargin,
      floatingPnL,
      liveEquity,
      marginUtilized,
      activeCopiers,
      openTrades
    };
  }, [balance, openTrades, getLivePrice]);

  return {
    ...walletStats,
    isWalletLoading: isLoading,
    refreshWallet: fetchLedger // Expose manual refresh function for instant updates post-trade
  };
}
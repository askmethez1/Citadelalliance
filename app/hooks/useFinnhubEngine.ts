"use client";

import { useState, useEffect, useCallback } from 'react';

export function useFinnhubEngine() {
  const [stockPrices, setStockPrices] = useState<Record<string, number>>({});
  const [isStockLoading, setIsStockLoading] = useState(true);
  const [stockError, setStockError] = useState<string | null>(null);

  const fetchStockPrices = useCallback(async () => {
    try {
      // Hit our own backend proxy
      const res = await fetch('/api/prices', {
        headers: { 'Cache-Control': 'no-cache' }
      });

      if (!res.ok) {
        throw new Error(`Proxy HTTP ${res.status}`);
      }

      const data = await res.json();

      if (data.success && data.prices) {
        setStockPrices(prev => ({ ...prev, ...data.prices }));
        setStockError(null);
      }
    } catch (err: any) {
      console.error("[Finnhub Engine] Proxy quote error:", err);
      setStockError(err?.message || 'Stock fetch failed');
    } finally {
      setIsStockLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStockPrices();
    // Finnhub data can be polled every 15 seconds
    const interval = setInterval(fetchStockPrices, 15000);
    return () => clearInterval(interval);
  }, [fetchStockPrices]);

  const getStockPrice = useCallback((symbol: string): number => {
    if (!symbol) return 0;
    const clean = symbol.replace('/', '').toUpperCase();
    return stockPrices[clean] || stockPrices[symbol] || 0;
  }, [stockPrices]);

  return { stockPrices, getStockPrice, isStockLoading, stockError };
}
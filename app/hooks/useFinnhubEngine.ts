"use client";

import { useState, useEffect, useCallback, useRef } from 'react';
import { TRADING_ASSETS, TradingAsset } from '@/app/config/assets';

export function useFinnhubEngine() {
  const [stockPrices, setStockPrices] = useState<Record<string, number>>({});
  const [isStockLoading, setIsStockLoading] = useState(true);
  const [stockError, setStockError] = useState<string | null>(null);

  const stockAssets = useRef<TradingAsset[]>(
    TRADING_ASSETS.filter(a => a.type === 'stock')
  );

  useEffect(() => {
    const apiKey = process.env.NEXT_PUBLIC_FINNHUB_API_KEY;
    if (!apiKey) {
      setIsStockLoading(false);
      return;
    }

    let isMounted = true;

    const fetchQuotes = async () => {
      try {
        const fetchPromises = stockAssets.current.map(asset =>
          fetch(`https://finnhub.io/api/v1/quote?symbol=${asset.symbol}&token=${apiKey}`)
            .then(res => res.ok ? res.json() : null)
            .then(data => ({ symbol: asset.symbol, price: data?.c }))
            .catch(() => null)
        );

        const results = await Promise.all(fetchPromises);

        if (isMounted) {
          const initialMap: Record<string, number> = {};
          results.forEach(item => {
            if (item && item.price && item.price > 0) {
              initialMap[item.symbol] = item.price;
            }
          });
          if (Object.keys(initialMap).length > 0) {
            setStockPrices(prev => ({ ...prev, ...initialMap }));
            setStockError(null);
          }
        }
      } catch (err: any) {
        console.error("[Finnhub Engine] REST quote error:", err);
      } finally {
        if (isMounted) setIsStockLoading(false);
      }
    };

    fetchQuotes();
    const interval = setInterval(fetchQuotes, 15000);

    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, []);

  const getStockPrice = useCallback((symbol: string): number => {
    if (!symbol) return 0;
    const clean = symbol.replace('/', '').toUpperCase();
    return stockPrices[clean] || stockPrices[symbol] || 0;
  }, [stockPrices]);

  return { stockPrices, getStockPrice, isStockLoading, stockError };
}
"use client";

import { useState, useEffect, useCallback } from 'react';

export function useCryptoEngine() {
  const [cryptoPrices, setCryptoPrices] = useState<Record<string, number>>({});
  const [isCryptoLoading, setIsCryptoLoading] = useState(true);
  const [cryptoError, setCryptoError] = useState<string | null>(null);

  const fetchCryptoPrices = useCallback(async () => {
    try {
      // Hit our own backend proxy to bypass browser restrictions
      const res = await fetch('/api/prices', {
        headers: { 'Cache-Control': 'no-cache' }
      });

      if (!res.ok) {
        throw new Error(`Proxy HTTP ${res.status}: ${res.statusText}`);
      }

      const data = await res.json();

      if (data.success && data.prices) {
        setCryptoPrices(prev => ({ ...prev, ...data.prices }));
        setCryptoError(null);
      } else {
        throw new Error('Invalid response format from proxy');
      }
    } catch (err: any) {
      console.error('[Crypto Engine] Proxy fetch failed:', err);
      setCryptoError(err?.message || 'Price fetch failed');
    } finally {
      setIsCryptoLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCryptoPrices();
    // Poll the proxy every 8 seconds
    const interval = setInterval(fetchCryptoPrices, 8000);
    return () => clearInterval(interval);
  }, [fetchCryptoPrices]);

  const getCryptoPrice = useCallback((symbol: string): number => {
    if (!symbol) return 0;
    const clean = symbol.replace('/', '').toUpperCase();
    const base = clean.replace('USDT', '').replace('USD', '');

    return cryptoPrices[clean] || cryptoPrices[base] || cryptoPrices[`${base}USD`] || cryptoPrices[`${base}USDT`] || 0;
  }, [cryptoPrices]);

  return { cryptoPrices, getCryptoPrice, isCryptoLoading, cryptoError };
}
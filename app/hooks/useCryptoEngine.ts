"use client";

import { useState, useEffect, useCallback, useRef } from 'react';
import { TRADING_ASSETS, TradingAsset } from '@/app/config/assets';

// Map trading symbols to CoinGecko coin IDs
const COINGECKO_ID_MAP: Record<string, string> = {
  'BTC': 'bitcoin',
  'ETH': 'ethereum',
  'SOL': 'solana',
  'BNB': 'binancecoin',
  'XRP': 'ripple',
  'DOGE': 'dogecoin',
  'AVAX': 'avalanche-2',
};

// Reverse map for quick lookup when parsing responses
const REVERSE_ID_MAP: Record<string, string> = Object.entries(COINGECKO_ID_MAP).reduce(
  (acc, [sym, id]) => ({ ...acc, [id]: sym }),
  {}
);

export function useCryptoEngine() {
  const [cryptoPrices, setCryptoPrices] = useState<Record<string, number>>({});
  const [isCryptoLoading, setIsCryptoLoading] = useState(true);
  const [cryptoError, setCryptoError] = useState<string | null>(null);

  const cryptoAssets = useRef<TradingAsset[]>(
    TRADING_ASSETS.filter(a => a.type === 'crypto')
  );

  const populatePriceVariants = (symbol: string, price: number, map: Record<string, number>) => {
    const base = symbol.replace('USDT', '').replace('USD', '').replace('/', '').toUpperCase();
    map[base] = price;
    map[`${base}USD`] = price;
    map[`${base}USDT`] = price;
    map[`${base}/USDT`] = price;
    map[`${base}/USD`] = price;
  };

  const fetchCryptoPrices = useCallback(async () => {
    try {
      const apiKey = process.env.NEXT_PUBLIC_COINGECKO_API_KEY || 'CG-4GhMyK7U1YKzQwxQ6uejz623';

      // Extract all unique CoinGecko IDs needed
      const ids = Array.from(
        new Set(
          cryptoAssets.current.map(a => {
            const clean = a.symbol.replace('USDT', '').replace('USD', '').replace('/', '').toUpperCase();
            return COINGECKO_ID_MAP[clean] || clean.toLowerCase();
          })
        )
      ).join(',');

      const url = `https://api.coingecko.com/api/v3/simple/price?ids=${ids}&vs_currencies=usd&x_cg_demo_api_key=${apiKey}`;

      const res = await fetch(url, {
        headers: {
          'x-cg-demo-api-key': apiKey,
        },
      });

      if (!res.ok) {
        throw new Error(`CoinGecko HTTP ${res.status}: ${res.statusText}`);
      }

      const data = await res.json();

      if (data && typeof data === 'object') {
        const priceMap: Record<string, number> = {};

        Object.keys(data).forEach(coinId => {
          const price = data[coinId]?.usd;
          if (price && price > 0) {
            const symbol = REVERSE_ID_MAP[coinId] || coinId.toUpperCase();
            populatePriceVariants(symbol, price, priceMap);
          }
        });

        if (Object.keys(priceMap).length > 0) {
          setCryptoPrices(prev => ({ ...prev, ...priceMap }));
          setCryptoError(null);
        }
      }
    } catch (err: any) {
      console.error('[Crypto Engine] CoinGecko fetch failed:', err);
      setCryptoError(err?.message || 'CoinGecko price fetch failed');
    } finally {
      setIsCryptoLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCryptoPrices();
    // 8-second interval is well within the 30 calls/min demo key limit
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
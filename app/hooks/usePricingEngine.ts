"use client";

import { useCallback } from 'react';
import { useCryptoEngine } from './useCryptoEngine';
import { useFinnhubEngine } from './useFinnhubEngine';

export function usePricingEngine() {
  const { getCryptoPrice, isCryptoLoading, cryptoError } = useCryptoEngine();
  const { getStockPrice, isStockLoading, stockError } = useFinnhubEngine();

  const getLivePrice = useCallback((symbol: string): number => {
    if (!symbol) return 0;

    const cleanSymbol = symbol.replace('/', '').toUpperCase();

    // 1. Check Crypto Engine
    const cryptoPrice = getCryptoPrice(symbol) || getCryptoPrice(cleanSymbol);
    if (cryptoPrice > 0) return cryptoPrice;

    // 2. Check Stock Engine
    const stockPrice = getStockPrice(symbol) || getStockPrice(cleanSymbol);
    if (stockPrice > 0) return stockPrice;

    return 0;
  }, [getCryptoPrice, getStockPrice]);

  return {
    getLivePrice,
    isPriceLoading: isCryptoLoading && isStockLoading,
    cryptoError,
    stockError
  };
}
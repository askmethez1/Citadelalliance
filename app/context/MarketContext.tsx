"use client";

import React, { createContext, useContext, useState, useEffect } from 'react';

export interface MarketAsset {
  symbol: string;
  name: string;
  category: 'Crypto' | 'Stocks' | 'Forex' | 'Commodities';
  price: number;
  change24h: number;
  high24h: number;
  low24h: number;
  volume: string;
}

const DEFAULT_ASSETS: MarketAsset[] = [
  { symbol: "BTCUSDT", name: "Bitcoin / Tether", category: "Crypto", price: 0, change24h: 0, high24h: 0, low24h: 0, volume: "..." },
  { symbol: "ETHUSDT", name: "Ethereum / Tether", category: "Crypto", price: 0, change24h: 0, high24h: 0, low24h: 0, volume: "..." },
  { symbol: "SOLUSDT", name: "Solana / Tether", category: "Crypto", price: 0, change24h: 0, high24h: 0, low24h: 0, volume: "..." },
  { symbol: "BNBUSDT", name: "Binance Coin", category: "Crypto", price: 0, change24h: 0, high24h: 0, low24h: 0, volume: "..." },
  { symbol: "AAPL", name: "Apple Inc.", category: "Stocks", price: 0, change24h: 0, high24h: 0, low24h: 0, volume: "..." },
  { symbol: "TSLA", name: "Tesla Inc.", category: "Stocks", price: 0, change24h: 0, high24h: 0, low24h: 0, volume: "..." },
  { symbol: "NVDA", name: "NVIDIA Corp.", category: "Stocks", price: 0, change24h: 0, high24h: 0, low24h: 0, volume: "..." },
  { symbol: "EURUSD", name: "EUR / USD", category: "Forex", price: 0, change24h: 0, high24h: 0, low24h: 0, volume: "..." },
  { symbol: "GBPUSD", name: "GBP / USD", category: "Forex", price: 0, change24h: 0, high24h: 0, low24h: 0, volume: "..." },
  { symbol: "XAUUSD", name: "Gold Spot", category: "Commodities", price: 0, change24h: 0, high24h: 0, low24h: 0, volume: "..." },
];

// Finnhub strictly handles US Equities
const FINNHUB_SYMBOL_MAP: Record<string, string> = {
  "AAPL": "AAPL",
  "TSLA": "TSLA",
  "NVDA": "NVDA"
};

// CryptoCompare handles Crypto, Fiat Forex, and Physical Gold (PAXG)
const CC_MAP: Record<string, string> = {
  "BTCUSDT": "BTC",
  "ETHUSDT": "ETH",
  "SOLUSDT": "SOL",
  "BNBUSDT": "BNB",
  "EURUSD": "EUR",
  "GBPUSD": "GBP",
  "XAUUSD": "PAXG" // Paxos Gold acts as a 1:1 digital mirror for physical Gold
};

// Reverse map for incoming WebSocket data routing
const REVERSE_CC_MAP: Record<string, string> = {
  "BTC": "BTCUSDT",
  "ETH": "ETHUSDT",
  "SOL": "SOLUSDT",
  "BNB": "BNBUSDT",
  "EUR": "EURUSD",
  "GBP": "GBPUSD",
  "PAXG": "XAUUSD"
};

interface MarketContextType {
  assets: MarketAsset[];
  selectedSymbol: string;
  setSelectedSymbol: (symbol: string) => void;
  getAsset: (symbol: string) => MarketAsset | undefined;
}

const MarketContext = createContext<MarketContextType | undefined>(undefined);

export function MarketProvider({ children }: { children: React.ReactNode }) {
  const [assets, setAssets] = useState<MarketAsset[]>(DEFAULT_ASSETS);
  const [selectedSymbol, setSelectedSymbol] = useState<string>("BTCUSDT");

  // ENGINE 1: CRYPTOCOMPARE (Crypto + Forex + Gold)
  useEffect(() => {
    const apiKey = process.env.NEXT_PUBLIC_CRYPTO_API_KEY;
    if (!apiKey) return;

    const ccSymbols = Object.values(CC_MAP).join(',');

    // 1. Initial REST Fetch
    fetch(`https://min-api.cryptocompare.com/data/pricemultifull?fsyms=${ccSymbols}&tsyms=USD&api_key=${apiKey}`)
      .then(res => res.json())
      .then(json => {
        if (json.RAW) {
          setAssets(prev => prev.map(asset => {
            if (CC_MAP[asset.symbol]) {
              const apiSymbol = CC_MAP[asset.symbol];
              const data = json.RAW[apiSymbol]?.USD;
              if (data) {
                return {
                  ...asset,
                  price: data.PRICE,
                  change24h: data.CHANGEPCT24HOUR,
                  high24h: data.HIGH24HOUR,
                  low24h: data.LOW24HOUR
                };
              }
            }
            return asset;
          }));
        }
      })
      .catch(err => console.error("CryptoCompare REST error:", err));

    // 2. Live WebSocket Stream
    const wsCrypto = new WebSocket(`wss://streamer.cryptocompare.com/v2?api_key=${apiKey}`);

    wsCrypto.onopen = () => {
      // '5' is the Aggregate Index for unified pricing across multiple exchanges
      const subs = Object.values(CC_MAP).map(sym => `5~CCCAGG~${sym}~USD`);
      wsCrypto.send(JSON.stringify({
        action: "SubAdd",
        subs: subs
      }));
    };

    wsCrypto.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);

        // Only process Trade updates (TYPE "5") that contain a PRICE payload
        if (data.TYPE === "5" && data.FROMSYMBOL && data.PRICE !== undefined) {
          const localSymbol = REVERSE_CC_MAP[data.FROMSYMBOL];

          if (localSymbol) {
            setAssets(prev => prev.map(asset => {
              if (asset.symbol === localSymbol) {
                return {
                  ...asset,
                  price: data.PRICE
                };
              }
              return asset;
            }));
          }
        }
      } catch (e) {}
    };

    return () => {
      if (wsCrypto.readyState === WebSocket.OPEN) wsCrypto.close();
    };
  }, []);

  // ENGINE 2: FINNHUB (US Stocks Only)
  useEffect(() => {
    const apiKey = process.env.NEXT_PUBLIC_FINNHUB_API_KEY;
    if (!apiKey) return;

    // Filter to only the 3 US Equities
    const stockAssets = DEFAULT_ASSETS.filter(a => FINNHUB_SYMBOL_MAP[a.symbol]);

    // 1. Initial REST Fetch
    Promise.all(
      stockAssets.map(asset => {
        const fhSymbol = FINNHUB_SYMBOL_MAP[asset.symbol];
        return fetch(`https://finnhub.io/api/v1/quote?symbol=${fhSymbol}&token=${apiKey}`)
          .then(res => res.json())
          .then(data => ({ symbol: asset.symbol, data }))
          .catch(() => null);
      })
    ).then(results => {
      setAssets(prev => prev.map(asset => {
        const match = results.find(r => r && r.symbol === asset.symbol);
        if (match && match.data && match.data.c !== undefined && match.data.c !== 0) {
          const d = match.data;
          const changePercent = d.pc > 0 ? ((d.c - d.pc) / d.pc) * 100 : 0;
          return { ...asset, price: d.c, change24h: changePercent, high24h: d.h, low24h: d.l };
        }
        return asset;
      }));
    });

    // 2. Live WebSocket Stream
    const wsTradFi = new WebSocket(`wss://ws.finnhub.io?token=${apiKey}`);

    wsTradFi.onopen = () => {
      stockAssets.forEach(asset => {
        wsTradFi.send(JSON.stringify({ type: 'subscribe', symbol: FINNHUB_SYMBOL_MAP[asset.symbol] }));
      });
    };

    wsTradFi.onmessage = (event) => {
      try {
        const response = JSON.parse(event.data);
        if (response.type === 'trade' && Array.isArray(response.data)) {
          const latestTrades = response.data;

          setAssets(prev => prev.map(asset => {
            if (FINNHUB_SYMBOL_MAP[asset.symbol]) {
              const fhSymbol = FINNHUB_SYMBOL_MAP[asset.symbol];
              const trade = latestTrades.reverse().find((t: any) => t.s === fhSymbol);
              if (trade) {
                return { ...asset, price: trade.p };
              }
            }
            return asset;
          }));
        }
      } catch (err) {}
    };

    return () => {
      if (wsTradFi.readyState === WebSocket.OPEN) wsTradFi.close();
    };
  }, []);

  const getAsset = (symbol: string) => assets.find(a => a.symbol === symbol);

  return (
    <MarketContext.Provider value={{ assets, selectedSymbol, setSelectedSymbol, getAsset }}>
      {children}
    </MarketContext.Provider>
  );
}

export function useMarket() {
  const context = useContext(MarketContext);
  if (!context) throw new Error("useMarket must be used within a MarketProvider");
  return context;
}

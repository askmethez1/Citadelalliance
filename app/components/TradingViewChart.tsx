"use client";

import React, { useEffect, useRef, useState } from 'react';
import { TRADING_ASSETS } from '@/app/config/assets';

interface TradingViewChartProps {
  symbol: string;
}

// Dynamically map symbols using your assets.ts configuration
function formatTradingViewSymbol(rawSymbol: string): string {
  const asset = TRADING_ASSETS.find(a => a.symbol === rawSymbol);
  
  if (asset?.type === 'crypto') {
    // TradingView Crypto pairs usually trade against USDT on Binance (e.g., BTCUSD -> BINANCE:BTCUSDT)
    return `BINANCE:${asset.symbol.replace('USD', 'USDT')}`;
  } 
  
  if (asset?.type === 'stock') {
    // Specific ETFs trade on AMEX, the rest of your list are on NASDAQ
    if (['SPY', 'VOO'].includes(asset.symbol)) {
      return `AMEX:${asset.symbol}`;
    }
    return `NASDAQ:${asset.symbol}`;
  }
  
  // Safe Fallback
  return `BINANCE:${rawSymbol.replace('USD', 'USDT')}`;
}

// Ensure the TradingView script is only loaded once per session
let tvScriptLoadingPromise: Promise<void> | null = null;

export default function TradingViewChart({ symbol }: TradingViewChartProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  // Generate a unique ID for each chart instance so the modal can safely mount/unmount
  const [containerId] = useState(`tv_chart_${Math.random().toString(36).substring(7)}`);

  useEffect(() => {
    const tvSymbol = formatTradingViewSymbol(symbol);

    const createWidget = () => {
      if (document.getElementById(containerId) && 'TradingView' in window) {
        new (window as any).TradingView.widget({
          autosize: true,
          symbol: tvSymbol,
          interval: 'D',
          timezone: 'Etc/UTC',
          theme: 'dark',
          style: '1',
          locale: 'en',
          enable_publishing: false,
          backgroundColor: '#0B0E14',
          gridColor: 'rgba(255, 255, 255, 0.05)',
          hide_top_toolbar: false,
          hide_legend: false,
          save_image: false,
          container_id: containerId,
        });
      }
    };

    // If the script hasn't been loaded yet, append it to the document head
    if (!tvScriptLoadingPromise) {
      tvScriptLoadingPromise = new Promise((resolve, reject) => {
        const script = document.createElement('script');
        script.id = 'tradingview-widget-loading-script';
        script.src = 'https://s3.tradingview.com/tv.js';
        script.type = 'text/javascript';
        script.async = true;
        script.onload = () => resolve();
        script.onerror = (err) => reject(err);
        document.head.appendChild(script);
      });
    }

    // Once the script is loaded, create the widget
    tvScriptLoadingPromise.then(() => {
      if (containerRef.current) {
        createWidget();
      }
    }).catch((err) => {
      console.error("TradingView script blocked or failed to load:", err);
    });

    // Cleanup function
    return () => {
      if (containerRef.current) {
        containerRef.current.innerHTML = '';
      }
    };
  }, [symbol, containerId]);

  return (
    <div 
      id={containerId} 
      ref={containerRef} 
      className="w-full h-full bg-[#0B0E14] overflow-hidden" 
    />
  );
}
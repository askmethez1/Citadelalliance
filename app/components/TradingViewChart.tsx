"use client";

import React, { useEffect, useRef, useState } from 'react';

interface TradingViewChartProps {
  symbol: string;
}

// Map symbols to official TradingView exchange tickers
function formatTradingViewSymbol(symbol: string): string {
  const cleanSymbol = symbol.toUpperCase().replace('/', '').replace('USDT', 'USD');
  
  const symbolMap: Record<string, string> = {
    'BTCUSD': 'BINANCE:BTCUSDT',
    'ETHUSD': 'BINANCE:ETHUSDT',
    'SOLUSD': 'BINANCE:SOLUSDT',
    'BNBUSD': 'BINANCE:BNBUSDT',
    'XRPUSD': 'BINANCE:XRPUSDT',
    'DOGEUSD': 'BINANCE:DOGEUSDT',
    'AVAXUSD': 'BINANCE:AVAXUSDT',
    'SPY': 'AMEX:SPY',
    'QQQ': 'NASDAQ:QQQ',
    'VOO': 'AMEX:VOO',
    'AAPL': 'NASDAQ:AAPL',
    'NVDA': 'NASDAQ:NVDA',
    'MSFT': 'NASDAQ:MSFT',
    'AMZN': 'NASDAQ:AMZN',
    'TSLA': 'NASDAQ:TSLA',
    'META': 'NASDAQ:META',
    'IBIT': 'NASDAQ:IBIT',
    'ETHA': 'NASDAQ:ETHA',
  };

  return symbolMap[cleanSymbol] || `NASDAQ:${cleanSymbol}`;
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
      tvScriptLoadingPromise = new Promise((resolve) => {
        const script = document.createElement('script');
        script.id = 'tradingview-widget-loading-script';
        script.src = 'https://s3.tradingview.com/tv.js';
        script.type = 'text/javascript';
        script.onload = () => resolve();
        document.head.appendChild(script);
      });
    }

    // Once the script is loaded, create the widget
    tvScriptLoadingPromise.then(() => createWidget());

    // Cleanup function
    return () => {
      if (containerRef.current) {
        containerRef.current.innerHTML = '';
      }
    };
  }, [symbol, containerId]);

  return (
    <div className="w-full h-full relative bg-[#0B0E14]">
      {/* Absolute inset-0 forces the chart to fill the entire modal body */}
      <div id={containerId} ref={containerRef} className="absolute inset-0" />
    </div>
  );
}
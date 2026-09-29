"use client";

import { useState, useEffect, useRef } from 'react';
import { ShieldAlert, Info, Clock, CheckCircle2, XCircle } from 'lucide-react';
import { getUserBalance, settleTradeBalance } from '../../actions/user';
import { useMarket } from '../../context/MarketContext';

interface ActiveTrade {
  id: number;
  side: 'buy' | 'sell';
  size: number;
  entryPrice: number;
  timeLeft: number;
  status: 'active' | 'won' | 'lost';
}

export default function OrderEntry() {
  const { assets, selectedSymbol } = useMarket();
  const activeAsset = assets.find(a => a.symbol === selectedSymbol) || assets[0];
  const currentPrice = activeAsset ? activeAsset.price : 64250.00;

  const [balance, setBalance] = useState<number>(0.00); 
  const [isFetchingBalance, setIsFetchingBalance] = useState(true);
  const [orderType, setOrderType] = useState<'market' | 'limit' | 'algo'>('market');
  const [leverage, setLeverage] = useState<number>(10);
  const [orderSize, setOrderSize] = useState<string>('');
  const [duration, setDuration] = useState<number>(15);
  const [activeTrades, setActiveTrades] = useState<ActiveTrade[]>([]);
  
  const tradesRef = useRef(activeTrades);
  const priceRef = useRef(currentPrice);

  useEffect(() => {
    tradesRef.current = activeTrades;
  }, [activeTrades]);

  useEffect(() => {
    priceRef.current = currentPrice;
  }, [currentPrice]);

  useEffect(() => {
    async function loadBalance() {
      const res = await getUserBalance();
      if (res.success) setBalance(res.balance);
      setIsFetchingBalance(false);
    }
    loadBalance();
  }, []);

  // Timer Trade Resolution
  useEffect(() => {
    const timer = setInterval(() => {
      const currentTrades = tradesRef.current;
      if (currentTrades.length === 0) return; 

      let stateChanged = false;
      let totalPayout = 0;
      
      const updatedTrades = currentTrades.map((trade): ActiveTrade => {
        if (trade.status === 'active' && trade.timeLeft > 0) {
          stateChanged = true;
          return { ...trade, timeLeft: trade.timeLeft - 1 };
        }
        
        if (trade.status === 'active' && trade.timeLeft === 0) {
          stateChanged = true;
          const isWin = trade.side === 'buy' 
            ? priceRef.current > trade.entryPrice 
            : priceRef.current < trade.entryPrice;
          
          if (isWin) totalPayout += (trade.size * 1.8);
          
          return { ...trade, status: isWin ? 'won' : 'lost' };
        }
        
        return trade;
      });

      if (stateChanged) setActiveTrades(updatedTrades);

      if (totalPayout > 0) {
        setBalance((b) => b + totalPayout);
        settleTradeBalance(totalPayout);
      }
    }, 1000);
    
    return () => clearInterval(timer);
  }, []);

  const handleExecuteTrade = async (side: 'buy' | 'sell') => {
    const size = parseFloat(orderSize);
    if (isNaN(size) || size <= 0 || size > balance) return;

    setBalance((prev) => prev - size);
    const dbUpdate = await settleTradeBalance(-size);
    if (!dbUpdate.success) {
      setBalance((prev) => prev + size);
      return;
    }
    
    const newTrade: ActiveTrade = {
      id: Date.now(),
      side,
      size,
      entryPrice: currentPrice,
      timeLeft: duration,
      status: 'active'
    };
    
    setActiveTrades((prev) => [newTrade, ...prev]);
    setOrderSize(''); 
  };

  const isInsufficient = parseFloat(orderSize) > balance;
  const isPositive = activeAsset.change24h >= 0;

  return (
    <div className="w-full md:w-[340px] flex flex-col bg-[#151924]">
      {/* Uniform Live Ticker Header */}
      <div className="p-5 border-b border-white/5 flex items-center justify-between bg-[#0B0E14]/50">
        <div className="font-extrabold text-white flex items-center gap-2">
          {activeAsset.symbol} <span className="px-1.5 py-0.5 rounded bg-white/5 text-gray-400 text-[10px] font-medium border border-white/10">{activeAsset.category}</span>
        </div>
        <div className={`${isPositive ? 'text-green-400' : 'text-red-400'} font-mono text-sm font-bold flex items-center gap-1`}>
          <span className={`w-1.5 h-1.5 rounded-full ${isPositive ? 'bg-green-500' : 'bg-red-500'} animate-pulse`}></span>
          ${currentPrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 4 })}
        </div>
      </div>
      
      <div className="p-5 flex-1 overflow-y-auto scrollbar-none relative">
        <div className="flex bg-[#0B0E14] rounded-lg p-1 mb-6 border border-white/5">
          <button onClick={() => setOrderType('market')} className={`flex-1 py-1.5 text-xs font-bold rounded-md ${orderType === 'market' ? 'bg-blue-600 text-white' : 'text-gray-400'}`}>Market</button>
          <button onClick={() => setOrderType('limit')} className={`flex-1 py-1.5 text-xs font-bold rounded-md ${orderType === 'limit' ? 'bg-blue-600 text-white' : 'text-gray-400'}`}>Limit</button>
          <button onClick={() => setOrderType('algo')} className={`flex-1 py-1.5 text-xs font-bold rounded-md ${orderType === 'algo' ? 'bg-blue-600 text-white' : 'text-gray-400'}`}>Timer</button>
        </div>

        <div className="mb-6">
          <div className="flex justify-between items-center mb-2">
            <label className="text-xs text-gray-400 font-medium flex items-center gap-1">Leverage <Info size={12} className="text-gray-600" /></label>
            <span className="text-xs font-bold text-blue-400 bg-blue-500/10 px-2 py-0.5 rounded border border-blue-500/20">{leverage}x</span>
          </div>
          <input 
            type="range" min="1" max="100" value={leverage} 
            onChange={(e) => setLeverage(Number(e.target.value))}
            className="w-full h-1.5 bg-gray-800 rounded-full appearance-none cursor-pointer accent-blue-500"
          />
        </div>

        <div className="mb-5">
          <label className="text-xs text-gray-400 font-medium mb-1.5 flex items-center gap-1 block"><Clock size={12}/> Trade Duration</label>
          <div className="flex gap-2">
            {[15, 30, 60, 300].map((sec) => (
              <button key={sec} onClick={() => setDuration(sec)} className={`flex-1 py-2 rounded-lg text-xs font-bold border ${duration === sec ? 'bg-blue-600/20 border-blue-500 text-blue-400' : 'bg-[#0B0E14] border-white/5 text-gray-500'}`}>
                {sec < 60 ? `${sec}s` : `${sec/60}m`}
              </button>
            ))}
          </div>
        </div>

        <div className="mb-6">
          <div className="flex justify-between items-center mb-1.5">
            <label className="text-xs text-gray-400 font-medium block">Order Size</label>
            <span className="text-[10px] text-gray-500 font-mono">
              Avail: <span className="text-white">{isFetchingBalance ? "..." : `$${balance.toLocaleString(undefined, {minimumFractionDigits: 2})}`}</span>
            </span>
          </div>
          <div className="relative">
            <input 
              type="number" value={orderSize} onChange={(e) => setOrderSize(e.target.value)} placeholder="0.00" 
              className={`w-full bg-[#0B0E14] border ${isInsufficient ? 'border-red-500' : 'border-white/5 focus:border-blue-500'} rounded-xl py-2.5 px-3 text-white font-mono text-sm focus:outline-none pr-12`} 
            />
            <div className="absolute inset-y-0 right-3 flex items-center text-xs font-bold text-gray-500">USD</div>
          </div>
        </div>

        <div className="mt-6 flex flex-col gap-3">
          <button disabled={isInsufficient || !orderSize || isFetchingBalance} onClick={() => handleExecuteTrade('buy')} className="w-full py-3.5 bg-green-500/10 border border-green-500/20 text-green-500 rounded-xl font-bold text-sm hover:bg-green-500 hover:text-white disabled:opacity-30 flex justify-between items-center px-4">
            <span>Buy / Call</span>
            <span className="font-mono text-xs">{duration}s Timer</span>
          </button>
          <button disabled={isInsufficient || !orderSize || isFetchingBalance} onClick={() => handleExecuteTrade('sell')} className="w-full py-3.5 bg-red-500/10 border border-red-500/20 text-red-500 rounded-xl font-bold text-sm hover:bg-red-500 hover:text-white disabled:opacity-30 flex justify-between items-center px-4">
            <span>Sell / Put</span>
            <span className="font-mono text-xs">{duration}s Timer</span>
          </button>
        </div>
        
        {isInsufficient && (
          <p className="text-center text-xs text-red-400 mt-4 font-medium flex items-center justify-center gap-1.5 bg-red-500/10 py-2 rounded-lg border border-red-500/10">
            <ShieldAlert size={14} /> Insufficient Balance
          </p>
        )}

        {activeTrades.length > 0 && (
          <div className="mt-8 border-t border-white/5 pt-6">
            <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-4">Trade Monitor</h4>
            <div className="space-y-3">
              {activeTrades.slice(0, 3).map(trade => (
                <div key={trade.id} className="bg-[#0B0E14] p-3 rounded-xl border border-white/5 flex items-center justify-between">
                  <div className="flex flex-col">
                    <span className={`text-xs font-bold capitalize ${trade.side === 'buy' ? 'text-green-500' : 'text-red-500'}`}>{trade.side}</span>
                    <span className="text-[10px] text-gray-500 font-mono">${trade.size.toFixed(2)}</span>
                  </div>
                  <div className="text-right">
                    {trade.status === 'active' ? (
                      <span className="text-blue-400 font-mono text-xs font-bold animate-pulse">{trade.timeLeft}s left</span>
                    ) : trade.status === 'won' ? (
                      <span className="text-green-500 font-bold text-xs flex items-center gap-1"><CheckCircle2 size={12}/> Won +80%</span>
                    ) : (
                      <span className="text-red-500 font-bold text-xs flex items-center gap-1"><XCircle size={12}/> Lost</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
"use client";

import React, { useState, useEffect } from 'react';
import { PhoneCall, Play, Loader2, Zap, Activity, AlertTriangle, TrendingUp, TrendingDown, AlertCircle } from 'lucide-react';
import { getSignals } from '@/app/actions/signals';
import { openTrade } from '@/app/actions/trading';
import { usePricingEngine } from '@/app/hooks/usePricingEngine';
import { ModalType } from '@/app/components/ui/NotificationModal';

export interface TradingSignal {
  id: string;
  pair: string;
  type: 'LONG' | 'SHORT';
  status: 'ACTIVE' | 'CLOSED' | 'TARGET_HIT';
  entryPrice: number;
  targetPrice1: number;
  targetPrice2: number;
  stopLoss: number;
  timeframe: string;
  riskLevel: 'Low' | 'Medium' | 'High';
  notes: string;
  timestamp: string;
  leverage?: number;
}

export default function UserSignalsView({ balance, refreshWallet, showAlert }: { balance: number, refreshWallet: () => void, showAlert: (msg: string, type: ModalType, title?: string) => void }) {
  const { getLivePrice } = usePricingEngine();
  const [signals, setSignals] = useState<TradingSignal[]>([]);
  const [filter, setFilter] = useState<'ALL' | 'ACTIVE' | 'CLOSED'>('ALL');
  const [executingId, setExecutingId] = useState<string | null>(null);
  const [allocations, setAllocations] = useState<Record<string, string>>({});

  useEffect(() => {
    const fetchActiveSignals = async () => {
      const activeSignals = await getSignals();
      if (activeSignals) setSignals(activeSignals);
    };

    fetchActiveSignals();
    const interval = setInterval(fetchActiveSignals, 30000);
    return () => clearInterval(interval);
  }, []);

  const handleExecuteTrade = async (signal: TradingSignal) => {
    const adminEntry = parseFloat(signal.entryPrice as any);
    const livePrice = getLivePrice(signal.pair) || adminEntry;
    const requestedAmount = parseFloat(allocations[signal.id] ?? '100');
    
    if (isNaN(requestedAmount) || requestedAmount < 5) {
      return showAlert("The minimum allocation amount is $5.", "warning", "Invalid Amount");
    }
    if (livePrice === 0) {
      return showAlert("Awaiting live market data. Please try again in a few seconds.", "warning", "Fetching Data");
    }

    setExecutingId(signal.id);
    const leverage = signal.leverage || 10;
    const isLong = signal.type === 'LONG';
    const adminSl = parseFloat(signal.stopLoss as any);
    const adminTp1 = parseFloat(signal.targetPrice1 as any);

    if (isLong && livePrice <= adminSl) {
      setExecutingId(null);
      return showAlert(`Trade aborted: Live market price ($${livePrice.toFixed(2)}) has already dropped below the Admin's Stop Loss ($${adminSl}).`, "error", "Invalid Entry");
    }
    if (!isLong && livePrice >= adminSl) {
      setExecutingId(null);
      return showAlert(`Trade aborted: Live market price ($${livePrice.toFixed(2)}) is already above the Admin's Stop Loss ($${adminSl}).`, "error", "Invalid Entry");
    }

    if (isLong && livePrice >= adminTp1) {
      setExecutingId(null);
      return showAlert("Trade aborted: Target price has already been reached.", "error", "Missed Target");
    }
    if (!isLong && livePrice <= adminTp1) {
      setExecutingId(null);
      return showAlert("Trade aborted: Target price has already been reached.", "error", "Missed Target");
    }

    const liqDistancePct = 1 / leverage;
    const exactLiqPrice = isLong ? livePrice * (1 - liqDistancePct) : livePrice * (1 + liqDistancePct);
    let safeSl = adminSl;
    const buffer = liqDistancePct * 0.15; 
    const clampedSlPrice = isLong ? livePrice * (1 - (liqDistancePct - buffer)) : livePrice * (1 + (liqDistancePct - buffer));

    if (isLong && safeSl <= exactLiqPrice) safeSl = clampedSlPrice;
    else if (!isLong && safeSl >= exactLiqPrice) safeSl = clampedSlPrice;

    const volume = (requestedAmount * leverage) / livePrice;
    const fee = requestedAmount * 0.001; 
    const orderType = isLong ? 'BUY' : 'SELL';

    const payload = {
      symbol: signal.pair, type: orderType as 'BUY' | 'SELL', orderType: 'MARKET' as 'MARKET',
      marginMode: 'CROSS', leverage, volume: parseFloat(volume.toFixed(5)),
      openPrice: livePrice, tp: adminTp1, sl: parseFloat(safeSl.toFixed(5)), fee: parseFloat(fee.toFixed(2))
    };

    const res = await openTrade(payload);

    if (res.success) {
      showAlert(`Signal #${signal.id} successfully executed at $${livePrice.toFixed(2)}. Anti-liquidation protocols engaged.`, "success", "Trade Executed");
      setAllocations(prev => ({ ...prev, [signal.id]: '100' }));
      refreshWallet();
    } else {
      showAlert(res.error || "Execution failed in trading engine. Please try again.", "error");
    }
    setExecutingId(null);
  };

  const filteredSignals = signals.filter(s => {
    if (filter === 'ACTIVE') return s.status === 'ACTIVE' || s.status === 'TARGET_HIT';
    if (filter === 'CLOSED') return s.status === 'CLOSED';
    return true;
  });

  return (
    <div className="bg-[#151924] border border-white/5 rounded-3xl p-6 sm:p-8 shadow-xl mt-8 animate-in fade-in duration-300">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8 border-b border-white/5 pb-6">
        <div>
          <h2 className="text-2xl font-extrabold text-white mb-2 flex items-center gap-3">
            <PhoneCall className="text-blue-500" size={28} /> Premium Signals Desk
          </h2>
          <p className="text-gray-400 text-sm">Execute institutional market setups broadcasted directly by Citadel Analysts.</p>
        </div>

        <div className="flex items-center gap-2 bg-[#0B0E14] border border-white/10 p-1.5 rounded-2xl shrink-0">
          {(['ALL', 'ACTIVE', 'CLOSED'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setFilter(tab)}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                filter === tab ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20' : 'text-gray-400 hover:text-white'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-4">
        {filteredSignals.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 bg-[#0B0E14] border border-dashed border-white/10 rounded-2xl text-gray-500">
            <Zap size={48} className="text-gray-600 mb-4" />
            <h3 className="text-xl font-bold text-white mb-2">No Active Signals</h3>
            <p className="text-sm">There are currently no trading signals broadcasted by the admin.</p>
          </div>
        ) : (
          filteredSignals.map((signal) => {
            const isLong = signal.type === 'LONG';
            const isExecuting = executingId === signal.id;
            const lev = signal.leverage || 10;
            const adminEntry = parseFloat(signal.entryPrice as any);
            const target1 = parseFloat(signal.targetPrice1 as any);
            const sl = parseFloat(signal.stopLoss as any);
            const livePrice = getLivePrice(signal.pair) || adminEntry;
            
            const liqPrice = isLong ? adminEntry * (1 - 1 / lev) : adminEntry * (1 + 1 / lev);
            let projectedProfitPct = 0;
            let projectedLossPct = 0;
            if (adminEntry > 0) {
              projectedProfitPct = isLong ? ((target1 - adminEntry) / adminEntry) * 100 * lev : ((adminEntry - target1) / adminEntry) * 100 * lev;
              projectedLossPct = isLong ? ((adminEntry - sl) / adminEntry) * 100 * lev : ((sl - adminEntry) / adminEntry) * 100 * lev;
            }

            return (
              <div key={signal.id} className="bg-[#151924] border border-white/5 hover:border-blue-500/30 rounded-2xl p-5 shadow-lg flex flex-col md:flex-row gap-6 justify-between transition-colors">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-3">
                    <span className={`px-2 py-1 rounded text-[10px] font-extrabold font-mono uppercase ${isLong ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
                      {signal.type} {lev}x
                    </span>
                    <span className="text-lg font-extrabold text-white">{signal.pair}</span>
                    <span className="text-xs text-gray-500 font-mono">({signal.timeframe})</span>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-6 gap-3 mb-4 bg-[#0B0E14] p-3 rounded-xl border border-white/5 font-mono text-xs relative overflow-hidden">
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-green-500/5 to-red-500/5 opacity-50 pointer-events-none"></div>
                    <div className="relative z-10"><span className="text-gray-500 block text-[9px] uppercase mb-0.5">Admin Entry</span><span className="text-white">${adminEntry.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span></div>
                    <div className="relative z-10"><span className="text-blue-400 block text-[9px] uppercase mb-0.5 flex items-center gap-1"><Activity size={10}/> Live Price</span><span className="text-white font-bold">${livePrice.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span></div>
                    <div className="relative z-10"><span className="text-gray-500 block text-[9px] uppercase mb-0.5 flex items-center gap-1"><AlertTriangle size={10} className="text-orange-500"/> Liq. Price</span><span className="text-orange-400 font-bold">${liqPrice.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span></div>
                    <div className="relative z-10"><span className="text-gray-500 block text-[9px] uppercase mb-0.5">Target 1</span><span className="text-green-400">${target1.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span></div>
                    <div className="relative z-10"><span className="text-gray-500 block text-[9px] uppercase mb-0.5">Proj. Profit</span><span className="text-green-400 flex items-center gap-1"><TrendingUp size={12}/> +{projectedProfitPct.toFixed(2)}%</span></div>
                    <div className="relative z-10"><span className="text-gray-500 block text-[9px] uppercase mb-0.5">Admin SL</span><span className="text-red-400 flex items-center gap-1"><TrendingDown size={12}/> -{projectedLossPct.toFixed(2)}%</span></div>
                  </div>
                  
                  <div className="text-xs text-gray-400 flex items-start gap-2">
                    <AlertCircle size={14} className="text-blue-400 shrink-0 mt-0.5" />
                    <span><b>Analyst Note:</b> {signal.notes}</span>
                  </div>
                </div>

                <div className="flex flex-col justify-between items-end min-w-[160px] border-l border-white/5 pl-6">
                  <div className="text-right mb-4">
                    <div className="text-[10px] text-gray-500 uppercase font-bold mb-1">Status</div>
                    <span className={`inline-flex items-center px-2 py-1 rounded text-[10px] font-bold ${
                      signal.status === 'ACTIVE' ? 'bg-yellow-500/10 text-yellow-400 border border-yellow-500/20' :
                      signal.status === 'TARGET_HIT' ? 'bg-green-500/10 text-green-400 border border-green-500/20' :
                      'bg-gray-500/10 text-gray-400 border border-gray-500/20'
                    }`}>
                      {signal.status.replace('_', ' ')}
                    </span>
                  </div>

                  <div className="w-full space-y-2 mt-auto">
                    {signal.status === 'ACTIVE' && (
                      <div className="relative w-full">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-xs font-bold">$</span>
                        <input
                          type="number" min="5"
                          value={allocations[signal.id] !== undefined ? allocations[signal.id] : '100'}
                          onChange={(e) => setAllocations(prev => ({ ...prev, [signal.id]: e.target.value }))}
                          className="w-full bg-[#0B0E14] border border-white/10 rounded-xl py-2 pl-7 pr-3 text-white text-xs font-mono focus:outline-none focus:border-blue-500 transition-colors"
                          placeholder="Amount"
                        />
                      </div>
                    )}

                    <button
                      onClick={() => handleExecuteTrade(signal)}
                      disabled={isExecuting || signal.status === 'CLOSED'}
                      className="w-full py-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 shadow-lg shadow-blue-600/20"
                    >
                      {isExecuting ? <><Loader2 size={14} className="animate-spin" /> Executing...</> : 
                       signal.status === 'CLOSED' ? <>Closed</> : 
                       <><Play size={14} /> Execute Trade</>}
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
// PATH: app/admin/dashboard/components/CopyTradingMonitor.tsx

"use client";

import React, { useState, useMemo, useEffect } from 'react';
import { Copy, Search, Info, AlertTriangle, Users, Clock, Activity, Loader2, XSquare } from 'lucide-react';
import { AdminCopyTrade, AdminUser, fmtMoney, fmtDate } from '../page';
import { SIM_RATE_PER_CYCLE, getTradeStats, getVolumeAndMark } from '@/src/lib/copySim';

interface CopyTradingMonitorProps {
  copyTrades: AdminCopyTrade[];
  enrichedUsers: AdminUser[];
  dashboardTime?: number; // no longer used: the monitor runs its own 1s clock so it matches the user view
  copiesError: string | null;
  onSelectUser: (userId: string) => void;
  onCloseTrade?: (tradeId: number) => Promise<void>;
}

export default function CopyTradingMonitor({
  copyTrades,
  enrichedUsers,
  copiesError,
  onSelectUser,
  onCloseTrade
}: CopyTradingMonitorProps) {
  const [copySearch, setCopySearch] = useState('');
  const [closingId, setClosingId] = useState<number | null>(null);
  const [confirmCloseId, setConfirmCloseId] = useState<number | null>(null);

  // Same 1s clock the user's page uses
  const [now, setNow] = useState<number>(Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  const monitorRows = useMemo(() => {
    const q = copySearch.trim().toLowerCase();
    return copyTrades
      .map(t => {
        const owner = enrichedUsers.find(u => String(u.id) === t.userId);
        return { trade: t, owner };
      })
      .filter(({ trade, owner }) => {
        if (!q) return true;
        return (
          (owner?.email || trade.ownerEmail || '').toLowerCase().includes(q) ||
          (trade.ownerName || owner?.name || '').toLowerCase().includes(q) ||
          trade.traderName.toLowerCase().includes(q) ||
          trade.symbol.toLowerCase().includes(q) ||
          `#${trade.id}`.includes(q)
        );
      });
  }, [copyTrades, enrichedUsers, copySearch]);

  const copyStats = useMemo(() => {
    const usersCopying = new Set(copyTrades.map(t => t.userId)).size;
    const totalAllocated = copyTrades.reduce((s, t) => s + t.allocated, 0);
    const totalProfit = copyTrades.reduce((s, t) => s + getTradeStats(t.allocated, t.openedAt, now).profit, 0);
    const maxCycle = copyTrades.reduce((m, t) => Math.max(m, getTradeStats(t.allocated, t.openedAt, now).currentCycleNumber), 0);
    return { count: copyTrades.length, usersCopying, totalAllocated, totalProfit, maxCycle };
  }, [copyTrades, now]);

  const handleConfirmClose = async () => {
    if (!onCloseTrade || confirmCloseId === null) return;
    const tradeIdToClose = confirmCloseId;
    setConfirmCloseId(null);
    setClosingId(tradeIdToClose);
    try {
      await onCloseTrade(tradeIdToClose);
    } finally {
      setClosingId(null);
    }
  };

  return (
    <div className="bg-[#151924] border border-blue-500/30 rounded-3xl p-6 shadow-xl relative overflow-hidden mt-6">
      <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-500 to-emerald-500"></div>

      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-5">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-blue-500/20 rounded-lg text-blue-400">
            <Copy className="animate-pulse" size={20} />
          </div>
          <div>
            <h3 className="text-lg font-extrabold text-white">Live Copy Trading Monitor</h3>
            <p className="text-xs text-gray-400 font-medium">Mirrors exactly what each user sees: position, cycle, simulated mark and profit</p>
          </div>
        </div>

        <div className="relative w-full lg:w-80">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500" size={14} />
          <input
            type="text"
            value={copySearch}
            onChange={(e) => setCopySearch(e.target.value)}
            placeholder="Search user, trader, symbol or trade ID..."
            className="w-full bg-[#0B0E14] border border-white/10 rounded-xl py-2.5 pl-9 pr-4 text-xs text-white focus:outline-none focus:border-blue-500 transition-colors"
          />
        </div>
      </div>

      <div className="flex items-start gap-3 bg-amber-500/10 border border-amber-500/30 text-amber-300 rounded-2xl px-4 py-3 text-xs mb-5">
        <Info size={16} className="shrink-0 mt-0.5" />
        <span>
          <b>Simulated yield.</b> Profit is a simulation of {SIM_RATE_PER_CYCLE * 100}% per 24h cycle on the allocated amount, and keeps accruing every cycle until the trade is closed. This is the same figure the user sees and the amount credited when they close the trade.
        </span>
      </div>

      {copiesError && (
        <div className="flex items-start gap-3 bg-red-500/10 border border-red-500/30 text-red-300 rounded-2xl px-4 py-3 text-xs mb-5">
          <AlertTriangle size={16} className="shrink-0 mt-0.5" />
          <span><b>Could not load copy trades:</b> {copiesError}</span>
        </div>
      )}

      {/* SUMMARY */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 mb-5">
        <div className="bg-[#0B0E14] border border-white/5 rounded-2xl p-4">
          <div className="text-[10px] text-gray-500 font-bold uppercase tracking-wider mb-1">Active Copies</div>
          <div className="text-xl font-mono font-extrabold text-white">{copyStats.count}</div>
        </div>
        <div className="bg-[#0B0E14] border border-white/5 rounded-2xl p-4">
          <div className="text-[10px] text-gray-500 font-bold uppercase tracking-wider mb-1 flex items-center gap-1"><Users size={11} /> Users Copying</div>
          <div className="text-xl font-mono font-extrabold text-white">{copyStats.usersCopying}</div>
        </div>
        <div className="bg-[#0B0E14] border border-white/5 rounded-2xl p-4">
          <div className="text-[10px] text-gray-500 font-bold uppercase tracking-wider mb-1">Total Allocated</div>
          <div className="text-xl font-mono font-extrabold text-yellow-400">${fmtMoney(copyStats.totalAllocated)}</div>
        </div>
        <div className="bg-[#0B0E14] border border-white/5 rounded-2xl p-4">
          <div className="text-[10px] text-emerald-500/80 font-bold uppercase tracking-wider mb-1">Simulated Profit Owed</div>
          <div className="text-xl font-mono font-extrabold text-emerald-400">+${fmtMoney(copyStats.totalProfit)}</div>
        </div>
        <div className="bg-[#0B0E14] border border-white/5 rounded-2xl p-4 col-span-2 lg:col-span-1">
          <div className="text-[10px] text-gray-500 font-bold uppercase tracking-wider mb-1">Highest Cycle</div>
          <div className="text-xl font-mono font-extrabold text-blue-400">{copyStats.maxCycle}</div>
        </div>
      </div>

      {/* ALL COPY TRADES */}
      {monitorRows.length > 0 ? (
        <div className="overflow-x-auto bg-[#0B0E14] border border-white/5 rounded-2xl">
          <table className="w-full text-left font-mono text-xs whitespace-nowrap min-w-[1250px]">
            <thead>
              <tr className="border-b border-white/10 text-gray-500 uppercase text-[10px] bg-white/[0.02]">
                <th className="p-3.5">Trade</th>
                <th className="p-3.5">User</th>
                <th className="p-3.5">Master Trader</th>
                <th className="p-3.5">Position</th>
                <th className="p-3.5">Allocated</th>
                <th className="p-3.5">Volume</th>
                <th className="p-3.5">Entry</th>
                <th className="p-3.5">Sim. Mark</th>
                <th className="p-3.5">TP / SL</th>
                <th className="p-3.5">Opened</th>
                <th className="p-3.5">Cycle</th>
                <th className="p-3.5 text-right">Sim. Profit</th>
                <th className="p-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {monitorRows.map(({ trade, owner }) => {
                const stats = getTradeStats(trade.allocated, trade.openedAt, now);
                const { volume, mark } = getVolumeAndMark(
                  trade.allocated, trade.leverage, trade.entryPrice, trade.isLong, stats.profit
                );
                const ownerDisplayName = trade.ownerName || owner?.name || 'Unknown user';
                const ownerDisplayEmail = owner?.email || trade.ownerEmail || `user #${trade.userId}`;
                return (
                  <tr
                    key={trade.id}
                    onClick={() => owner && onSelectUser(String(owner.id))}
                    className="hover:bg-white/[0.03] transition-colors cursor-pointer"
                  >
                    <td className="p-3.5 text-gray-400">#{trade.id}</td>
                    <td className="p-3.5">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-lg bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-blue-400 font-bold text-[10px]">
                          {(ownerDisplayName !== 'Unknown user' ? ownerDisplayName : ownerDisplayEmail).charAt(0).toUpperCase()}
                        </div>
                        <div className="flex flex-col">
                          <span className="text-white font-bold truncate max-w-[150px]">{ownerDisplayName}</span>
                          <span className="text-[10px] text-gray-500 truncate max-w-[150px]">{ownerDisplayEmail}</span>
                        </div>
                      </div>
                    </td>
                    <td className="p-3.5">
                      <div className="flex items-center gap-2">
                        {trade.avatar && <img src={trade.avatar} alt="" className="w-6 h-6 rounded-md bg-[#151924] border border-white/10" />}
                        <span className="text-gray-200">{trade.traderName}</span>
                      </div>
                    </td>
                    <td className="p-3.5">
                      <div className="flex items-center gap-2">
                        <span className="font-extrabold text-white">{trade.symbol}</span>
                        <span className={`px-1.5 py-0.5 rounded text-[10px] font-extrabold ${trade.isLong ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
                          {trade.isLong ? 'LONG' : 'SHORT'} {trade.leverage}x
                        </span>
                      </div>
                    </td>
                    <td className="p-3.5 text-yellow-400 font-bold">${fmtMoney(trade.allocated)}</td>
                    <td className="p-3.5 text-gray-300">{volume.toFixed(4)}</td>
                    <td className="p-3.5 text-gray-300">${fmtMoney(trade.entryPrice)}</td>
                    <td className="p-3.5 text-white">${fmtMoney(mark)}</td>
                    <td className="p-3.5">
                      <span className="text-emerald-400">{trade.tp > 0 ? '$' + fmtMoney(trade.tp) : '—'}</span>
                      <span className="text-gray-600"> / </span>
                      <span className="text-rose-400">{trade.sl > 0 ? '$' + fmtMoney(trade.sl) : '—'}</span>
                    </td>
                    <td className="p-3.5 text-gray-400">{fmtDate(trade.openedAt)}</td>
                    <td className="p-3.5">
                      <div className="flex flex-col gap-1 min-w-[110px]">
                        <span className="text-blue-400 flex items-center gap-1">
                          <Clock size={11} /> Cycle {stats.currentCycleNumber} · {stats.formattedTimer}
                        </span>
                        <div className="w-full h-1 bg-white/5 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-gradient-to-r from-blue-500 to-emerald-400 transition-all duration-1000"
                            style={{ width: `${stats.progressPercent}%` }}
                          />
                        </div>
                      </div>
                    </td>
                    <td className="p-3.5 text-right font-bold text-emerald-400">+${fmtMoney(stats.profit)}</td>
                    <td className="p-3.5 text-right">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setConfirmCloseId(trade.id);
                        }}
                        disabled={closingId === trade.id}
                        className="flex items-center justify-center gap-1 ml-auto px-3 py-1.5 bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 rounded-lg text-[10px] font-bold transition-colors disabled:opacity-50"
                      >
                        {closingId === trade.id ? <Loader2 size={12} className="animate-spin" /> : <XSquare size={12} />}
                        Close
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="py-10 flex flex-col items-center justify-center text-center border border-dashed border-white/10 rounded-2xl bg-white/[0.02]">
          <Activity size={32} className="text-gray-600 mb-3" />
          <p className="text-white font-bold text-sm">{copySearch ? 'No copy trades match your search' : 'No Active Copy Trades'}</p>
          <p className="text-gray-500 text-xs mt-1">{copySearch ? 'Try a different user, trader or symbol.' : 'Users are not currently mirroring any Master Traders.'}</p>
        </div>
      )}
      <p className="text-[10px] text-gray-500 mt-3">Click anywhere on a row to open that user's full inspector.</p>

      {confirmCloseId !== null && (
        <div className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-[#151924] border border-yellow-500/20 rounded-3xl w-full max-w-md p-6 sm:p-8 shadow-2xl relative text-center">
            <div className="w-16 h-16 rounded-2xl bg-yellow-500/10 border border-yellow-500/20 flex items-center justify-center mx-auto mb-4">
              <AlertTriangle className="w-10 h-10 text-yellow-400" />
            </div>
            <h3 className="text-xl font-bold text-white mb-2">Force Close Trade</h3>
            <p className="text-sm text-gray-400 mb-6 leading-relaxed">
              Are you sure you want to forcefully close copy trade #{confirmCloseId}? Principal plus simulated profit will be credited immediately to the user's wallet.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setConfirmCloseId(null)}
                className="flex-1 py-3.5 rounded-xl text-sm font-bold bg-[#0B0E14] border border-white/10 text-gray-400 hover:text-white transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmClose}
                className="flex-1 py-3.5 rounded-xl text-sm font-bold bg-yellow-600 hover:bg-yellow-500 text-black shadow-lg shadow-yellow-600/20 transition-all"
              >
                Yes, Close Trade
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
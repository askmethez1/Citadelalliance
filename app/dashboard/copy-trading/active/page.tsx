// PATH: app/dashboard/copy-trading/active/page.tsx

"use client";

import React, { useState, useEffect, useMemo, useRef } from 'react';
import Link from 'next/link';
import Sidebar from '../../components/Sidebar';
import TopHeader from '../../components/TopHeader';
import DashboardSkeleton from '../../components/DashboardSkeleton';
import NotificationModal, { ModalType } from '@/app/components/ui/NotificationModal';
import { ChevronLeft, Activity, Square, TrendingUp, Loader2, Clock } from 'lucide-react';

import { getUserProfile } from '@/app/actions/profile';
import { getActiveCopies, closeActiveCopy } from '@/app/actions/copytrading';
import { useWalletEngine } from '@/app/hooks/useWalletEngine';

import { TRADERS } from '@/app/config/traders';
import { getTradeStats as computeStats } from '@/src/lib/copySim';

interface DBActiveCopy {
  id: number;
  user_id: number;
  trader_id: number;
  amount: string | number;
  created_at: string;
}

export default function ActiveCopyTradesPage() {
  const [sidebarTab, setSidebarTab] = useState('copy-trading');
  const [userCountry, setUserCountry] = useState('Nigeria');

  const walletEngine = useWalletEngine() as any;
  const walletEngineRef = useRef(walletEngine);
  walletEngineRef.current = walletEngine;

  const [copies, setCopies] = useState<DBActiveCopy[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const [currentTime, setCurrentTime] = useState<number>(Date.now());
  const [closingId, setClosingId] = useState<number | null>(null);

  const [modalConfig, setModalConfig] = useState<{ isOpen: boolean; title?: string; message: string; type: ModalType; }>({
    isOpen: false, message: '', type: 'info'
  });

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const initData = async () => {
      const [profile, copiesRes] = await Promise.all([
        getUserProfile(),
        getActiveCopies()
      ]);

      if (profile?.country) setUserCountry(profile.country);

      if (copiesRes?.success && copiesRes.data) {
        const newData = copiesRes.data as any[];

        setCopies(prev => {
          // Trigger a silent wallet refresh if a trade was closed remotely (e.g. by an admin)
          if (prev.length > 0 && newData.length < prev.length) {
            if (walletEngineRef.current?.refreshWallet) {
              walletEngineRef.current.refreshWallet();
            }
          }
          return newData;
        });
      }
      setIsLoading(false);
    };

    initData();
    const dataInterval = setInterval(initData, 10000);
    return () => clearInterval(dataInterval);
  }, []);

  const showAlert = (message: string, type: ModalType = 'info', title?: string) => {
    setModalConfig({ isOpen: true, message, type, title });
  };

  const mappedTrades = useMemo(() => {
    return copies.map(copy => {
      const trader = TRADERS.find(t => String(t.id) === String(copy.trader_id)) || TRADERS[0];
      const allocated = parseFloat(String(copy.amount)) || 1000;
      const timestamp = new Date(copy.created_at).getTime();

      return {
        id: copy.id,
        trader,
        allocated,
        timestamp
      };
    });
  }, [copies]);

  const getTradeStats = (allocatedAmount: number, startTimestamp: number) =>
    computeStats(allocatedAmount, startTimestamp, currentTime);

  const handleStopCopying = async (trade: any) => {
    if (closingId !== null) return;
    setClosingId(trade.id);

    try {
      const res = await closeActiveCopy(trade.id);

      if (res.success) {
        setCopies(prev => prev.filter(t => t.id !== trade.id));
        if (walletEngine.refreshWallet) walletEngine.refreshWallet();
        showAlert(
          `Copy trade for ${trade.trader.name} closed. Balance credited with $${trade.allocated.toFixed(2)} + $${(res.profit ?? 0).toFixed(2)} profit.`,
          'success',
          'Copy Trade Closed'
        );
      } else {
        showAlert(res.error || "Failed to close trade.", "error", "Close Failed");
      }
    } catch {
      showAlert("Unexpected error while closing the trade.", "error");
    } finally {
      setClosingId(null);
    }
  };

  const totalAllocated = useMemo(() => mappedTrades.reduce((sum, t) => sum + t.allocated, 0), [mappedTrades]);
  const totalProfit = useMemo(
    () => mappedTrades.reduce((sum, t) => sum + computeStats(t.allocated, t.timestamp, currentTime).profit, 0),
    [mappedTrades, currentTime]
  );

  if (isLoading) return <DashboardSkeleton activeTab={sidebarTab} location={userCountry} />;

  return (
    <div className="min-h-screen bg-[#0B0E14] text-gray-300 font-sans flex selection:bg-blue-500/30 w-full relative">
      <Sidebar activeTab={sidebarTab} setActiveTab={setSidebarTab} location={userCountry} />

      <main className="flex-1 flex flex-col min-h-screen relative min-w-0 overflow-x-hidden">
        <TopHeader />

        <div className="flex-1 p-4 sm:p-6 lg:p-8 w-full flex flex-col">
          <div className="max-w-7xl mx-auto space-y-8 w-full flex-1">

            {/* Header Section */}
            <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-6 border-b border-white/5 pb-6">
              <div className="flex items-center gap-4">
                <Link href="/dashboard/copy-trading" className="p-2 bg-[#151924] border border-white/10 rounded-xl hover:bg-white/5 transition-colors">
                  <ChevronLeft size={20} className="text-white" />
                </Link>
                <div>
                  <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight flex items-center gap-3">
                    <Activity className="text-blue-500" size={28} /> Active AI Trades
                  </h1>
                  <p className="text-gray-400 text-sm mt-1">Live overview of all automated positions mirroring your Master Traders.</p>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-3 xl:ml-auto">
                <div className="bg-emerald-900/20 border border-emerald-500/30 px-4 py-2.5 rounded-2xl flex items-center gap-3">
                  <div className="p-1.5 bg-emerald-500/20 rounded-lg text-emerald-400">
                    <TrendingUp size={18} />
                  </div>
                  <div className="flex flex-col">
                    <span className="text-emerald-400/80 text-[9px] font-bold uppercase tracking-wider">Accumulated Profit</span>
                    <span className="text-white font-mono font-bold text-lg">+${totalProfit.toFixed(2)}</span>
                  </div>
                </div>

                <div className="bg-blue-900/20 border border-blue-500/30 px-4 py-2.5 rounded-2xl flex items-center gap-3">
                  <div className="p-1.5 bg-blue-500/20 rounded-lg text-blue-400">
                    <Activity size={18} />
                  </div>
                  <div className="flex flex-col">
                    <span className="text-blue-400/80 text-[9px] font-bold uppercase tracking-wider">Total Allocated</span>
                    <span className="text-white font-mono font-bold text-lg">${totalAllocated.toFixed(2)}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Trades Grid */}
            {mappedTrades.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-32 bg-[#151924] border border-white/5 rounded-3xl">
                <Activity size={48} className="text-gray-600 mb-4" />
                <h2 className="text-xl font-bold text-white mb-2">No Active AI Trades</h2>
                <p className="text-gray-400 text-sm mb-6">You are not currently mirroring any traders.</p>
                <Link href="/dashboard/copy-trading" className="px-6 py-3 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl transition-colors">
                  Find a Master Trader
                </Link>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {mappedTrades.map((trade) => {
                  const { profit, progressPercent, formattedTimer } = getTradeStats(trade.allocated, trade.timestamp);

                  return (
                    <div key={trade.id} className="bg-[#151924] border border-blue-500/50 bg-blue-950/10 rounded-3xl p-6 shadow-xl relative flex flex-col justify-between space-y-4">
                      <div>
                        {/* Trader Header */}
                        <div className="flex items-center justify-between mb-4">
                          <div className="flex items-center gap-3">
                            <img src={trade.trader.avatar} alt={trade.trader.name} className="w-12 h-12 rounded-2xl bg-[#0B0E14] border border-white/10 p-1 object-cover" />
                            <div>
                              <h3 className="text-base font-bold text-white">{trade.trader.name}</h3>
                              <p className="text-[10px] text-gray-400 font-bold uppercase">{trade.trader.strategy}</p>
                              <p className="text-xs text-gray-500 font-mono mt-0.5">ID: {trade.id}</p>
                            </div>
                          </div>
                          <span className="font-mono font-bold text-[10px] px-2.5 py-1 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                            ACTIVE
                          </span>
                        </div>

                        {/* Timer */}
                        <div className="bg-[#0B0E14] border border-white/5 rounded-2xl p-3 mb-4 space-y-2">
                          <div className="flex items-center justify-between text-xs font-mono">
                            <span className="text-gray-400 flex items-center gap-1.5 text-[11px]">
                              <Clock size={14} className="text-blue-400" /> Timer
                            </span>
                            <span className="text-blue-400 font-bold">{formattedTimer}</span>
                          </div>
                          <div className="w-full h-2 bg-white/5 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-gradient-to-r from-blue-500 to-emerald-400 transition-all duration-1000"
                              style={{ width: `${progressPercent}%` }}
                            ></div>
                          </div>
                        </div>

                        {/* Profit & Allocation Card */}
                        <div className="bg-[#0B0E14] border border-white/5 rounded-2xl p-4 mb-4 space-y-3">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Accumulated Profit</span>
                            <span className="font-mono font-extrabold text-lg flex items-center gap-1 text-green-400">
                              <TrendingUp size={18} />
                              +${profit.toFixed(2)}
                            </span>
                          </div>

                          <div className="flex items-center justify-between border-t border-white/5 pt-3 text-xs font-mono">
                            <span className="text-gray-500">Allocated</span>
                            <span className="text-white font-bold">${trade.allocated.toFixed(2)}</span>
                          </div>
                        </div>
                      </div>

                      <button
                        onClick={() => handleStopCopying(trade)}
                        disabled={closingId !== null}
                        className="w-full py-3 bg-red-600/20 hover:bg-red-600 text-red-400 hover:text-white border border-red-500/30 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                      >
                        {closingId === trade.id ? (
                          <><Loader2 size={14} className="animate-spin" /> Closing Route...</>
                        ) : (
                          <><Square size={14} /> Stop Copying & Realize</>
                        )}
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </main>

      <NotificationModal
        isOpen={modalConfig.isOpen}
        onClose={() => setModalConfig(prev => ({ ...prev, isOpen: false }))}
        title={modalConfig.title}
        message={modalConfig.message}
        type={modalConfig.type}
      />
    </div>
  );
}

"use client";

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import Sidebar from '../components/Sidebar';
import TopHeader from '../components/TopHeader';
import DashboardSkeleton from '../components/DashboardSkeleton';
import NotificationModal, { ModalType } from '@/app/components/ui/NotificationModal';
import { 
  Zap, TrendingUp, TrendingDown, Clock, ShieldCheck, 
  Target, Play, Check, Filter, AlertCircle, ArrowUpRight, Loader2,
  Lock, ArrowRight // Added for the lock screen
} from 'lucide-react';

import { getUserProfile } from '@/app/actions/profile';
import { openTrade } from '@/app/actions/trading';
import { getSignals } from '@/app/actions/signals'; // Backend action to fetch admin signals
import { usePricingEngine } from '@/app/hooks/usePricingEngine';

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

export default function SignalsPage() {
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  const [sidebarTab, setSidebarTab] = useState('signals');
  const [userCountry, setUserCountry] = useState('Nigeria');
  
  const { getLivePrice } = usePricingEngine();
  
  const [signals, setSignals] = useState<TradingSignal[]>([]);
  const [filter, setFilter] = useState<'ALL' | 'ACTIVE' | 'CLOSED'>('ALL');
  const [executingId, setExecutingId] = useState<string | null>(null);
  
  // ACCESS STATE: Determines if the user has paid for the Pro plan (Monthly or Yearly)
  const [hasPaidAccess, setHasPaidAccess] = useState(false);
  
  // Track user allocations per signal
  const [allocations, setAllocations] = useState<Record<string, string>>({});

  // Notification Modal State
  const [modalConfig, setModalConfig] = useState<{
    isOpen: boolean;
    title?: string;
    message: string;
    type: ModalType;
  }>({
    isOpen: false,
    message: '',
    type: 'info'
  });

  useEffect(() => {
    const initData = async () => {
      try {
        const [profile, activeSignals] = await Promise.all([
          getUserProfile(),
          getSignals() // Fetch real signals pushed by admin
        ]);

        if (profile?.country) setUserCountry(profile.country);
        
        // STRICT PAYMENT CHECK: Check if the user has the isPro flag from the database
        if (profile?.isPro) {
          setHasPaidAccess(true);
        }

        if (activeSignals) setSignals(activeSignals);
      } catch (error) {
        console.error("Error loading signals:", error);
      } finally {
        setIsInitialLoad(false);
      }
    };

    initData();
    
    // Poll for new signals every 30 seconds
    const interval = setInterval(initData, 30000);
    return () => clearInterval(interval);
  }, []);

  const showAlert = (message: string, type: ModalType = 'info', title?: string) => {
    setModalConfig({ isOpen: true, message, type, title });
  };

  const handleExecuteTrade = async (signal: TradingSignal) => {
    const livePrice = getLivePrice(signal.pair) || signal.entryPrice;
    const requestedAmount = parseFloat(allocations[signal.id] ?? '100');
    
    if (isNaN(requestedAmount) || requestedAmount < 5) {
      return showAlert("The minimum allocation amount is $5.", "warning", "Invalid Amount");
    }
    if (livePrice === 0) {
      return showAlert("Awaiting live market data. Please try again in a few seconds.", "warning", "Fetching Data");
    }

    setExecutingId(signal.id);

    const leverage = signal.leverage || 10; // Default to 10x if admin didn't specify
    const volume = (requestedAmount * leverage) / livePrice;
    const fee = requestedAmount * 0.001; // 0.1% execution fee
    const orderType = signal.type === 'LONG' ? 'BUY' : 'SELL';

    const payload = {
      symbol: signal.pair,
      type: orderType as 'BUY' | 'SELL',
      orderType: 'MARKET' as 'MARKET',
      marginMode: 'CROSS',
      leverage: leverage,
      volume: parseFloat(volume.toFixed(5)),
      openPrice: livePrice,
      tp: signal.targetPrice1,
      sl: signal.stopLoss,
      fee: parseFloat(fee.toFixed(2))
    };

    const res = await openTrade(payload);

    if (res.success) {
      showAlert(
        `Signal #${signal.id} (${signal.pair} ${signal.type}) successfully placed at $${livePrice.toFixed(2)}. Position is now active in your terminal.`,
        "success",
        "Trade Executed"
      );
      // Reset input
      setAllocations(prev => ({ ...prev, [signal.id]: '100' }));
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

  // FULL SCREEN LOADER: Renders the DashboardSkeleton on initial load
  if (isInitialLoad) {
    return <DashboardSkeleton activeTab={sidebarTab} location={userCountry} />;
  }

  // =========================================================================
  // LOCK SCREEN: Displayed if the user has NOT paid for the Pro plan
  // =========================================================================
  if (!hasPaidAccess) {
    return (
      <div className="min-h-screen bg-[#0B0E14] text-gray-300 font-sans flex selection:bg-blue-500/30 w-full relative">
        <Sidebar activeTab={sidebarTab} setActiveTab={setSidebarTab} location={userCountry} />
        <main className="flex-1 flex flex-col min-h-screen relative min-w-0 overflow-x-hidden">
          <TopHeader />
          <div className="flex-1 p-4 sm:p-6 lg:p-8 w-full flex flex-col items-center justify-center">
            <div className="bg-[#151924] border border-white/5 rounded-3xl p-8 md:p-12 max-w-2xl w-full text-center shadow-2xl relative overflow-hidden">
              <div className="absolute -top-24 -right-24 w-48 h-48 bg-blue-500/10 rounded-full blur-3xl pointer-events-none"></div>
              <div className="absolute -bottom-24 -left-24 w-48 h-48 bg-purple-500/10 rounded-full blur-3xl pointer-events-none"></div>
              
              <div className="relative z-10">
                <div className="w-20 h-20 bg-blue-500/10 border border-blue-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
                  <Lock size={36} className="text-blue-500" />
                </div>
                <h2 className="text-3xl font-extrabold text-white mb-4">Pro Terminal Required</h2>
                <p className="text-gray-400 text-lg mb-8 leading-relaxed">
                  The Premium Signals Desk is an exclusive feature for Pro users. To unlock institutional market setups and direct broadcasts, you must upgrade your account.
                </p>
                <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                  <Link href="/dashboard/upgrade" className="px-8 py-4 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-bold transition-all shadow-lg shadow-blue-600/20 flex items-center gap-2">
                    Upgrade to Pro <ArrowRight size={18} />
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>
    );
  }

  // =========================================================================
  // NORMAL SIGNALS DESK: Displayed only if the user HAS paid
  // =========================================================================
  return (
    <div className="min-h-screen bg-[#0B0E14] text-gray-300 font-sans flex selection:bg-blue-500/30 w-full relative">
      <Sidebar activeTab={sidebarTab} setActiveTab={setSidebarTab} location={userCountry} />

      <main className="flex-1 flex flex-col min-h-screen relative min-w-0 overflow-x-hidden">
        <TopHeader />

        <div className="flex-1 p-4 sm:p-6 lg:p-8 w-full">
          <div className="max-w-6xl mx-auto space-y-8">

            {/* Page Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h1 className="text-3xl sm:text-4xl font-extrabold text-white mb-2 tracking-tight flex items-center gap-3">
                  <Zap className="text-yellow-400" size={32} /> Premium Signals Desk
                </h1>
                <p className="text-gray-400 text-sm">Execute institutional market setups broadcasted directly by Citadel Analysts.</p>
              </div>

              <div className="flex items-center gap-2 bg-[#151924] border border-white/10 p-1.5 rounded-2xl shrink-0">
                {(['ALL', 'ACTIVE', 'CLOSED'] as const).map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setFilter(tab)}
                    className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                      filter === tab 
                        ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20' 
                        : 'text-gray-400 hover:text-white'
                    }`}
                  >
                    {tab}
                  </button>
                ))}
              </div>
            </div>

            {/* Quick Metrics Bar */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="bg-[#151924] border border-white/5 rounded-2xl p-6 shadow-xl">
                <div className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Signal Accuracy</div>
                <div className="text-2xl font-mono font-bold text-green-400">91.2%</div>
                <div className="text-[11px] text-gray-400">Verified admin execution log</div>
              </div>

              <div className="bg-[#151924] border border-white/5 rounded-2xl p-6 shadow-xl">
                <div className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Avg Risk/Reward</div>
                <div className="text-2xl font-mono font-bold text-white">1 : 3.4</div>
                <div className="text-[11px] text-blue-400">Optimal position sizing</div>
              </div>

              <div className="bg-[#151924] border border-white/5 rounded-2xl p-6 shadow-xl">
                <div className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Active Setups</div>
                <div className="text-2xl font-mono font-bold text-yellow-400">
                  {signals.filter(s => s.status === 'ACTIVE').length} Broadcasts
                </div>
                <div className="text-[11px] text-gray-500">Live market signals</div>
              </div>
            </div>

            {/* SIGNALS LIST */}
            <div className="space-y-4">
              {filteredSignals.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 bg-[#151924] border border-dashed border-white/10 rounded-3xl text-gray-500">
                  <Zap size={48} className="text-gray-600 mb-4" />
                  <h2 className="text-xl font-bold text-white mb-2">No Active Signals</h2>
                  <p className="text-sm">There are currently no trading signals broadcasted by the admin.</p>
                </div>
              ) : (
                filteredSignals.map((signal) => {
                  const isLong = signal.type === 'LONG';
                  const isExecuting = executingId === signal.id;
                  const livePrice = getLivePrice(signal.pair) || signal.entryPrice;

                  return (
                    <div 
                      key={signal.id} 
                      className="bg-[#151924] border border-white/5 hover:border-blue-500/30 rounded-3xl p-6 shadow-xl space-y-6 transition-all"
                    >
                      {/* Signal Top Info */}
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/5 pb-4">
                        <div className="flex items-center gap-3">
                          <span className={`px-3 py-1.5 rounded-xl font-mono font-extrabold text-xs flex items-center gap-1 ${
                            isLong ? 'bg-green-500/20 text-green-400 border border-green-500/30' : 'bg-red-500/20 text-red-400 border border-red-500/30'
                          }`}>
                            {isLong ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
                            {signal.type} {signal.leverage ? `${signal.leverage}x` : ''}
                          </span>

                          <h3 className="text-xl font-extrabold text-white">{signal.pair}</h3>
                          <span className="text-xs font-mono text-gray-500">({signal.timeframe})</span>
                        </div>

                        <div className="flex items-center gap-3">
                          <span className={`text-[11px] font-bold px-2.5 py-1 rounded-md border ${
                            signal.status === 'ACTIVE' ? 'text-yellow-400 bg-yellow-500/10 border-yellow-500/20' :
                            signal.status === 'TARGET_HIT' ? 'text-green-400 bg-green-500/10 border-green-500/20' :
                            'text-gray-400 bg-gray-500/10 border-gray-500/20'
                          }`}>
                            {signal.status.replace('_', ' ')}
                          </span>
                          <span className="text-xs text-gray-500 font-mono flex items-center gap-1">
                            <Clock size={12} /> {signal.timestamp}
                          </span>
                        </div>
                      </div>

                      {/* Signal Grid Values */}
                      <div className="grid grid-cols-2 sm:grid-cols-5 gap-4 bg-[#0B0E14] border border-white/5 rounded-2xl p-4 font-mono text-xs">
                        <div>
                          <span className="text-gray-500 block text-[10px] uppercase font-bold mb-1">Signal Entry</span>
                          <span className="text-gray-300 font-bold">${signal.entryPrice.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                        </div>

                        <div>
                          <span className="text-gray-500 block text-[10px] uppercase font-bold mb-1">Live Price</span>
                          <span className="text-white font-bold">${livePrice.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                        </div>

                        <div>
                          <span className="text-gray-500 block text-[10px] uppercase font-bold mb-1">Target 1</span>
                          <span className="text-green-400 font-bold">${signal.targetPrice1.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                        </div>

                        <div>
                          <span className="text-gray-500 block text-[10px] uppercase font-bold mb-1">Target 2</span>
                          <span className="text-green-400 font-bold">${signal.targetPrice2.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                        </div>

                        <div>
                          <span className="text-gray-500 block text-[10px] uppercase font-bold mb-1">Stop Loss</span>
                          <span className="text-red-400 font-bold">${signal.stopLoss.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                        </div>
                      </div>

                      {/* Admin Notes & Actions */}
                      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pt-2">
                        <div className="text-xs text-gray-400 flex items-start gap-2 max-w-2xl">
                          <AlertCircle size={14} className="text-blue-400 shrink-0 mt-0.5" />
                          <span><b>Analyst Note:</b> {signal.notes}</span>
                        </div>

                        <div className="flex items-center gap-3 w-full sm:w-auto shrink-0">
                          {signal.status === 'ACTIVE' && (
                            <div className="relative w-28">
                              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-xs font-bold">$</span>
                              <input
                                type="number"
                                min="5"
                                value={allocations[signal.id] !== undefined ? allocations[signal.id] : '100'}
                                onChange={(e) => setAllocations(prev => ({ ...prev, [signal.id]: e.target.value }))}
                                className="w-full bg-[#0B0E14] border border-white/10 rounded-xl py-3 pl-7 pr-3 text-white text-xs font-mono focus:outline-none focus:border-blue-500 transition-colors"
                                placeholder="Amount"
                              />
                            </div>
                          )}

                          <button
                            onClick={() => handleExecuteTrade(signal)}
                            disabled={isExecuting || signal.status === 'CLOSED'}
                            className="w-full sm:w-auto px-6 py-3 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 shadow-lg shadow-blue-600/20"
                          >
                            {isExecuting ? (
                              <>
                                <Loader2 size={14} className="animate-spin" />
                                Executing...
                              </>
                            ) : signal.status === 'CLOSED' ? (
                              <>Closed</>
                            ) : (
                              <>
                                <Play size={14} /> Execute Trade
                              </>
                            )}
                          </button>
                        </div>
                      </div>

                    </div>
                  );
                })
              )}
            </div>

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
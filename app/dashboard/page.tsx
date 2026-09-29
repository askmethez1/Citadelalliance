"use client";

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { 
  Crown, TrendingUp, TrendingDown, ArrowUpRight, ArrowDownLeft, 
  Ban, Wallet, PhoneCall, CreditCard, History, MessageSquare, 
  ShieldAlert, Settings, Users, Clock, Play, AlertCircle, Loader2, AlertTriangle, Zap, Activity
} from 'lucide-react';
import Link from 'next/link';
import Sidebar from './components/Sidebar';
import TopHeader from './components/TopHeader';
import TradingTerminal from './components/TradingTerminal';
import RecentTrades from './components/RecentTrades';
import RecentActivity from './components/RecentActivity';
import DashboardSkeleton from './components/DashboardSkeleton';
import NotificationModal, { ModalType } from '@/app/components/ui/NotificationModal';

import { getUserRole, checkBanStatus, logoutUser } from '@/app/actions/auth';
import { useWalletEngine } from '@/app/hooks/useWalletEngine';
import { getSignals } from '@/app/actions/signals';
import { openTrade } from '@/app/actions/trading';
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

// ------------------------------------------------------------------
// ISOLATED USER SIGNALS COMPONENT (WITH POLISHED ADMIN UI)
// ------------------------------------------------------------------
function UserSignalsView({ balance, refreshWallet, showAlert }: { balance: number, refreshWallet: () => void, showAlert: (msg: string, type: ModalType, title?: string) => void }) {
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

    // 1. Prevent execution if price has already crossed Stop Loss (Dead trade)
    if (isLong && livePrice <= adminSl) {
      setExecutingId(null);
      return showAlert(`Trade aborted: Live market price ($${livePrice.toFixed(2)}) has already dropped below the Admin's Stop Loss ($${adminSl}).`, "error", "Invalid Entry");
    }
    if (!isLong && livePrice >= adminSl) {
      setExecutingId(null);
      return showAlert(`Trade aborted: Live market price ($${livePrice.toFixed(2)}) is already above the Admin's Stop Loss ($${adminSl}).`, "error", "Invalid Entry");
    }

    // 2. Prevent execution if price has already hit Target
    if (isLong && livePrice >= adminTp1) {
      setExecutingId(null);
      return showAlert("Trade aborted: Target price has already been reached.", "error", "Missed Target");
    }
    if (!isLong && livePrice <= adminTp1) {
      setExecutingId(null);
      return showAlert("Trade aborted: Target price has already been reached.", "error", "Missed Target");
    }

    // 3. --- ANTI-LIQUIDATION ENGINE ---
    const liqDistancePct = 1 / leverage;
    const exactLiqPrice = isLong ? livePrice * (1 - liqDistancePct) : livePrice * (1 + liqDistancePct);

    let safeSl = adminSl;
    const buffer = liqDistancePct * 0.15; // 15% of the liquidation distance as safety buffer
    const clampedSlPrice = isLong ? livePrice * (1 - (liqDistancePct - buffer)) : livePrice * (1 + (liqDistancePct - buffer));

    // Clamp the Stop Loss if the Admin's SL crosses the user's specific Liquidation threshold
    if (isLong && safeSl <= exactLiqPrice) {
      safeSl = clampedSlPrice;
    } else if (!isLong && safeSl >= exactLiqPrice) {
      safeSl = clampedSlPrice;
    }

    const volume = (requestedAmount * leverage) / livePrice;
    const fee = requestedAmount * 0.001; 
    const orderType = isLong ? 'BUY' : 'SELL';

    const payload = {
      symbol: signal.pair,
      type: orderType as 'BUY' | 'SELL',
      orderType: 'MARKET' as 'MARKET',
      marginMode: 'CROSS',
      leverage: leverage,
      volume: parseFloat(volume.toFixed(5)),
      openPrice: livePrice,
      tp: adminTp1,
      sl: parseFloat(safeSl.toFixed(5)), // Safe clamped SL
      fee: parseFloat(fee.toFixed(2))
    };

    const res = await openTrade(payload);

    if (res.success) {
      showAlert(
        `Signal #${signal.id} successfully executed at $${livePrice.toFixed(2)}. Anti-liquidation protocols engaged.`,
        "success",
        "Trade Executed"
      );
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
            
            // Calculate Liquidation Limit based on Admin Entry
            const liqPrice = isLong ? adminEntry * (1 - 1 / lev) : adminEntry * (1 + 1 / lev);

            // Calculate Projections
            let projectedProfitPct = 0;
            let projectedLossPct = 0;
            if (adminEntry > 0) {
              projectedProfitPct = isLong ? ((target1 - adminEntry) / adminEntry) * 100 * lev : ((adminEntry - target1) / adminEntry) * 100 * lev;
              projectedLossPct = isLong ? ((adminEntry - sl) / adminEntry) * 100 * lev : ((sl - adminEntry) / adminEntry) * 100 * lev;
            }

            return (
              <div 
                key={signal.id} 
                className="bg-[#151924] border border-white/5 hover:border-blue-500/30 rounded-2xl p-5 shadow-lg flex flex-col md:flex-row gap-6 justify-between transition-colors"
              >
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-3">
                    <span className={`px-2 py-1 rounded text-[10px] font-extrabold font-mono uppercase ${
                      isLong ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'
                    }`}>
                      {signal.type} {lev}x
                    </span>
                    <span className="text-lg font-extrabold text-white">{signal.pair}</span>
                    <span className="text-xs text-gray-500 font-mono">({signal.timeframe})</span>
                  </div>

                  {/* IDENTICAL ADMIN GRID UI */}
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

                {/* ALIGNED EXECUTION DESK */}
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
                          type="number"
                          min="5"
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
                      {isExecuting ? (
                        <><Loader2 size={14} className="animate-spin" /> Executing...</>
                      ) : signal.status === 'CLOSED' ? (
                        <>Closed</>
                      ) : (
                        <><Play size={14} /> Execute Trade</>
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
  );
}

// ------------------------------------------------------------------
// MAIN DASHBOARD PAGE
// ------------------------------------------------------------------
export default function DashboardPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState('terminal');
  const [location, setLocation] = useState('Detecting...');
  const [isInitializing, setIsInitializing] = useState(true);
  const [isBanned, setIsBanned] = useState(false);

  // Modal Notification State
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

  const showAlert = (message: string, type: ModalType = 'info', title?: string) => {
    setModalConfig({ isOpen: true, message, type, title });
  };

  const { balance, liveEquity, floatingPnL, marginUtilized, activeCopiers, isWalletLoading, refreshWallet } = useWalletEngine();

  useEffect(() => {
    const fetchInitialAuth = async () => {
      try {
        const banned = await checkBanStatus();
        if (banned) {
          setIsBanned(true);
          setIsInitializing(false);
          return;
        }

        const role = await getUserRole();
        if (role === 'admin') {
          router.replace('/admin/dashboard');
          return;
        }

        fetch('https://ipapi.co/json/')
          .then(res => res.ok ? res.json() : null)
          .then(data => {
            if (data) setLocation(`${data.city}, ${data.country_name}`);
          })
          .catch(() => setLocation('Location Unavailable'));

      } finally {
        setIsInitializing(false);
      }
    };

    fetchInitialAuth();
  }, [router]);

  const handleLogout = async () => {
    await logoutUser();
    router.push('/');
  };

  if (isInitializing || isWalletLoading) {
    return <DashboardSkeleton activeTab={activeTab} location={location} />;
  }

  if (isBanned) {
    return (
      <div className="min-h-screen bg-[#0B0E14] text-gray-300 font-sans flex selection:bg-red-500/30">
        <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} location={location} isBanned={true} />
        <main className="flex-1 flex flex-col items-center justify-center p-4 relative overflow-hidden">
          <div className="bg-[#151924] border border-red-500/20 rounded-3xl p-8 max-w-md w-full text-center shadow-2xl relative z-10">
            <div className="w-20 h-20 bg-red-500/10 border border-red-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
              <Ban size={36} className="text-red-500" />
            </div>
            <h1 className="text-2xl font-extrabold text-white mb-3">Account Suspended</h1>
            <p className="text-gray-400 text-sm mb-8 leading-relaxed">Your system access has been revoked. Contact compliance.</p>
            <button onClick={handleLogout} className="w-full py-3.5 bg-red-600 hover:bg-red-500 text-white rounded-xl text-sm font-bold">Log Out</button>
          </div>
        </main>
      </div>
    );
  }

  const pnlColor = floatingPnL > 0 ? 'text-green-500' : floatingPnL < 0 ? 'text-red-500' : 'text-gray-400';
  const pnlSign = floatingPnL > 0 ? '+' : '';

  return (
    <div className="min-h-screen bg-[#0B0E14] text-gray-300 font-sans flex selection:bg-blue-500/30">
      <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} location={location} />

      <main className="flex-1 flex flex-col min-h-screen relative min-w-0 overflow-x-hidden">
        <TopHeader />

        <div className="flex-1 p-4 sm:p-6 lg:p-8 w-full">
          <div className="max-w-7xl mx-auto space-y-6">

            {activeTab === 'terminal' && (
              <>
                <div className="w-full rounded-2xl bg-gradient-to-r from-blue-900/40 via-blue-800/20 to-[#0B0E14] border border-blue-500/30 p-6 flex flex-col md:flex-row items-center justify-between gap-6 relative overflow-hidden shadow-[0_0_30px_rgba(41,98,255,0.1)]">
                  <div className="absolute -right-20 -top-20 w-64 h-64 bg-blue-500/20 rounded-full blur-3xl pointer-events-none"></div>
                  <div className="flex items-center gap-5 relative z-10">
                    <div className="w-14 h-14 rounded-2xl bg-blue-600 flex items-center justify-center text-white shrink-0 shadow-xl shadow-blue-600/30 border border-blue-400/50">
                      <Crown size={28} />
                    </div>
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="text-xl font-extrabold text-white">Upgrade to Pro Terminal</h3>
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-yellow-500/20 text-yellow-500 uppercase tracking-wider">Recommended</span>
                      </div>
                      <p className="text-sm text-gray-400 max-w-xl">Unlock sub-12ms execution latency, unlimited algorithmic trading orders, and direct consultation calls with Top-Tier Master Traders.</p>
                    </div>
                  </div>
                  <Link href="/plans" className="shrink-0 px-8 py-3.5 bg-white text-black hover:bg-gray-200 rounded-full text-sm font-bold transition-all flex items-center gap-2 relative z-10 shadow-lg">
                    View Pricing Plans <ArrowUpRight size={18} className="text-gray-600" />
                  </Link>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="bg-[#151924] border border-white/5 rounded-2xl p-5 shadow-lg relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-24 h-24 bg-blue-500/5 rounded-full blur-2xl"></div>
                    <div className="flex items-center justify-between text-gray-500 text-xs font-medium mb-2 uppercase tracking-wider">
                      <span>Total Balance</span>
                      <button onClick={() => setActiveTab('wallet')} className="text-blue-400 hover:underline flex items-center gap-1 text-[10px]">
                        <ArrowDownLeft size={12} /> Deposit
                      </button>
                    </div>
                    <div className="text-2xl font-mono font-bold text-white mb-2">
                      ${balance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </div>
                    <div className="text-xs text-gray-500 flex items-center gap-1">
                      Unrealized PnL: <span className={`font-mono font-bold ${pnlColor}`}>{pnlSign}{floatingPnL.toFixed(2)} USDT</span>
                    </div>
                  </div>

                  <div className="bg-[#151924] border border-white/5 rounded-2xl p-5 shadow-lg">
                    <div className="text-gray-500 text-xs font-medium mb-2 uppercase tracking-wider">Equity</div>
                    <div className={`text-2xl font-mono font-bold mb-2 ${floatingPnL >= 0 ? 'text-white' : 'text-gray-300'}`}>
                      ${liveEquity.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </div>
                    <div className="text-xs flex items-center gap-1 text-gray-500"><TrendingUp size={12} className="text-green-500" /> Live Sync Active</div>
                  </div>

                  <div className="bg-[#151924] border border-white/5 rounded-2xl p-5 shadow-lg">
                    <div className="text-gray-500 text-xs font-medium mb-2 uppercase tracking-wider">Active Copiers</div>
                    <div className="text-2xl font-mono font-bold text-white mb-2">{activeCopiers}</div>
                    <Link href="/dashboard/copy-trading" className="text-xs text-blue-400 hover:underline cursor-pointer">Find Masters to copy</Link>
                  </div>

                  <div className="bg-[#151924] border border-white/5 rounded-2xl p-5 shadow-lg flex flex-col justify-between">
                    <div>
                      <div className="text-gray-500 text-xs font-medium mb-2 uppercase tracking-wider">Margin Utilization</div>
                      <div className={`text-2xl font-mono font-bold mb-2 ${marginUtilized > 80 ? 'text-red-500' : 'text-white'}`}>
                        {marginUtilized.toFixed(1)}%
                      </div>
                    </div>
                    <div className="w-full h-1.5 bg-white/5 rounded-full mt-2 overflow-hidden">
                      <div 
                        className={`h-full rounded-full transition-all ${marginUtilized > 80 ? 'bg-red-500' : 'bg-blue-500'}`}
                        style={{ width: `${Math.min(marginUtilized, 100)}%` }}
                      ></div>
                    </div>
                  </div>
                </div>

                <TradingTerminal />
                <RecentTrades />
                <RecentActivity location={location} />
              </>
            )}

            {activeTab === 'wallet' && (
              <div className="bg-[#151924] border border-dashed border-white/10 rounded-3xl p-12 text-center shadow-lg mt-8">
                <div className="w-20 h-20 bg-blue-500/10 rounded-full flex items-center justify-center mx-auto mb-4">
                  <ArrowDownLeft size={36} className="text-blue-500" />
                </div>
                <h2 className="text-2xl font-extrabold text-white mb-2">Wallet & Deposits</h2>
                <p className="text-gray-500">Fund your account and manage withdrawals here.</p>
              </div>
            )}

            {activeTab === 'copy' && (
              <div className="bg-[#151924] border border-dashed border-white/10 rounded-3xl p-12 text-center shadow-lg mt-8">
                <div className="w-20 h-20 bg-yellow-500/10 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Crown size={36} className="text-yellow-500" />
                </div>
                <h2 className="text-2xl font-extrabold text-white mb-2">Copy Trading Masters</h2>
                <p className="text-gray-500">Browse top-performing quantitative traders and mirror their execution algorithms.</p>
              </div>
            )}

            {activeTab === 'signals' && (
              <UserSignalsView balance={balance} refreshWallet={refreshWallet} showAlert={showAlert} />
            )}

            {activeTab === 'buy-crypto' && (
              <div className="bg-[#151924] border border-dashed border-white/10 rounded-3xl p-12 text-center shadow-lg mt-8">
                <div className="w-20 h-20 bg-purple-500/10 rounded-full flex items-center justify-center mx-auto mb-4">
                  <CreditCard size={36} className="text-purple-500" />
                </div>
                <h2 className="text-2xl font-extrabold text-white mb-2">Buy Crypto</h2>
                <p className="text-gray-500">Purchase digital assets instantly via credit card or bank transfer.</p>
              </div>
            )}

            {activeTab === 'statement' && (
              <div className="bg-[#151924] border border-dashed border-white/10 rounded-3xl p-12 text-center shadow-lg mt-8">
                <div className="w-20 h-20 bg-blue-400/10 rounded-full flex items-center justify-center mx-auto mb-4">
                  <History size={36} className="text-blue-400" />
                </div>
                <h2 className="text-2xl font-extrabold text-white mb-2">Account Statement</h2>
                <p className="text-gray-500">Detailed historical ledger of all your trades, deposits, and fees.</p>
              </div>
            )}

            {activeTab === 'chat' && (
              <div className="bg-[#151924] border border-dashed border-white/10 rounded-3xl p-12 text-center shadow-lg mt-8">
                <div className="w-20 h-20 bg-gray-500/10 rounded-full flex items-center justify-center mx-auto mb-4">
                  <MessageSquare size={36} className="text-gray-400" />
                </div>
                <h2 className="text-2xl font-extrabold text-white mb-2">Trader Chat</h2>
                <p className="text-gray-500">Connect with customer support or your designated account manager.</p>
              </div>
            )}

            {['security', 'profile'].includes(activeTab) && (
              <div className="bg-[#151924] border border-dashed border-white/10 rounded-3xl p-12 text-center shadow-lg mt-8">
                <div className="w-20 h-20 bg-gray-400/10 rounded-full flex items-center justify-center mx-auto mb-4">
                  {activeTab === 'security' ? <ShieldAlert size={36} className="text-gray-300" /> : <Settings size={36} className="text-gray-300" />}
                </div>
                <h2 className="text-2xl font-extrabold text-white mb-2 capitalize">{activeTab} Settings</h2>
                <p className="text-gray-500">Manage your credentials, 2FA, and personal details.</p>
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
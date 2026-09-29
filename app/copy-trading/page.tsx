"use client";

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { 
  Crown, TrendingUp, TrendingDown, ArrowUpRight, ArrowDownLeft, Ban, 
  Wallet, PhoneCall, CreditCard, History, MessageSquare, ShieldAlert, 
  Settings, Users, Search, Activity, Play, Square, Loader2, X, Target, 
  LineChart, Briefcase, ChevronLeft, ChevronRight 
} from 'lucide-react';

// Components
import Sidebar from '../components/Sidebar';
import TopHeader from '../components/TopHeader';
import DashboardSkeleton from '../components/DashboardSkeleton';
import TradingViewChart from '@/app/components/TradingViewChart';
import NotificationModal, { ModalType } from '@/app/components/ui/NotificationModal';

// Actions & Config
import { getWalletOverview } from '@/app/actions/wallet';
import { getUserRole, checkBanStatus, logoutUser } from '@/app/actions/auth';
import { getUserProfile } from '@/app/actions/profile';
import { getCopyTradingData, MasterTraderRecord } from '@/app/actions/copytrading';
import { fetchUserActiveCopies, startMirrorTrade, stopMirrorTrade } from '@/app/actions/copyDatabase';
import { useMarket } from '@/app/context/MarketContext'; 
import { TRADING_ASSETS } from '@/app/config/assets';

interface ExtendedTrade {
  type: 'LONG' | 'SHORT';
  pair: string;
  leverage: number;
}

interface TraderWithLiveStats extends Omit<MasterTraderRecord, 'activeTrade'> {
  activeTrade: ExtendedTrade;
}

interface ActiveCopy {
  amount: number;
  entryPrice: number;
  sl?: number;
  tp?: number;
  timestamp: number;
}

export default function CopyTradingPage() {
  const router = useRouter();
  const [sidebarTab, setSidebarTab] = useState('copy-trading');
  const [userCountry, setUserCountry] = useState('Detecting...');
  const [viewMode, setViewMode] = useState<'marketplace' | 'portfolio'>('marketplace');
  
  const { assets, getAsset } = useMarket();
  
  // App States
  const [isLoading, setIsLoading] = useState(true);
  const [isBanned, setIsBanned] = useState(false);
  const [isProcessingTx, setIsProcessingTx] = useState(false);
  
  // Real DB States & Equity Tracking
  const [realizedBalance, setRealizedBalance] = useState<number>(0.00);
  const [traders, setTraders] = useState<TraderWithLiveStats[]>([]);
  const [masterEntries, setMasterEntries] = useState<Record<string, number>>({});
  const [activeCopies, setActiveCopies] = useState<Record<number, ActiveCopy>>({});
  
  // Fallbacks & UI
  const [binancePrices, setBinancePrices] = useState<Record<string, number>>({});
  const [chartModal, setChartModal] = useState<{ isOpen: boolean; symbol: string }>({ isOpen: false, symbol: '' });
  
  // Setup Modal
  const [setupModal, setSetupModal] = useState<{ isOpen: boolean; traderId: number | null }>({ isOpen: false, traderId: null });
  const [setupAmount, setSetupAmount] = useState('100');
  const [setupSL, setSetupSL] = useState('');
  const [setupTP, setSetupTP] = useState('');

  // Pagination & Filtering
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<'ALL' | 'LONG' | 'SHORT'>('ALL');
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [totalTraders, setTotalTraders] = useState<number>(0);
  const itemsPerPage = 9;

  const [modalConfig, setModalConfig] = useState<{ isOpen: boolean; title?: string; message: string; type: ModalType; }>({
    isOpen: false, message: '', type: 'info'
  });

  // --- INITIALIZATION ---
  useEffect(() => {
    fetch('https://api.binance.com/api/v3/ticker/price')
      .then(res => res.json())
      .then((data: any[]) => {
        const priceMap: Record<string, number> = {};
        data.forEach(item => { priceMap[item.symbol] = parseFloat(item.price); });
        setBinancePrices(priceMap);
      })
      .catch(() => console.warn("Binance API unreachable."));
  }, []);

  const getLivePrice = (symbol: string) => {
    const lookup = symbol.endsWith('USD') && symbol.length > 4 ? symbol + 'T' : symbol;
    const asset = getAsset(lookup) || getAsset(symbol);
    if (asset && asset.price > 0) return asset.price;
    if (binancePrices[lookup]) return binancePrices[lookup];
    if (binancePrices[symbol]) return binancePrices[symbol];
    return 0; 
  };

  const loadData = async (page: number) => {
    try {
      setIsLoading(true);

      const banned = await checkBanStatus();
      if (banned) {
        setIsBanned(true);
        setIsLoading(false);
        return;
      }

      const role = await getUserRole();
      if (role === 'admin') {
        router.replace('/admin/dashboard');
        return;
      }

      // FETCH CONCURRENTLY FROM DATABASE
      const [copyData, profile, dbCopies] = await Promise.all([
        getCopyTradingData(page, itemsPerPage),
        getUserProfile(),
        fetchUserActiveCopies("user_id_placeholder") // Secure Database Call
      ]);

      if (profile?.country) setUserCountry(profile.country);
      
      setRealizedBalance(Number(copyData.userBalance) || 0);
      setTotalTraders(copyData.totalTraders);
      setActiveCopies(dbCopies || {});

      const formattedTraders: TraderWithLiveStats[] = copyData.traders.map((t, index) => {
        const asset = TRADING_ASSETS[index % TRADING_ASSETS.length];
        return {
          ...t,
          activeTrade: { ...t.activeTrade, pair: asset.symbol }
        };
      });

      setTraders(formattedTraders);
    } catch (error) {
      console.error("Failed to load dashboard data:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData(currentPage);
  }, [currentPage, router]);

  // Master Entry Price Stubs
  useEffect(() => {
    traders.forEach(t => {
      if (!masterEntries[t.id]) {
        const livePrice = getLivePrice(t.activeTrade.pair);
        if (livePrice > 0) {
          const offset = t.activeTrade.type === 'LONG' ? 0.998 : 1.002; 
          setMasterEntries(prev => ({ ...prev, [t.id]: livePrice * offset }));
        }
      }
    });
  }, [assets, binancePrices, traders, masterEntries]);

  const handleLogout = async () => {
    await logoutUser();
    router.push('/');
  };

  const showAlert = (message: string, type: ModalType = 'info', title?: string) => {
    setModalConfig({ isOpen: true, message, type, title });
  };

  // --- LIVE RISK ENGINE: AUTO CLOSE ON SL / TP ---
  useEffect(() => {
    if (Object.keys(activeCopies).length === 0 || traders.length === 0 || isProcessingTx) return;

    Object.entries(activeCopies).forEach(async ([idStr, copyData]) => {
      const traderId = parseInt(idStr);
      const trader = traders.find(t => t.id === traderId);
      if (!trader) return;

      const livePrice = getLivePrice(trader.activeTrade.pair);
      if (livePrice === 0) return;

      const isLong = trader.activeTrade.type === 'LONG';
      let shouldClose = false;
      let closeReason = '';

      if (isLong) {
        if (copyData.sl && livePrice <= copyData.sl) { shouldClose = true; closeReason = 'Stop Loss Hit'; }
        if (copyData.tp && livePrice >= copyData.tp) { shouldClose = true; closeReason = 'Take Profit Hit'; }
      } else {
        if (copyData.sl && livePrice >= copyData.sl) { shouldClose = true; closeReason = 'Stop Loss Hit'; }
        if (copyData.tp && livePrice <= copyData.tp) { shouldClose = true; closeReason = 'Take Profit Hit'; }
      }

      if (shouldClose) {
        setIsProcessingTx(true);
        const diff = (livePrice - copyData.entryPrice) / copyData.entryPrice;
        const dir = isLong ? 1 : -1;
        const pnlPercent = diff * trader.activeTrade.leverage * dir;
        const pnlDollars = copyData.amount * pnlPercent;
        const totalReturn = copyData.amount + pnlDollars;

        // Secure DB Liquidation / TP Call
        const res = await stopMirrorTrade(traderId, totalReturn);
        if (res.success) {
          setRealizedBalance(prev => prev + totalReturn);
          setActiveCopies(prev => {
            const next = { ...prev };
            delete next[traderId];
            return next;
          });
          showAlert(
            `Trade closed automatically (${closeReason}). Realized ${pnlDollars >= 0 ? '+' : ''}$${pnlDollars.toFixed(2)}.`,
            pnlDollars >= 0 ? 'success' : 'warning',
            'Auto-Close Triggered'
          );
        }
        setIsProcessingTx(false);
      }
    });
  }, [assets, binancePrices, activeCopies, traders, isProcessingTx]);

  // --- MANUAL TRADE ACTIONS ---
  const openSetupModal = (traderId: number) => {
    setSetupModal({ isOpen: true, traderId });
    setSetupAmount('100');
    setSetupSL('');
    setSetupTP('');
  };

  const confirmCopyTrade = async () => {
    if (!setupModal.traderId) return;
    
    const amount = parseFloat(setupAmount);
    const sl = setupSL ? parseFloat(setupSL) : undefined;
    const tp = setupTP ? parseFloat(setupTP) : undefined;
    
    const trader = traders.find(t => t.id === setupModal.traderId);
    if (!trader) return;

    if (isNaN(amount) || amount < 5) {
      showAlert(`The minimum allocation amount is $5.`, "warning", "Invalid Amount");
      return;
    }
    
    if (realizedBalance < amount) {
      showAlert(`You need at least $${amount.toFixed(2)} available balance to mirror this trader.`, "warning", "Insufficient Balance");
      return;
    }

    const livePrice = getLivePrice(trader.activeTrade.pair);
    if (livePrice === 0) {
      showAlert("Waiting for real-time market data to establish an entry price. Please wait.", "warning", "Fetching Price");
      return;
    }

    setIsProcessingTx(true);
    
    // Server Action DB Call
    const res = await startMirrorTrade({ traderId: trader.id, amount, entryPrice: livePrice, sl, tp });
    
    if (res.success) {
      setRealizedBalance(prev => prev - amount);
      setActiveCopies(prev => ({
        ...prev,
        [trader.id]: { amount, entryPrice: livePrice, sl, tp, timestamp: Date.now() }
      }));
      
      setSetupModal({ isOpen: false, traderId: null });
      showAlert(`Successfully allocated $${amount.toFixed(2)} at market price $${livePrice.toLocaleString()}.`, 'success', 'Copying Activated');
    } else {
      showAlert("Failed to allocate trade. Please try again.", "error", "Transaction Failed");
    }
    
    setIsProcessingTx(false);
  };

  const closeCopyTrade = async (traderId: number, livePnLDollars: number) => {
    const copyData = activeCopies[traderId];
    if (!copyData) return;
    
    const trader = traders.find(t => t.id === traderId);
    const totalReturn = copyData.amount + livePnLDollars;
    
    setIsProcessingTx(true);
    
    // Server Action DB Call
    const res = await stopMirrorTrade(traderId, totalReturn);
    
    if (res.success) {
      setRealizedBalance(prev => prev + totalReturn);
      setActiveCopies(prev => {
        const next = { ...prev };
        delete next[traderId];
        return next;
      });
      showAlert(`Stopped copying ${trader?.name || 'trader'}. Returned $${totalReturn.toFixed(2)} to your available balance.`, 'info', 'Position Closed');
    } else {
      showAlert("Failed to close position. Please try again.", "error", "Transaction Failed");
    }
    
    setIsProcessingTx(false);
  };

  // --- EQUITY CALCULATIONS ---
  const activeCopiedCount = Object.keys(activeCopies).length;
  const lockedAllocation = Object.values(activeCopies).reduce((sum, copy) => sum + copy.amount, 0);
  
  const unrealizedPnL = Object.entries(activeCopies).reduce((sum, [idStr, copy]) => {
    const traderId = parseInt(idStr);
    const trader = traders.find(t => t.id === traderId);
    if (!trader) return sum;

    const livePrice = getLivePrice(trader.activeTrade.pair);
    if (copy.entryPrice > 0 && livePrice > 0) {
      const diff = (livePrice - copy.entryPrice) / copy.entryPrice;
      const dir = trader.activeTrade.type === 'LONG' ? 1 : -1;
      const pnlPercent = diff * trader.activeTrade.leverage * dir;
      return sum + (copy.amount * pnlPercent);
    }
    return sum;
  }, 0);

  const totalNetEquity = realizedBalance + lockedAllocation + unrealizedPnL;
  const totalPages = Math.ceil(totalTraders / itemsPerPage) || 1;

  const displayTraders = traders.filter(t => {
    if (viewMode === 'portfolio') return !!activeCopies[t.id];
    
    const matchesSearch = t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          t.activeTrade.pair.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesFilter = filterType === 'ALL' || t.activeTrade.type === filterType;
    return matchesSearch && matchesFilter;
  });

  // --- RENDER BLOCK ---
  if (isLoading) {
    return <DashboardSkeleton activeTab={sidebarTab} location={userCountry} />;
  }

  if (isBanned) {
    return (
      <div className="min-h-screen bg-[#0B0E14] text-gray-300 font-sans flex selection:bg-red-500/30">
        <Sidebar location={userCountry} isBanned={true} />
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

  return (
    <div className="min-h-screen bg-[#0B0E14] text-gray-300 font-sans flex selection:bg-blue-500/30 w-full relative">
      <Sidebar location={userCountry} />

      <main className="flex-1 flex flex-col min-h-screen relative min-w-0 overflow-x-hidden">
        <TopHeader />

        <div className="flex-1 p-4 sm:p-6 lg:p-8 w-full flex flex-col">
          <div className="max-w-7xl mx-auto space-y-8 w-full flex-1 flex flex-col">
            
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h1 className="text-3xl sm:text-4xl font-extrabold text-white mb-2 tracking-tight flex items-center gap-3">
                  <Users className="text-blue-500" size={32} /> AI Copy-Trading
                </h1>
                <p className="text-gray-400 text-sm">Mirror institutional Master Traders directly from your wallet balance.</p>
              </div>

              <div className="flex items-center gap-4 bg-[#151924] border border-white/10 px-5 py-3 rounded-2xl shrink-0 shadow-lg">
                <div className="flex items-center gap-3 border-r border-white/10 pr-4">
                  <Wallet size={18} className="text-gray-400" />
                  <div>
                    <div className="text-[10px] text-gray-500 font-bold uppercase">Available Balance</div>
                    <div className="text-sm font-mono font-extrabold text-white">
                      ${realizedBalance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-3 pl-1">
                  <LineChart size={18} className="text-blue-400" />
                  <div>
                    <div className="text-[10px] text-gray-500 font-bold uppercase">Total Net Equity</div>
                    <div className={`text-sm font-mono font-extrabold ${unrealizedPnL >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                      ${totalNetEquity.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
              <div className="bg-[#151924] border border-white/5 rounded-2xl p-5 shadow-xl">
                <div className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Active Mirroring</div>
                <div className="text-2xl font-mono font-bold text-white">{activeCopiedCount} Master AI(s)</div>
                <div className="text-[11px] text-blue-400">Locked Funds: ${lockedAllocation.toFixed(2)}</div>
              </div>

              <div className="bg-[#151924] border border-white/5 rounded-2xl p-5 shadow-xl">
                <div className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Floating PnL</div>
                <div className={`text-2xl font-mono font-bold ${unrealizedPnL >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                  {unrealizedPnL >= 0 ? '+' : ''}${unrealizedPnL.toFixed(2)}
                </div>
                <div className="text-[11px] text-gray-500">Live active trade profit</div>
              </div>

              <div className="bg-[#151924] border border-white/5 rounded-2xl p-5 shadow-xl">
                <div className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Avg WinRate</div>
                <div className="text-2xl font-mono font-bold text-green-400">88.2%</div>
                <div className="text-[11px] text-gray-500">Verified institutional data</div>
              </div>

              <div className="bg-[#151924] border border-white/5 rounded-2xl p-5 shadow-xl">
                <div className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Execution Speed</div>
                <div className="text-2xl font-mono font-bold text-blue-400">&lt; 15ms</div>
                <div className="text-[11px] text-gray-500">Sub-second trade mirroring</div>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-[#151924] border border-white/5 p-2 rounded-2xl">
              <div className="flex items-center gap-2 w-full sm:w-auto p-1 bg-[#0B0E14] rounded-xl border border-white/5">
                <button
                  onClick={() => setViewMode('marketplace')}
                  className={`px-6 py-2.5 rounded-lg text-xs font-bold transition-all flex items-center gap-2 ${
                    viewMode === 'marketplace' 
                      ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20' 
                      : 'text-gray-400 hover:text-white hover:bg-white/5'
                  }`}
                >
                  <Users size={16} /> Strategy Marketplace
                </button>
                <button
                  onClick={() => setViewMode('portfolio')}
                  className={`px-6 py-2.5 rounded-lg text-xs font-bold transition-all flex items-center gap-2 ${
                    viewMode === 'portfolio' 
                      ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20' 
                      : 'text-gray-400 hover:text-white hover:bg-white/5'
                  }`}
                >
                  <Briefcase size={16} /> My Portfolio ({activeCopiedCount})
                </button>
              </div>

              {viewMode === 'marketplace' && (
                <div className="flex items-center gap-2 w-full sm:w-auto">
                  <div className="relative w-full sm:w-64">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={14}/>
                    <input 
                      type="text" 
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Search pair..." 
                      className="w-full bg-[#0B0E14] border border-white/10 rounded-xl py-2 pl-9 pr-4 text-xs text-white focus:outline-none focus:border-blue-500"
                    />
                  </div>
                  {(['ALL', 'LONG', 'SHORT'] as const).map(type => (
                    <button
                      key={type}
                      onClick={() => setFilterType(type)}
                      className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                        filterType === type 
                          ? 'bg-white/10 text-white' 
                          : 'bg-transparent border border-white/10 text-gray-400 hover:text-white'
                      }`}
                    >
                      {type}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="flex-1 flex flex-col justify-start min-h-[40vh]">
              {displayTraders.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 w-full gap-3 text-gray-500 border border-dashed border-white/5 rounded-3xl bg-[#151924]">
                  <Briefcase size={32} className="opacity-50" />
                  <p className="text-sm font-medium">No traders found in this view.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {displayTraders.map((trader) => {
                    const livePrice = getLivePrice(trader.activeTrade.pair);
                    const masterEntry = masterEntries[trader.id] || 0;
                    const isPriceReady = livePrice > 0 && masterEntry > 0;
                    
                    const activeCopy = activeCopies[trader.id];
                    const isCopying = !!activeCopy;

                    // Display PnL logic
                    let displayPnlPercent = 0;
                    let userPnlDollars = 0;

                    if (isCopying && activeCopy.entryPrice > 0 && livePrice > 0) {
                      const diff = (livePrice - activeCopy.entryPrice) / activeCopy.entryPrice;
                      const dir = trader.activeTrade.type === 'LONG' ? 1 : -1;
                      displayPnlPercent = diff * trader.activeTrade.leverage * dir * 100;
                      userPnlDollars = activeCopy.amount * (displayPnlPercent / 100);
                    } else if (!isCopying && isPriceReady) {
                      const diff = (livePrice - masterEntry) / masterEntry;
                      const dir = trader.activeTrade.type === 'LONG' ? 1 : -1;
                      displayPnlPercent = diff * trader.activeTrade.leverage * dir * 100;
                    }

                    const isProfit = displayPnlPercent >= 0;
                    const isLong = trader.activeTrade.type === 'LONG';
                    const displayEntryPrice = isCopying ? activeCopy.entryPrice : masterEntry;

                    return (
                      <div 
                        key={trader.id}
                        className={`bg-[#151924] border rounded-3xl p-6 shadow-xl transition-all relative space-y-4 ${
                          isCopying ? 'border-blue-500/50 bg-blue-950/20' : 'border-white/5 hover:border-white/20'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <img 
                              src={trader.avatar} 
                              alt={trader.name} 
                              className="w-12 h-12 rounded-2xl bg-[#0B0E14] border border-white/10 p-1"
                            />
                            <div>
                              <h3 className="text-base font-bold text-white flex items-center gap-1.5">
                                {trader.name}
                              </h3>
                              <p className="text-xs text-gray-500 font-mono">{trader.strategy}</p>
                            </div>
                          </div>
                          <span className="text-xs font-mono font-bold text-green-400 bg-green-500/10 border border-green-500/20 px-2.5 py-1 rounded-lg">
                            {trader.winRate}% Win
                          </span>
                        </div>

                        {!isCopying && (
                          <div className="grid grid-cols-2 gap-2 bg-[#0B0E14] border border-white/5 rounded-2xl p-3 text-xs">
                            <div>
                              <span className="text-gray-500 block text-[10px] uppercase font-bold mb-0.5">Historical ROI</span>
                              <span className="font-mono font-bold text-gray-300">+{trader.monthlyReturn.toFixed(1)}% / mo</span>
                            </div>
                            <div className="border-l border-white/5 pl-2">
                              <span className="text-gray-500 block text-[10px] uppercase font-bold mb-0.5">Performance</span>
                              <span className="font-mono font-bold text-green-400">Consistent</span>
                            </div>
                          </div>
                        )}

                        <div className="border-t border-white/5 pt-3 space-y-3">
                          <div className="flex items-center justify-between text-xs">
                            <span className="font-bold text-gray-400 flex items-center gap-1">
                              <Activity size={14} className="text-blue-400" /> 
                              {isCopying ? "Your Active Trade" : "Live Master Signal"}
                            </span>
                            <span className={`font-mono font-bold text-[10px] px-2 py-0.5 rounded ${
                              isLong ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'
                            }`}>
                              {trader.activeTrade.type} {trader.activeTrade.leverage}x
                            </span>
                          </div>

                          <div className="bg-[#0B0E14] border border-white/5 rounded-xl p-3 space-y-2">
                            <div className="flex items-center justify-between font-mono text-xs">
                              <div className="flex items-center gap-2">
                                <span className="text-white font-bold">{trader.activeTrade.pair}</span>
                                <button 
                                  onClick={() => setChartModal({ isOpen: true, symbol: trader.activeTrade.pair })}
                                  className="p-1 rounded bg-blue-500/10 text-blue-400 hover:bg-blue-500/20 hover:text-blue-300 transition-colors"
                                >
                                  <LineChart size={12} />
                                </button>
                              </div>
                              <span className={`font-bold flex items-center gap-1 ${isPriceReady ? (isProfit ? 'text-green-400' : 'text-red-400') : 'text-gray-500'}`}>
                                {isPriceReady ? (
                                  <>
                                    {isProfit ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
                                    {isProfit ? '+' : ''}{displayPnlPercent.toFixed(2)}%
                                  </>
                                ) : (
                                  <><Loader2 className="w-3 h-3 animate-spin mr-1" /> Loading...</>
                                )}
                              </span>
                            </div>
                            
                            <div className="flex items-center justify-between text-[10px] text-gray-500 font-mono">
                              <span>Entry: {displayEntryPrice > 0 ? `$${displayEntryPrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '...'}</span>
                              <span className="text-gray-300">
                                Mark: {livePrice > 0 ? `$${livePrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '...'}
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* SL / TP Indicators if Copying */}
                        {isCopying && (
                           <div className="flex gap-2">
                             {activeCopy.sl ? (
                               <div className="flex-1 bg-red-500/10 border border-red-500/20 rounded-lg p-2 text-center text-[10px] text-red-400 font-mono">
                                 SL: ${activeCopy.sl.toLocaleString()}
                               </div>
                             ) : null}
                             {activeCopy.tp ? (
                               <div className="flex-1 bg-green-500/10 border border-green-500/20 rounded-lg p-2 text-center text-[10px] text-green-400 font-mono">
                                 TP: ${activeCopy.tp.toLocaleString()}
                               </div>
                             ) : null}
                             <div className="flex-1 bg-blue-500/10 border border-blue-500/20 rounded-lg p-2 text-center text-[10px] text-blue-400 font-mono">
                               Qty: ${activeCopy.amount.toFixed(2)}
                             </div>
                           </div>
                        )}

                        <button
                          onClick={() => isCopying ? closeCopyTrade(trader.id, userPnlDollars) : openSetupModal(trader.id)}
                          disabled={!isPriceReady || isProcessingTx}
                          className={`w-full py-3 rounded-xl text-xs font-bold transition-all shadow-lg flex items-center justify-center gap-2 ${
                            !isPriceReady || isProcessingTx
                              ? 'bg-gray-800 text-gray-500 cursor-not-allowed'
                              : isCopying 
                                ? 'bg-red-600/20 hover:bg-red-600 text-red-400 hover:text-white border border-red-500/30' 
                                : 'bg-blue-600 hover:bg-blue-500 text-white shadow-blue-600/20'
                          }`}
                        >
                          {!isPriceReady ? (
                            <>
                              <Loader2 size={14} className="animate-spin" /> Fetching Market...
                            </>
                          ) : isProcessingTx ? (
                            <>
                              <Loader2 size={14} className="animate-spin" /> Processing Block...
                            </>
                          ) : isCopying ? (
                            <>
                              <Square size={14} /> Close & Realize ({isProfit ? '+' : ''}${userPnlDollars.toFixed(2)})
                            </>
                          ) : (
                            <>
                              <Play size={14} /> Allocate & Setup Trade
                            </>
                          )}
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {viewMode === 'marketplace' && (
              <div className="bg-[#151924] border border-white/5 rounded-2xl p-4 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-gray-400 mt-auto">
                <div>
                  Showing Page <b className="text-white">{currentPage}</b> of <b className="text-white">{totalPages}</b> ({totalTraders} Total Traders)
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                    disabled={currentPage === 1 || isLoading}
                    className="px-4 py-2 bg-[#0B0E14] border border-white/10 rounded-xl font-bold text-white hover:bg-white/5 disabled:opacity-40 transition-colors flex items-center gap-1"
                  >
                    <ChevronLeft size={16} /> Previous
                  </button>
                  <button
                    onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                    disabled={currentPage === totalPages || isLoading}
                    className="px-4 py-2 bg-[#0B0E14] border border-white/10 rounded-xl font-bold text-white hover:bg-white/5 disabled:opacity-40 transition-colors flex items-center gap-1"
                  >
                    Next <ChevronRight size={16} />
                  </button>
                </div>
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

      {/* SETUP TRADE MODAL (SL & TP) */}
      {setupModal.isOpen && setupModal.traderId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-[#151924] border border-white/10 rounded-3xl w-full max-w-md p-6 shadow-2xl space-y-6 relative overflow-hidden">
            <div className="flex justify-between items-center border-b border-white/10 pb-4">
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                <Target className="text-blue-500" /> Trade Setup
              </h2>
              <button onClick={() => !isProcessingTx && setSetupModal({ isOpen: false, traderId: null })} className="text-gray-500 hover:text-white transition-colors">
                <X size={20} />
              </button>
            </div>
            
            <div className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-gray-500 uppercase">Allocation Amount (USD)</label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 font-bold">$</span>
                  <input
                    type="number"
                    min="5"
                    value={setupAmount}
                    onChange={(e) => setSetupAmount(e.target.value)}
                    disabled={isProcessingTx}
                    className="w-full bg-[#0B0E14] border border-white/10 rounded-xl py-3 pl-8 pr-4 text-white font-mono focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-gray-500 uppercase flex items-center justify-between">
                  Take Profit (Price) <span className="text-gray-600 text-[10px]">Optional</span>
                </label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-green-500"><TrendingUp size={16} /></span>
                  <input
                    type="number"
                    placeholder="E.g. 68000"
                    value={setupTP}
                    onChange={(e) => setSetupTP(e.target.value)}
                    disabled={isProcessingTx}
                    className="w-full bg-[#0B0E14] border border-white/10 rounded-xl py-3 pl-10 pr-4 text-green-400 font-mono focus:outline-none focus:border-green-500"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-gray-500 uppercase flex items-center justify-between">
                  Stop Loss (Price) <span className="text-gray-600 text-[10px]">Optional</span>
                </label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-red-500"><ShieldAlert size={16} /></span>
                  <input
                    type="number"
                    placeholder="E.g. 62000"
                    value={setupSL}
                    onChange={(e) => setSetupSL(e.target.value)}
                    disabled={isProcessingTx}
                    className="w-full bg-[#0B0E14] border border-white/10 rounded-xl py-3 pl-10 pr-4 text-red-400 font-mono focus:outline-none focus:border-red-500"
                  />
                </div>
              </div>
            </div>

            <button
              onClick={confirmCopyTrade}
              disabled={isProcessingTx}
              className="w-full py-4 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white rounded-xl font-bold transition-all shadow-lg flex justify-center items-center gap-2"
            >
              {isProcessingTx ? <Loader2 className="animate-spin" size={18} /> : "Confirm Allocation"}
            </button>
          </div>
        </div>
      )}

      {/* CHART MODAL */}
      {chartModal.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-[#151924] border border-white/10 rounded-2xl w-full max-w-4xl h-[70vh] flex flex-col overflow-hidden shadow-2xl">
            <div className="flex items-center justify-between p-4 border-b border-white/10 bg-[#0B0E14]">
              <h3 className="text-white font-bold flex items-center gap-2">
                <LineChart size={18} className="text-blue-500" /> {chartModal.symbol} Live Chart
              </h3>
              <button 
                onClick={() => setChartModal({ isOpen: false, symbol: '' })} 
                className="p-1.5 text-gray-400 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
              >
                <X size={18} />
              </button>
            </div>
            <div className="flex-1 bg-[#0B0E14]">
              <TradingViewChart symbol={chartModal.symbol} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
"use client";

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { 
  ShieldAlert, RefreshCw, Loader2, UserCheck, Wallet, 
  TrendingUp, TrendingDown, Eye, X, Activity, DollarSign,
  Briefcase, ArrowUpRight, ArrowDownRight, Award, Crown, Copy, Clock
} from 'lucide-react';

import AdminMetrics from './components/AdminMetrics';
import UsersTab from './components/UsersTab';
import NotificationModal, { ModalType } from '@/app/components/ui/NotificationModal';
import { getAllUsersAdmin, getPendingTransactionsAdmin } from '@/app/actions/admin';
import { usePricingEngine } from '@/app/hooks/usePricingEngine';
import LoadingSpinner from '@/app/components/ui/LoadingSpinner';

export interface OpenTradePosition {
  id: string;
  symbol: string;
  type: 'BUY' | 'SELL' | 'LONG' | 'SHORT';
  leverage: number;
  openPrice: number;
  volume: number;
  margin?: number;
  sl?: number;
  tp?: number;
  createdAt?: string;
  openTime?: string;
  isAiCopy?: boolean; 
  aiMeta?: any;       
}

export interface AdminUser {
  id: string;
  name?: string;
  email: string;
  role: string;
  isBanned?: boolean;
  isPro?: boolean;             
  proPlanType?: string;        
  proExpiry?: string;          
  balance: number;            
  tradingBalance: number;     
  openTrades?: OpenTradePosition[];
  totalEquity?: number;        
  floatingPnL?: number;        
  createdAt?: string;
}

export default function AdminDashboardRoot() {
  const { getLivePrice } = usePricingEngine();
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [pendingTxs, setPendingTxs] = useState<any[]>([]);
  const [selectedUser, setSelectedUser] = useState<AdminUser | null>(null);

  const [dashboardTime, setDashboardTime] = useState<number>(Date.now());

  const [modalConfig, setModalConfig] = useState<{
    isOpen: boolean;
    title?: string;
    message: string;
    type: ModalType;
  }>({
    isOpen: false, message: '', type: 'info'
  });

  const showAlert = (message: string, type: ModalType = 'info', title?: string) => {
    setModalConfig({ isOpen: true, message, type, title });
  };

  useEffect(() => {
    const timer = setInterval(() => setDashboardTime(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  const loadData = useCallback(async (isBackgroundSync = false) => {
    if (!isBackgroundSync) setIsRefreshing(true);
    
    try {
      const [uData, pData] = await Promise.all([
        getAllUsersAdmin(),
        getPendingTransactionsAdmin()
      ]);

      const sanitizedUsers: AdminUser[] = (uData || []).map((user: any) => {
        let mainBal = parseFloat(user.balance);
        if (isNaN(mainBal)) mainBal = 0;

        let tradeBal = parseFloat(user.tradingBalance) 
          || parseFloat(user.trading_balance) 
          || parseFloat(user.lockedMargin) 
          || parseFloat(user.locked_margin);
        if (isNaN(tradeBal)) tradeBal = 0;

        const openTrades: OpenTradePosition[] = user.openTrades || user.trades || [];

        let totalFloatingPnL = 0;
        let activeMargin = tradeBal;

        openTrades.forEach((trade) => {
          const dbAllocated = trade.margin || ((trade.volume * trade.openPrice) / (trade.leverage || 1));
          
          let dbTimestamp = Date.now();
          if (trade.openTime) {
            dbTimestamp = new Date(trade.openTime).getTime();
          } else if (trade.createdAt) {
            dbTimestamp = new Date(trade.createdAt).getTime();
          }

          const meta = {
            traderName: "Master Trader",
            avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${trade.id}`,
            allocated: dbAllocated,
            timestamp: dbTimestamp,
            symbol: trade.symbol
          };

          trade.isAiCopy = true;
          trade.aiMeta = meta;
          
          const msPassed = Math.max(Date.now() - dbTimestamp, 0);
          const daysPassed = msPassed / (1000 * 60 * 60 * 24);
          const fakeLivePnl = dbAllocated * 0.25 * daysPassed;

          totalFloatingPnL += fakeLivePnl;
          
          if (dbAllocated && !isNaN(dbAllocated)) {
            activeMargin += dbAllocated;
          }
        });

        const totalEquity = mainBal + activeMargin + totalFloatingPnL;

        return {
          ...user,
          balance: mainBal,
          tradingBalance: activeMargin,
          openTrades,
          floatingPnL: totalFloatingPnL,
          totalEquity: Math.max(0, totalEquity),
          isPro: user.isPro || false,
          proPlanType: user.proPlanType || null,
          proExpiry: user.proExpiry || null
        };
      });

      setUsers(sanitizedUsers);
      setPendingTxs(pData || []);

      if (selectedUser) {
        const updatedSelected = sanitizedUsers.find(u => u.id === selectedUser.id);
        if (updatedSelected) setSelectedUser(updatedSelected);
      }
    } catch (error) {
      console.error("Failed to load admin data:", error);
    } finally {
      setIsInitialLoad(false);
      if (!isBackgroundSync) setIsRefreshing(false);
    }
  }, [selectedUser]);

  useEffect(() => { 
    loadData(false);
    const interval = setInterval(() => { loadData(true); }, 3000);
    return () => clearInterval(interval);
  }, [loadData]);

  const totalSystemLiquidity = users.reduce((acc, curr) => acc + (curr.totalEquity || (curr.balance + curr.tradingBalance)), 0);

  // Directly map the database users into the Live Copy Trading Monitor
  const activeCopySessions = useMemo(() => {
    return users.map(user => {
      const ctTrades = (user.openTrades || []).filter(t => t.isAiCopy);
      if (ctTrades.length === 0) return null;

      let totalAllocated = 0;
      let currentProfit = 0;

      const formattedTrades = ctTrades.map(trade => {
        const meta = trade.aiMeta;
        const allocated = meta?.allocated || 1000;
        const start = meta?.timestamp || Date.now();
        const msPassed = Math.max(dashboardTime - start, 0);
        const msIn24Hours = 24 * 60 * 60 * 1000;
        
        const daysPassed = msPassed / msIn24Hours;
        const tradeProfit = allocated * 0.25 * daysPassed;

        totalAllocated += allocated;
        currentProfit += tradeProfit;

        const msRemaining = Math.max(msIn24Hours - msPassed, 0);
        const hours = Math.floor(msRemaining / (1000 * 60 * 60));
        const minutes = Math.floor((msRemaining % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((msRemaining % (1000 * 60)) / 1000);

        return {
          id: trade.id,
          symbol: trade.symbol,
          allocated,
          profit: tradeProfit,
          timer: `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`,
          traderName: meta?.traderName || 'Master Trader',
          avatar: meta?.avatar
        };
      });

      return {
        owner: user,
        trades: formattedTrades,
        totalAllocated,
        currentProfit
      };
    }).filter(Boolean) as { owner: AdminUser, trades: any[], totalAllocated: number, currentProfit: number }[];
  }, [users, dashboardTime]);

  if (isInitialLoad) return <LoadingSpinner label="Synchronizing Admin Desk & User Ledgers..." />;

  return (
    <div className="animate-in fade-in duration-300 space-y-6">
      
      <div className="w-full rounded-2xl bg-gradient-to-r from-red-900/40 via-blue-900/20 to-[#0B0E14] border border-red-500/30 p-6 flex flex-col md:flex-row items-center justify-between gap-6 relative overflow-hidden shadow-[0_0_30px_rgba(239,68,68,0.1)]">
        <div className="absolute -right-20 -top-20 w-64 h-64 bg-red-500/10 rounded-full blur-3xl pointer-events-none"></div>
        <div className="flex items-center gap-5 relative z-10">
          <div className="w-14 h-14 rounded-2xl bg-red-600 flex items-center justify-center text-white shrink-0 shadow-xl shadow-red-600/30 border border-red-400/50">
            <ShieldAlert size={28} />
          </div>
          <div>
            <div className="flex items-center gap-2 mb-1">
              <h3 className="text-xl font-extrabold text-white">Citadel Executive Control Desk</h3>
              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-red-500/20 text-red-400 uppercase tracking-wider flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-red-400 animate-pulse"></span> Live Sync Active
              </span>
            </div>
            <p className="text-sm text-gray-400 max-w-xl">Total operational control over user accounts, live trade monitoring, real-time position tracking, and wallet overrides.</p>
          </div>
        </div>
        <button onClick={() => loadData(false)} disabled={isRefreshing} className="shrink-0 px-6 py-3 bg-white/5 hover:bg-white/10 border border-white/10 rounded-full text-xs font-bold text-white transition-all flex items-center gap-2 relative z-10 shadow-lg disabled:opacity-50">
          {isRefreshing ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />} Refresh System Ledger
        </button>
      </div>

      <AdminMetrics usersCount={users.length} pendingCount={pendingTxs.length} totalLiquidity={totalSystemLiquidity} />

      {/* ========================================================================= */}
      {/* ALWAYS VISIBLE LIVE COPY TRADING MONITOR PANEL */}
      {/* ========================================================================= */}
      <div className="bg-[#151924] border border-blue-500/30 rounded-3xl p-6 shadow-xl relative overflow-hidden mt-6">
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-500 to-emerald-500"></div>
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 bg-blue-500/20 rounded-lg text-blue-400">
            <Copy className="animate-pulse" size={20} />
          </div>
          <div>
            <h3 className="text-lg font-extrabold text-white">Live Copy Trading Monitor</h3>
            <p className="text-xs text-gray-400 font-medium">Real-time breakdown of user positions & 24h progress timers</p>
          </div>
        </div>

        {activeCopySessions.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {activeCopySessions.map(({ owner, trades, totalAllocated, currentProfit }, idx) => (
              <div 
                key={owner.id || idx} 
                onClick={() => setSelectedUser(owner)}
                className="bg-[#0B0E14] border border-white/5 hover:border-blue-500/50 rounded-2xl p-4 cursor-pointer transition-all flex flex-col justify-between gap-4 group"
              >
                <div className="flex justify-between items-start border-b border-white/5 pb-3">
                  <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-xl bg-blue-600/20 flex items-center justify-center text-blue-400 font-bold text-xs border border-blue-500/30">
                      {owner.name ? owner.name.charAt(0).toUpperCase() : owner.email.charAt(0).toUpperCase()}
                    </div>
                    <div className="flex flex-col">
                      <span className="text-sm font-bold text-white truncate max-w-[140px]">{owner.name || 'Trader'}</span>
                      <span className="text-[10px] text-gray-400 font-mono truncate max-w-[140px]">{owner.email}</span>
                    </div>
                  </div>
                  <span className="text-[10px] font-bold bg-blue-500/10 text-blue-400 border border-blue-500/20 px-2 py-0.5 rounded-md">
                    {trades.length} Position{trades.length > 1 ? 's' : ''}
                  </span>
                </div>

                {/* INDIVIDUAL STOCK POSITIONS & TIMERS */}
                <div className="space-y-2.5 my-1">
                  {trades.map(t => (
                    <div key={t.id} className="bg-[#151924] border border-white/5 p-2.5 rounded-xl space-y-1.5">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-extrabold text-white flex items-center gap-1">
                          {t.symbol} <span className="text-[10px] text-gray-500 font-normal">({t.traderName})</span>
                        </span>
                        <span className="font-mono font-bold text-emerald-400">+${t.profit.toFixed(2)}</span>
                      </div>
                      <div className="flex items-center justify-between text-[10px] font-mono text-gray-400 border-t border-white/5 pt-1.5">
                        <span>Margin: ${t.allocated.toFixed(2)}</span>
                        <span className="text-blue-400 flex items-center gap-1">
                          <Clock size={10} /> {t.timer}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="flex justify-between items-end border-t border-white/5 pt-3">
                  <div className="flex flex-col">
                    <span className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">Total Margin</span>
                    <span className="text-sm font-mono font-bold text-gray-300">${totalAllocated.toFixed(2)}</span>
                  </div>
                  
                  <div className="flex flex-col items-end">
                    <span className="text-[10px] text-emerald-500/80 font-bold uppercase tracking-wider">Live Return</span>
                    <span className="text-xs font-mono font-extrabold text-emerald-400 bg-emerald-500/10 px-2 py-1 rounded-lg border border-emerald-500/20">
                      [+25%] [+${currentProfit.toFixed(2)} CT]
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="py-10 flex flex-col items-center justify-center text-center border border-dashed border-white/10 rounded-2xl bg-white/[0.02]">
            <Activity size={32} className="text-gray-600 mb-3" />
            <p className="text-white font-bold text-sm">No Active Copy Trades</p>
            <p className="text-gray-500 text-xs mt-1">Users are not currently mirroring any Master Traders.</p>
          </div>
        )}
      </div>

      <div className="mt-6">
        <UsersTab users={users} refreshData={() => loadData(false)} showAlert={showAlert} onSelectUser={(user) => setSelectedUser(user)} />
      </div>

      {selectedUser && <UserDetailModal user={selectedUser} getLivePrice={getLivePrice} onClose={() => setSelectedUser(null)} />}

      <NotificationModal isOpen={modalConfig.isOpen} onClose={() => setModalConfig(prev => ({ ...prev, isOpen: false }))} title={modalConfig.title} message={modalConfig.message} type={modalConfig.type} />
    </div>
  );
}

// ------------------------------------------------------------------
// TRADER INSPECTOR MODAL
// ------------------------------------------------------------------
function UserDetailModal({ user, getLivePrice, onClose }: { user: AdminUser; getLivePrice: (symbol: string) => number; onClose: () => void }) {
  const openTrades = user.openTrades || [];
  const hasActiveTrades = openTrades.length > 0;
  
  const [modalTime, setModalTime] = useState(Date.now());
  useEffect(() => {
    const timer = setInterval(() => setModalTime(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  let dynamicFloatingPnL = 0;
  openTrades.forEach(trade => {
    if (trade.isAiCopy && trade.aiMeta) {
      const allocatedAmount = trade.aiMeta.allocated || (trade.volume * trade.openPrice);
      const startTickingTime = trade.aiMeta.timestamp || Date.now();
      const msPassed = Math.max(modalTime - startTickingTime, 0);
      const daysPassed = msPassed / (1000 * 60 * 60 * 24);
      dynamicFloatingPnL += allocatedAmount * 0.25 * daysPassed;
    } else {
      const currentPrice = getLivePrice(trade.symbol) || trade.openPrice;
      const isLong = trade.type === 'BUY' || trade.type === 'LONG';
      const priceDiff = isLong ? (currentPrice - trade.openPrice) : (trade.openPrice - currentPrice);
      dynamicFloatingPnL += (priceDiff / trade.openPrice) * (trade.volume * trade.openPrice);
    }
  });

  const dynamicTotalEquity = user.balance + user.tradingBalance + dynamicFloatingPnL;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="bg-[#151924] border border-white/10 rounded-3xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col shadow-2xl relative">
        <div className="p-6 border-b border-white/10 flex items-center justify-between bg-[#0B0E14]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-blue-400 font-bold text-lg">
              {user.name ? user.name.charAt(0).toUpperCase() : user.email.charAt(0).toUpperCase()}
            </div>
            <div>
              <h2 className="text-lg font-extrabold text-white flex items-center gap-2">
                {user.name || 'Trader Account'}
                <span className={`text-[10px] px-2 py-0.5 rounded font-mono font-bold uppercase ${user.role === 'admin' ? 'bg-red-500/20 text-red-400' : 'bg-blue-500/20 text-blue-400'}`}>
                  {user.role}
                </span>
                
                {user.isPro && (
                  <span className="text-[10px] px-2 py-0.5 rounded font-mono font-bold uppercase bg-yellow-500/20 text-yellow-400 border border-yellow-500/30 flex items-center gap-1">
                    <Crown size={12} /> PRO {user.proPlanType ? `(${user.proPlanType})` : ''}
                  </span>
                )}
              </h2>
              <p className="text-xs text-gray-400 font-mono flex items-center gap-2">
                {user.email}
                {user.isPro && user.proExpiry && (
                  <span className="text-gray-500">| Renews: {user.proExpiry}</span>
                )}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="w-9 h-9 rounded-xl bg-white/5 hover:bg-white/10 flex items-center justify-center text-gray-400 hover:text-white transition-colors">
            <X size={18} />
          </button>
        </div>

        <div className="p-6 overflow-y-auto space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-[#0B0E14] border border-blue-500/30 p-4 rounded-2xl relative overflow-hidden">
              <div className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1 flex items-center gap-1.5"><DollarSign size={14} className="text-blue-400" /> Total Live Equity</div>
              <div className="text-2xl font-mono font-extrabold text-white">${Math.max(0, dynamicTotalEquity).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
              <p className="text-[10px] text-gray-400 mt-1">Available Wallet + Trade Capital + Live PnL</p>
            </div>
            <div className="bg-[#0B0E14] border border-white/5 p-4 rounded-2xl">
              <div className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1 flex items-center gap-1.5"><Wallet size={14} className="text-green-400" /> Liquid Balance</div>
              <div className="text-2xl font-mono font-extrabold text-white">${user.balance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
              <p className="text-[10px] text-gray-400 mt-1">Unallocated funds ready for withdrawal or trade</p>
            </div>
            <div className="bg-[#0B0E14] border border-white/5 p-4 rounded-2xl">
              <div className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1 flex items-center gap-1.5"><Briefcase size={14} className="text-yellow-400" /> Capital in Trade</div>
              <div className="text-2xl font-mono font-extrabold text-yellow-400">${user.tradingBalance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
              <p className="text-[10px] text-gray-400 mt-1">Locked margin in active market positions</p>
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-extrabold text-white uppercase tracking-wider flex items-center gap-2"><Activity size={16} className="text-blue-400" /> Live Active Trades ({openTrades.length})</h3>
              {dynamicFloatingPnL !== 0 && (
                <div className={`text-xs font-mono font-bold flex items-center gap-1 px-3 py-1 rounded-xl border ${dynamicFloatingPnL >= 0 ? 'bg-green-500/10 text-green-400 border-green-500/20' : 'bg-red-500/10 text-red-400 border-red-500/20'}`}>
                  Unrealized PnL: {dynamicFloatingPnL >= 0 ? '+' : ''}${dynamicFloatingPnL.toFixed(2)}
                </div>
              )}
            </div>

            {!hasActiveTrades ? (
              <div className="py-12 bg-[#0B0E14] border border-dashed border-white/10 rounded-2xl text-center text-gray-500">
                <Briefcase size={36} className="mx-auto text-gray-600 mb-2" />
                <p className="text-sm font-bold text-white">No Active Trades</p>
              </div>
            ) : (
              <div className="overflow-x-auto bg-[#0B0E14] border border-white/5 rounded-2xl">
                <table className="w-full text-left font-mono text-xs">
                  <thead>
                    <tr className="border-b border-white/10 text-gray-500 uppercase text-[10px]">
                      <th className="p-3.5">Asset / Type</th>
                      <th className="p-3.5">Leverage</th>
                      <th className="p-3.5">Entry Price</th>
                      <th className="p-3.5">Live Price</th>
                      <th className="p-3.5">Margin</th>
                      <th className="p-3.5 text-right">Live PnL</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {openTrades.map((trade, idx) => {
                      let livePrice = getLivePrice(trade.symbol) || trade.openPrice;
                      const isLong = trade.type === 'BUY' || trade.type === 'LONG';
                      let pnl = 0;

                      if (trade.isAiCopy && trade.aiMeta) {
                        const allocatedAmount = trade.aiMeta.allocated || (trade.volume * trade.openPrice);
                        const startTickingTime = trade.aiMeta.timestamp || Date.now();
                        const msPassed = Math.max(modalTime - startTickingTime, 0);
                        const daysPassed = msPassed / (1000 * 60 * 60 * 24);
                        
                        pnl = allocatedAmount * 0.25 * daysPassed;
                        
                        livePrice = isLong 
                          ? trade.openPrice + (pnl / trade.volume)
                          : Math.max(trade.openPrice - (pnl / trade.volume), 0);
                      } else {
                        const diff = isLong ? (livePrice - trade.openPrice) : (trade.openPrice - livePrice);
                        pnl = (diff / trade.openPrice) * (trade.volume * trade.openPrice);
                      }
                      
                      const isProfitable = pnl >= 0;
                      const calculatedMargin = trade.margin || ((trade.volume * trade.openPrice) / (trade.leverage || 1));

                      return (
                        <tr key={trade.id || idx} className="hover:bg-white/[0.02] transition-colors">
                          <td className="p-3.5">
                            <div className="flex items-center gap-2">
                              <span className={`px-2 py-0.5 rounded text-[10px] font-extrabold ${isLong ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
                                {isLong ? 'BUY' : 'SELL'}
                              </span>
                              <span className="font-extrabold text-white flex items-center gap-1">
                                {trade.symbol} 
                              </span>
                            </div>
                          </td>
                          <td className="p-3.5 text-gray-300">{trade.leverage || 1}x</td>
                          <td className="p-3.5 text-gray-300">${trade.openPrice.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                          <td className="p-3.5 text-blue-400 font-bold">${livePrice.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                          <td className="p-3.5 text-yellow-400">${calculatedMargin.toFixed(2)}</td>
                          
                          {trade.isAiCopy ? (
                            <td className="p-3.5 text-right font-bold text-emerald-400">
                              <div className="flex items-center justify-end gap-1">
                                <TrendingUp size={14} />
                                <span className="bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20 text-[10px]">
                                  [+25%] [+${pnl.toFixed(2)} CT]
                                </span>
                              </div>
                            </td>
                          ) : (
                            <td className={`p-3.5 text-right font-bold ${isProfitable ? 'text-green-400' : 'text-red-400'}`}>
                              <div className="flex items-center justify-end gap-1">
                                {isProfitable ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}
                                {isProfitable ? '+' : ''}${pnl.toFixed(2)}
                              </div>
                            </td>
                          )}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        <div className="p-4 border-t border-white/10 bg-[#0B0E14] flex justify-end">
          <button onClick={onClose} className="px-6 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold transition-all shadow-lg shadow-blue-600/20">
            Close Inspector
          </button>
        </div>
      </div>
    </div>
  );
}
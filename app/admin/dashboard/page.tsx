"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { 
  ShieldAlert, RefreshCw, Loader2, UserCheck, Wallet, 
  TrendingUp, TrendingDown, Eye, X, Activity, DollarSign,
  Briefcase, ArrowUpRight, ArrowDownRight, Award, Crown
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
}

export interface AdminUser {
  id: string;
  name?: string;
  email: string;
  role: string;
  isBanned?: boolean;
  isPro?: boolean;             // <-- Added Pro Status Tracking
  proPlanType?: string;        // <-- Added Plan Type (Monthly/Annual)
  proExpiry?: string;          // <-- Added Expiry Date
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
          const currentPrice = getLivePrice(trade.symbol) || trade.openPrice;
          const isLong = trade.type === 'BUY' || trade.type === 'LONG';
          const priceDiff = isLong ? (currentPrice - trade.openPrice) : (trade.openPrice - currentPrice);
          
          // FIX: Volume is already (margin * leverage / openPrice). 
          // Multiplying by leverage again squares it. Removed the duplicate multiplier.
          const pnl = (priceDiff / trade.openPrice) * (trade.volume * trade.openPrice);
          totalFloatingPnL += pnl;

          const calculatedMargin = trade.margin || ((trade.volume * trade.openPrice) / (trade.leverage || 1));
          if (calculatedMargin && !isNaN(calculatedMargin)) {
            activeMargin += calculatedMargin;
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
  }, [getLivePrice, selectedUser]);

  useEffect(() => { 
    loadData(false);
    const interval = setInterval(() => { loadData(true); }, 3000);
    return () => clearInterval(interval);
  }, [loadData]);

  const totalSystemLiquidity = users.reduce((acc, curr) => acc + (curr.totalEquity || (curr.balance + curr.tradingBalance)), 0);

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
                
                {/* PRO SUBSCRIPTION BADGE */}
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
              <div className="text-2xl font-mono font-extrabold text-white">${(user.totalEquity || (user.balance + user.tradingBalance)).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
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
              {user.floatingPnL !== undefined && user.floatingPnL !== 0 && (
                <div className={`text-xs font-mono font-bold flex items-center gap-1 px-3 py-1 rounded-xl border ${user.floatingPnL >= 0 ? 'bg-green-500/10 text-green-400 border-green-500/20' : 'bg-red-500/10 text-red-400 border-red-500/20'}`}>
                  Unrealized PnL: {user.floatingPnL >= 0 ? '+' : ''}${user.floatingPnL.toFixed(2)}
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
                      const livePrice = getLivePrice(trade.symbol) || trade.openPrice;
                      const isLong = trade.type === 'BUY' || trade.type === 'LONG';
                      const diff = isLong ? (livePrice - trade.openPrice) : (trade.openPrice - livePrice);
                      
                      // FIX: Removed duplicate leverage multiplier
                      const pnl = (diff / trade.openPrice) * (trade.volume * trade.openPrice);
                      
                      const isProfitable = pnl >= 0;
                      const calculatedMargin = trade.margin || ((trade.volume * trade.openPrice) / (trade.leverage || 1));

                      return (
                        <tr key={trade.id || idx} className="hover:bg-white/[0.02] transition-colors">
                          <td className="p-3.5">
                            <div className="flex items-center gap-2">
                              <span className={`px-2 py-0.5 rounded text-[10px] font-extrabold ${isLong ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
                                {isLong ? 'BUY' : 'SELL'}
                              </span>
                              <span className="font-extrabold text-white">{trade.symbol}</span>
                            </div>
                          </td>
                          <td className="p-3.5 text-gray-300">{trade.leverage || 1}x</td>
                          <td className="p-3.5 text-gray-300">${trade.openPrice.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                          <td className="p-3.5 text-blue-400 font-bold">${livePrice.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                          <td className="p-3.5 text-yellow-400">${calculatedMargin.toFixed(2)}</td>
                          <td className={`p-3.5 text-right font-bold ${isProfitable ? 'text-green-400' : 'text-red-400'}`}>
                            <div className="flex items-center justify-end gap-1">
                              {isProfitable ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}
                              {isProfitable ? '+' : ''}${pnl.toFixed(2)}
                            </div>
                          </td>
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
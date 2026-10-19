// PATH: app/admin/dashboard/page.tsx

"use client";

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  ShieldAlert, RefreshCw, Loader2, Wallet,
  TrendingUp, X, Activity, DollarSign,
  Briefcase, ArrowUpRight, ArrowDownRight, Crown, Clock
} from 'lucide-react';

import AdminMetrics from './components/AdminMetrics';
import UsersTab from './components/UsersTab';
import CopyTradingMonitor from './components/CopyTradingMonitor';
import NotificationModal, { ModalType } from '@/app/components/ui/NotificationModal';
import { getAllUsersAdmin, getPendingTransactionsAdmin } from '@/app/actions/admin';
import { getAllActiveCopiesAdmin, closeCopyTradeAdmin } from '@/app/actions/copytrading';
import { usePricingEngine } from '@/app/hooks/usePricingEngine';
import LoadingSpinner from '@/app/components/ui/LoadingSpinner';
import { TRADERS } from '@/app/config/traders';
import { TRADING_ASSETS } from '@/app/config/assets';

// SIMULATION SETTINGS - must match app/actions/copytrading.ts and the user's "Active AI Trades" page
export const SIM_RATE_PER_CYCLE = 0.25;
export const CYCLE_MS = 24 * 60 * 60 * 1000;
export const COPY_LEVERAGE = 10;

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
  tradingBalance: number;      // regular locked margin + copy-trade margin
  openTrades?: OpenTradePosition[];
  totalEquity?: number;
  floatingPnL?: number;
  createdAt?: string;
  // breakdown fields
  regularMargin?: number;
  regularPnL?: number;
  copyMargin?: number;
  copyProfit?: number;
  copyCount?: number;
}

// One copy trade as the admin sees it
export interface AdminCopyTrade {
  id: number;
  userId: string;
  traderId: string;
  traderName: string;
  avatar?: string;
  symbol: string;
  isLong: boolean;
  leverage: number;
  allocated: number;
  entryPrice: number;
  sl: number;
  tp: number;
  openedAt: number;
  ownerName: string;   // from the user's profile (first_name + last_name)
  ownerEmail: string;
}

// Build a display name from profile fields
export const buildName = (first?: string | null, last?: string | null) =>
  [first, last].filter(Boolean).join(' ').trim();

// Same simulated yield the user sees and the server credits on close (capped at one cycle)
export const simElapsed = (openedAt: number, now: number) => Math.min(Math.max(now - openedAt, 0), CYCLE_MS);
export const simProfit = (allocated: number, openedAt: number, now: number) =>
  allocated * SIM_RATE_PER_CYCLE * (simElapsed(openedAt, now) / CYCLE_MS);

export const timeLeft = (openedAt: number, now: number) => {
  const remaining = CYCLE_MS - simElapsed(openedAt, now);
  if (remaining <= 0) return null; // cycle complete
  const h = Math.floor(remaining / 3600000);
  const m = Math.floor((remaining % 3600000) / 60000);
  const s = Math.floor((remaining % 60000) / 1000);
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
};

export const fmtMoney = (n: number) =>
  n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export const fmtDate = (ms: number) =>
  new Date(ms).toLocaleString('en-GB', { dateStyle: 'medium', timeStyle: 'short' });

export default function AdminDashboardRoot() {
  const { getLivePrice } = usePricingEngine();
  const livePriceRef = useRef(getLivePrice);
  livePriceRef.current = getLivePrice;

  const [isInitialLoad, setIsInitialLoad] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [pendingTxs, setPendingTxs] = useState<any[]>([]);
  const [copiesRaw, setCopiesRaw] = useState<any[]>([]);
  const [copiesError, setCopiesError] = useState<string | null>(null);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);

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
      const [uData, pData, cRes] = await Promise.all([
        getAllUsersAdmin(),
        getPendingTransactionsAdmin(),
        getAllActiveCopiesAdmin()
      ]);

      if (cRes?.success) {
        setCopiesRaw((cRes.data as any[]) ?? []);
        setCopiesError(null);
      } else {
        setCopiesError(cRes?.error ?? 'Failed to load copy trades.');
      }

      const sanitizedUsers: AdminUser[] = (uData ?? []).map((user: any) => {
        let mainBal = parseFloat(user.balance);
        if (isNaN(mainBal)) mainBal = 0;

        let tradeBal = parseFloat(user.tradingBalance)
          || parseFloat(user.trading_balance)
          || parseFloat(user.lockedMargin)
          || parseFloat(user.locked_margin);
        if (isNaN(tradeBal)) tradeBal = 0;

        const openTrades: OpenTradePosition[] = user.openTrades ?? user.trades ?? [];

        let regularMarginSum = 0;
        let regularPnL = 0;
        openTrades.forEach((trade) => {
          const margin = trade.margin ?? ((trade.volume * trade.openPrice) / (trade.leverage ?? 1));
          if (margin && !isNaN(margin)) regularMarginSum += margin;

          const currentPrice = livePriceRef.current(trade.symbol) ?? trade.openPrice;
          const isLong = trade.type === 'BUY' || trade.type === 'LONG';
          const diff = isLong ? (currentPrice - trade.openPrice) : (trade.openPrice - currentPrice);
          regularPnL += (diff / trade.openPrice) * (trade.volume * trade.openPrice);
        });

        const regularMargin = tradeBal > 0 ? tradeBal : regularMarginSum;

        const profileName =
          user.name ??
          buildName(user.first_name ?? user.firstName, user.last_name ?? user.lastName) ??
          undefined;

        return {
          ...user,
          name: profileName,
          balance: mainBal,
          tradingBalance: regularMargin,
          regularMargin,
          regularPnL,
          openTrades,
          isPro: user.isPro ?? false,
          proPlanType: user.proPlanType ?? null,
          proExpiry: user.proExpiry ?? null
        };
      });

      setUsers(sanitizedUsers);
      setPendingTxs(pData ?? []);
    } catch (error) {
      console.error("Failed to load admin data:", error);
    } finally {
      setIsInitialLoad(false);
      if (!isBackgroundSync) setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadData(false);
    const interval = setInterval(() => { loadData(true); }, 3000);
    return () => clearInterval(interval);
  }, [loadData]);

  const copyTrades: AdminCopyTrade[] = useMemo(() => {
    const stockAssets = TRADING_ASSETS.filter(a => a.type === 'stock');
    return copiesRaw.map((c: any) => {
      const trader = TRADERS.find(t => String(t.id) === String(c.trader_id)) ?? TRADERS[0];
      const traderNumId = parseInt(trader.id) ? parseInt(trader.id) : 1;
      const symbol = stockAssets.length > 0
        ? stockAssets[(traderNumId * 7 + 3) % stockAssets.length].symbol
        : '—';
      return {
        id: Number(c.id),
        userId: String(c.user_id),
        traderId: String(c.trader_id),
        traderName: trader.name,
        avatar: trader.avatar,
        symbol,
        isLong: traderNumId % 2 === 0,
        leverage: COPY_LEVERAGE,
        allocated: parseFloat(String(c.amount)) ? parseFloat(String(c.amount)) : 0,
        entryPrice: parseFloat(String(c.entry_price)) ? parseFloat(String(c.entry_price)) : 0,
        sl: c.sl ? parseFloat(String(c.sl)) : 0,
        tp: c.tp ? parseFloat(String(c.tp)) : 0,
        openedAt: new Date(c.created_at).getTime(),
        ownerName: buildName(c.first_name, c.last_name),
        ownerEmail: c.user_email ?? ''
      };
    });
  }, [copiesRaw]);

  const enrichedUsers: AdminUser[] = useMemo(() => {
    const byUser = new Map<string, AdminCopyTrade[]>();
    copyTrades.forEach(t => {
      const list = byUser.get(t.userId) ?? [];
      list.push(t);
      byUser.set(t.userId, list);
    });

    return users.map(u => {
      const list = byUser.get(String(u.id)) ?? [];
      const copyMargin = list.reduce((s, t) => s + t.allocated, 0);
      const copyProfit = list.reduce((s, t) => s + simProfit(t.allocated, t.openedAt, dashboardTime), 0);
      const regularMargin = u.regularMargin ?? 0;
      const regularPnL = u.regularPnL ?? 0;
      const tradingBalance = regularMargin + copyMargin;
      const floatingPnL = regularPnL + copyProfit;
      return {
        ...u,
        tradingBalance,
        copyMargin,
        copyProfit,
        copyCount: list.length,
        floatingPnL,
        totalEquity: Math.max(0, u.balance + tradingBalance + floatingPnL)
      };
    });
  }, [users, copyTrades, dashboardTime]);

  const selectedUser = useMemo(
    () => (selectedUserId ? (enrichedUsers.find(u => String(u.id) === selectedUserId) ?? null) : null),
    [selectedUserId, enrichedUsers]
  );

  const totalSystemLiquidity = enrichedUsers.reduce((acc, curr) => acc + (curr.totalEquity ?? (curr.balance + curr.tradingBalance)), 0);

  // NEW: Handler for closing copy trades from the admin side
  const handleCloseCopyTrade = async (tradeId: number) => {
    try {
      const res = await closeCopyTradeAdmin(tradeId);
      if (res.success) {
        showAlert(`Successfully closed copy trade #${tradeId} and credited profit to user.`, 'success');
        loadData(false); // Force a full sync to update user balances
      } else {
        showAlert(res.error || 'Failed to close copy trade.', 'error');
      }
    } catch (err: any) {
      showAlert(err.message || 'An error occurred while closing the trade.', 'error');
    }
  };

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
        <button onClick={() => loadData(false)} disabled={isRefreshing} className="shrink-0 px-6 py-3 bg-white/5 hover:bg-white/10 border border-white/10 rounded-full text-xs font-bold text-whitetransition-all flex items-center gap-2 relative z-10 shadow-lg disabled:opacity-50">
          {isRefreshing ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />} Refresh System Ledger
        </button>
      </div>

      <AdminMetrics usersCount={enrichedUsers.length} pendingCount={pendingTxs.length} totalLiquidity={totalSystemLiquidity} />

      <CopyTradingMonitor
        copyTrades={copyTrades}
        enrichedUsers={enrichedUsers}
        dashboardTime={dashboardTime}
        copiesError={copiesError}
        onSelectUser={setSelectedUserId}
        onCloseTrade={handleCloseCopyTrade}
      />

      <div className="mt-6">
        <UsersTab users={enrichedUsers} refreshData={() => loadData(false)} showAlert={showAlert} onSelectUser={(user) => setSelectedUserId(String(user.id))} />
      </div>

      {selectedUser && (
        <UserDetailModal
          user={selectedUser}
          copyTrades={copyTrades.filter(t => t.userId === String(selectedUser.id))}
          now={dashboardTime}
          getLivePrice={getLivePrice}
          onClose={() => setSelectedUserId(null)}
        />
      )}

      <NotificationModal isOpen={modalConfig.isOpen} onClose={() => setModalConfig(prev => ({ ...prev, isOpen: false }))} title={modalConfig.title} message={modalConfig.message} type={modalConfig.type} />
    </div>
  );
}

// ------------------------------------------------------------------
// TRADER INSPECTOR MODAL
// ------------------------------------------------------------------
function UserDetailModal({
  user, copyTrades, now, getLivePrice, onClose
}: {
  user: AdminUser;
  copyTrades: AdminCopyTrade[];
  now: number;
  getLivePrice: (symbol: string) => number;
  onClose: () => void;
}) {
  const openTrades = user.openTrades ?? [];
  const dynamicTotalEquity = user.totalEquity ?? 0;

  // Safe extraction to prevent parser issues on copy-paste
  const displayRegularMargin = user.regularMargin ?? 0;
  const displayCopyMargin = user.copyMargin ?? 0;
  const displayCopyProfit = user.copyProfit ?? 0;
  const displayRegularPnL = user.regularPnL ?? 0;
  const displayName = user.name ?? 'Trader Account';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="bg-[#151924] border border-white/10 rounded-3xl w-full max-w-5xl max-h-[90vh] overflow-hidden flex flex-col shadow-2xl relative">
        <div className="p-6 border-b border-white/10 flex items-center justify-between bg-[#0B0E14]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-blue-400 font-bold text-lg">
              {user.name ? user.name.charAt(0).toUpperCase() : user.email.charAt(0).toUpperCase()}
            </div>
            <div>
              <h2 className="text-lg font-extrabold text-white flex items-center gap-2">
                {displayName}
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
              <div className="text-2xl font-mono font-extrabold text-white">{"$"}{fmtMoney(Math.max(0, dynamicTotalEquity))}</div>
              <p className="text-[10px] text-gray-400 mt-1">Available Wallet + Trade Capital + PnL (copy profit simulated)</p>
            </div>
            <div className="bg-[#0B0E14] border border-white/5 p-4 rounded-2xl">
              <div className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1 flex items-center gap-1.5"><Wallet size={14} className="text-green-400" /> Liquid Balance</div>
              <div className="text-2xl font-mono font-extrabold text-white">{"$"}{fmtMoney(user.balance)}</div>
              <p className="text-[10px] text-gray-400 mt-1">Unallocated funds ready for withdrawal or trade</p>
            </div>
            <div className="bg-[#0B0E14] border border-white/5 p-4 rounded-2xl">
              <div className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1 flex items-center gap-1.5"><Briefcase size={14} className="text-yellow-400" /> Capital in Trade</div>
              <div className="text-2xl font-mono font-extrabold text-yellow-400">{"$"}{fmtMoney(user.tradingBalance)}</div>
              <p className="text-[10px] text-gray-400 mt-1">
                Regular {"$"}{fmtMoney(displayRegularMargin)} + Copy {"$"}{fmtMoney(displayCopyMargin)}
              </p>
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-extrabold text-white uppercase tracking-wider flex items-center gap-2">
                <Activity size={16} className="text-blue-400" /> Copy Trades ({copyTrades.length})
              </h3>
              {copyTrades.length > 0 && (
                <div className="text-xs font-mono font-bold flex items-center gap-1 px-3 py-1 rounded-xl border bg-emerald-500/10 text-emerald-400 border-emerald-500/20">
                  <TrendingUp size={12} /> Simulated profit: +{"$"}{fmtMoney(displayCopyProfit)}
                </div>
              )}
            </div>

            {copyTrades.length === 0 ? (
              <div className="py-8 bg-[#0B0E14] border border-dashed border-white/10 rounded-2xl text-center text-gray-500">
                <p className="text-sm font-bold text-white">No active copy trades</p>
              </div>
            ) : (
              <div className="overflow-x-auto bg-[#0B0E14] border border-white/5 rounded-2xl">
                <table className="w-full text-left font-mono text-xs whitespace-nowrap min-w-[800px]">
                  <thead>
                    <tr className="border-b border-white/10 text-gray-500 uppercase text-[10px]">
                      <th className="p-3.5">Trade</th>
                      <th className="p-3.5">Master Trader</th>
                      <th className="p-3.5">Position</th>
                      <th className="p-3.5">Allocated</th>
                      <th className="p-3.5">Entry</th>
                      <th className="p-3.5">TP / SL</th>
                      <th className="p-3.5">Opened</th>
                      <th className="p-3.5">Status</th>
                      <th className="p-3.5 text-right">Sim. Profit</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {copyTrades.map(t => {
                      const remaining = timeLeft(t.openedAt, now);
                      return (
                        <tr key={t.id}>
                          <td className="p-3.5 text-gray-400">#{t.id}</td>
                          <td className="p-3.5 text-gray-200">{t.traderName}</td>
                          <td className="p-3.5">
                            <span className="font-extrabold text-white mr-2">{t.symbol}</span>
                            <span className={`px-1.5 py-0.5 rounded text-[10px] font-extrabold ${t.isLong ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
                              {t.isLong ? 'LONG' : 'SHORT'} {t.leverage}x
                            </span>
                          </td>
                          <td className="p-3.5 text-yellow-400 font-bold">{"$"}{fmtMoney(t.allocated)}</td>
                          <td className="p-3.5 text-gray-300">{"$"}{fmtMoney(t.entryPrice)}</td>
                          <td className="p-3.5">
                            <span className="text-emerald-400">{t.tp > 0 ? `{"$"}${fmtMoney(t.tp)}` :'—'}</span>
                            <span className="text-gray-600"> / </span>
                            <span className="text-rose-400">{t.sl > 0 ? `{"$"}${fmtMoney(t.sl)}` : '—'}</span>
                          </td>
                          <td className="p-3.5 text-gray-400">{fmtDate(t.openedAt)}</td>
                          <td className="p-3.5">
                            {remaining ? (
                              <span className="text-blue-400 flex items-center gap-1"><Clock size={11} /> {remaining}</span>
                            ) : (
                              <span className="text-[10px] font-bold text-blue-300">CYCLE COMPLETE</span>
                            )}
                          </td>
                          <td className="p-3.5 text-right font-bold text-emerald-400">+{"$"}{fmtMoney(simProfit(t.allocated, t.openedAt, now))}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-extrabold text-white uppercase tracking-wider flex items-center gap-2"><Activity size={16} className="text-blue-400" /> Live Active Trades ({openTrades.length})</h3>
              {displayRegularPnL !== 0 && (
                <div className={`text-xs font-mono font-bold flex items-center gap-1 px-3 py-1 rounded-xl border ${displayRegularPnL >= 0 ? 'bg-green-500/10 text-green-400 border-green-500/20' : 'bg-red-500/10 text-red-400 border-red-500/20'}`}>
                  Unrealized PnL: {displayRegularPnL >= 0 ? '+' : ''}{"$"}{(displayRegularPnL).toFixed(2)}
                </div>
              )}
            </div>

            {openTrades.length === 0 ? (
              <div className="py-8 bg-[#0B0E14] border border-dashed border-white/10 rounded-2xl text-center text-gray-500">
                <Briefcase size={30} className="mx-auto text-gray-600 mb-2" />
                <p className="text-sm font-bold text-white">No regular open positions</p>
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
                      const livePrice = getLivePrice(trade.symbol) ?? trade.openPrice;
                      const isLong = trade.type === 'BUY' || trade.type === 'LONG';
                      const diff = isLong ? (livePrice - trade.openPrice) : (trade.openPrice - livePrice);
                      const pnl = (diff / trade.openPrice) * (trade.volume * trade.openPrice);
                      const isProfitable = pnl >= 0;
                      const calculatedMargin = trade.margin ?? ((trade.volume * trade.openPrice) / (trade.leverage ?? 1));

                      return (
                        <tr key={trade.id ?? idx} className="hover:bg-white/[0.02] transition-colors">
                          <td className="p-3.5">
                            <div className="flex items-center gap-2">
                              <span className={`px-2 py-0.5 rounded text-[10px] font-extrabold ${isLong ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
                                {isLong ? 'BUY' : 'SELL'}
                              </span>
                              <span className="font-extrabold text-white">{trade.symbol}</span>
                            </div>
                          </td>
                          <td className="p-3.5 text-gray-300">{trade.leverage ?? 1}x</td>
                          <td className="p-3.5 text-gray-300">{"$"}{trade.openPrice.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                          <td className="p-3.5 text-blue-400 font-bold">{"$"}{livePrice.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                          <td className="p-3.5 text-yellow-400">{"$"}{calculatedMargin.toFixed(2)}</td>
                          <td className={`p-3.5 text-right font-bold ${isProfitable ? 'text-green-400' : 'text-red-400'}`}>
                            <div className="flex items-center justify-end gap-1">
                              {isProfitable ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}
                              {isProfitable ? '+' : ''}{"$"}{pnl.toFixed(2)}
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
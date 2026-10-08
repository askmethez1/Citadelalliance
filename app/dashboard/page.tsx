"use client";

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { 
  Crown, TrendingUp, ArrowUpRight, ArrowDownLeft, 
  Ban, CreditCard, History, MessageSquare, 
  ShieldAlert, Settings, Eye, X, Activity, 
  DollarSign, Briefcase, ArrowDownRight, Award, Gift, CheckCircle2
} from 'lucide-react';
import Link from 'next/link';
import Sidebar from './components/Sidebar';
import TopHeader from './components/TopHeader';
import TradingTerminal from './components/TradingTerminal';
import RecentTrades from './components/RecentTrades';
import RecentActivity from './components/RecentActivity';
import DashboardSkeleton from './components/DashboardSkeleton';
import NotificationModal, { ModalType } from '@/app/components/ui/NotificationModal';
import UserSignalsView from './components/UserSignalsView';

import { getUserRole, checkBanStatus, logoutUser } from '@/app/actions/auth';
import { getWalletOverview, claimSignupBonus } from '@/app/actions/wallet';
import { getUserProfile } from '@/app/actions/profile'; // <-- Fetches user profile for Pro status
import { useWalletEngine } from '@/app/hooks/useWalletEngine';
import { usePricingEngine } from '@/app/hooks/usePricingEngine';

// Configuration for static placeholder tabs
const TAB_CONTENT: Record<string, any> = {
  wallet: { icon: ArrowDownLeft, color: 'text-blue-500', bg: 'bg-blue-500/10', title: 'Wallet & Deposits', desc: 'Fund your account and manage withdrawals here.' },
  copy: { icon: Crown, color: 'text-yellow-500', bg: 'bg-yellow-500/10', title: 'Copy Trading Masters', desc: 'Browse top-performing quantitative traders and mirror their execution algorithms.' },
  'buy-crypto': { icon: CreditCard, color: 'text-purple-500', bg: 'bg-purple-500/10', title: 'Buy Crypto', desc: 'Purchase digital assets instantly via credit card or bank transfer.' },
  statement: { icon: History, color: 'text-blue-400', bg: 'bg-blue-400/10', title: 'Account Statement', desc: 'Detailed historical ledger of all your trades, deposits, and fees.' },
  chat: { icon: MessageSquare, color: 'text-gray-400', bg: 'bg-gray-500/10', title: 'Trader Chat', desc: 'Connect with customer support or your designated account manager.' },
  security: { icon: ShieldAlert, color: 'text-gray-300', bg: 'bg-gray-400/10', title: 'Security Settings', desc: 'Manage your credentials, 2FA, and personal details.' },
  profile: { icon: Settings, color: 'text-gray-300', bg: 'bg-gray-400/10', title: 'Profile Settings', desc: 'Manage your credentials, 2FA, and personal details.' }
};

export default function DashboardPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState('terminal');
  const [location, setLocation] = useState('Detecting...');
  const [isInitializing, setIsInitializing] = useState(true);
  const [isBanned, setIsBanned] = useState(false);
  const [isBreakdownOpen, setIsBreakdownOpen] = useState(false);
  
  // Database-backed State for Signup Bonus & Pro Status
  const [hasClaimedBonus, setHasClaimedBonus] = useState(false);
  const [localBonusBalance, setLocalBonusBalance] = useState(0);
  const [isClaiming, setIsClaiming] = useState(false);
  const [isProUser, setIsProUser] = useState(false); // <-- Tracks Pro Status
  
  const [modalConfig, setModalConfig] = useState<{isOpen: boolean; title?: string; message: string; type: ModalType}>({ isOpen: false, message: '', type: 'info' });
  const showAlert = (message: string, type: ModalType = 'info', title?: string) => setModalConfig({ isOpen: true, message, type, title });

  // Hook into Wallet & Pricing Engines
  const walletEngine = useWalletEngine() as any; 
  const { balance, liveEquity, floatingPnL, marginUtilized, activeCopiers, isWalletLoading, refreshWallet, openTrades = [] } = walletEngine;
  
  // Combine Wallet Engine state with Local Component state for seamless UI updates
  const displayBonusBalance = walletEngine.bonusBalance !== undefined && walletEngine.bonusBalance > 0 
    ? walletEngine.bonusBalance 
    : localBonusBalance;
  
  const displayTotalBalance = balance + displayBonusBalance;

  const { getLivePrice } = usePricingEngine();

  // Initial Load Config (Fetches bonus & pro status from database)
  useEffect(() => {
    const fetchInitialAuth = async () => {
      try {
        if (await checkBanStatus()) return setIsBanned(true);
        if (await getUserRole() === 'admin') return router.replace('/admin/dashboard');

        // Check if user is already Pro to hide the banner
        const profile = await getUserProfile();
        if (profile?.isPro) {
          setIsProUser(true);
        }

        // Fetch user's wallet overview to know if they already claimed the bonus
        const walletData = await getWalletOverview();
        if (walletData) {
          setHasClaimedBonus(walletData.hasClaimedBonus);
          setLocalBonusBalance(walletData.bonusBalance);
        }

        fetch('https://ipapi.co/json/').then(res => res.ok ? res.json() : null)
          .then(data => data && setLocation(`${data.city}, ${data.country_name}`))
          .catch(() => setLocation('Location Unavailable'));
      } finally {
        setIsInitializing(false);
      }
    };
    fetchInitialAuth();
  }, [router]);

  // AUTO-REFRESH BALANCES GLOBALLY (Every 5 seconds)
  useEffect(() => {
    const interval = setInterval(() => {
      refreshWallet();
    }, 5000);
    return () => clearInterval(interval);
  }, [refreshWallet]);

  // Handle claiming the bonus by saving to database
  const handleClaimBonus = async () => {
    if (hasClaimedBonus) return;
    setIsClaiming(true);
    
    try {
      const res = await claimSignupBonus();
      if (res.success) {
        setHasClaimedBonus(true);
        setLocalBonusBalance(prev => prev + 100);
        refreshWallet(); // Refresh engine just to be safe
        showAlert(res.message, 'success', 'Bonus Claimed!');
      } else {
        showAlert(res.message, 'error', 'Claim Failed');
      }
    } catch (error) {
      showAlert("An error occurred while claiming your bonus.", 'error');
    } finally {
      setIsClaiming(false);
    }
  };

  if (isInitializing || isWalletLoading) return <DashboardSkeleton activeTab={activeTab} location={location} />;

  if (isBanned) {
    return (
      <div className="min-h-screen bg-[#0B0E14] text-gray-300 font-sans flex selection:bg-red-500/30">
        <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} location={location} isBanned={true} />
        <main className="flex-1 flex flex-col items-center justify-center p-4 relative overflow-hidden">
          <div className="bg-[#151924] border border-red-500/20 rounded-3xl p-6 sm:p-8 max-w-md w-full text-center shadow-2xl relative z-10 mx-auto">
            <div className="w-20 h-20 bg-red-500/10 border border-red-500/20 rounded-full flex items-center justify-center mx-auto mb-6"><Ban size={36} className="text-red-500" /></div>
            <h1 className="text-xl sm:text-2xl font-extrabold text-white mb-3">Account Suspended</h1>
            <p className="text-gray-400 text-sm mb-8">Your system access has been revoked. Contact compliance.</p>
            <button onClick={() => logoutUser().then(() => router.push('/'))} className="w-full py-3.5 bg-red-600 hover:bg-red-500 text-white rounded-xl text-sm font-bold">Log Out</button>
          </div>
        </main>
      </div>
    );
  }

  const activeTabContent = TAB_CONTENT[activeTab];

  return (
    <div className="min-h-screen bg-[#0B0E14] text-gray-300 font-sans flex selection:bg-blue-500/30">
      <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} location={location} />

      <main className="flex-1 flex flex-col min-h-screen relative min-w-0 overflow-x-hidden">
        <TopHeader />

        <div className="flex-1 p-4 sm:p-6 lg:p-8 w-full">
          <div className="max-w-7xl mx-auto space-y-6">

            {activeTab === 'terminal' && (
              <>
                {/* PRO TERMINAL BANNER - HIDDEN FOR PRO USERS */}
                {!isProUser && (
                  <div className="w-full rounded-2xl bg-gradient-to-r from-blue-900/40 via-blue-800/20 to-[#0B0E14] border border-blue-500/30 p-5 sm:p-6 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6 relative overflow-hidden">
                    <div className="absolute -right-20 -top-20 w-64 h-64 bg-blue-500/20 rounded-full blur-3xl pointer-events-none"></div>
                    <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 sm:gap-5 relative z-10 w-full lg:w-auto">
                      <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-blue-600 flex items-center justify-center text-white shrink-0 shadow-xl border border-blue-400/50"><Crown size={24} className="sm:w-7 sm:h-7" /></div>
                      <div>
                        <div className="flex flex-wrap items-center gap-2 mb-1">
                          <h3 className="text-lg sm:text-xl font-extrabold text-white">Upgrade to Pro Terminal</h3>
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-yellow-500/20 text-yellow-500 uppercase tracking-wider">Recommended</span>
                        </div>
                        <p className="text-xs sm:text-sm text-gray-400 max-w-xl mt-1 sm:mt-0">Unlock sub-12ms execution latency, unlimited algorithmic trading orders, and direct consultation calls.</p>
                      </div>
                    </div>
                    <Link href="/dashboard/upgrade" className="shrink-0 w-full lg:w-auto px-6 sm:px-8 py-3.5 bg-white text-black hover:bg-gray-200 rounded-xl lg:rounded-full text-sm font-bold flex items-center justify-center gap-2 relative z-10 transition-colors">
                      View Pricing Plans <ArrowUpRight size={18} className="text-gray-600" />
                    </Link>
                  </div>
                )}

                {/* SIGNUP BONUS CALL TO ACTION */}
                {!hasClaimedBonus && (
                  <div 
                    onClick={handleClaimBonus}
                    className="w-full rounded-2xl bg-gradient-to-r from-purple-900/40 via-purple-800/20 to-[#0B0E14] border border-purple-500/30 p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 cursor-pointer hover:border-purple-500/60 transition-all group"
                  >
                    <div className="flex items-start sm:items-center gap-3 sm:gap-4 w-full sm:w-auto">
                      <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-purple-500/20 flex items-center justify-center text-purple-400 shrink-0 group-hover:scale-110 transition-transform">
                        <Gift size={20} className="sm:w-6 sm:h-6" />
                      </div>
                      <div>
                        <h3 className="text-white font-bold text-base sm:text-lg flex flex-wrap items-center gap-2">
                          Claim your $100 Signup Bonus
                        </h3>
                        <p className="text-xs text-gray-400 mt-0.5">Trade with bonus funds. Double it to unlock withdrawals.</p>
                      </div>
                    </div>
                    
                    <div className="flex items-center justify-end w-full sm:w-auto gap-3 mt-2 sm:mt-0">
                      <span className="text-sm font-bold text-purple-400">Click to Claim</span>
                      <div className={`w-8 h-8 rounded-full border-2 flex items-center justify-center shrink-0 transition-all ${isClaiming ? 'border-purple-500 opacity-50' : 'border-purple-500 group-hover:bg-purple-500/20'}`}>
                        {isClaiming ? (
                          <div className="w-4 h-4 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
                        ) : (
                          <CheckCircle2 size={20} className="text-purple-500 opacity-0 group-hover:opacity-100 transition-opacity" />
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {/* METRICS GRID */}
                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
                  
                  {/* Total Balance Card */}
                  <div 
                    onClick={() => setIsBreakdownOpen(true)}
                    className="bg-[#151924] border border-white/5 hover:border-blue-500/40 rounded-2xl p-5 shadow-lg relative overflow-hidden cursor-pointer transition-all group flex flex-col justify-between"
                  >
                    <div className="absolute top-0 right-0 w-24 h-24 bg-blue-500/5 rounded-full blur-2xl group-hover:bg-blue-500/10 transition-colors"></div>
                    <div className="flex items-center justify-between text-gray-500 text-xs font-medium mb-3 uppercase tracking-wider relative z-10">
                      <span>Total Balance</span>
                      <Eye size={14} className="text-blue-400 opacity-50 group-hover:opacity-100 transition-opacity" />
                    </div>
                    <div className="text-2xl sm:text-3xl font-mono font-bold text-white mb-2 flex flex-wrap items-center gap-2 relative z-10 truncate">
                      ${displayTotalBalance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </div>
                    <div className="flex flex-col gap-1.5 relative z-10">
                      {displayBonusBalance > 0 && (
                        <span className="px-2 py-0.5 w-max rounded text-[9px] font-bold bg-purple-500/20 text-purple-400 uppercase tracking-wider flex items-center gap-1">
                          <CheckCircle2 size={10} /> +${displayBonusBalance.toFixed(2)} Bonus
                        </span>
                      )}
                      <div className="text-xs text-gray-500 flex items-center gap-1">
                        Unrealized PnL: <span className={`font-mono font-bold ${floatingPnL > 0 ? 'text-green-500' : floatingPnL < 0 ? 'text-red-500' : 'text-gray-400'}`}>{floatingPnL > 0 ? '+' : ''}{floatingPnL.toFixed(2)} USDT</span>
                      </div>
                    </div>
                  </div>

                  {/* Equity Card */}
                  <div 
                    onClick={() => setIsBreakdownOpen(true)}
                    className="bg-[#151924] border border-white/5 hover:border-blue-500/40 rounded-2xl p-5 shadow-lg cursor-pointer transition-all group flex flex-col justify-between"
                  >
                    <div className="flex items-center justify-between text-gray-500 text-xs font-medium mb-3 uppercase tracking-wider">
                      <span>Equity</span>
                      <Eye size={14} className="text-blue-400 opacity-50 group-hover:opacity-100 transition-opacity" />
                    </div>
                    <div className={`text-2xl sm:text-3xl font-mono font-bold mb-2 truncate ${floatingPnL >= 0 ? 'text-white' : 'text-gray-300'}`}>
                      ${liveEquity.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </div>
                    <div className="text-xs flex items-center gap-1 text-gray-500"><TrendingUp size={12} className="text-green-500 shrink-0" /> Live Sync Active</div>
                  </div>

                  {/* Active Copiers */}
                  <div className="bg-[#151924] border border-white/5 rounded-2xl p-5 shadow-lg flex flex-col justify-between">
                    <div className="text-gray-500 text-xs font-medium mb-3 uppercase tracking-wider">Active Copiers</div>
                    <div className="text-2xl sm:text-3xl font-mono font-bold text-white mb-2">{activeCopiers}</div>
                    <Link href="/dashboard/copy-trading" className="text-xs text-blue-400 hover:text-blue-300 transition-colors inline-block mt-auto w-max">Find Masters to copy</Link>
                  </div>

                  {/* Margin Utilization */}
                  <div className="bg-[#151924] border border-white/5 rounded-2xl p-5 shadow-lg flex flex-col justify-between">
                    <div>
                      <div className="text-gray-500 text-xs font-medium mb-3 uppercase tracking-wider">Margin Utilization</div>
                      <div className={`text-2xl sm:text-3xl font-mono font-bold mb-2 ${marginUtilized > 80 ? 'text-red-500' : 'text-white'}`}>{marginUtilized.toFixed(1)}%</div>
                    </div>
                    <div className="w-full h-1.5 bg-white/5 rounded-full mt-3 overflow-hidden">
                      <div className={`h-full rounded-full transition-all ${marginUtilized > 80 ? 'bg-red-500' : 'bg-blue-500'}`} style={{ width: `${Math.min(marginUtilized, 100)}%` }}></div>
                    </div>
                  </div>
                </div>

                <TradingTerminal />
                <RecentTrades />
                <RecentActivity location={location} />
              </>
            )}

            {activeTab === 'signals' && <UserSignalsView balance={balance} refreshWallet={refreshWallet} showAlert={showAlert} />}

            {/* Render Static Tabs Dynamically */}
            {activeTabContent && (
              <div className="bg-[#151924] border border-dashed border-white/10 rounded-3xl p-8 sm:p-12 text-center shadow-lg mt-8 animate-in fade-in zoom-in-95 duration-300">
                <div className={`w-16 h-16 sm:w-20 sm:h-20 ${activeTabContent.bg} rounded-full flex items-center justify-center mx-auto mb-4`}>
                  {React.createElement(activeTabContent.icon, { size: 36, className: `w-8 h-8 sm:w-10 sm:h-10 ${activeTabContent.color}` })}
                </div>
                <h2 className="text-xl sm:text-2xl font-extrabold text-white mb-2">{activeTabContent.title}</h2>
                <p className="text-sm sm:text-base text-gray-500 max-w-md mx-auto">{activeTabContent.desc}</p>
              </div>
            )}

          </div>
        </div>
      </main>

      {/* ACCOUNT BREAKDOWN MODAL */}
      {isBreakdownOpen && (
        <AccountBreakdownModal 
          onClose={() => setIsBreakdownOpen(false)}
          balance={displayTotalBalance}
          bonusBalance={displayBonusBalance}
          liveEquity={liveEquity}
          floatingPnL={floatingPnL}
          openTrades={openTrades}
          getLivePrice={getLivePrice}
        />
      )}

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

// ------------------------------------------------------------------
// ACCOUNT BREAKDOWN MODAL (USER FACING)
// ------------------------------------------------------------------
function AccountBreakdownModal({ 
  onClose, balance, bonusBalance, liveEquity, floatingPnL, openTrades, getLivePrice 
}: { 
  onClose: () => void; 
  balance: number; 
  bonusBalance: number;
  liveEquity: number; 
  floatingPnL: number; 
  openTrades: any[]; 
  getLivePrice: (symbol: string) => number; 
}) {
  const hasActiveTrades = openTrades.length > 0;
  
  // Calculate total margin locked in active trades
  const capitalInTrade = openTrades.reduce((acc, trade) => acc + (trade.margin || ((trade.volume * trade.openPrice) / trade.leverage) || 0), 0);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="bg-[#151924] border border-white/10 rounded-2xl sm:rounded-3xl w-full max-w-5xl max-h-[95vh] sm:max-h-[90vh] overflow-hidden flex flex-col shadow-2xl relative">
        
        {/* Modal Header */}
        <div className="p-4 sm:p-6 border-b border-white/10 flex items-start sm:items-center justify-between gap-4 bg-[#0B0E14] shrink-0">
          <div>
            <h2 className="text-base sm:text-lg font-extrabold text-white flex items-center gap-2">
              Account Margin Breakdown
            </h2>
            <p className="text-xs text-gray-400 mt-1">Live tracking of your wallet funds, bonuses, and active market capital.</p>
          </div>
          <button 
            onClick={onClose} 
            className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-white/5 hover:bg-white/10 flex items-center justify-center text-gray-400 hover:text-white transition-colors shrink-0"
          >
            <X size={18} />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-6 flex-1">
          
          {/* 4-COLUMN BALANCE BREAKDOWN CARDS */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            
            {/* Total Live Equity */}
            <div className="bg-[#0B0E14] border border-blue-500/30 p-4 rounded-2xl relative overflow-hidden flex flex-col justify-center">
              <div className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                <DollarSign size={14} className="text-blue-400 shrink-0" /> Total Live Equity
              </div>
              <div className="text-xl sm:text-2xl font-mono font-extrabold text-white truncate">
                ${liveEquity.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
              <p className="text-[10px] text-gray-400 mt-1.5 line-clamp-1">Total Account Value + PnL</p>
            </div>

            {/* Withdrawable Balance */}
            <div className="bg-[#0B0E14] border border-white/5 p-4 rounded-2xl flex flex-col justify-center">
              <div className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                <ArrowDownLeft size={14} className="text-green-400 shrink-0" /> Withdrawable Funds
              </div>
              <div className="text-xl sm:text-2xl font-mono font-extrabold text-white truncate">
                ${Math.max(0, balance - bonusBalance).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
              <p className="text-[10px] text-gray-400 mt-1.5 line-clamp-1">Liquid capital cleared for withdrawal</p>
            </div>

            {/* Trading Bonus */}
            <div className="bg-[#0B0E14] border border-purple-500/30 p-4 rounded-2xl flex flex-col justify-center">
              <div className="text-[10px] font-bold text-purple-500/70 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                <Award size={14} className="text-purple-400 shrink-0" /> Trading Bonus
              </div>
              <div className="text-xl sm:text-2xl font-mono font-extrabold text-purple-400 truncate">
                ${bonusBalance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
              <p className="text-[10px] text-gray-400 mt-1.5 line-clamp-1">Tradable funds (Non-withdrawable)</p>
            </div>

            {/* In Trade Capital */}
            <div className="bg-[#0B0E14] border border-white/5 p-4 rounded-2xl flex flex-col justify-center">
              <div className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                <Briefcase size={14} className="text-yellow-400 shrink-0" /> Capital in Trade
              </div>
              <div className="text-xl sm:text-2xl font-mono font-extrabold text-yellow-400 truncate">
                ${capitalInTrade.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
              <p className="text-[10px] text-gray-400 mt-1.5 line-clamp-1">Locked margin in active positions</p>
            </div>
          </div>

          {/* ACTIVE TRADES TABLE */}
          <div>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
              <h3 className="text-sm font-extrabold text-white uppercase tracking-wider flex items-center gap-2">
                <Activity size={16} className="text-blue-400 shrink-0" /> Live Position Details
              </h3>
              {floatingPnL !== 0 && (
                <div className={`w-max text-xs font-mono font-bold flex items-center gap-1 px-3 py-1 rounded-xl border ${
                  floatingPnL >= 0 ? 'bg-green-500/10 text-green-400 border-green-500/20' : 'bg-red-500/10 text-red-400 border-red-500/20'
                }`}>
                  Unrealized PnL: {floatingPnL >= 0 ? '+' : ''}${floatingPnL.toFixed(2)}
                </div>
              )}
            </div>

            {!hasActiveTrades ? (
              <div className="py-12 bg-[#0B0E14] border border-dashed border-white/10 rounded-2xl text-center text-gray-500">
                <Briefcase size={36} className="mx-auto text-gray-600 mb-2" />
                <p className="text-sm font-bold text-white">No Active Trades</p>
                <p className="text-xs text-gray-500 mt-1">You currently have zero open market positions.</p>
              </div>
            ) : (
              <div className="overflow-x-auto bg-[#0B0E14] border border-white/5 rounded-2xl custom-scrollbar">
                <table className="w-full text-left font-mono text-xs whitespace-nowrap min-w-[650px]">
                  <thead>
                    <tr className="border-b border-white/10 text-gray-500 uppercase text-[10px] bg-white/[0.02]">
                      <th className="p-3 sm:p-4">Asset / Type</th>
                      <th className="p-3 sm:p-4">Leverage</th>
                      <th className="p-3 sm:p-4">Entry Price</th>
                      <th className="p-3 sm:p-4">Live Price</th>
                      <th className="p-3 sm:p-4">Margin Used</th>
                      <th className="p-3 sm:p-4 text-right">Live PnL</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {openTrades.map((trade, idx) => {
                      const livePrice = getLivePrice(trade.symbol) || trade.openPrice;
                      const isLong = trade.type === 'BUY' || trade.type === 'LONG';
                      const diff = isLong ? (livePrice - trade.openPrice) : (trade.openPrice - livePrice);
                      const pnl = (diff / trade.openPrice) * (trade.volume * trade.openPrice) * (trade.leverage || 1);
                      const isProfitable = pnl >= 0;
                      const margin = trade.margin || ((trade.volume * trade.openPrice) / trade.leverage);

                      return (
                        <tr key={trade.id || idx} className="hover:bg-white/[0.02] transition-colors">
                          <td className="p-3 sm:p-4">
                            <div className="flex items-center gap-2">
                              <span className={`px-2 py-0.5 rounded text-[10px] font-extrabold ${
                                isLong ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'
                              }`}>
                                {isLong ? 'BUY' : 'SELL'}
                              </span>
                              <span className="font-extrabold text-white">{trade.symbol}</span>
                            </div>
                          </td>
                          <td className="p-3 sm:p-4 text-gray-300">{trade.leverage || 1}x</td>
                          <td className="p-3 sm:p-4 text-gray-300">${trade.openPrice.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                          <td className="p-3 sm:p-4 text-blue-400 font-bold">${livePrice.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                          <td className="p-3 sm:p-4 text-yellow-400">${(margin || 0).toFixed(2)}</td>
                          <td className={`p-3 sm:p-4 text-right font-bold ${isProfitable ? 'text-green-400' : 'text-red-400'}`}>
                            <div className="flex items-center justify-end gap-1">
                              {isProfitable ? <ArrowUpRight size={14} className="shrink-0" /> : <ArrowDownRight size={14} className="shrink-0" />}
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

        {/* Modal Footer */}
        <div className="p-4 border-t border-white/10 bg-[#0B0E14] flex justify-end shrink-0">
          <button 
            onClick={onClose} 
            className="w-full sm:w-auto px-6 py-3 bg-white/10 hover:bg-white/20 text-white rounded-xl text-xs sm:text-sm font-bold transition-all"
          >
            Close Breakdown
          </button>
        </div>

      </div>
    </div>
  );
}
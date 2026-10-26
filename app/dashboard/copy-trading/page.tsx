// PATH: app/dashboard/copy-trading/page.tsx

"use client";

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import Sidebar from '../components/Sidebar';
import TopHeader from '../components/TopHeader';
import DashboardSkeleton from '../components/DashboardSkeleton';
import NotificationModal, { ModalType } from '@/app/components/ui/NotificationModal';
import Pagination from '@/app/components/ui/Pagination';
import ProLockScreen from '../components/ProLockScreen';
import {
  Users, Search, Activity, Loader2, Wallet, Users2, ShieldCheck, CheckCircle2
} from 'lucide-react';

import { getUserProfile } from '@/app/actions/profile';
import { createActiveCopy } from '@/app/actions/copytrading';
import { useWalletEngine } from '@/app/hooks/useWalletEngine';
import { TRADERS, MasterTrader } from '@/app/config/traders';

const MIN_ALLOCATION = 1000;

export default function CopyTradingPage() {
  const [sidebarTab, setSidebarTab] = useState('copy-trading');
  const [userCountry, setUserCountry] = useState('Nigeria');

  const walletEngine = useWalletEngine() as any;
  const availableBalance = walletEngine.balance || 0;
  const isWalletLoading = walletEngine.isWalletLoading;

  const [isInitialLoad, setIsInitialLoad] = useState(true);
  const [isLoading, setIsLoading] = useState(true);
  const [hasPaidAccess, setHasPaidAccess] = useState(false);
  const [processingId, setProcessingId] = useState<string | null>(null);

  const [traders, setTraders] = useState<MasterTrader[]>([]);
  const [allocations, setAllocations] = useState<Record<string, string>>({});
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState<number>(1);
  const itemsPerPage = 9;

  const [modalConfig, setModalConfig] = useState<{ isOpen: boolean; title?: string; message: string; type: ModalType; }>({
    isOpen: false, message: '', type: 'info'
  });

  const loadData = async () => {
    setIsLoading(true);

    const profile = await getUserProfile();

    if (profile?.country) setUserCountry(profile.country);
    if (profile?.isPro) setHasPaidAccess(true);

    const formattedTraders: MasterTrader[] = TRADERS.map((t) => ({
      ...t,
      minCopy: MIN_ALLOCATION,
    }));

    setTraders(formattedTraders);
    setIsLoading(false);
    setIsInitialLoad(false);
  };

  useEffect(() => {
    loadData();
  }, []);

  const showAlert = (message: string, type: ModalType = 'info', title?: string) => {
    setModalConfig({ isOpen: true, message, type, title });
  };

  const executeCopyTrade = async (trader: MasterTrader) => {
    if (processingId) return;

    const requestedAmount = parseFloat(allocations[trader.id] ?? String(MIN_ALLOCATION));

    if (isNaN(requestedAmount) || requestedAmount < MIN_ALLOCATION) {
      return showAlert(`The minimum allocation amount for all Master Traders is $${MIN_ALLOCATION}.`, "warning", "Invalid Amount");
    }

    if (availableBalance < requestedAmount) {
      return showAlert(
        `Insufficient real balance. You need $${requestedAmount.toFixed(2)} but have $${availableBalance.toFixed(2)}. Bonus funds can't be used for copy trading.`,
        "error",
        "Balance Error"
      );
    }

    setProcessingId(trader.id);

    try {
      const res = await createActiveCopy(
        parseInt(trader.id, 10) || 1,
        requestedAmount,
        100, // Valid entry price
        null,
        null
      );

      if (res.success) {
        if (walletEngine.refreshWallet) {
          walletEngine.refreshWallet();
        }

        showAlert(
          `Successfully allocated $${requestedAmount.toLocaleString()} to mirror ${trader.name}. View it in My Copyings.`,
          'success',
          'Copy Trade Activated'
        );

        setAllocations(prev => ({ ...prev, [trader.id]: String(MIN_ALLOCATION) }));
      } else {
        showAlert(res.error || "Execution failed. Please try again.", "error", "Copy Trade Failed");
      }
    } catch {
      showAlert("Unexpected error. Please try again.", "error");
    } finally {
      setProcessingId(null);
    }
  };

  const preFilteredTraders = traders.filter(t =>
    t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    t.strategy?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const totalPages = Math.ceil(preFilteredTraders.length / itemsPerPage) || 1;
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentDisplayedTraders = preFilteredTraders.slice(indexOfFirstItem, indexOfLastItem);

  useEffect(() => {
    if (currentPage > totalPages) setCurrentPage(1);
  }, [searchQuery, totalPages, currentPage]);

  if (isInitialLoad || isWalletLoading) return <DashboardSkeleton activeTab={sidebarTab} location={userCountry} />;

  if (!hasPaidAccess) {
    return (
      <div className="min-h-screen bg-[#0B0E14] text-gray-300 font-sans flex selection:bg-blue-500/30 w-full relative">
        <Sidebar activeTab={sidebarTab} setActiveTab={setSidebarTab} location={userCountry} />
        <main className="flex-1 flex flex-col min-h-screen relative min-w-0 overflow-x-hidden">
          <TopHeader />
          <ProLockScreen
            featureName="Copy Trading Plaza"
            description="The Copy Trading Plaza is an exclusive feature for Pro users. To unlock automated mirroring, algorithmic execution, and our elite Master Traders, you must upgrade your account."
          />
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0B0E14] text-gray-300 font-sans flex selection:bg-blue-500/30 w-full relative">
      <Sidebar activeTab={sidebarTab} setActiveTab={setSidebarTab} location={userCountry} />

      <main className="flex-1 flex flex-col min-h-screen relative min-w-0 overflow-x-hidden">
        <TopHeader />

        <div className="flex-1 p-4 sm:p-6 lg:p-8 w-full flex flex-col">
          <div className="max-w-7xl mx-auto space-y-8 w-full flex-1 flex flex-col">

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/5 pb-6">
              <div>
                <h1 className="text-3xl sm:text-4xl font-extrabold text-white mb-2 tracking-tight flex items-center gap-3">
                  <Users className="text-blue-500" size={32} /> Copy Trading Plaza
                </h1>
                <p className="text-gray-400 text-sm">Join the AI Network Anniversary. Allocate funds to elite Master Traders.</p>
              </div>

              <div className="flex flex-col sm:flex-row items-center gap-4">
                <Link href="/dashboard/copy-trading/active" className="flex items-center gap-2 px-5 py-3 bg-blue-600 hover:bg-blue-500 text-white font-bold text-sm rounded-xl transition-all shadow-lg shadow-blue-600/20 w-full sm:w-auto justify-center">
                  <Activity size={18} /> My Copyings
                </Link>

                <div className="flex items-center gap-3 bg-[#151924] border border-white/10 px-5 py-3 rounded-xl w-full sm:w-auto">
                  <Wallet size={18} className="text-gray-400" />
                  <div>
                    <div className="text-[10px] text-gray-500 font-bold uppercase">Available Balance</div>
                    <div className="text-sm font-mono font-extrabold text-white">
                      {"$"}{availableBalance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-[#151924] border border-white/5 p-4 rounded-2xl">
              <div className="relative w-full">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500" size={16}/>
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search Master Trader..."
                  className="w-full bg-[#0B0E14] border border-white/10 rounded-xl py-2.5 pl-10 pr-4 text-xs text-white focus:outline-none focus:border-blue-500 transition-colors"
                />
              </div>
            </div>

            <div className="flex-1 flex flex-col justify-center min-h-[40vh]">
              {isLoading ? (
                <div className="flex flex-col items-center justify-center py-20 w-full gap-3 text-blue-500">
                  <Loader2 className="w-6 h-6 animate-spin" />
                  <span className="text-sm font-medium text-gray-400">Loading Master Traders...</span>
                </div>
              ) : preFilteredTraders.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 w-full gap-3 text-gray-500">
                  <span className="text-sm font-medium">No Master Traders found matching your criteria.</span>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {currentDisplayedTraders.map((trader) => (
                    <div key={trader.id} className="bg-[#151924] border border-white/5 hover:border-white/20 rounded-3xl p-6 shadow-xl transition-all flex flex-col justify-between">
                      <div>
                        <div className="flex items-center justify-between mb-4">
                          <div className="flex items-center gap-3">
                            <img src={trader.avatar} alt={trader.name} className="w-12 h-12 rounded-2xl bg-[#0B0E14] border border-white/10 p-1 object-cover" />
                            <div>
                              <h3 className="text-base font-bold text-white flex items-center gap-1.5">
                                {trader.name} <ShieldCheck size={14} className="text-blue-500" />
                              </h3>
                              <p className="text-[10px] text-gray-400 font-bold uppercase">
                                {trader.strategy}
                              </p>
                            </div>
                          </div>
                        </div>

                        <div className="bg-[#0B0E14] border border-white/5 rounded-xl p-3 mb-4">
                          <div className="grid grid-cols-2 gap-4 text-[10px] text-gray-500 font-mono">
                            <div className="flex flex-col gap-1">
                              <span>30D PnL</span>
                              <span className="text-green-400 font-bold">{trader.pnl30d}</span>
                            </div>
                            <div className="flex flex-col gap-1">
                              <span>ROI (7d)</span>
                              <span className="text-white font-bold">{trader.roi7d}%</span>
                            </div>
                            <div className="flex flex-col gap-1">
                              <span>Copiers</span>
                              <span className="text-white font-bold flex items-center gap-1">
                                <Users2 size={10} /> {trader.copiers} / {trader.maxCopiers}
                              </span>
                            </div>
                            <div className="flex flex-col gap-1">
                              <span>AUM</span>
                              <span className="text-blue-400 font-bold">{trader.aum}</span>
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="space-y-3">
                        <div className="bg-[#0B0E14] border border-white/5 p-3 rounded-xl">
                          <div className="flex items-center justify-between">
                            <span className="text-[11px] text-gray-500 font-bold ml-1 uppercase">Allocation</span>
                            <div className="relative w-28">
                              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-xs font-bold">{"$"}</span>
                              <input
                                type="number"
                                min={MIN_ALLOCATION}
                                placeholder={String(MIN_ALLOCATION)}
                                value={allocations[trader.id] !== undefined ? allocations[trader.id] : String(MIN_ALLOCATION)}
                                onChange={(e) => setAllocations(prev => ({ ...prev, [trader.id]: e.target.value }))}
                                className="w-full bg-[#151924] border border-white/10 rounded-lg py-1.5 pl-6 pr-3 text-white text-xs font-mono focus:outline-none focus:border-blue-500 transition-colors"
                              />
                            </div>
                          </div>
                        </div>

                        <button
                          onClick={() => executeCopyTrade(trader)}
                          disabled={processingId !== null}
                          className="w-full py-3 bg-white text-black hover:bg-gray-200 rounded-xl text-xs font-bold transition-all shadow-lg flex items-center justify-center gap-2 disabled:opacity-50"
                        >
                          {processingId === trader.id ? (
                            <><Loader2 size={14} className="animate-spin" /> Mirroring Strategy...</>
                          ) : (
                            <><CheckCircle2 size={14} /> Copy Trade (Min: {"$"}{MIN_ALLOCATION})</>
                          )}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {!isLoading && preFilteredTraders.length > 0 && (
              <Pagination
                currentPage={currentPage}
                totalPages={totalPages}
                onPageChange={setCurrentPage}
                totalItems={preFilteredTraders.length}
                itemsPerPage={itemsPerPage}
                itemLabel="Master Traders"
                className="bg-[#151924] border border-white/5 rounded-2xl p-4 mt-auto"
              />
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

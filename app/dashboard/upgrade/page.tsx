"use client";

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Sidebar from '../components/Sidebar';
import TopHeader from '../components/TopHeader';
import NotificationModal, { ModalType } from '@/app/components/ui/NotificationModal';
import { useWalletEngine } from '@/app/hooks/useWalletEngine';
import { upgradeToProPlan } from '@/app/actions/subscription';
import { getUserProfile } from '@/app/actions/profile';
import { Crown, CheckCircle2, Loader2, ArrowRight, Wallet, Check } from 'lucide-react';
import Link from 'next/link';

export default function UpgradePage() {
  const router = useRouter();
  const [sidebarTab, setSidebarTab] = useState('upgrade');
  
  const walletEngine = useWalletEngine() as any;
  const realBalance = walletEngine.balance || 0;
  const isWalletLoading = walletEngine.isWalletLoading;

  const [isProcessing, setIsProcessing] = useState(false);
  const [isAnnual, setIsAnnual] = useState(true); 
  const [userProfile, setUserProfile] = useState<any>(null);
  
  const [modalConfig, setModalConfig] = useState<{ isOpen: boolean; title?: string; message: string; type: ModalType; }>({
    isOpen: false, message: '', type: 'info'
  });

  useEffect(() => {
    getUserProfile().then(p => setUserProfile(p));
  }, []);

  const currentPlan = userProfile?.proPlanType?.toLowerCase();
  const isPro = userProfile?.isPro;

  // Determine dynamic cost
  let PRO_COST = isAnnual ? 960 : 100;
  let upgradeLabel = "Pro Terminal Access";

  // Prorated upgrade math: If they are on monthly, subtract the $100 they already paid from the yearly cost
  if (isPro && currentPlan === 'monthly' && isAnnual) {
    PRO_COST = 860;
    upgradeLabel = "Upgrade to Annual (Prorated: -$100)";
  }

  // Prevent paying for a plan they already have
  const isAlreadyOnSelectedPlan = 
    (isPro && currentPlan === 'monthly' && !isAnnual) || 
    (isPro && currentPlan === 'annual' && isAnnual);

  const canAfford = realBalance >= PRO_COST;

  const showAlert = (message: string, type: ModalType, title?: string) => {
    setModalConfig({ isOpen: true, message, type, title });
  };

  const handlePayment = async () => {
    if (!canAfford || isAlreadyOnSelectedPlan) return;
    
    setIsProcessing(true);
    // Pass the calculated amount and plan type to the backend
    const res = await upgradeToProPlan(PRO_COST, isAnnual ? 'annual' : 'monthly');
    
    if (res.success) {
      if (walletEngine.refreshWallet) walletEngine.refreshWallet();
      showAlert("Payment successful! Redirecting...", "success", "Welcome to Pro");
      
      // Update local profile state immediately so buttons disable
      setUserProfile((prev: any) => ({ ...prev, isPro: true, proPlanType: isAnnual ? 'annual' : 'monthly' }));

      setTimeout(() => {
        router.push('/dashboard/copy-trading');
      }, 2000);
    } else {
      showAlert(res.message, "error", "Payment Failed");
    }
    setIsProcessing(false);
  };

  return (
    <div className="min-h-screen bg-[#0B0E14] text-gray-300 font-sans flex selection:bg-blue-500/30">
      <Sidebar activeTab={sidebarTab} setActiveTab={setSidebarTab} location="Detecting..." />

      <main className="flex-1 flex flex-col min-h-screen relative min-w-0">
        <TopHeader />

        <div className="flex-1 p-4 sm:p-6 flex items-center justify-center">
          <div className="bg-[#151924] border border-white/5 rounded-3xl p-8 max-w-lg w-full shadow-2xl relative overflow-hidden">
            <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/5 rounded-full blur-3xl pointer-events-none"></div>

            <div className="text-center mb-8 relative z-10">
              <div className="w-16 h-16 bg-blue-500/10 border border-blue-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <Crown size={28} className="text-blue-500" />
              </div>
              <h1 className="text-2xl font-extrabold text-white mb-2">Upgrade to Pro</h1>
              <p className="text-sm text-gray-400">Unlock the Copy Trading Plaza and algorithmic execution.</p>
            </div>

            {/* BILLING TOGGLE */}
            <div className="flex items-center justify-center gap-4 mb-8 relative z-10">
              <span className={`text-sm font-bold ${!isAnnual ? 'text-white' : 'text-gray-500'}`}>Monthly</span>
              <button 
                onClick={() => setIsAnnual(!isAnnual)}
                className="w-14 h-7 rounded-full bg-blue-600/20 border border-blue-500/50 flex items-center px-1 transition-all"
              >
                <div className={`w-5 h-5 rounded-full bg-blue-500 transition-transform ${isAnnual ? 'translate-x-7' : 'translate-x-0'}`}></div>
              </button>
              <span className={`text-sm font-bold flex items-center gap-2 ${isAnnual ? 'text-white' : 'text-gray-500'}`}>
                Annually <span className="px-2 py-0.5 rounded-full bg-green-500/20 text-green-400 text-xs">-20%</span>
              </span>
            </div>

            <div className="bg-[#0B0E14] border border-white/10 rounded-2xl p-6 mb-8 relative z-10 space-y-4">
              <div className="flex justify-between items-center border-b border-white/5 pb-4">
                <div className="flex flex-col">
                  <span className="text-white text-sm font-bold">{upgradeLabel}</span>
                  <span className="text-gray-500 text-xs">
                    {isAnnual ? (isPro && currentPlan === 'monthly' ? 'Billed once at prorated rate' : 'Billed at $960 per year') : 'Billed at $100 per month'}
                  </span>
                </div>
                <span className="text-white font-mono font-bold text-xl">${PRO_COST.toFixed(2)}</span>
              </div>
              
              <div className="flex justify-between items-center pt-2">
                <span className="text-gray-400 text-sm flex items-center gap-2">
                  <Wallet size={16} className="text-blue-400"/> Your Real Balance
                </span>
                {isWalletLoading ? (
                  <Loader2 size={14} className="animate-spin text-blue-500" />
                ) : (
                  <span className={`font-mono font-bold ${canAfford || isAlreadyOnSelectedPlan ? 'text-green-400' : 'text-red-400'}`}>
                    ${realBalance.toFixed(2)}
                  </span>
                )}
              </div>
            </div>

            <div className="relative z-10">
              {isAlreadyOnSelectedPlan ? (
                 <button disabled className="w-full py-4 bg-green-500/10 border border-green-500/30 text-green-400 rounded-xl font-bold flex items-center justify-center gap-2">
                   <Check size={18} /> Active Subscription
                 </button>
              ) : (
                !isWalletLoading && (
                  canAfford ? (
                    <button 
                      onClick={handlePayment}
                      disabled={isProcessing}
                      className="w-full py-4 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-bold transition-all shadow-lg shadow-blue-600/20 flex items-center justify-center gap-2 disabled:opacity-50"
                    >
                      {isProcessing ? <><Loader2 size={18} className="animate-spin"/> Processing Payment...</> : <><CheckCircle2 size={18}/> Pay ${PRO_COST} & Upgrade</>}
                    </button>
                  ) : (
                    <div className="space-y-3">
                      <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-xs text-center font-medium">
                        Insufficient balance. You need ${ (PRO_COST - realBalance).toFixed(2) } more.
                      </div>
                      <Link href="/dashboard/wallet" className="w-full py-4 bg-white hover:bg-gray-200 text-black rounded-xl font-bold transition-all flex items-center justify-center gap-2">
                        Deposit Funds <ArrowRight size={18}/>
                      </Link>
                    </div>
                  )
                )
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
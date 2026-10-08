"use client";

import React, { useState, useEffect } from 'react';
import Sidebar from '@/app/dashboard/components/Sidebar';
import TopHeader from '@/app/dashboard/components/TopHeader';
import NotificationModal, { ModalType } from '@/app/components/ui/NotificationModal';
import { 
  CreditCard, ExternalLink, Globe, ShieldCheck, 
  ArrowRight, Copy, Check
} from 'lucide-react';
import { getUserProfile } from '@/app/actions/profile';

interface OnRampProvider {
  name: string;
  tagline: string;
  regions: string[];
  supportedPayment: string;
  url: string;
  recommendedFor: string;
}

const PROVIDERS: OnRampProvider[] = [
  {
    name: "MoonPay",
    tagline: "Instant card & Faster Payments setup for UK & Europe",
    regions: ["UK", "Europe", "US", "Global"],
    supportedPayment: "Visa, Mastercard, UK Faster Payments, Apple Pay",
    url: "https://www.moonpay.com/buy",
    recommendedFor: "United Kingdom & Europe"
  },
  {
    name: "Banxa",
    tagline: "Low fee local bank transfers & Instant Card checkout",
    regions: ["UK", "Australia", "Europe", "US"],
    supportedPayment: "SEPA, Faster Payments, Credit Card, Google Pay",
    url: "https://banxa.com/",
    recommendedFor: "UK & International Bank Transfers"
  },
  {
    name: "Ramp Network",
    tagline: "Fast open-banking payouts & global fiat support",
    regions: ["UK", "Europe", "US", "Global"],
    supportedPayment: "Revolut Pay, Open Banking, Credit Card",
    url: "https://ramp.network/buy",
    recommendedFor: "Fastest Open Banking"
  },
  {
    name: "Transak",
    tagline: "Non-custodial buy/sell widget supporting 160+ countries",
    regions: ["Global", "UK", "Asia", "Americas"],
    supportedPayment: "Bank Transfer, Debit Card, Apple Pay",
    url: "https://global.transak.com/",
    recommendedFor: "Global Coverage"
  }
];

export default function BuyCryptoPage() {
  const [sidebarTab, setSidebarTab] = useState('buy-crypto');
  const [userCountry, setUserCountry] = useState('United Kingdom');
  const [copied, setCopied] = useState(false);

  // Platform Treasury Deposit Address
  const treasuryAddress = process.env.NEXT_PUBLIC_USDT_TRC20_ADDRESS || "T9zX1a8B3cK7mQ4vP2L6wE0rY5sU8iD1oN";

  // Notification State
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
    getUserProfile().then(data => {
      if (data?.country) setUserCountry(data.country);
    });
  }, []);

  const showAlert = (message: string, type: ModalType = 'info', title?: string) => {
    setModalConfig({ isOpen: true, message, type, title });
  };

  const copyTreasuryAddress = () => {
    navigator.clipboard.writeText(treasuryAddress);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    showAlert("Citadel deposit address copied to clipboard. Paste this as the payout destination on your provider.", "info", "Address Copied");
  };

  return (
    <div className="min-h-screen bg-[#0B0E14] text-gray-300 font-sans flex selection:bg-blue-500/30 w-full relative">
      <Sidebar activeTab={sidebarTab} setActiveTab={setSidebarTab} location={userCountry} />

      <main className="flex-1 flex flex-col min-h-screen relative min-w-0 overflow-x-hidden">
        <TopHeader />

        <div className="flex-1 p-4 sm:p-6 lg:p-8 w-full">
          <div className="max-w-6xl mx-auto space-y-6 sm:space-y-8">
            
            {/* Header Title */}
            <div>
              <h1 className="text-2xl sm:text-4xl font-extrabold text-white mb-2 tracking-tight flex items-center gap-2 sm:gap-3">
                <CreditCard className="text-blue-500 shrink-0" size={28} /> 
                <span className="truncate">Buy Crypto</span>
              </h1>
              <p className="text-gray-400 text-xs sm:text-sm">Buy crypto instantly in the UK or internationally using non-custodial fiat providers, then transfer to Citadel to trade.</p>
            </div>

            {/* How It Works Steps Banner */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 sm:gap-4">
              <div className="bg-[#151924] border border-white/5 rounded-2xl p-4 sm:p-5 shadow-lg relative">
                <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-xl bg-blue-600/20 border border-blue-500/30 text-blue-400 font-extrabold flex items-center justify-center text-xs sm:text-sm mb-3">1</div>
                <h4 className="text-white font-bold text-sm mb-1">Choose Non-Custodial Provider</h4>
                <p className="text-[11px] sm:text-xs text-gray-400">Select MoonPay, Banxa, or Ramp depending on your region.</p>
              </div>

              <div className="bg-[#151924] border border-white/5 rounded-2xl p-4 sm:p-5 shadow-lg relative">
                <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-xl bg-blue-600/20 border border-blue-500/30 text-blue-400 font-extrabold flex items-center justify-center text-xs sm:text-sm mb-3">2</div>
                <h4 className="text-white font-bold text-sm mb-1">Buy to Personal Wallet</h4>
                <p className="text-[11px] sm:text-xs text-gray-400">Pay with UK Faster Payments, Visa/Mastercard, or Apple Pay directly to your wallet.</p>
              </div>

              <div className="bg-[#151924] border border-white/5 rounded-2xl p-4 sm:p-5 shadow-lg relative sm:col-span-2 md:col-span-1">
                <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-xl bg-blue-600/20 border border-blue-500/30 text-blue-400 font-extrabold flex items-center justify-center text-xs sm:text-sm mb-3">3</div>
                <h4 className="text-white font-bold text-sm mb-1">Deposit to Citadel Desk</h4>
                <p className="text-[11px] sm:text-xs text-gray-400">Transfer the acquired USDT/BTC to your Citadel wallet address to activate trading.</p>
              </div>
            </div>

            {/* Recommended On-Ramp Providers List */}
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 sm:gap-0">
                <h3 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
                  <Globe size={18} className="text-blue-500 shrink-0" /> Supported Regional On-Ramps
                </h3>
                <span className="text-[10px] sm:text-xs text-gray-500 font-mono">Location Detected: {userCountry}</span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {PROVIDERS.map((provider) => (
                  <div 
                    key={provider.name} 
                    className="bg-[#151924] border border-white/5 hover:border-blue-500/30 rounded-3xl p-5 sm:p-6 shadow-xl flex flex-col justify-between space-y-5 sm:space-y-6 transition-all group"
                  >
                    <div className="space-y-3">
                      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-2">
                        <span className="text-[10px] sm:text-xs font-bold text-blue-400 bg-blue-500/10 px-2.5 sm:px-3 py-1 rounded-full border border-blue-500/20 w-fit">
                          {provider.recommendedFor}
                        </span>
                        <div className="flex flex-wrap gap-1">
                          {provider.regions.map(r => (
                            <span key={r} className="text-[9px] sm:text-[10px] font-mono text-gray-500 bg-white/5 px-2 py-0.5 rounded">
                              {r}
                            </span>
                          ))}
                        </div>
                      </div>

                      <div>
                        <h4 className="text-lg sm:text-xl font-bold text-white group-hover:text-blue-400 transition-colors">{provider.name}</h4>
                        <p className="text-[11px] sm:text-xs text-gray-400 mt-1">{provider.tagline}</p>
                      </div>

                      <div className="p-2.5 sm:p-3 bg-[#0B0E14] rounded-xl border border-white/5 text-[11px] sm:text-xs text-gray-400">
                        <span className="text-gray-500 block text-[9px] sm:text-[10px] uppercase font-bold mb-0.5">Supported Payment Options</span>
                        {provider.supportedPayment}
                      </div>
                    </div>

                    <a
                      href={provider.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-full py-3 sm:py-3.5 bg-white/5 hover:bg-blue-600 text-white rounded-2xl text-[11px] sm:text-xs font-bold transition-all flex items-center justify-center gap-2 border border-white/10 group-hover:border-blue-500/50 shadow-lg"
                    >
                      Buy on {provider.name} <ExternalLink size={14} className="shrink-0" />
                    </a>
                  </div>
                ))}
              </div>
            </div>

            {/* Direct Wallet Deposit Shortcut */}
            <div className="bg-[#151924] border border-white/5 rounded-3xl p-5 sm:p-8 shadow-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-5 sm:gap-6">
              <div className="flex items-start sm:items-center gap-3 sm:gap-4">
                <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-2xl bg-green-500/10 border border-green-500/20 text-green-400 flex items-center justify-center shrink-0 mt-0.5 sm:mt-0">
                  <ShieldCheck size={20} className="sm:w-6 sm:h-6" />
                </div>
                <div>
                  <h4 className="text-white font-bold text-sm sm:text-base">Already Have Crypto in Your Personal Wallet?</h4>
                  <p className="text-[11px] sm:text-xs text-gray-400 mt-1">Skip third-party providers and transfer directly to your Citadel trading balance.</p>
                </div>
              </div>

              <a
                href="/dashboard/wallet"
                className="w-full sm:w-auto px-6 py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-[11px] sm:text-xs font-bold transition-all shadow-lg shadow-blue-600/20 flex items-center justify-center gap-2 shrink-0"
              >
                Go to Treasury Deposit <ArrowRight size={16} className="shrink-0" />
              </a>
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
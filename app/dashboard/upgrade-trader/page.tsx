// PATH: app/dashboard/upgrade-trader/page.tsx
"use client";

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import Sidebar from '../components/Sidebar';
import TopHeader from '../components/TopHeader';
import DashboardSkeleton from '../components/DashboardSkeleton';
import { getUserProfile } from '@/app/actions/profile';
import { Award, CheckCircle2, Shield, Zap, Crown, ArrowRight, Star } from 'lucide-react';

const TIERS = [
  {
    name: "Beginner Trader",
    icon: Star,
    color: "text-blue-400",
    bg: "bg-blue-500/10",
    border: "border-blue-500/20",
    requiredDeposit: "$2,000",
    dailyWithdrawal: "$5,000",
    description: "Perfect for getting started with real capital and standard trading features.",
    benefits: [
      "Standard Market Execution",
      "Basic 24/5 Support",
      "Standard Copy Trading Access",
      "Standard Trading Spreads"
    ]
  },
  {
    name: "Professional",
    icon: Shield,
    color: "text-purple-400",
    bg: "bg-purple-500/10",
    border: "border-purple-500/20",
    requiredDeposit: "$13,000",
    dailyWithdrawal: "$25,000",
    description: "Designed for experienced traders needing higher limits and priority tools.",
    benefits: [
      "Priority Order Execution",
      "24/7 Dedicated Support",
      "Advanced Pro Tools & Analytics",
      "Access to Elite Master Traders",
      "Reduced Trading Spreads"
    ],
    popular: true
  },
  {
    name: "Elite Trader",
    icon: Zap,
    color: "text-emerald-400",
    bg: "bg-emerald-500/10",
    border: "border-emerald-500/20",
    requiredDeposit: "$20,000",
    dailyWithdrawal: "$50,000",
    description: "High-volume trading environment with massive perks and dedicated management.",
    benefits: [
      "Institutional Grade Liquidity",
      "Zero Commission Trades",
      "Dedicated Account Manager",
      "VIP Market Signals & Alerts",
      "Monthly Strategy Sessions"
    ]
  },
  {
    name: "Legendary",
    icon: Crown,
    color: "text-amber-400",
    bg: "bg-amber-500/10",
    border: "border-amber-500/20",
    requiredDeposit: "$35,000+",
    dailyWithdrawal: "Unlimited",
    description: "The ultimate Citadel tier. Unrestricted access, bespoke strategies, and exclusive invites.",
    benefits: [
      "Direct Market Access (DMA)",
      "Unlimited API Access",
      "Bespoke Quant Strategies",
      "Annual Luxury Retreat Invite",
      "Unlimited Daily Withdrawals",
      "Executive Tier Concierge"
    ]
  }
];

export default function UpgradeTraderPage() {
  const [sidebarTab, setSidebarTab] = useState('upgrade-trader');
  const [userCountry, setUserCountry] = useState('Nigeria');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchUserData = async () => {
      try {
        const data = await getUserProfile();
        if (data?.country) {
          setUserCountry(data.country);
        }
      } catch (error) {
        console.error("Failed to load profile:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchUserData();
  }, []);

  if (isLoading) return <DashboardSkeleton activeTab="upgrade-trader" location={userCountry} />;

  return (
    <div className="min-h-screen bg-[#0B0E14] text-gray-300 font-sans flex selection:bg-blue-500/30 w-full relative">
      <Sidebar activeTab={sidebarTab} setActiveTab={setSidebarTab} location={userCountry} />

      <main className="flex-1 flex flex-col min-h-screen relative min-w-0 overflow-x-hidden">
        <TopHeader />

        <div className="flex-1 p-4 sm:p-6 lg:p-8 w-full flex flex-col">
          <div className="max-w-7xl mx-auto space-y-8 w-full flex-1">

            {/* Header */}
            <div className="border-b border-white/5 pb-6 text-center max-w-2xl mx-auto">
              <div className="flex justify-center mb-4">
                <div className="p-3 bg-blue-500/10 rounded-2xl text-blue-400">
                  <Award size={32} />
                </div>
              </div>
              <h1 className="text-3xl sm:text-4xl font-extrabold text-white mb-3 tracking-tight">
                Account Tiers & Limits
              </h1>
              <p className="text-gray-400 text-sm sm:text-base">
                Unlock higher withdrawal limits, institutional features, and dedicated support by upgrading your Citadel account tier. Upgrades are applied automatically based on your total deposit volume.
              </p>
            </div>

            {/* Pricing Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 pt-4">
              {TIERS.map((tier, index) => {
                const Icon = tier.icon;
                return (
                  <div
                    key={index}
                    className={`relative bg-[#151924] border ${tier.border} rounded-3xl p-6 flex flex-col transition-all hover:scale-[1.02] hover:shadow-2xl hover:border-opacity-50`}
                  >
                    {tier.popular && (
                      <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 bg-gradient-to-r from-purple-500 to-indigo-500 rounded-full text-[10px] font-bold text-white uppercase tracking-widest shadow-lg">
                        Most Popular
                      </div>
                    )}

                    <div className="flex items-center gap-3 mb-4">
                      <div className={`p-2.5 rounded-xl ${tier.bg} ${tier.color}`}>
                        <Icon size={20} />
                      </div>
                      <h3 className="text-lg font-bold text-white">{tier.name}</h3>
                    </div>

                    <p className="text-xs text-gray-400 mb-6 min-h-[40px]">
                      {tier.description}
                    </p>

                    <div className="bg-[#0B0E14] border border-white/5 rounded-2xl p-4 mb-6 space-y-4">
                      <div>
                        <div className="text-[10px] text-gray-500 font-bold uppercase tracking-wider mb-1">Required Deposit</div>
                        <div className="text-xl font-mono font-extrabold text-white">{tier.requiredDeposit}</div>
                      </div>
                      <div className="border-t border-white/5 pt-3">
                        <div className="text-[10px] text-gray-500 font-bold uppercase tracking-wider mb-1">Daily Withdrawal Limit</div>
                        <div className={`text-sm font-mono font-bold ${tier.color}`}>{tier.dailyWithdrawal}</div>
                      </div>
                    </div>

                    <div className="flex-1 space-y-3 mb-8">
                      <div className="text-xs font-bold text-white mb-3">Tier Benefits:</div>
                      {tier.benefits.map((benefit, i) => (
                        <div key={i} className="flex items-start gap-2.5">
                          <CheckCircle2 size={16} className={`${tier.color} shrink-0 mt-0.5`} />
                          <span className="text-xs text-gray-300">{benefit}</span>
                        </div>
                      ))}
                    </div>

                    <Link
                      href="/dashboard/wallet"
                      className={`w-full py-3 rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-all mt-auto ${
                        tier.popular
                          ? 'bg-purple-600 hover:bg-purple-500 text-white shadow-lg shadow-purple-900/20'
                          : 'bg-white/5 hover:bg-white/10 text-white border border-white/10'
                      }`}
                    >
                      Deposit to Upgrade <ArrowRight size={16} />
                    </Link>
                  </div>
                );
              })}
            </div>

          </div>
        </div>
      </main>
    </div>
  );
}

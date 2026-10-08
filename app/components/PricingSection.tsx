"use client";

import React, { useState } from 'react';
import Link from 'next/link';
import { CheckCircle2, Zap, Crown, ArrowRight } from 'lucide-react';

interface PlanCardProps {
  title: string;
  badge?: string;
  priceMonthly: string;
  priceAnnual: string;
  billingCycle: 'monthly' | 'annual';
  desc: string;
  features: string[];
  highlighted?: boolean;
  ctaText: string;
  ctaHref: string;
}

function PlanCard({
  title,
  badge,
  priceMonthly,
  priceAnnual,
  billingCycle,
  desc,
  features,
  highlighted,
  ctaText,
  ctaHref,
}: PlanCardProps) {
  const currentPrice = billingCycle === 'annual' ? priceAnnual : priceMonthly;

  // Calculate annual total dynamically if price is numeric (e.g., "$80" -> "$960/yr")
  const numericAnnualPrice = parseInt(priceAnnual.replace(/[^0-9]/g, ''), 10);
  const isPaidPlan = !isNaN(numericAnnualPrice) && numericAnnualPrice > 0;
  const annualTotalFormatted = isPaidPlan ? `$${numericAnnualPrice * 12}/yr` : '';

  return (
    <div
      className={`p-6 sm:p-8 rounded-3xl border transition-all duration-300 flex flex-col justify-between relative ${
        highlighted
          ? 'bg-[#151924] border-blue-500/50 shadow-[0_0_30px_rgba(59,130,246,0.15)] ring-1 ring-blue-500/30'
          : 'bg-[#151924]/80 border-white/5 hover:border-white/10'
      }`}
    >
      {highlighted && (
        <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 bg-blue-600 text-white text-[10px] sm:text-xs font-extrabold uppercase tracking-wider px-3.5 py-1 rounded-full shadow-lg shadow-blue-600/30 flex items-center gap-1 whitespace-nowrap">
          <Zap size={12} className="fill-white" /> Most Popular
        </div>
      )}

      <div>
        {/* Tier Header */}
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-xl sm:text-2xl font-extrabold text-white flex items-center gap-2">
            {highlighted && <Crown className="text-yellow-400 shrink-0" size={20} />}
            {title}
          </h3>
          {badge && (
            <span className="text-[10px] font-bold text-blue-400 bg-blue-500/10 px-2.5 py-1 rounded-full border border-blue-500/20">
              {badge}
            </span>
          )}
        </div>

        {/* Pricing Display */}
        <div className="my-4 flex items-baseline gap-1">
          <span className="text-3xl sm:text-4xl font-black text-white tracking-tight">
            {currentPrice}
          </span>
          {isPaidPlan && (
            <span className="text-xs sm:text-sm text-gray-400 font-mono">
              /{billingCycle === 'annual' ? `month (billed ${annualTotalFormatted})` : 'month'}
            </span>
          )}
        </div>

        <p className="text-xs sm:text-sm text-gray-400 mb-6 pb-6 border-b border-white/10 min-h-[40px]">
          {desc}
        </p>

        {/* Features List */}
        <ul className="space-y-3.5 mb-8">
          {features.map((feature, i) => (
            <li key={i} className="flex items-start gap-3 text-gray-300 text-xs sm:text-sm leading-relaxed">
              <CheckCircle2
                className={`shrink-0 mt-0.5 ${highlighted ? 'text-blue-400' : 'text-green-500'}`}
                size={16}
              />
              <span>{feature}</span>
            </li>
          ))}
        </ul>
      </div>

      {/* CTA Button */}
      <Link
        href={ctaHref}
        className={`w-full py-3.5 rounded-2xl font-bold text-xs sm:text-sm transition-all flex items-center justify-center gap-2 shadow-lg ${
          highlighted
            ? 'bg-blue-600 hover:bg-blue-500 text-white shadow-blue-600/25'
            : 'bg-white/5 hover:bg-white/10 text-white border border-white/10'
        }`}
      >
        {ctaText} <ArrowRight size={16} className="shrink-0" />
      </Link>
    </div>
  );
}

export default function PricingSection() {
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'annual'>('annual');

  return (
    <section id="plans" className="w-full">
      {/* Monthly / Annual Switch */}
      <div className="flex justify-center items-center mb-10 sm:mb-14">
        <div className="bg-[#151924] p-1.5 rounded-2xl border border-white/10 flex items-center gap-1 shadow-xl">
          <button
            onClick={() => setBillingCycle('monthly')}
            className={`px-4 sm:px-6 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all ${
              billingCycle === 'monthly'
                ? 'bg-blue-600 text-white shadow-md'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            Monthly Billing
          </button>
          <button
            onClick={() => setBillingCycle('annual')}
            className={`px-4 sm:px-6 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all flex items-center gap-1.5 ${
              billingCycle === 'annual'
                ? 'bg-blue-600 text-white shadow-md'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            Annual Billing
            <span className="bg-green-500/20 text-green-400 text-[10px] px-2 py-0.5 rounded-full font-extrabold uppercase border border-green-500/30">
              Save 20%
            </span>
          </button>
        </div>
      </div>

      {/* Grid Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 sm:gap-8 items-stretch">
        <PlanCard
          title="Retail"
          badge="Standard"
          priceMonthly="Free"
          priceAnnual="Free"
          billingCycle={billingCycle}
          desc="Perfect for individual manual traders & beginner copy-traders."
          features={[
            'Standard execution speed (~50ms)',
            'Up to 3 Master Trader allocations',
            'Full Crypto & Fiat deposits',
            '50 req/min API rate limit',
            'Basic portfolio analytics & logs',
          ]}
          ctaText="Start Free Trading"
          ctaHref="/register"
        />

        <PlanCard
          title="Pro Terminal"
          badge="High Speed"
          priceMonthly="$100"
          priceAnnual="$80"
          billingCycle={billingCycle}
          desc="Engineered for active copy-traders seeking low latency & full control."
          features={[
            'Priority execution latency (<12ms)',
            'Unlimited Copy-Trading allocations',
            'Algorithmic Stop Loss & Take Profit orders',
            'Direct Trader Desk Signals (Real-time)',
            '500 req/min High-rate API limit',
          ]}
          highlighted
          ctaText="Upgrade to Pro"
          ctaHref="/dashboard/upgrade"
        />

        <PlanCard
          title="Advisor / Fund"
          badge="Enterprise"
          priceMonthly="Custom"
          priceAnnual="Custom"
          billingCycle={billingCycle}
          desc="Tailored liquidity for wealth managers, prop funds, and family offices."
          features={[
            'Colocated execution infrastructure (<5ms)',
            'Multi-Account Manager (MAM / PAMM)',
            'White-label investor reporting',
            'Dedicated API & Custom Webhooks',
            '24/7 Priority VIP Account Officer',
          ]}
          ctaText="Contact Desk"
          ctaHref="/dashboard/chat"
        />
      </div>
    </section>
  );
}
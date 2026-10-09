'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { CheckCircle2, Zap, Crown, ArrowRight } from 'lucide-react';

interface PlanCardProps {
  title: string;
  titleIcon?: React.ReactNode;
  badge: string;
  price: string;
  priceSub?: string;
  priceNote?: string;
  desc: string;
  features: string[];
  buttonText: string;
  buttonHref: string;
  highlighted?: boolean;
  iconColor?: string;
}

function PlanCard({ 
  title, 
  titleIcon, 
  badge, 
  price, 
  priceSub, 
  priceNote, 
  desc, 
  features, 
  buttonText, 
  buttonHref,
  highlighted,
  iconColor = 'text-emerald-500'
}: PlanCardProps) {
  return (
    <div className={`p-8 rounded-2xl border flex flex-col justify-between transition-all ${
      highlighted 
        ? 'bg-[#121622] border-blue-600 relative ring-1 ring-blue-600/50 shadow-[0_0_35px_-10px_rgba(37,99,235,0.25)]' 
        : 'bg-[#121622] border-white/10 hover:border-white/20'
    }`}>
      {highlighted && (
        <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 bg-blue-600 text-white text-[11px] font-extrabold px-3.5 py-1 rounded-full flex items-center gap-1.5 uppercase tracking-wider shadow-md">
          <Zap size={13} fill="currentColor" />
          Most Popular
        </div>
      )}
      
      <div>
        {/* Card Header */}
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-2xl font-bold text-white flex items-center gap-2">
            {titleIcon}
            {title}
          </h3>
          <span className="text-[11px] font-medium px-2.5 py-1 rounded-full border border-blue-500/20 text-blue-400 bg-blue-500/10">
            {badge}
          </span>
        </div>

        {/* Pricing */}
        <div className="mb-6 flex flex-col h-16 justify-center">
          <div className="flex items-baseline gap-1">
            <span className="text-4xl font-extrabold text-white">{price}</span>
            {priceSub && <span className="text-sm text-gray-400 font-medium">{priceSub}</span>}
          </div>
          {priceNote ? (
            <div className="text-xs text-gray-400 mt-1 font-mono">{priceNote}</div>
          ) : (
            <div className="h-4"></div>
          )}
        </div>

        {/* Description */}
        <p className="text-sm text-gray-400 mb-8 pb-8 border-b border-white/10 min-h-[4.5rem] leading-relaxed">
          {desc}
        </p>

        {/* Features List */}
        <ul className="space-y-4 mb-8">
          {features.map((feature, index) => (
            <li key={index} className="flex items-start gap-3 text-gray-300 text-sm">
              <CheckCircle2 className={`${iconColor} flex-shrink-0 mt-0.5`} size={18} />
              <span>{feature}</span>
            </li>
          ))}
        </ul>
      </div>

      {/* Action Button Link */}
      <Link 
        href={buttonHref}
        className={`w-full py-3.5 px-4 rounded-xl font-semibold transition-all flex items-center justify-center gap-2 text-sm ${
          highlighted 
            ? 'bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-600/20' 
            : 'bg-[#1C2230] hover:bg-[#252C3D] text-white border border-white/10'
        }`}
      >
        {buttonText}
        <ArrowRight size={16} />
      </Link>
    </div>
  );
}

export default function PlansSection() {
  const [isAnnual, setIsAnnual] = useState(true);

  return (
    <section id="plans" className="py-16 px-4 md:px-6 max-w-7xl mx-auto font-sans">
      {/* Section Header */}
      <div className="text-center mb-10 max-w-3xl mx-auto">
        <h2 className="text-4xl md:text-5xl font-extrabold text-white mb-4 tracking-tight">
          Transparent Pricing.
        </h2>
        <p className="text-gray-400 text-base md:text-lg leading-relaxed">
          Zero commission on standard asset classes. Choose the infrastructure tier that matches 
          your trading volume and strategy requirements.
        </p>
      </div>

      {/* Billing Toggle */}
      <div className="flex items-center justify-center p-1.5 bg-[#121622] rounded-full border border-white/10 mx-auto w-fit mb-12">
        <button
          className={`px-6 py-2 rounded-full text-sm font-semibold transition-all ${
            !isAnnual ? 'bg-blue-600 text-white shadow-md' : 'text-gray-400 hover:text-white'
          }`}
          onClick={() => setIsAnnual(false)}
        >
          Monthly Billing
        </button>
        <button
          className={`flex items-center gap-2 px-6 py-2 rounded-full text-sm font-semibold transition-all ${
            isAnnual ? 'bg-blue-600 text-white shadow-md' : 'text-gray-400 hover:text-white'
          }`}
          onClick={() => setIsAnnual(true)}
        >
          Annual Billing 
          <span className="bg-emerald-500/20 text-emerald-400 text-[10px] px-2 py-0.5 rounded font-bold uppercase tracking-wider">
            Save 20%
          </span>
        </button>
      </div>

      {/* Pricing Grid */}
      <div className="grid md:grid-cols-3 gap-6 items-stretch">
        <PlanCard 
          title="Retail" 
          badge="Standard"
          price="Free" 
          desc="Perfect for individual manual traders & beginner copy-traders." 
          features={[
            'Standard execution speed (~50ms)', 
            'Up to 3 Master Trader allocations', 
            'Full Crypto & Fiat deposits',
            '50 req/min API rate limit',
            'Basic portfolio analytics & logs'
          ]} 
          buttonText="Start Free Trading"
          buttonHref="/dashboard"
          iconColor="text-emerald-500"
        />
        
        <PlanCard 
          title="Pro Terminal"
          titleIcon={<Crown className="text-amber-400" size={22} fill="currentColor" />}
          badge="High Speed"
          price={isAnnual ? "$80" : "$100"}
          priceSub="/month"
          priceNote={isAnnual ? "(billed $960/yr)" : ""}
          desc="Engineered for active copy-traders seeking low latency & full control." 
          features={[
            'Priority execution latency (< 12ms)', 
            'Unlimited Copy-Trading allocations', 
            'Algorithmic Stop Loss & Take Profit orders',
            'Direct Trader Desk Signals (Real-time)',
            '500 req/min High-rate API limit'
          ]} 
          buttonText="Upgrade to Pro"
          buttonHref="/dashboard/upgrade"
          highlighted 
          iconColor="text-blue-500"
        />
        
        <PlanCard 
          title="Advisor / Fund" 
          badge="Enterprise"
          price="Custom" 
          desc="Tailored liquidity for wealth managers, prop funds, and family offices." 
          features={[
            'Colocated execution infrastructure (< 5ms)', 
            'Multi-Account Manager (MAM / PAMM)', 
            'White-label investor reporting',
            'Dedicated API & Custom Webhooks',
            '24/7 Priority VIP Account Officer'
          ]} 
          buttonText="Contact Desk"
          buttonHref="mailto:contact@citadel.com?subject=Enterprise%20Advisor%20Inquiry"
          iconColor="text-emerald-500"
        />
      </div>
    </section>
  );
}
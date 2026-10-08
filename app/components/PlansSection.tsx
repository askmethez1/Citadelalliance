'use client';

import React, { useState } from 'react';
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
  highlighted?: boolean;
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
  highlighted 
}: PlanCardProps) {
  return (
    <div className={`p-8 rounded-3xl border flex flex-col ${highlighted ? 'bg-[#151924] border-blue-500 relative ring-1 ring-blue-500/50 shadow-[0_0_30px_-10px_rgba(37,99,235,0.2)]' : 'bg-[#151924] border-white/5'}`}>
      {highlighted && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-blue-600 text-white text-[11px] font-bold px-3 py-1 rounded-full flex items-center gap-1 uppercase tracking-wider shadow-lg">
          <Zap size={14} fill="currentColor" />
          Most Popular
        </div>
      )}
      
      <div className="flex justify-between items-center mb-6">
        <h3 className="text-2xl font-bold text-white flex items-center gap-2">
          {titleIcon}
          {title}
        </h3>
        <span className="text-[10px] uppercase font-bold px-3 py-1 rounded-full border border-blue-500/20 text-blue-400 bg-[#1A233A]">
          {badge}
        </span>
      </div>

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

      <p className="text-sm text-gray-400 mb-8 pb-8 border-b border-white/10 min-h-[5rem]">
        {desc}
      </p>

      <ul className="space-y-4 mb-8 flex-1">
        {features.map((f, i) => (
          <li key={i} className="flex items-start gap-3 text-gray-300 text-sm">
            <CheckCircle2 className="text-green-500 flex-shrink-0 mt-0.5" size={18} />
            <span>{f}</span>
          </li>
        ))}
      </ul>

      <button className={`w-full py-3.5 px-4 rounded-xl font-bold transition-all flex items-center justify-center gap-2 ${
        highlighted 
          ? 'bg-blue-600 hover:bg-blue-500 text-white' 
          : 'bg-transparent border border-white/10 hover:bg-white/5 text-white'
      }`}>
        {buttonText}
        <ArrowRight size={18} />
      </button>
    </div>
  );
}

export default function PlansSection() {
  const [isAnnual, setIsAnnual] = useState(false);

  return (
    <section id="plans" className="py-24 px-6 max-w-6xl mx-auto font-sans bg-[#0B0E14]">
      {/* Header Section */}
      <div className="text-center mb-12">
        <h2 className="text-5xl font-extrabold text-white mb-6">Transparent Pricing.</h2>
        <p className="text-gray-400 text-lg max-w-2xl mx-auto">
          Zero commission on standard asset classes. Choose the infrastructure tier that matches 
          your trading volume and strategy requirements.
        </p>
      </div>

      {/* Billing Toggle */}
      <div className="flex items-center justify-center p-1.5 bg-[#151924] rounded-full border border-white/5 mx-auto w-fit mb-16">
        <button
          className={`px-6 py-2.5 rounded-full text-sm font-semibold transition-all ${
            !isAnnual ? 'bg-blue-600 text-white shadow-md' : 'text-gray-400 hover:text-white'
          }`}
          onClick={() => setIsAnnual(false)}
        >
          Monthly Billing
        </button>
        <button
          className={`flex items-center gap-2 px-6 py-2.5 rounded-full text-sm font-semibold transition-all ${
            isAnnual ? 'bg-blue-600 text-white shadow-md' : 'text-gray-400 hover:text-white'
          }`}
          onClick={() => setIsAnnual(true)}
        >
          Annual Billing 
          <span className="bg-[#10B981]/20 text-[#10B981] text-[10px] px-2 py-0.5 rounded uppercase font-bold tracking-wider">
            Save 20%
          </span>
        </button>
      </div>

      {/* Pricing Cards */}
      <div className="grid md:grid-cols-3 gap-6">
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
        />
        
        <PlanCard 
          title="Pro Terminal"
          titleIcon={<Crown className="text-yellow-500" size={24} fill="currentColor" />}
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
          highlighted 
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
        />
      </div>
    </section>
  );
}
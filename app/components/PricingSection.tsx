"use client";

import { useState } from 'react';
import { CheckCircle2 } from 'lucide-react';
import Link from 'next/link';

export default function PricingSection() {
  const [isAnnual, setIsAnnual] = useState(true);

  return (
    <div className="w-full">
      {/* Billing Toggle */}
      <div className="flex items-center justify-center gap-4 mb-12">
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

      {/* Pricing Cards Grid */}
      <div className="grid md:grid-cols-3 gap-8">
        
        {/* Retail Tier */}
        <div className="px-8 py-16 rounded-3xl bg-[#151924] border border-white/5 flex flex-col">
          <h3 className="text-2xl font-bold text-white mb-2">Retail</h3>
          <div className="text-4xl font-extrabold text-white mb-4">Free</div>
          <p className="text-sm text-gray-400 mb-8 pb-8 border-b border-white/10">Perfect for individual copy-traders starting out.</p>
          <ul className="space-y-4 mb-8 flex-1">
            <li className="flex items-center gap-3 text-gray-300 text-sm"><CheckCircle2 className="text-green-500" size={18} /> Standard execution latency</li>
            <li className="flex items-center gap-3 text-gray-300 text-sm"><CheckCircle2 className="text-green-500" size={18} /> Basic charting tools</li>
            <li className="flex items-center gap-3 text-gray-300 text-sm"><CheckCircle2 className="text-green-500" size={18} /> Access to top 50 Master Traders</li>
            <li className="flex items-center gap-3 text-gray-300 text-sm"><CheckCircle2 className="text-green-500" size={18} /> Crypto & Fiat deposits</li>
          </ul>
          <Link href="/register" className="w-full py-4 bg-white/5 hover:bg-white/10 border border-white/10 text-white rounded-full font-bold transition-all text-center flex-shrink-0">
            Open Free Account
          </Link>
        </div>

        {/* Pro Tier (Highlighted) */}
        <div className="p-8 rounded-3xl bg-blue-600/5 border border-blue-500/30 relative flex flex-col shadow-[0_0_40px_rgba(41,98,255,0.1)] transform md:-translate-y-4">
          <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-blue-600 text-white text-xs font-bold px-4 py-1.5 rounded-full">
            Most Popular
          </div>
          <h3 className="text-2xl font-bold text-white mb-2">Pro Terminal</h3>
          <div className="flex items-end gap-1 mb-2">
            {/* The Toggle Logic for $55 vs $44 */}
            <div className="text-4xl font-extrabold text-white">{isAnnual ? '$44' : '$55'}</div>
            <div className="text-gray-400 mb-1">/mo</div>
          </div>
          {/* Helper text to explain the billing math clearly */}
          <div className="text-xs text-blue-400 font-medium mb-4 h-4">
            {isAnnual ? 'Billed annually at $528/yr' : 'Billed monthly'}
          </div>
          <p className="text-sm text-gray-400 mb-8 pb-8 border-b border-white/10">For active traders seeking a quantitative edge.</p>
          <ul className="space-y-4 mb-8 flex-1">
            <li className="flex items-center gap-3 text-white font-medium text-sm"><CheckCircle2 className="text-blue-400" size={18} /> Priority Sub-12ms execution</li>
            <li className="flex items-center gap-3 text-white font-medium text-sm"><CheckCircle2 className="text-blue-400" size={18} /> Advanced TradingView integration</li>
            <li className="flex items-center gap-3 text-white font-medium text-sm"><CheckCircle2 className="text-blue-400" size={18} /> Access to ALL Master Traders</li>
            <li className="flex items-center gap-3 text-white font-medium text-sm"><CheckCircle2 className="text-blue-400" size={18} /> Direct trader strategy calls (1/mo)</li>
            <li className="flex items-center gap-3 text-white font-medium text-sm"><CheckCircle2 className="text-blue-400" size={18} /> Algorithmic orders (TWAP/VWAP)</li>
          </ul>
          <Link href="/register" className="w-full py-4 bg-blue-600 hover:bg-blue-500 text-white rounded-full font-bold transition-all text-center shadow-lg shadow-blue-600/20 flex-shrink-0">
            Start 14-Day Free Trial
          </Link>
        </div>

        {/* Advisor Tier */}
        <div className="p-8 rounded-3xl bg-[#151924] border border-white/5 flex flex-col">
          <h3 className="text-2xl font-bold text-white mb-2">Advisor</h3>
          <div className="text-4xl font-extrabold text-white mb-4">Custom</div>
          <p className="text-sm text-gray-400 mb-8 pb-8 border-b border-white/10">For wealth managers, funds, and institutional prop firms.</p>
          <ul className="space-y-4 mb-8 flex-1">
            <li className="flex items-center gap-3 text-gray-300 text-sm"><CheckCircle2 className="text-green-500" size={18} /> Dedicated account manager</li>
            <li className="flex items-center gap-3 text-gray-300 text-sm"><CheckCircle2 className="text-green-500" size={18} /> MAM/PAMM sub-account structures</li>
            <li className="flex items-center gap-3 text-gray-300 text-sm"><CheckCircle2 className="text-green-500" size={18} /> Unlimited API REST/WebSocket limits</li>
            <li className="flex items-center gap-3 text-gray-300 text-sm"><CheckCircle2 className="text-green-500" size={18} /> White-label client reporting</li>
          </ul>
          <Link href="/contact" className="w-full py-4 bg-white text-black hover:bg-gray-200 rounded-full font-bold transition-all text-center flex-shrink-0">
            Contact Sales
          </Link>
        </div>
      </div>
    </div>
  );
}
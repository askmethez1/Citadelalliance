import { Globe, Wallet, Shield } from 'lucide-react';
import React from 'react';

interface AssetCardProps {
  title: string;
  icon: React.ReactNode;
  desc: string;
  badge?: string;
}

function AssetCard({ title, icon, desc, badge }: AssetCardProps) {
  return (
    <div className="p-8 rounded-2xl bg-[#151924] border border-white/5 hover:border-white/10 transition">
      <div className="flex justify-between items-start mb-6">
        <div className="w-12 h-12 rounded-xl bg-white/5 flex items-center justify-center text-white">
          {icon}
        </div>
        {badge && (
          <span className="px-2.5 py-1 bg-emerald-500/10 text-emerald-400 text-xs font-bold rounded-full border border-emerald-500/20">
            {badge}
          </span>
        )}
      </div>
      <h3 className="text-xl font-bold text-white mb-3">{title}</h3>
      <p className="text-gray-400 text-sm leading-relaxed">{desc}</p>
    </div>
  );
}

export default function MarketsSection() {
  return (
    <section id="markets" className="py-24 px-6 max-w-7xl mx-auto">
      <div className="text-center mb-16">
        <h2 className="text-3xl md:text-4xl font-extrabold text-white mb-4">One account. Every asset.</h2>
        <p className="text-gray-400 max-w-2xl mx-auto">Deep liquidity and institutional execution across all major asset classes.</p>
      </div>
      <div className="grid md:grid-cols-3 gap-6">
        <AssetCard
          title="Global Stocks"
          icon={<Globe />}
          desc="Direct market access to US, EU, and Asian equities. Fractional shares available."
        />
        <AssetCard
          title="Cryptocurrency"
          icon={<Wallet />}
          desc="Trade spot and derivatives for BTC, ETH, and top altcoins with deep liquidity."
        />
        <AssetCard
          title="Regulated ETFs"
          icon={<Shield className="text-emerald-400" />}
          desc="Build long-term wealth with SEC & FCA compliant Exchange Traded Funds."
          badge="Highly Regulated"
        />
      </div>
    </section>
  );
}

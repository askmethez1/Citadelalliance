import { LineChart, Zap, Lock } from 'lucide-react';
import React from 'react';

interface ToolCardProps {
  icon: React.ReactNode;
  title: string;
  desc: string;
}

function ToolCard({ icon, title, desc }: ToolCardProps) {
  return (
    <div className="p-8 rounded-2xl bg-[#0B0E14] border border-white/5 text-left">
      <div className="text-blue-400 mb-6">{icon}</div>
      <h3 className="text-lg font-bold text-white mb-2">{title}</h3>
      <p className="text-sm text-gray-400 leading-relaxed">{desc}</p>
    </div>
  );
}

export default function ToolsSection() {
  return (
    <section id="tools" className="py-24 bg-[#151924]/30 border-y border-white/5">
      <div className="max-w-7xl mx-auto px-6 text-center">
        <h2 className="text-3xl font-extrabold text-white mb-12">Built for the professional.</h2>
        <div className="grid md:grid-cols-3 gap-8">
          <ToolCard icon={<LineChart />} title="Advanced Charting" desc="Integrated TradingView charts with custom indicators and drawing tools built directly into the dashboard." />
          <ToolCard icon={<Zap />} title="Algorithmic Orders" desc="TWAP, VWAP, and Iceberg orders available for deep-liquidity institutional execution." />
          <ToolCard icon={<Lock />} title="Risk Management" desc="Set global account stop-losses, daily drawdown limits, and strict margin requirements." />
        </div>
      </div>
    </section>
  );
}
import Link from 'next/link';
import { Calendar, CheckCircle2 } from 'lucide-react';

function ListItem({ text }: { text: string }) {
  return (
    <li className="flex items-center gap-3 text-gray-300">
      <CheckCircle2 className="text-green-500" size={18} />
      <span>{text}</span>
    </li>
  );
}

export default function CopyTradingSection() {
  return (
    <section id="copy-trade" className="py-24 px-6 max-w-7xl mx-auto">
      <div className="grid md:grid-cols-2 gap-16 items-center">
        
        {/* Left Content */}
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-purple-500/30 bg-purple-500/10 text-purple-400 text-xs font-bold mb-6">
            99.99% Uptime Execution
          </div>
          <h2 className="text-4xl font-extrabold text-white mb-6">Don't just copy.<br />Understand the strategy.</h2>
          <p className="text-gray-400 mb-6 leading-relaxed">
            Our 1-click copy trading engine operates with near-zero latency. But we take it a step further. We believe in transparency between investors and master traders.
          </p>
          <ul className="space-y-4 mb-8">
            <ListItem text="Sub-12ms trade mirroring latency" />
            <ListItem text="Automatic risk-scaling based on your balance" />
            <ListItem text="Instant pausing and fund withdrawal" />
          </ul>
          
          <div className="bg-[#151924] border border-white/10 p-6 rounded-2xl flex items-start gap-4">
            <div className="p-3 bg-blue-500/10 text-blue-400 rounded-xl">
              <Calendar size={24} />
            </div>
            <div>
              <h4 className="text-white font-bold mb-1">Book a Strategy Call</h4>
              <p className="text-sm text-gray-400 mb-3">
                Want to allocate large capital? Schedule a 1-on-1 video call with your selected master trader before you invest.
              </p>
              {/* Linked to calendar page */}
              <Link href="/calendar" className="text-blue-400 text-sm font-semibold hover:text-blue-300 transition-colors inline-flex items-center gap-1">
                View Calendars &rarr;
              </Link>
            </div>
          </div>
        </div>

        {/* Right Content - Updated Master Trader Profile */}
        <div className="relative">
          <div className="absolute inset-0 bg-gradient-to-tr from-blue-500/20 to-purple-500/20 blur-3xl rounded-full"></div>
          <div className="relative bg-[#0B0E14] border border-white/10 p-8 rounded-3xl shadow-2xl">
            
            <div className="flex justify-between items-center mb-6">
              <div className="flex items-center gap-4">
                <img 
                  src="https://api.dicebear.com/7.x/avataaars/svg?seed=Alex" 
                  alt="Alex Quant" 
                  className="w-16 h-16 rounded-2xl bg-[#151924] border border-white/10 p-1"
                />
                <div>
                  <h3 className="text-white font-bold text-lg flex items-center gap-1.5">Alex Quant</h3>
                  <p className="text-[10px] text-blue-400 font-bold uppercase">Quantitative Momentum</p>
                </div>
              </div>
              <Link href="/dashboard/copy-trading" className="bg-white text-black px-5 py-2.5 rounded-full text-sm font-bold hover:bg-gray-200 transition-colors">
                Copy
              </Link>
            </div>

            {/* Active Trade Display mimicking the Dashboard UI */}
            <div className="bg-[#151924] border border-white/5 rounded-xl p-4 mb-6 space-y-3">
              <div className="flex items-center justify-between font-mono text-sm">
                <span className="text-white font-bold">BTC/USD</span>
                <span className="text-[10px] font-bold px-2.5 py-1 rounded-lg bg-green-500/10 text-green-400 border border-green-500/20">
                  LONG 50x
                </span>
              </div>
              <div className="flex items-center justify-between text-xs text-gray-500 font-mono border-t border-white/5 pt-3">
                <span>Win Rate: <b className="text-green-400">84%</b></span>
                <span>ROI: <b className="text-blue-400">+18.5%/mo</b></span>
              </div>
            </div>

            {/* Trader Stats */}
            <div className="space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-gray-400">Risk Score</span>
                <span className="text-white font-bold">4 / 10</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-400">Copiers</span>
                <span className="text-white font-bold">1,204</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-400">AUM</span>
                <span className="text-white font-bold">$4.2M</span>
              </div>
            </div>

          </div>
        </div>

      </div>
    </section>
  );
}
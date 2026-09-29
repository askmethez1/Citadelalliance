import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import LiveTicker from './LiveTicker';

export default function HeroSection() {
  return (
    // 1. Wrapper takes full viewport height and manages layout
    <div className="relative min-h-screen flex flex-col justify-between overflow-hidden bg-[#0a0a0a]">
      
      {/* 2. Optional: Subtle background glow effect behind the text */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-blue-600/15 rounded-full blur-[120px] pointer-events-none" />

      {/* 3. Main Hero Content (flex-grow keeps it centered above the ticker) */}
      <section className="relative flex-grow flex flex-col items-center justify-center px-6 md:px-12 py-20 max-w-7xl mx-auto text-center z-10">
        
        {/* Upgraded badge with a better pinging animation */}
        <div className="inline-flex items-center gap-2.5 px-4 py-1.5 rounded-full border border-blue-500/30 bg-blue-500/10 text-blue-400 text-xs font-semibold tracking-wide mb-8 backdrop-blur-sm">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500"></span>
          </span>
          Institutional Trading Infrastructure
        </div>
        
        <h1 className="text-5xl md:text-7xl lg:text-8xl font-extrabold text-white tracking-tight leading-[1.1] mb-6">
          Trade with precision. <br />
          {/* Added a sleek text gradient to the second line */}
          <span className="bg-clip-text text-transparent bg-gradient-to-r from-gray-400 to-gray-600">
            Mirror the experts.
          </span>
        </h1>
        
        <p className="text-lg md:text-xl text-gray-400 max-w-2xl mx-auto mb-10 font-light leading-relaxed">
          Access global stocks, crypto, and regulated ETFs. Deposit seamlessly with stablecoins and automatically copy top-performing traders with <span className="text-gray-200 font-medium">zero latency</span>.
        </p>
        
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 w-full sm:w-auto">
          {/* Added a subtle shadow glow to the primary button */}
          <Link 
            href="/register" 
            className="w-full sm:w-auto px-8 py-4 bg-blue-600 hover:bg-blue-500 text-white rounded-full text-base font-semibold transition-all shadow-[0_0_20px_-5px_rgba(37,99,235,0.4)] hover:shadow-[0_0_25px_-5px_rgba(37,99,235,0.6)] flex items-center justify-center gap-2"
          >
            Start Trading <ArrowRight size={18} />
          </Link>
          
          {/* Improved hover state on the secondary button */}
          <Link 
            href="#copy-trade" 
            className="w-full sm:w-auto px-8 py-4 bg-transparent border border-white/10 hover:border-white/30 hover:bg-white/5 text-white rounded-full text-base font-semibold transition-all flex items-center justify-center backdrop-blur-sm"
          >
            View Masters Leaderboard
          </Link>
        </div>
      </section>

      {/* 4. Ticker stays pinned to the bottom of the screen */}
      <div className="w-full border-t border-white/5 bg-black/40 backdrop-blur-md z-10">
        <LiveTicker />
      </div>
      
    </div>
  );
}
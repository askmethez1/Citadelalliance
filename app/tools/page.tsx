import Navbar from '../components/Navbar';
import { 
  LineChart, Zap, Lock, Terminal, 
  Activity, Cpu, ArrowRight, Code2
} from 'lucide-react';
import Link from 'next/link';

const TOOLS = [
  {
    icon: <LineChart size={24} />,
    title: "Advanced Charting",
    desc: "Integrated lightweight charts with 50+ technical indicators, drawing tools, and multi-timeframe analysis built directly into your dashboard.",
    color: "text-blue-400",
    bg: "bg-blue-500/10"
  },
  {
    icon: <Zap size={24} />,
    title: "Algorithmic Orders",
    desc: "Minimize market impact with institutional execution algorithms including TWAP, VWAP, Iceberg, and Sniper limit orders.",
    color: "text-yellow-400",
    bg: "bg-yellow-500/10"
  },
  {
    icon: <Lock size={24} />,
    title: "Risk Management Engine",
    desc: "Protect your capital with account-level stop-losses, maximum daily drawdown limits, and automated margin-call prevention.",
    color: "text-emerald-400",
    bg: "bg-emerald-500/10"
  },
  {
    icon: <Cpu size={24} />,
    title: "Low-Latency Infrastructure",
    desc: "Co-located servers provide sub-12ms execution latency, ensuring you get the exact price you click on during high volatility.",
    color: "text-purple-400",
    bg: "bg-purple-500/10"
  }
];

export default function ToolsPage() {
  return (
    <div className="bg-[#0B0E14] min-h-screen text-gray-300">
      <Navbar />
      
      <main className="pt-32 pb-24 px-6 max-w-7xl mx-auto">
        {/* Header Section */}
        <div className="text-center mb-20 max-w-3xl mx-auto">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-blue-500/30 bg-blue-500/10 text-blue-400 text-xs font-bold mb-6">
            <Activity size={14} /> Citadel Terminal Engine
          </div>
          <h1 className="text-4xl md:text-6xl font-extrabold text-white mb-6 tracking-tight">
            Built for the professional.
          </h1>
          <p className="text-gray-400 text-lg">
            Stop relying on retail platforms. Upgrade to institutional-grade trading tools, automated execution algorithms, and deep liquidity routing.
          </p>
        </div>

        {/* Tools Grid */}
        <div className="grid md:grid-cols-2 gap-6 mb-24">
          {TOOLS.map((tool, i) => (
            <div key={i} className="p-8 rounded-3xl bg-[#151924] border border-white/5 hover:border-white/10 transition-colors group">
              <div className={`w-14 h-14 rounded-2xl flex items-center justify-center mb-6 ${tool.bg} ${tool.color}`}>
                {tool.icon}
              </div>
              <h3 className="text-2xl font-bold text-white mb-3">{tool.title}</h3>
              <p className="text-gray-400 leading-relaxed">
                {tool.desc}
              </p>
            </div>
          ))}
        </div>

        {/* API & Developer Section */}
        <div className="relative rounded-3xl bg-[#151924] border border-white/5 overflow-hidden">
          {/* Ambient Glow */}
          <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-blue-600/10 rounded-full blur-[100px] pointer-events-none translate-x-1/3 -translate-y-1/3"></div>
          
          <div className="grid md:grid-cols-2 items-center relative z-10">
            <div className="p-12">
              <div className="w-12 h-12 rounded-xl bg-gray-800 flex items-center justify-center text-white mb-6 border border-white/10">
                <Terminal size={24} />
              </div>
              <h2 className="text-3xl font-extrabold text-white mb-4">REST & WebSocket API</h2>
              <p className="text-gray-400 mb-8 leading-relaxed">
                Connect your own automated strategies, trading bots, or custom UI directly to our matching engine. Stream live market data, execute trades, and manage account configurations programmatically.
              </p>
              <ul className="space-y-4 mb-8">
                <li className="flex items-center gap-3 text-sm font-medium text-gray-300">
                  <Code2 className="text-blue-500" size={18} /> Detailed documentation & SDKs (TS, Python)
                </li>
                <li className="flex items-center gap-3 text-sm font-medium text-gray-300">
                  <Activity className="text-blue-500" size={18} /> Real-time market data websockets
                </li>
              </ul>
              <Link href="/register" className="inline-flex items-center gap-2 px-6 py-3 bg-white text-black hover:bg-gray-200 rounded-full text-sm font-bold transition-colors">
                Generate API Keys <ArrowRight size={16} />
              </Link>
            </div>
            
            {/* Mock Code Block */}
            <div className="p-6 md:p-12 md:pl-0 h-full">
              <div className="bg-[#0B0E14] border border-white/10 rounded-2xl p-6 h-full font-mono text-sm shadow-2xl relative overflow-hidden">
                {/* Fake Window Controls */}
                <div className="flex gap-2 mb-6">
                  <div className="w-3 h-3 rounded-full bg-red-500"></div>
                  <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
                  <div className="w-3 h-3 rounded-full bg-green-500"></div>
                </div>
                
                <div className="text-blue-400 mb-2">import <span className="text-white">CitadelSDK</span> from <span className="text-green-400">'@citadel/sdk'</span>;</div>
                <br/>
                <div className="text-purple-400 mb-2">const <span className="text-white">client</span> = new <span className="text-yellow-200">CitadelSDK</span>({'{'}</div>
                <div className="pl-4 text-white mb-2">apiKey: process.env.<span className="text-gray-400">CITADEL_KEY</span>,</div>
                <div className="pl-4 text-white mb-2">environment: <span className="text-green-400">'production'</span></div>
                <div className="mb-2 text-purple-400">{'}'});</div>
                <br/>
                <div className="text-gray-500 mb-2">// Execute a VWAP algorithmic order</div>
                <div className="text-purple-400 mb-2">await <span className="text-white">client</span>.orders.<span className="text-blue-300">create</span>({'{'}</div>
                <div className="pl-4 text-white mb-2">symbol: <span className="text-green-400">'BTC/USD'</span>,</div>
                <div className="pl-4 text-white mb-2">side: <span className="text-green-400">'BUY'</span>,</div>
                <div className="pl-4 text-white mb-2">type: <span className="text-green-400">'VWAP'</span>,</div>
                <div className="pl-4 text-white mb-2">amount: <span className="text-orange-400">2.5</span>,</div>
                <div className="pl-4 text-white mb-2">durationMinutes: <span className="text-orange-400">60</span></div>
                <div className="text-purple-400">{'}'});</div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
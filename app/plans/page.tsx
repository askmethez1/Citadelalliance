import Navbar from '../components/Navbar';
import { CheckCircle2, HelpCircle, X } from 'lucide-react';
import PricingSection from '../components/PricingSection';

export default function PlansPage() {
  return (
    <div className="bg-[#0B0E14] min-h-screen text-gray-300 font-sans selection:bg-blue-500/30">
      <Navbar />
      
      <main className="pt-32 pb-24 px-6 max-w-7xl mx-auto">
        
        {/* Header */}
        <div className="text-center mb-10 max-w-3xl mx-auto">
          <h1 className="text-4xl md:text-6xl font-extrabold text-white mb-6 tracking-tight">
            Transparent Pricing.
          </h1>
          <p className="text-gray-400 text-lg">
            Zero commission on standard asset classes. Choose the infrastructure tier that matches your trading volume and strategy requirements.
          </p>
        </div>

        {/* Reusable Pricing Component */}
        <div className="mb-24">
          <PricingSection />
        </div>

        {/* Feature Comparison Table */}
        <div className="mb-24 overflow-x-auto">
          <h2 className="text-2xl font-bold text-white mb-8 text-center md:text-left">Compare Features</h2>
          <table className="w-full text-left border-collapse min-w-[800px]">
            <thead>
              <tr className="border-b border-white/10">
                <th className="py-4 px-6 text-gray-400 font-medium w-1/3">Features</th>
                <th className="py-4 px-6 text-white font-bold w-2/9 text-center">Retail</th>
                <th className="py-4 px-6 text-blue-400 font-bold w-2/9 text-center">Pro</th>
                <th className="py-4 px-6 text-white font-bold w-2/9 text-center">Advisor</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              <tr className="hover:bg-white/[0.02]">
                <td className="py-4 px-6 font-medium text-gray-300">Execution Latency</td>
                <td className="py-4 px-6 text-center text-gray-400">Standard (~50ms)</td>
                <td className="py-4 px-6 text-center text-blue-400 font-bold">Priority (&lt;12ms)</td>
                <td className="py-4 px-6 text-center text-gray-300 font-bold">Colocated (&lt;5ms)</td>
              </tr>
              <tr className="hover:bg-white/[0.02]">
                <td className="py-4 px-6 font-medium text-gray-300">Max Copy Allocations</td>
                <td className="py-4 px-6 text-center text-gray-400">3 Masters</td>
                <td className="py-4 px-6 text-center text-white font-bold">Unlimited</td>
                <td className="py-4 px-6 text-center text-white font-bold">Unlimited</td>
              </tr>
              <tr className="hover:bg-white/[0.02]">
                <td className="py-4 px-6 font-medium text-gray-300">Algorithmic Order Types</td>
                <td className="py-4 px-6 text-center"><X className="mx-auto text-gray-600" size={20} /></td>
                <td className="py-4 px-6 text-center"><CheckCircle2 className="mx-auto text-blue-400" size={20} /></td>
                <td className="py-4 px-6 text-center"><CheckCircle2 className="mx-auto text-green-500" size={20} /></td>
              </tr>
              <tr className="hover:bg-white/[0.02]">
                <td className="py-4 px-6 font-medium text-gray-300">API Rate Limits</td>
                <td className="py-4 px-6 text-center text-gray-400">50 req / min</td>
                <td className="py-4 px-6 text-center text-white">500 req / min</td>
                <td className="py-4 px-6 text-center text-white font-bold">Custom</td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* FAQ Section */}
        <div className="max-w-3xl mx-auto">
          <div className="text-center mb-10">
            <h2 className="text-3xl font-extrabold text-white mb-4">Frequently Asked Questions</h2>
          </div>
          <div className="space-y-4">
            
            <div className="bg-[#151924] border border-white/5 rounded-2xl p-6">
              <h4 className="text-lg font-bold text-white mb-2 flex items-center gap-2">
                <HelpCircle size={18} className="text-blue-500" /> Are there any hidden trading fees?
              </h4>
              <p className="text-gray-400 text-sm leading-relaxed">
                No. We offer zero-commission trading on standard equities and ETFs. For copy-trading, a performance fee (usually 10-20%) is automatically deducted from your profits and paid to the Master Trader. If you don't profit, they don't get paid.
              </p>
            </div>

            <div className="bg-[#151924] border border-white/5 rounded-2xl p-6">
              <h4 className="text-lg font-bold text-white mb-2 flex items-center gap-2">
                <HelpCircle size={18} className="text-blue-500" /> How fast are crypto deposits credited?
              </h4>
              <p className="text-gray-400 text-sm leading-relaxed">
                USDT and USDC deposits on supported networks (TRC20, ERC20, Polygon) are credited automatically after standard network confirmations (usually under 3 minutes). You can deploy that capital into the market immediately.
              </p>
            </div>

            <div className="bg-[#151924] border border-white/5 rounded-2xl p-6">
              <h4 className="text-lg font-bold text-white mb-2 flex items-center gap-2">
                <HelpCircle size={18} className="text-blue-500" /> Can I cancel my Pro subscription anytime?
              </h4>
              <p className="text-gray-400 text-sm leading-relaxed">
                Yes, Pro subscriptions are billed on a month-to-month basis unless you select the annual plan. You can downgrade to the free Retail tier at any time directly from your dashboard settings.
              </p>
            </div>

          </div>
        </div>

      </main>
    </div>
  );
}
import { CheckCircle2 } from 'lucide-react';

interface PlanCardProps {
  title: string;
  fee: string;
  desc: string;
  features: string[];
  highlighted?: boolean;
}

function PlanCard({ title, fee, desc, features, highlighted }: PlanCardProps) {
  return (
    <div className={`p-8 rounded-3xl border ${highlighted ? 'bg-blue-600/10 border-blue-500/50 relative' : 'bg-[#151924] border-white/5'}`}>
      {highlighted && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-blue-600 text-white text-xs font-bold px-3 py-1 rounded-full">
          Most Popular
        </div>
      )}
      <h3 className="text-2xl font-bold text-white mb-2">{title}</h3>
      <div className="text-3xl font-extrabold text-white mb-4">{fee}</div>
      <p className="text-sm text-gray-400 mb-8 pb-8 border-b border-white/10">{desc}</p>
      <ul className="space-y-4 mb-8">
        {features.map((f, i) => (
          <li key={i} className="flex items-center gap-3 text-gray-300 text-sm">
            <CheckCircle2 className="text-green-500 flex-shrink-0" size={18} />
            <span>{f}</span>
          </li>
        ))}
      </ul>
      <button className={`w-full py-3 rounded-full font-bold transition-colors ${highlighted ? 'bg-blue-600 hover:bg-blue-500 text-white' : 'bg-white/10 hover:bg-white/20 text-white'}`}>
        Choose {title}
      </button>
    </div>
  );
}

export default function PlansSection() {
  return (
    <section id="plans" className="py-24 px-6 max-w-7xl mx-auto">
      <div className="text-center mb-16">
        <h2 className="text-3xl font-extrabold text-white mb-4">Account Tiers</h2>
        <p className="text-gray-400">Tailored conditions for retail traders, professionals, and financial advisors.</p>
      </div>
      <div className="grid md:grid-cols-3 gap-8">
        <PlanCard 
          title="Retail" 
          fee="0%" 
          desc="Perfect for individual copy-traders." 
          features={['Standard execution', 'Access to all Master Traders', 'Crypto deposits']} 
        />
        <PlanCard 
          title="Pro" 
          fee="$49/mo" 
          desc="For active traders seeking edge." 
          features={['Priority execution latency', 'Advanced charting tools', 'Direct trader calls (1/mo)']} 
          highlighted 
        />
        <PlanCard 
          title="Advisor" 
          fee="Custom" 
          desc="For wealth managers and funds." 
          features={['MAM/PAMM accounts', 'White-label reporting', 'Dedicated API access']} 
        />
      </div>
    </section>
  );
}
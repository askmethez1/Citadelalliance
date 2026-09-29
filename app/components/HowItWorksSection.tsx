interface StepProps {
  number: string;
  title: string;
  desc: string;
}

function Step({ number, title, desc }: StepProps) {
  return (
    <div className="relative p-6 md:p-8 bg-white/[0.02] border border-white/5 rounded-2xl hover:bg-white/[0.04] transition-colors">
      <div className="text-5xl font-extrabold text-white/10 mb-4">{number}</div>
      <h4 className="text-lg font-bold text-white mb-2">{title}</h4>
      <p className="text-sm text-gray-400 leading-relaxed">{desc}</p>
    </div>
  );
}

export default function HowItWorksSection() {
  return (
    <section className="py-32 my-16 bg-[#151924]/30 border-y border-white/5">
      <div className="max-w-7xl mx-auto px-8 md:px-12">
        <h2 className="text-3xl md:text-4xl font-extrabold text-white text-center mb-16">
          From deposit to execution in minutes.
        </h2>
        <div className="grid sm:grid-cols-2 md:grid-cols-4 gap-6 md:gap-8">
          <Step number="01" title="Register & KYC" desc="Lightning-fast automated onboarding based on your jurisdiction." />
          <Step number="02" title="Fund via Crypto" desc="Deposit stablecoins (USDT/USDC). Instant clearing to your trading balance." />
          <Step number="03" title="Select a Master" desc="Filter experts by risk profile, win-rate, and historical drawdowns." />
          <Step number="04" title="Automated Alpha" desc="Your account mirrors their trades in real-time. You keep the profits." />
        </div>
      </div>
    </section>
  );
}
import Link from 'next/link';
import { ShieldCheck } from 'lucide-react';

export default function ComplianceSection() {
  return (
    <section className="py-24 px-6 max-w-4xl mx-auto text-center">
      <div className="w-16 h-16 bg-blue-600/20 text-blue-500 rounded-full flex items-center justify-center mx-auto mb-6">
        <ShieldCheck size={32} />
      </div>
      <h2 className="text-3xl font-extrabold text-white mb-6">Security, Custody & Compliance</h2>
      <p className="text-gray-400 leading-relaxed mb-8">
        Citadel Alliance was founded by a collective of quantitative analysts and software engineers with a singular goal: to bridge the gap between Web3 funding and traditional, regulated markets. 
        <br /><br />
        We adhere to strict KYC/AML policies globally. All ETF offerings are subject to regulatory oversight by primary market watchdogs (SEC/FCA equivalents). Client crypto assets are held in institutional cold-storage multi-sig vaults, while fiat equivalents are segregated in Tier-1 banking institutions. 
      </p>
      <Link href="/compliance" className="text-blue-400 font-semibold hover:underline">
        Read our full Regulatory & Execution Policy →
      </Link>
    </section>
  );
}
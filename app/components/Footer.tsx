import Link from 'next/link';
import { BarChart3 } from 'lucide-react';

export default function Footer() {
  return (
    <footer className="bg-[#080a0f] border-t border-white/5 pt-16 pb-8 px-6 text-sm font-sans">
      <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-4 gap-12 mb-12">

        {/* Brand Column */}
        <div className="md:col-span-1">
          <Link href="/" className="flex items-center gap-2 mb-4 hover:opacity-80 transition-opacity w-max">
            <div className="w-8 h-8 rounded bg-blue-600 flex items-center justify-center">
              <BarChart3 className="text-white" size={18} />
            </div>
            {/* Updated to match the global Manrope font aesthetic */}
            <span className="text-xl font-extrabold text-white tracking-tight">
              Citadel Alliance
            </span>
          </Link>
          <p className="text-gray-500 font-medium leading-relaxed pr-4">
            Institutional-grade execution meets decentralized funding. The premier destination for mirroring global market experts.
          </p>
        </div>

        {/* Links Column 1 */}
        <div>
          <h4 className="text-white font-bold mb-4 tracking-wide uppercase text-xs">Platform</h4>
          <ul className="space-y-3 text-gray-400 font-medium">
            <li><Link href="/markets" className="hover:text-white transition-colors">Global Markets</Link></li>
            <li><Link href="/copy-trading" className="hover:text-white transition-colors">Master Traders</Link></li>
            <li><Link href="/funding" className="hover:text-white transition-colors">Crypto Wallet</Link></li>
            <li><Link href="/plans" className="hover:text-white transition-colors">Pricing & Fees</Link></li>
          </ul>
        </div>

        {/* Links Column 2 */}
        <div>
          <h4 className="text-white font-bold mb-4 tracking-wide uppercase text-xs">Company</h4>
          <ul className="space-y-3 text-gray-400 font-medium">
            <li><Link href="/about" className="hover:text-white transition-colors">About Us</Link></li>
            <li><Link href="/careers" className="hover:text-white transition-colors">Careers</Link></li>
            <li><Link href="/press" className="hover:text-white transition-colors">Press</Link></li>
            <li><Link href="/contact" className="hover:text-white transition-colors">Contact Support</Link></li>
          </ul>
        </div>

        {/* Links Column 3 */}
        <div>
          <h4 className="text-white font-bold mb-4 tracking-wide uppercase text-xs">Legal & Compliance</h4>
          <ul className="space-y-3 text-gray-400 font-medium">
            <li><Link href="/terms" className="hover:text-white transition-colors">Terms of Service</Link></li>
            <li><Link href="/privacy" className="hover:text-white transition-colors">Privacy Policy</Link></li>
            <li><Link href="/kyc" className="hover:text-white transition-colors">KYC & AML</Link></li>
            <li><Link href="/risk" className="hover:text-white transition-colors">Risk Disclosure</Link></li>
          </ul>
        </div>
      </div>

      {/* Bottom Bar */}
      <div className="max-w-7xl mx-auto border-t border-white/5 pt-8 flex flex-col md:flex-row items-center justify-between gap-4">
        <p className="text-gray-600 font-medium text-xs text-center md:text-left">
          &copy; {new Date().getFullYear()} Citadel Alliance. All rights reserved. Trading involves substantial risk of loss and is not suitable for every investor.
        </p>
        <div className="flex gap-4 text-gray-500 font-medium">
          <Link href="#" className="hover:text-white transition-colors">𝕏</Link>
          <Link href="#" className="hover:text-white transition-colors">in</Link>
        </div>
      </div>
    </footer>
  );
}
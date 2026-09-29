"use client";

import Navbar from '../components/Navbar';
import { Shield, FileCheck, Globe, Lock, Award, Building2, Server, Scale, Wallet as WalletIcon } from 'lucide-react';

const licenses = [
  {
    region: "United States",
    regulator: "SEC & FINRA",
    desc: "Registered broker-dealer and member of the Financial Industry Regulatory Authority, strictly adhering to US securities laws.",
    icon: Building2,
  },
  {
    region: "United Kingdom",
    regulator: "FCA",
    desc: "Authorized and regulated by the Financial Conduct Authority to offer derivatives, equities, and digital asset services.",
    icon: Scale,
  },
  {
    region: "European Union",
    regulator: "CySEC & BaFin",
    desc: "Compliant with MiFID II directives, holding Tier-1 licenses to operate seamlessly across the European Economic Area.",
    icon: Globe,
  },
  {
    region: "Australia",
    regulator: "ASIC",
    desc: "Holds an Australian Financial Services License (AFSL), ensuring consumer protection and market integrity.",
    icon: FileCheck,
  },
];

const certifications = [
  {
    title: "SOC 2 Type II",
    desc: "Independently audited for security, availability, and processing integrity of our trading infrastructure.",
  },
  {
    title: "ISO/IEC 27001:2022",
    desc: "Certified for establishing, implementing, and maintaining a world-class Information Security Management System.",
  },
  {
    title: "PCI DSS Level 1",
    desc: "The highest standard of payment data security, ensuring all fiat and crypto onboarding transactions are encrypted.",
  },
];

export default function CompliancePage() {
  return (
    <>
      {/* Global Navigation */}
      <Navbar />

      <div className="min-h-screen bg-[#0a0a0a] text-white pt-32 pb-24 selection:bg-blue-500/30">
        <div className="max-w-7xl mx-auto px-6 md:px-12">
          
          {/* Hero Section */}
          <div className="text-center max-w-3xl mx-auto mb-24">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-blue-500/30 bg-blue-500/10 text-blue-400 text-sm font-semibold tracking-wide mb-8">
              <Shield className="w-4 h-4" />
              Global Regulatory Standards
            </div>
            <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight leading-[1.1] mb-8">
              Uncompromising <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-blue-600">Security.</span>
            </h1>
            <p className="text-lg md:text-xl text-gray-400 font-light leading-relaxed">
              As a unified stock and cryptocurrency trading infrastructure, we operate under the strictest regulatory frameworks worldwide. Your assets are protected by tier-1 licenses, institutional insurance, and cryptographic security.
            </p>
          </div>

          {/* Global Licenses Grid */}
          <div className="mb-32">
            <h2 className="text-3xl font-bold mb-12 flex items-center gap-3 border-b border-white/10 pb-4">
              <Globe className="text-blue-500" /> Global Regulatory Licenses
            </h2>
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
              {licenses.map((license, idx) => {
                const Icon = license.icon;
                return (
                  <div key={idx} className="bg-[#151924]/50 border border-white/5 p-8 rounded-2xl hover:border-blue-500/30 hover:bg-[#151924] transition-all group">
                    <Icon className="w-10 h-10 text-blue-400 mb-6 group-hover:scale-110 transition-transform" />
                    <div className="text-sm text-blue-400 font-medium mb-1 uppercase tracking-wider">{license.region}</div>
                    <h3 className="text-xl font-bold text-white mb-3">{license.regulator}</h3>
                    <p className="text-sm text-gray-400 leading-relaxed">
                      {license.desc}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Institutional Protection & Security */}
          <div className="grid lg:grid-cols-2 gap-16 mb-32">
            <div>
              <h2 className="text-3xl font-bold mb-8 flex items-center gap-3 border-b border-white/10 pb-4">
                <Lock className="text-blue-500" /> Asset Protection & Insurance
              </h2>
              <div className="space-y-8">
                <div className="flex gap-4">
                  <div className="mt-1 bg-blue-500/10 p-3 rounded-full border border-blue-500/20 h-fit">
                    <WalletIcon className="w-6 h-6 text-blue-400" />
                  </div>
                  <div>
                    <h4 className="text-xl font-bold mb-2">Fiat Custody & SIPC Coverage</h4>
                    <p className="text-gray-400 text-sm leading-relaxed">
                      Client fiat funds are held in segregated, bankruptcy-remote accounts at tier-1 global banks. US securities accounts are protected by SIPC up to $500,000 (including $250,000 for cash claims).
                    </p>
                  </div>
                </div>
                <div className="flex gap-4">
                  <div className="mt-1 bg-blue-500/10 p-3 rounded-full border border-blue-500/20 h-fit">
                    <Server className="w-6 h-6 text-blue-400" />
                  </div>
                  <div>
                    <h4 className="text-xl font-bold mb-2">Crypto Cold Storage</h4>
                    <p className="text-gray-400 text-sm leading-relaxed">
                      98% of digital assets are stored offline in multi-signature, geographically distributed HSMs (Hardware Security Modules) requiring multi-party authorization for execution.
                    </p>
                  </div>
                </div>
                <div className="flex gap-4">
                  <div className="mt-1 bg-blue-500/10 p-3 rounded-full border border-blue-500/20 h-fit">
                    <Award className="w-6 h-6 text-blue-400" />
                  </div>
                  <div>
                    <h4 className="text-xl font-bold mb-2">$350M Institutional Insurance</h4>
                    <p className="text-gray-400 text-sm leading-relaxed">
                      Digital assets held in our custody infrastructure are backed by a comprehensive $350 million insurance policy underwritten by syndicates at Lloyd's of London, covering third-party hacks or physical loss.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-[#151924]/30 border border-white/5 rounded-3xl p-8 md:p-12 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-64 h-64 bg-blue-600/10 rounded-full blur-[80px] pointer-events-none"></div>
              <h2 className="text-2xl font-bold mb-8 flex items-center gap-3">
                <FileCheck className="text-blue-500" /> Security Certifications
              </h2>
              <div className="space-y-6 relative z-10">
                {certifications.map((cert, idx) => (
                  <div key={idx} className="bg-black/40 border border-white/5 p-6 rounded-2xl">
                    <h4 className="text-lg font-bold text-white mb-2">{cert.title}</h4>
                    <p className="text-sm text-gray-400">{cert.desc}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* AML / KYC Disclaimer */}
          <div className="bg-blue-900/10 border border-blue-500/20 rounded-2xl p-8 text-center max-w-4xl mx-auto">
            <h3 className="text-xl font-bold mb-4 text-blue-400">Anti-Money Laundering (AML) & KYC Strict Compliance</h3>
            <p className="text-sm text-gray-400 leading-relaxed">
              Our platform strictly adheres to the guidelines set forth by the Financial Action Task Force (FATF) and local regulatory authorities. We employ automated, real-time transaction monitoring and enforce mandatory identity verification (KYC/KYB) for all clients to prevent financial crime, ensure market integrity, and protect our trading community.
            </p>
          </div>

        </div>
      </div>
    </>
  );
}
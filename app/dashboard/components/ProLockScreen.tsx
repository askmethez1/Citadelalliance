"use client";

import React from 'react';
import Link from 'next/link';
import { Lock, ArrowRight } from 'lucide-react';

interface ProLockScreenProps {
  featureName: string;
  description: string;
}

export default function ProLockScreen({ featureName, description }: ProLockScreenProps) {
  return (
    <div className="flex-1 p-4 sm:p-6 lg:p-8 w-full flex flex-col items-center justify-center">
      <div className="bg-[#151924] border border-white/5 rounded-3xl p-8 md:p-12 max-w-2xl w-full text-center shadow-2xl relative overflow-hidden">
        <div className="absolute -top-24 -right-24 w-48 h-48 bg-blue-500/10 rounded-full blur-3xl pointer-events-none"></div>
        <div className="absolute -bottom-24 -left-24 w-48 h-48 bg-purple-500/10 rounded-full blur-3xl pointer-events-none"></div>
        
        <div className="relative z-10">
          <div className="w-20 h-20 bg-blue-500/10 border border-blue-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
            <Lock size={36} className="text-blue-500" />
          </div>
          <h2 className="text-3xl font-extrabold text-white mb-4">Pro Terminal Required</h2>
          
          <div className="text-xs text-blue-400 font-bold uppercase tracking-wider mb-4">
            {featureName} Locked
          </div>
          
          <p className="text-gray-400 text-lg mb-8 leading-relaxed">
            {description}
          </p>
          
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link href="/dashboard/upgrade" className="px-8 py-4 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-bold transition-all shadow-lg shadow-blue-600/20 flex items-center gap-2">
              Upgrade to Pro <ArrowRight size={18} />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
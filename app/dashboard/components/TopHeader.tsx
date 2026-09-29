"use client";

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import { Wallet, ArrowDownLeft, LogOut, ShieldAlert, Loader2 } from 'lucide-react';
import { getUserRole, logoutUser } from '@/app/actions/auth';
import { useWalletEngine } from '@/app/hooks/useWalletEngine';

export default function TopHeader() {
  const router = useRouter();
  const pathname = usePathname();
  const [role, setRole] = useState<string>('user');
  
  // Hook directly into the central balance engine
  const { liveEquity, openTrades, isWalletLoading } = useWalletEngine();

  useEffect(() => {
    const initializeRole = async () => {
      const userRole = await getUserRole();
      setRole(userRole);
      
      if (userRole === 'admin' && pathname.startsWith('/dashboard')) {
        router.replace('/admin/dashboard');
      }
    };
    
    initializeRole();
  }, [router, pathname]);

  const handleLogout = async () => {
    await logoutUser();
    router.push('/login');
  };

  const isLive = openTrades.length > 0;

  return (
    <header className="h-20 border-b border-white/5 bg-[#0B0E14]/80 backdrop-blur-md px-4 sm:px-8 flex items-center justify-between sticky top-0 z-40">
      <div className="flex items-center gap-3">
        <h2 className="text-base sm:text-lg font-extrabold text-white">Trading Workspace</h2>
        
        {role === 'admin' && (
          <Link
            href="/admin/dashboard"
            className="flex items-center gap-1.5 px-3 py-1 bg-red-600/20 border border-red-500/30 text-red-400 hover:bg-red-600 hover:text-white rounded-xl text-xs font-bold transition-all"
          >
            <ShieldAlert size={14} /> Admin Desk
          </Link>
        )}
      </div>

      <div className="flex items-center gap-3 sm:gap-4">
        {/* Wallet Balance / Live Equity Display */}
        <Link 
          href="/dashboard/wallet" 
          className={`flex items-center gap-2.5 sm:gap-3 bg-[#151924] border hover:border-blue-500/50 px-3 sm:px-4 py-2 rounded-2xl transition-all ${
            isLive ? 'border-green-500/30 shadow-[0_0_15px_rgba(34,197,94,0.1)]' : 'border-white/10'
          }`}
        >
          <Wallet size={16} className={isLive ? "text-green-400" : "text-blue-400"} />
          <div className="text-right">
            <div className="text-[10px] text-gray-500 font-bold uppercase">
              {isLive ? 'Live Equity' : 'Equity'}
            </div>
            <div className="text-xs font-mono font-bold text-white flex items-center justify-end min-w-[70px]">
              {isWalletLoading ? (
                <Loader2 size={12} className="animate-spin text-gray-500" />
              ) : (
                `$${liveEquity.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
              )}
            </div>
          </div>
        </Link>

        {/* Deposit Quick Link */}
        <Link 
          href="/dashboard/wallet" 
          className="px-3.5 sm:px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-xl transition-all flex items-center gap-1.5 shadow-lg shadow-blue-600/20"
        >
          <ArrowDownLeft size={14} /> Deposit
        </Link>

        {/* Logout Button */}
        <button
          onClick={handleLogout}
          className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-400 hover:bg-red-600 hover:text-white transition-all shadow-sm shrink-0"
          title="Log Out Account"
        >
          <LogOut size={18} />
        </button>
      </div>
    </header>
  );
}
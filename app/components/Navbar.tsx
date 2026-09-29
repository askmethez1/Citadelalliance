"use client";

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { BarChart3, LayoutDashboard, UserCircle, LogOut, Wallet } from 'lucide-react';
import { checkAuthStatus, logoutUser, getUserRole } from '../actions/auth';
import { getWalletOverview } from '../actions/wallet';

export default function Navbar() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [role, setRole] = useState('user');
  const [balance, setBalance] = useState<number>(0.00);
  const router = useRouter();

  useEffect(() => {
    const initializeNav = async () => {
      const status = await checkAuthStatus();
      setIsLoggedIn(status);
      
      if (status) {
        const userRole = await getUserRole();
        setRole(userRole || 'user');

        // Only fetch wallet balance for regular users
        if (userRole !== 'admin') {
          const overview = await getWalletOverview();
          if (overview) setBalance(overview.balance);
        }
      }
    };
    
    initializeNav();
  }, []);

  const handleLogout = async () => {
    await logoutUser();
    setIsLoggedIn(false);
    router.push('/login');
  };

  const dashboardRoute = role === 'admin' ? '/admin/dashboard' : '/dashboard';

  return (
    <nav className="fixed top-0 w-full z-50 border-b border-white/5 bg-[#0B0E14]/80 backdrop-blur-md">
      <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
        
        {/* Brand Logo */}
        <Link href="/" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
          <div className="w-8 h-8 rounded bg-blue-600 flex items-center justify-center">
            <BarChart3 className="text-white" size={18} />
          </div>
          <span className="text-xl font-extrabold text-white tracking-tight">Citadel</span>
        </Link>
        
        {/* Navigation Links */}
        <div className="hidden md:flex gap-8 text-sm font-medium text-gray-400">
          <Link href="/markets" className="hover:text-white transition-colors">Markets</Link>
          <Link href="/tools" className="hover:text-white transition-colors">Tools</Link>
          {/* Dynamically route to login if not authenticated */}
          <Link href={isLoggedIn ? (role === 'admin' ? dashboardRoute : "/dashboard/copy-trading") : "/login"} className="hover:text-white transition-colors">
            Copy Trading
          </Link>
          <Link href="/plans" className="hover:text-white transition-colors">Plans</Link>
        </div>
        
        {/* Dynamic Auth & Balance Buttons */}
        <div className="flex items-center gap-3 md:gap-5">
          {isLoggedIn ? (
            <>
              {/* Live Synced Nav Balance (Hidden for Admins) */}
              {role !== 'admin' && (
                <Link 
                  href="/dashboard/wallet" 
                  className="hidden sm:flex items-center gap-2 bg-[#151924] border border-white/10 hover:border-blue-500/40 px-3.5 py-1.5 rounded-xl transition-all"
                >
                  <Wallet size={14} className="text-blue-400" />
                  <span className="text-xs font-mono font-bold text-white">
                    ${balance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                </Link>
              )}

              <Link href={dashboardRoute} className="hidden sm:flex items-center gap-2 text-sm font-medium text-gray-400 hover:text-white transition-colors">
                <LayoutDashboard size={16} />
              </Link>
              <Link 
                href={role === 'admin' ? dashboardRoute : '/dashboard/profile'} 
                className="w-10 h-10 rounded-full bg-blue-600/10 border border-blue-500/20 flex items-center justify-center text-blue-400 hover:bg-blue-600 hover:text-white transition-all shadow-sm"
                title={role === 'admin' ? "Admin Desk" : "Go to Terminal"}
              >
                <UserCircle size={20} />
              </Link>
              <button 
                onClick={handleLogout}
                className="w-10 h-10 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-400 hover:bg-red-500 hover:text-white transition-all shadow-sm"
                title="Log Out"
              >
                <LogOut size={18} />
              </button>
            </>
          ) : (
            <>
              <Link href="/login" className="text-sm font-medium hover:text-white transition-colors">
                Log in
              </Link>
              <Link href="/register" className="text-sm font-medium text-white bg-white/10 hover:bg-white/20 border border-white/10 px-5 py-2.5 rounded-full transition-all">
                Open Account
              </Link>
            </>
          )}
        </div>
        
      </div>
    </nav>
  );
}
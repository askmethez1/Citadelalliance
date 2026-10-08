"use client";

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  LineChart, LayoutDashboard, Users, PhoneCall, Wallet,
  CreditCard, History, MessageSquare, ShieldAlert, Settings, MapPin,
  Menu, X, Ban
} from 'lucide-react';
import { logoutUser } from '@/app/actions/auth';

interface SidebarProps {
  location?: string;
  isBanned?: boolean;
  activeTab?: string; 
  setActiveTab?: (tab: string) => void; 
}

export default function Sidebar({ location = "Detecting...", isBanned = false }: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);

  // Close sidebar on route change (for mobile)
  useEffect(() => {
    setIsOpen(false);
  }, [pathname]);

  // --- NEW: Lock body scroll when mobile sidebar is open ---
  useEffect(() => {
    if (isOpen) {
      // Prevent background scrolling
      document.body.style.overflow = 'hidden';
    } else {
      // Restore background scrolling
      document.body.style.overflow = 'unset';
    }

    // Cleanup function in case the component unmounts while sidebar is open
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  // --- NAVIGATION CONFIGURATION ---
  const NAV_GROUPS = [
    {
      title: 'Execution',
      items: [
        { href: '/dashboard', label: 'Pro Terminal', icon: LayoutDashboard },
        { href: '/dashboard/copy-trading', label: 'Copy Masters', icon: Users },
        { href: '/dashboard/signals', label: 'Premium Signals', icon: PhoneCall, badge: 'Book' },
      ]
    },
    {
      title: 'Finance',
      items: [
        { href: '/dashboard/wallet', label: 'Deposit / Withdraw', icon: Wallet },
        { href: '/dashboard/buy-crypto', label: 'Buy Crypto (Fiat)', icon: CreditCard },
        { href: '/dashboard/statement', label: 'Account Statement', icon: History },
      ]
    },
    {
      title: 'System',
      items: [
        { href: '/dashboard/chat', label: 'Trader Chat', icon: MessageSquare, indicator: true },
        { href: '/dashboard/security', label: 'Security & Logs', icon: ShieldAlert },
        { href: '/dashboard/profile', label: 'Profile Settings', icon: Settings },
      ]
    }
  ];

  // --- SECURITY INTERCEPTOR ---
  const handleBannedClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    alert("Your account is suspended. You will now be logged out.");
    logoutUser().then(() => router.push('/'));
  };

  return (
    <>
      {/* MOBILE MENU TOGGLE - FIXED POSITIONING */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="lg:hidden fixed top-4 left-4 z-[60] p-2.5 bg-[#151924] rounded-xl border border-white/10 text-white shadow-lg backdrop-blur-md transition-transform"
        aria-label="Toggle Menu"
      >
        {isOpen ? <X size={20} /> : <Menu size={20} />}
      </button>

      {/* MOBILE OVERLAY */}
      {isOpen && (
        <div
          onClick={() => setIsOpen(false)}
          className="lg:hidden fixed inset-0 bg-black/80 z-[40] backdrop-blur-sm transition-opacity"
        />
      )}

      {/* SIDEBAR CONTAINER */}
      <aside className={`
        fixed inset-y-0 left-0 z-[50] w-72 bg-[#080a0f] border-r border-white/5 flex flex-col shrink-0
        lg:static lg:h-screen lg:min-h-full
        transition-transform duration-300 ease-in-out
        ${isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
        ${isBanned ? 'border-red-500/30 bg-red-950/10 overflow-hidden' : ''}
      `}>
        
        {/* BAN BLOCKER */}
        {isBanned && (
          <div 
            onClick={handleBannedClick}
            className="absolute inset-0 z-[100] bg-[#080a0f]/60 backdrop-blur-[3px] flex flex-col items-center justify-center text-center px-6 cursor-not-allowed"
          >
             <div className="w-16 h-16 bg-red-500/20 border border-red-500/30 rounded-2xl flex items-center justify-center mb-4 shadow-2xl animate-pulse">
                <Ban className="text-red-500" size={32} />
             </div>
             <p className="text-red-400 font-extrabold text-lg tracking-wide mb-1">System Locked</p>
             <p className="text-gray-400 text-xs leading-relaxed max-w-[200px]">
                Account suspended by administrator. Click anywhere to log out.
             </p>
          </div>
        )}

        {/* LOGO */}
        <div className="p-6 border-b border-white/5 pt-20 lg:pt-6 shrink-0">
          <Link 
            href={isBanned ? "#" : "/"} 
            onClick={isBanned ? handleBannedClick : () => setIsOpen(false)}
            className={`flex items-center gap-3 transition-opacity ${isBanned ? 'pointer-events-none opacity-50' : 'hover:opacity-80'}`}
          >
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center shadow-lg ${isBanned ? 'bg-red-900 shadow-red-900/20' : 'bg-blue-600 shadow-blue-600/20'}`}>
              <LineChart className={isBanned ? 'text-red-400' : 'text-white'} size={20} />
            </div>
            <span className={`text-2xl font-extrabold tracking-tight ${isBanned ? 'text-red-500' : 'text-white'}`}>
              Citadel
            </span>
          </Link>
        </div>

        {/* NAVIGATION MENUS */}
        <div className={`flex-1 overflow-y-auto py-6 px-4 custom-scrollbar space-y-8 ${isBanned ? 'opacity-30 blur-[1px]' : ''}`}>
          {NAV_GROUPS.map((group) => (
            <div key={group.title}>
              <h4 className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-3 px-3">
                {group.title}
              </h4>
              <nav className="space-y-1.5">
                {group.items.map((item) => {
                  const Icon = item.icon;
                  const isActive = pathname === item.href;

                  return (
                    <Link
                      key={item.href}
                      href={isBanned ? '#' : item.href}
                      onClick={isBanned ? handleBannedClick : () => setIsOpen(false)}
                      className={`w-full flex items-center justify-between px-3 py-3 rounded-xl text-sm font-bold transition-all ${
                        isBanned 
                          ? 'opacity-30 cursor-not-allowed text-red-500/50 border border-transparent pointer-events-none'
                          : isActive
                            ? 'bg-blue-600/10 text-blue-400 border border-blue-500/20 shadow-inner'
                            : 'text-gray-400 hover:bg-white/5 hover:text-white border border-transparent'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <Icon size={18} className={isActive && !isBanned ? 'text-blue-400' : 'text-gray-500'} />
                        {item.label}
                      </div>
                      
                      {item.badge && (
                        <span className="bg-yellow-500/20 text-yellow-500 text-[10px] px-2 py-0.5 rounded-full font-bold uppercase shrink-0">
                          {item.badge}
                        </span>
                      )}
                      
                      {item.indicator && (
                        <div className={`w-2 h-2 rounded-full shrink-0 ${isBanned ? 'bg-red-900' : 'bg-blue-500'}`}></div>
                      )}
                    </Link>
                  );
                })}
              </nav>
            </div>
          ))}
        </div>

        {/* FOOTER USER CARD */}
        <div className="p-4 border-t border-white/5 bg-[#151924]/50 mt-auto shrink-0">
          <div className="flex items-center gap-2 px-3 py-2 mb-3 bg-[#0B0E14] border border-white/5 rounded-xl">
            <MapPin size={14} className={isBanned ? 'text-red-500 shrink-0' : 'text-gray-500 shrink-0'} />
            <div className="text-xs text-gray-400 font-mono truncate">{location}</div>
          </div>

          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-xl border border-white/10 flex items-center justify-center font-bold text-white shadow-inner shrink-0 ${isBanned ? 'bg-red-900/50 text-red-500' : 'bg-gray-800'}`}>
              JD
            </div>
            <div className="min-w-0">
              <div className={`text-sm font-bold truncate ${isBanned ? 'text-red-500 line-through' : 'text-white'}`}>John Doe</div>
              {isBanned ? (
                <div className="text-[10px] text-red-500 flex items-center gap-1 font-bold uppercase tracking-wider mt-0.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-red-500 shrink-0"></span> Suspended
                </div>
              ) : (
                <div className="text-[10px] text-blue-400 flex items-center gap-1 font-bold uppercase tracking-wider mt-0.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse shrink-0"></span> Online
                </div>
              )}
            </div>
          </div>
        </div>

      </aside>
    </>
  );
}
"use client";

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { 
  Users, 
  CircleDollarSign, 
  UserPlus, 
  Zap, 
  Activity, 
  Ban, 
  FileCheck, 
  ShieldAlert,
  LogOut,
  MapPin,
  MessageSquare,
  Crown, // <-- Added the Crown icon for the Subscriptions tab
  Menu,
  X
} from 'lucide-react';
import { logoutUser } from '@/app/actions/auth';

interface AdminSidebarProps {
  location: string;
}

export default function AdminSidebar({ location }: AdminSidebarProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);

  // Close sidebar on route change (for mobile)
  useEffect(() => {
    setIsOpen(false);
  }, [pathname]);

  // Lock body scroll when mobile sidebar is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  // Define URLs for each tab
  const NAV_ITEMS = [
    { id: 'users', href: '/admin/dashboard', label: 'User Accounts & Ledger', icon: Users },
    { id: 'deposits', href: '/admin/dashboard/deposits', label: 'Pending Deposits', icon: CircleDollarSign },
    { id: 'subscriptions', href: '/admin/dashboard/subscriptions', label: 'Pro Subscriptions', icon: Crown },
    { id: 'chat', href: '/admin/dashboard/chat', label: 'Live Support Desk', icon: MessageSquare },
    { id: 'traders', href: '/admin/dashboard/traders', label: 'Add Master Trader', icon: UserPlus },
    { id: 'signals', href: '/admin/dashboard/signals', label: 'Broadcast Signal', icon: Zap },
    { id: 'kyc', href: '/admin/dashboard/kyc', label: 'KYC Approvals', icon: FileCheck },
    { id: 'logins', href: '/admin/dashboard/logins', label: 'System Logins', icon: Activity },
    { id: 'bans', href: '/admin/dashboard/bans', label: 'Ban & Restrict Users', icon: Ban },
  ];

  const handleLogout = async () => {
    await logoutUser();
    router.push('/login');
  };

  return (
    <>
      {/* MOBILE MENU TOGGLE - FIXED POSITIONING */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="lg:hidden fixed top-4 left-4 z-[60] p-2.5 bg-[#0B0E14] rounded-xl border border-red-500/30 text-red-400 shadow-lg backdrop-blur-md transition-transform"
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
        fixed inset-y-0 left-0 z-[50] w-64 bg-[#0B0E14] border-r border-white/5 flex flex-col shrink-0
        lg:static lg:h-screen lg:min-h-full
        transition-transform duration-300 ease-in-out
        ${isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
      `}>
        
        {/* Admin Branding */}
        <div className="p-6 pt-20 lg:pt-6 lg:h-20 flex items-center border-b border-white/5 bg-red-950/10 shrink-0">
          <Link href="/" className="flex items-center gap-3 hover:opacity-80 transition-opacity">
            <div className="w-9 h-9 rounded-xl bg-red-600 flex items-center justify-center shadow-lg shadow-red-600/20 shrink-0">
              <ShieldAlert className="text-white" size={18} />
            </div>
            <div>
              <span className="text-lg font-extrabold text-white tracking-tight block leading-none">Citadel</span>
              <span className="text-[10px] font-bold text-red-500 uppercase tracking-widest">Root Access</span>
            </div>
          </Link>
        </div>

        {/* Navigation Links */}
        <div className="flex-1 py-6 px-4 space-y-1.5 overflow-y-auto custom-scrollbar">
          <div className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-4 px-2">Executive Controls</div>
          
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            // Exact match for the root dashboard to avoid highlighting multiple items,
            // otherwise check if the current pathname matches the item's href
            const isActive = item.href === '/admin/dashboard' 
              ? pathname === '/admin/dashboard'
              : pathname.startsWith(item.href);
            
            return (
              <Link
                key={item.id}
                href={item.href}
                onClick={() => setIsOpen(false)}
                className={`w-full flex items-center gap-3 px-3 py-3 rounded-xl text-sm font-bold transition-all ${
                  isActive 
                    ? 'bg-red-500/10 text-red-400 border border-red-500/20 shadow-inner' 
                    : 'text-gray-400 hover:bg-white/5 hover:text-white border border-transparent'
                }`}
              >
                <Icon size={18} className={isActive ? 'text-red-400' : 'text-gray-500'} />
                {item.label}
              </Link>
            );
          })}
        </div>

        {/* Admin Footer */}
        <div className="p-4 border-t border-white/5 bg-[#151924]/50 shrink-0">
          
          <div className="flex items-center gap-2 px-3 py-2 mb-3 bg-[#0B0E14] border border-white/5 rounded-xl">
            <MapPin size={14} className="text-gray-500 shrink-0" />
            <div className="text-xs text-gray-400 font-mono truncate">{location}</div>
          </div>

          <button 
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-white/5 hover:bg-red-500/10 border border-white/10 hover:border-red-500/30 text-gray-300 hover:text-red-400 rounded-xl text-xs font-bold transition-all"
          >
            <LogOut size={14} /> Exit Admin Node
          </button>
        </div>
      </aside>
    </>
  );
}
"use client";

import React from 'react';
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
  Crown // Added icon for Subscriptions
} from 'lucide-react';
import { logoutUser } from '@/app/actions/auth';

interface AdminSidebarProps {
  location: string;
}

export default function AdminSidebar({ location }: AdminSidebarProps) {
  const router = useRouter();
  const pathname = usePathname();

  // Define URLs for each tab
  const NAV_ITEMS = [
    { id: 'users', href: '/admin/dashboard', label: 'User Accounts & Ledger', icon: Users },
    { id: 'deposits', href: '/admin/dashboard/deposits', label: 'Pending Deposits', icon: CircleDollarSign },
    { id: 'subscriptions', href: '/admin/dashboard/subscriptions', label: 'Pro Subscriptions', icon: Crown }, // <-- New Subscriptions Tab
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
    <aside className="hidden lg:flex flex-col w-64 h-screen bg-[#0B0E14] border-r border-white/5 sticky top-0">
      
      {/* Admin Branding */}
      <div className="h-20 flex items-center px-6 border-b border-white/5 bg-red-950/10">
        <Link href="/" className="flex items-center gap-3 hover:opacity-80 transition-opacity">
          <div className="w-9 h-9 rounded-xl bg-red-600 flex items-center justify-center shadow-lg shadow-red-600/20">
            <ShieldAlert className="text-white" size={18} />
          </div>
          <div>
            <span className="text-lg font-extrabold text-white tracking-tight block leading-none">Citadel</span>
            <span className="text-[10px] font-bold text-red-500 uppercase tracking-widest">Root Access</span>
          </div>
        </Link>
      </div>

      {/* Navigation Links */}
      <div className="flex-1 py-6 px-4 space-y-1.5 overflow-y-auto">
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
      <div className="p-4 border-t border-white/5 bg-[#151924]/50">
        
        <div className="flex items-center gap-2 px-3 py-2 mb-3 bg-[#0B0E14] border border-white/5 rounded-xl">
          <MapPin size={14} className="text-gray-500" />
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
  );
}
"use client";

import React, { useState } from 'react';
import { Ban, Search, ShieldCheck, AlertTriangle } from 'lucide-react';
import { toggleUserBanAdmin } from '@/app/actions/admin';
import { ModalType } from '@/app/components/ui/NotificationModal';

interface BansTabProps {
  users: any[];
  refreshData: () => void;
  showAlert: (message: string, type: ModalType, title?: string) => void;
}

export default function BansTab({ users, refreshData, showAlert }: BansTabProps) {
  const [searchQuery, setSearchQuery] = useState('');
  
  // Custom Confirmation Modal State
  const [userToToggle, setUserToToggle] = useState<{ id: number, isBanned: boolean, name: string } | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  // Filter users using the correct camelCase properties from Drizzle ORM
  const filteredUsers = users.filter(u => {
    const query = searchQuery.toLowerCase();
    return query === '' ||
      (u.firstName && u.firstName.toLowerCase().includes(query)) ||
      (u.lastName && u.lastName.toLowerCase().includes(query)) ||
      (u.email && u.email.toLowerCase().includes(query));
  });

  const executeToggleBan = async () => {
    if (!userToToggle) return;
    setIsProcessing(true);

    const res = await toggleUserBanAdmin(userToToggle.id, userToToggle.isBanned);
    
    if (res.success) {
      showAlert(res.message, userToToggle.isBanned ? 'success' : 'warning', 'Status Updated');
      refreshData();
    } else {
      showAlert(res.message || "Failed to update user status.", 'error', 'Action Failed');
    }
    
    setIsProcessing(false);
    setUserToToggle(null); // Close modal
  };

  return (
    <div className="bg-[#151924] border border-red-500/10 rounded-3xl p-6 shadow-xl space-y-6 relative overflow-hidden animate-in fade-in duration-300">
      {/* Background Glow */}
      <div className="absolute top-0 right-0 w-64 h-64 bg-red-500/5 rounded-full blur-3xl pointer-events-none"></div>

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/5 pb-4 relative z-10">
        <div>
          <h3 className="text-lg font-bold text-white flex items-center gap-2">
            <Ban size={20} className="text-red-500" /> Restrict & Ban Users
          </h3>
          <p className="text-xs text-gray-400 mt-0.5">Revoke system access for users violating platform policies.</p>
        </div>

        <div className="relative w-full sm:w-64">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500" size={16} />
          <input 
            type="text" 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search Name or Email..."
            className="w-full bg-[#0B0E14] border border-white/10 rounded-xl py-2 pl-10 pr-4 text-xs text-white focus:outline-none focus:border-red-500 transition-colors"
          />
        </div>
      </div>

      <div className="overflow-x-auto relative z-10">
        <table className="w-full text-left">
          <thead>
            <tr className="border-b border-white/5 text-xs uppercase text-gray-500 bg-[#0B0E14]/50">
              <th className="p-4 font-semibold">User</th>
              <th className="p-4 font-semibold">Role</th>
              <th className="p-4 font-semibold">Current Status</th>
              <th className="p-4 font-semibold text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5 text-sm font-sans">
            {filteredUsers.length === 0 ? (
              <tr>
                <td colSpan={4} className="p-8 text-center text-gray-500 text-sm">
                  No users found matching your search.
                </td>
              </tr>
            ) : (
              filteredUsers.map((u) => {
                const isAdmin = u.role === 'admin';
                return (
                  <tr key={u.id} className={`transition-colors ${u.isBanned ? 'bg-red-950/10' : 'hover:bg-white/[0.02]'}`}>
                    <td className="p-4">
                      <p className={`font-bold ${u.isBanned ? 'text-red-400 line-through opacity-70' : 'text-white'}`}>
                        {u.firstName} {u.lastName}
                      </p>
                      <p className="text-xs text-gray-500 font-mono">{u.email}</p>
                    </td>
                    <td className="p-4 font-mono text-xs text-gray-400">
                      {u.role || 'user'}
                    </td>
                    <td className="p-4 text-xs font-bold">
                      {u.isBanned ? (
                        <span className="text-red-400 flex items-center gap-1"><Ban size={12}/> Suspended</span>
                      ) : (
                        <span className="text-green-400 flex items-center gap-1"><ShieldCheck size={12}/> Active</span>
                      )}
                    </td>
                    <td className="p-4 text-right">
                      <button
                        onClick={() => setUserToToggle({ id: u.id, isBanned: u.isBanned, name: `${u.firstName} ${u.lastName}` })}
                        disabled={isAdmin} // Prevent banning other admins
                        className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all inline-flex items-center gap-1.5 disabled:opacity-30 disabled:cursor-not-allowed ${
                          u.isBanned 
                            ? 'bg-white/5 hover:bg-white/10 text-white border border-white/10' 
                            : 'bg-red-600/20 hover:bg-red-600 text-red-400 hover:text-white border border-red-500/30'
                        }`}
                      >
                        <Ban size={14} />
                        {u.isBanned ? 'Revoke Ban' : 'Ban User'}
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* CUSTOM CONFIRMATION MODAL */}
      {userToToggle && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
          <div className="bg-[#151924] border border-white/10 rounded-3xl p-6 w-full max-w-sm shadow-2xl relative text-center">
            
            <div className={`w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-4 border ${
              userToToggle.isBanned ? 'bg-green-500/10 border-green-500/20 text-green-400' : 'bg-red-500/10 border-red-500/20 text-red-400'
            }`}>
              {userToToggle.isBanned ? <ShieldCheck size={28} /> : <AlertTriangle size={28} />}
            </div>

            <h3 className="text-lg font-bold text-white mb-2">
              {userToToggle.isBanned ? 'Unban User?' : 'Ban User?'}
            </h3>
            
            <p className="text-sm text-gray-400 mb-6">
              Are you sure you want to {userToToggle.isBanned ? 'restore access for' : 'revoke system access for'} <strong className="text-white">{userToToggle.name}</strong>?
            </p>

            <div className="flex gap-3">
              <button 
                onClick={() => setUserToToggle(null)} 
                disabled={isProcessing}
                className="flex-1 py-3 bg-white/5 hover:bg-white/10 text-gray-300 font-bold rounded-xl text-sm transition-all"
              >
                Cancel
              </button>
              <button 
                onClick={executeToggleBan} 
                disabled={isProcessing}
                className={`flex-1 py-3 font-bold rounded-xl text-sm transition-all shadow-lg flex items-center justify-center ${
                  userToToggle.isBanned 
                    ? 'bg-green-600 hover:bg-green-500 text-white shadow-green-600/20' 
                    : 'bg-red-600 hover:bg-red-500 text-white shadow-red-600/20'
                }`}
              >
                {isProcessing ? 'Processing...' : 'Confirm'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
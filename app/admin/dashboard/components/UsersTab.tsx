"use client";

import React, { useState } from 'react';
import { Users, Search } from 'lucide-react';
import { updateUserBalanceAdmin, creditUserDepositAdmin } from '@/app/actions/admin';
import { ModalType } from '@/app/components/ui/NotificationModal';

interface UsersTabProps {
  users: any[];
  refreshData: () => void;
  showAlert: (message: string, type: ModalType, title?: string) => void;
  onSelectUser?: (user: any) => void; // Fixed TypeScript Error: Added for the Inspector Modal
}

export default function UsersTab({ users, refreshData, showAlert, onSelectUser }: UsersTabProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedManageUser, setSelectedManageUser] = useState<any | null>(null); // For Balance Override Modal
  const [editBalance, setEditBalance] = useState<string>('');
  const [creditAmount, setCreditAmount] = useState<string>('');
  const [creditNote, setCreditNote] = useState<string>('');

  const filteredUsers = users.filter(u => 
    searchQuery === '' ||
    (u.first_name && u.first_name.toLowerCase().includes(searchQuery.toLowerCase())) ||
    (u.last_name && u.last_name.toLowerCase().includes(searchQuery.toLowerCase())) ||
    (u.email && u.email.toLowerCase().includes(searchQuery.toLowerCase())) ||
    (u.country && u.country.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const handleUpdateBalance = async () => {
    if (!selectedManageUser) return;
    const res = await updateUserBalanceAdmin(selectedManageUser.id, parseFloat(editBalance));
    if (res.success) {
      showAlert(res.message, 'success', 'Balance Updated');
      setSelectedManageUser(null);
      refreshData();
    } else {
      showAlert(res.message, 'error', 'Update Failed');
    }
  };

  const handleCreditUser = async () => {
    if (!selectedManageUser) return;
    
    // Safety check to prevent Next.js Server Action serialization crashes
    const amount = parseFloat(creditAmount);
    if (isNaN(amount) || amount <= 0) {
      showAlert("Please enter a valid credit amount greater than 0.", "error", "Invalid Amount");
      return;
    }

    const res = await creditUserDepositAdmin(selectedManageUser.id, amount, creditNote);
    
    if (res.success) {
      showAlert(res.message, 'success', 'Account Credited');
      setCreditAmount('');
      setCreditNote('');
      setSelectedManageUser(null);
      refreshData();
    } else {
      showAlert(res.message, 'error', 'Credit Failed');
    }
  };

  return (
    <div className="bg-[#151924] border border-white/5 rounded-3xl p-6 shadow-xl space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/5 pb-4">
        <div>
          <h3 className="text-lg font-bold text-white flex items-center gap-2">
            <Users size={20} className="text-blue-400" /> User Accounts & Wallet Ledger
          </h3>
          <p className="text-xs text-gray-400 mt-0.5">Direct manual override for account equity, deposits, and roles.</p>
        </div>

        <div className="relative w-full sm:w-64">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500" size={16} />
          <input 
            type="text" 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search Name, Email..."
            className="w-full bg-[#0B0E14] border border-white/10 rounded-xl py-2 pl-10 pr-4 text-xs text-white focus:outline-none focus:border-blue-500 transition-colors"
          />
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left">
          <thead>
            <tr className="border-b border-white/5 text-xs uppercase text-gray-500 bg-[#0B0E14]/50">
              <th className="p-4 font-semibold">User</th>
              <th className="p-4 font-semibold">System Role</th>
              <th className="p-4 font-semibold">Liquid Balance</th>
              <th className="p-4 font-semibold">Trading Funds</th>
              <th className="p-4 font-semibold">Total Equity</th>
              <th className="p-4 font-semibold text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5 text-sm font-sans">
            {filteredUsers.map((u) => (
              <tr 
                key={u.id} 
                onClick={() => onSelectUser && onSelectUser(u)} 
                className="hover:bg-white/[0.02] transition-colors cursor-pointer"
              >
                <td className="p-4">
                  <p className="font-bold text-white">{u.first_name} {u.last_name}</p>
                  <p className="text-xs text-gray-500 font-mono">{u.email}</p>
                </td>
                <td className="p-4 font-mono text-xs">
                  <span className={`px-2.5 py-1 rounded-md text-[10px] font-bold uppercase ${
                    u.role === 'admin' ? 'bg-red-500/20 text-red-400 border border-red-500/30' : 'bg-gray-500/20 text-gray-400'
                  }`}>
                    {u.role || 'user'}
                  </span>
                </td>
                <td className="p-4 font-mono font-bold text-green-400">
                  ${(u.balance || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </td>
                <td className="p-4 font-mono font-bold text-yellow-400">
                  ${(u.tradingBalance || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </td>
                <td className="p-4 font-mono font-bold text-blue-400">
                  ${(u.totalEquity || u.balance || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </td>
                <td className="p-4 text-right">
                  <button
                    onClick={(e) => {
                      e.stopPropagation(); // Prevents the row's onClick (Inspector Modal) from firing
                      setSelectedManageUser(u);
                      setEditBalance(u.balance.toString());
                    }}
                    className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold transition-all shadow-lg shadow-blue-600/20"
                  >
                    Manage Account
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* BALANCE MANAGE MODAL */}
      {selectedManageUser && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-[60]">
          <div className="bg-[#151924] border border-white/10 rounded-3xl p-6 sm:p-8 w-full max-w-md space-y-5 shadow-2xl">
            <div>
              <h3 className="text-lg font-bold text-white">Manage Balance: {selectedManageUser.first_name}</h3>
              <p className="text-xs text-gray-400 mt-1">Current Balance: <b className="text-green-400">${selectedManageUser.balance.toFixed(2)}</b></p>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Set Exact Balance ($)</label>
              <div className="flex gap-2">
                <input 
                  type="number" step="any" 
                  value={editBalance} 
                  onChange={e => setEditBalance(e.target.value)}
                  className="w-full bg-[#0B0E14] border border-white/10 rounded-xl p-3 text-sm text-white focus:outline-none focus:border-blue-500" 
                />
                <button 
                  onClick={handleUpdateBalance} 
                  className="px-5 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl text-xs transition-all shrink-0"
                >
                  Override
                </button>
              </div>
            </div>

            <div className="space-y-3 pt-3 border-t border-white/5">
              <label className="text-xs font-bold text-gray-400 uppercase tracking-wider block">Credit Deposit Account ($)</label>
              <input 
                type="number" step="any" 
                placeholder="Amount to Credit" 
                value={creditAmount} 
                onChange={e => setCreditAmount(e.target.value)}
                className="w-full bg-[#0B0E14] border border-white/10 rounded-xl p-3 text-sm text-white focus:outline-none focus:border-blue-500" 
              />
              <input 
                type="text" 
                placeholder="Credit Note (e.g. Wire Transfer Approved)" 
                value={creditNote} 
                onChange={e => setCreditNote(e.target.value)}
                className="w-full bg-[#0B0E14] border border-white/10 rounded-xl p-3 text-sm text-white focus:outline-none focus:border-blue-500" 
              />
              <button 
                onClick={handleCreditUser} 
                className="w-full py-3 bg-green-600 hover:bg-green-500 text-white font-bold rounded-xl text-xs transition-all shadow-lg shadow-green-600/20"
              >
                Credit Account
              </button>
            </div>

            <button 
              onClick={() => setSelectedManageUser(null)} 
              className="w-full py-2.5 bg-white/5 hover:bg-white/10 text-gray-400 rounded-xl text-xs font-bold transition-all"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
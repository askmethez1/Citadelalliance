"use client";

import React from 'react';
import { Wallet, Check, X } from 'lucide-react';
import { approveTransactionAdmin, rejectTransactionAdmin } from '@/app/actions/admin';
import { ModalType } from '@/app/components/ui/NotificationModal';

interface DepositsTabProps {
  pendingTxs: any[];
  refreshData: () => void;
  showAlert: (message: string, type: ModalType, title?: string) => void;
}

export default function DepositsTab({ pendingTxs, refreshData, showAlert }: DepositsTabProps) {
  const handleApproveTx = async (id: number) => {
    const res = await approveTransactionAdmin(id);
    if (res.success) {
      showAlert(res.message, 'success', 'Transaction Approved');
      refreshData();
    } else {
      showAlert(res.message, 'error', 'Approval Failed');
    }
  };

  const handleRejectTx = async (id: number) => {
    const res = await rejectTransactionAdmin(id);
    if (res.success) {
      showAlert(res.message, 'info', 'Transaction Rejected');
      refreshData();
    } else {
      showAlert(res.message, 'error', 'Rejection Failed');
    }
  };

  return (
    <div className="bg-[#151924] border border-white/5 rounded-3xl p-6 shadow-xl space-y-6">
      <div className="border-b border-white/5 pb-4">
        <h3 className="text-lg font-bold text-white flex items-center gap-2">
          <Wallet size={20} className="text-yellow-400" /> Pending Deposit Requests
        </h3>
        <p className="text-xs text-gray-400 mt-0.5">Verify off-chain or fiat deposits and credit user trading balances.</p>
      </div>

      {pendingTxs.length === 0 ? (
        <div className="text-center py-16 border border-dashed border-white/5 rounded-2xl text-gray-500 text-sm">
          No pending deposit transactions awaiting review.
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-white/5 text-xs uppercase text-gray-500 bg-[#0B0E14]/50">
                <th className="p-4 font-semibold">User</th>
                <th className="p-4 font-semibold">Method / Asset</th>
                <th className="p-4 font-semibold">Requested Amount</th>
                <th className="p-4 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5 text-sm font-sans">
              {pendingTxs.map((tx) => (
                <tr key={tx.id} className="hover:bg-white/[0.02] transition-colors">
                  <td className="p-4">
                    <p className="font-bold text-white">{tx.first_name} {tx.last_name}</p>
                    <p className="text-xs text-gray-500 font-mono">{tx.email}</p>
                  </td>
                  <td className="p-4 text-white font-medium">{tx.asset}</td>
                  <td className="p-4 font-mono font-bold text-green-400">{tx.amount}</td>
                  <td className="p-4 text-right space-x-2">
                    <button
                      onClick={() => handleApproveTx(tx.id)}
                      className="px-3.5 py-1.5 bg-green-600 hover:bg-green-500 text-white rounded-xl text-xs font-bold transition-all shadow-lg shadow-green-600/20 inline-flex items-center gap-1"
                    >
                      <Check size={14} /> Approve & Credit
                    </button>
                    <button
                      onClick={() => handleRejectTx(tx.id)}
                      className="px-3.5 py-1.5 bg-red-600/20 text-red-400 hover:bg-red-600 hover:text-white rounded-xl text-xs font-bold transition-all inline-flex items-center gap-1"
                    >
                      <X size={14} /> Reject
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
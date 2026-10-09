"use client";

import React, { useState, useEffect } from 'react';
import { Wallet, Check, X, Save, Link as LinkIcon } from 'lucide-react';
import { 
  getPendingTransactionsAdmin, 
  approveTransactionAdmin, 
  rejectTransactionAdmin,
  getSystemAddresses,
  updateSystemAddress
} from '@/app/actions/admin';
import NotificationModal, { ModalType } from '@/app/components/ui/NotificationModal';
import LoadingSpinner from '@/app/components/ui/LoadingSpinner';

export default function AdminDepositsPage() {
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [pendingTxs, setPendingTxs] = useState<any[]>([]);
  
  // Wallet Address State
  const [addresses, setAddresses] = useState({
    BTC: '',
    ETH: '',
    USDT_TRC20: '',
    SOL: '',
  });

  const [modalConfig, setModalConfig] = useState<{ isOpen: boolean; title?: string; message: string; type: ModalType; }>({
    isOpen: false, message: '', type: 'info'
  });

  const showAlert = (message: string, type: ModalType = 'info', title?: string) => {
    setModalConfig({ isOpen: true, message, type, title });
  };

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [pData, sysAddresses] = await Promise.all([
        getPendingTransactionsAdmin(),
        getSystemAddresses()
      ]);
      
      setPendingTxs(pData || []);
      if (sysAddresses) {
        const typedAddresses = sysAddresses as any;
        setAddresses({
          BTC: typedAddresses.BTC || '',
          ETH: typedAddresses.ETH || '',
          USDT_TRC20: typedAddresses.USDT_TRC20 || '',
          SOL: typedAddresses.SOL || '',
        });
      }
    } catch (error) {
      console.error("Failed to fetch data:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { 
    loadData(); 
  }, []);

  const handleApproveTx = async (id: number) => {
    const res = await approveTransactionAdmin(id);
    if (res.success) {
      showAlert(res.message, 'success', 'Transaction Approved');
      loadData(); 
    } else {
      showAlert(res.message || "Failed to approve transaction.", 'error', 'Approval Failed');
    }
  };

  const handleRejectTx = async (id: number) => {
    const res = await rejectTransactionAdmin(id);
    if (res.success) {
      showAlert(res.message, 'info', 'Transaction Rejected');
      loadData(); 
    } else {
      showAlert(res.message || "Failed to reject transaction.", 'error', 'Rejection Failed');
    }
  };

  const handleSaveAddresses = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      const res = await updateSystemAddress(addresses);
      if (res.success) {
        showAlert("System deposit addresses updated successfully. Users will now see these addresses.", "success", "Addresses Saved");
      } else {
        showAlert("Failed to save addresses.", "error");
      }
    } catch (error) {
      showAlert("An unexpected error occurred.", "error");
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) return <LoadingSpinner label="Loading Deposit Configuration..." />;

  const safeTxs = Array.isArray(pendingTxs) ? pendingTxs : [];

  return (
    <div className="animate-in fade-in duration-300 space-y-6">
      
      {/* SYSTEM DEPOSIT ADDRESSES CONFIGURATION */}
      <div className="bg-[#151924] border border-white/5 rounded-3xl p-6 shadow-xl">
        <div className="border-b border-white/5 pb-4 mb-6">
          <h3 className="text-lg font-bold text-white flex items-center gap-2">
            <LinkIcon size={20} className="text-blue-400" /> System Wallet Configuration
          </h3>
          <p className="text-xs text-gray-400 mt-0.5">Set the official deposit addresses shown to users on the deposit page.</p>
        </div>

        <form onSubmit={handleSaveAddresses} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            
            <div className="space-y-2">
              <label className="text-xs font-bold text-gray-500 uppercase tracking-wider flex items-center gap-2">
                <div className="w-5 h-5 rounded-full bg-orange-500/20 flex items-center justify-center text-orange-500 font-bold">₿</div> Bitcoin (BTC)
              </label>
              <input 
                type="text" 
                value={addresses.BTC}
                onChange={(e) => setAddresses({...addresses, BTC: e.target.value})}
                placeholder="bc1q..."
                className="w-full bg-[#0B0E14] border border-white/10 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-blue-500 font-mono"
              />
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold text-gray-500 uppercase tracking-wider flex items-center gap-2">
                <div className="w-5 h-5 rounded-full bg-indigo-500/20 flex items-center justify-center text-indigo-400 font-bold">Ξ</div> Ethereum (ERC20)
              </label>
              <input 
                type="text" 
                value={addresses.ETH}
                onChange={(e) => setAddresses({...addresses, ETH: e.target.value})}
                placeholder="0x..."
                className="w-full bg-[#0B0E14] border border-white/10 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-blue-500 font-mono"
              />
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold text-gray-500 uppercase tracking-wider flex items-center gap-2">
                <div className="w-5 h-5 rounded-full bg-green-500/20 flex items-center justify-center text-green-500 font-bold">$</div> USDT (TRC20)
              </label>
              <input 
                type="text" 
                value={addresses.USDT_TRC20}
                onChange={(e) => setAddresses({...addresses, USDT_TRC20: e.target.value})}
                placeholder="T..."
                className="w-full bg-[#0B0E14] border border-white/10 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-blue-500 font-mono"
              />
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold text-gray-500 uppercase tracking-wider flex items-center gap-2">
                <div className="w-5 h-5 rounded-full bg-purple-500/20 flex items-center justify-center text-purple-400 font-bold">◎</div> Solana (SOL)
              </label>
              <input 
                type="text" 
                value={addresses.SOL}
                onChange={(e) => setAddresses({...addresses, SOL: e.target.value})}
                placeholder="Solana address..."
                className="w-full bg-[#0B0E14] border border-white/10 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-blue-500 font-mono"
              />
            </div>

          </div>

          <div className="pt-2 flex justify-end">
            <button 
              type="submit" 
              disabled={isSaving}
              className="px-6 py-3 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white rounded-xl text-sm font-bold transition-all shadow-lg shadow-blue-600/20 flex items-center gap-2"
            >
              <Save size={16} /> {isSaving ? 'Saving...' : 'Save Addresses'}
            </button>
          </div>
        </form>
      </div>

      {/* PENDING DEPOSITS TABLE */}
      <div className="bg-[#151924] border border-white/5 rounded-3xl p-6 shadow-xl space-y-6">
        <div className="border-b border-white/5 pb-4">
          <h3 className="text-lg font-bold text-white flex items-center gap-2">
            <Wallet size={20} className="text-yellow-400" /> Pending Deposit Requests
          </h3>
          <p className="text-xs text-gray-400 mt-0.5">Verify off-chain or fiat deposits and credit user trading balances.</p>
        </div>

        {safeTxs.length === 0 ? (
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
                {safeTxs.map((tx) => (
                  <tr key={tx.id} className="hover:bg-white/[0.02] transition-colors">
                    <td className="p-4">
                      <p className="font-bold text-white">{tx.firstName} {tx.lastName}</p>
                      <p className="text-xs text-gray-500 font-mono">{tx.email}</p>
                    </td>
                    <td className="p-4 text-white font-medium">{tx.asset}</td>
                    <td className="p-4 font-mono font-bold text-green-400">{tx.amount}</td>
                    <td className="p-4 text-right space-x-2">
                      <button
                        onClick={() => handleApproveTx(tx.id)}
                        className="px-3.5 py-1.5 bg-green-600 hover:bg-green-500 text-white rounded-xl text-xs font-bold transition-all shadow-lg shadow-green-600/20 inline-flex items-center gap-1"
                      >
                        <Check size={14} /> Approve
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

      <NotificationModal 
        isOpen={modalConfig.isOpen} 
        onClose={() => setModalConfig(prev => ({ ...prev, isOpen: false }))} 
        title={modalConfig.title} 
        message={modalConfig.message} 
        type={modalConfig.type} 
      />
    </div>
  );
}
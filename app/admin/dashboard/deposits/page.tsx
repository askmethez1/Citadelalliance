"use client";

import React, { useState, useEffect } from 'react';
import { Wallet, Check, X, Save, Link as LinkIcon, History, Copy } from 'lucide-react';
import { 
  getPendingTransactionsAdmin, 
  approveTransactionAdmin, 
  rejectTransactionAdmin,
  getSystemAddresses,
  updateSystemAddress,
  getCompletedTransactionsAdmin
} from '@/app/actions/admin';
import NotificationModal, { ModalType } from '@/app/components/ui/NotificationModal';
import LoadingSpinner from '@/app/components/ui/LoadingSpinner';
import Pagination from '@/app/components/ui/Pagination';

// Failsafe helper to ensure Dates never crash the React render
const formatDate = (dateVal: any) => {
  if (!dateVal) return 'N/A';
  if (dateVal instanceof Date) return dateVal.toLocaleString();
  return String(dateVal);
};

export default function AdminDepositsPage() {
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [pendingTxs, setPendingTxs] = useState<any[]>([]);
  const [completedTxs, setCompletedTxs] = useState<any[]>([]); 
  
  // Wallet Address State
  const [addresses, setAddresses] = useState({
    BTC: '',
    ETH: '',
    USDT_TRC20: '',
    SOL: '',
  });

  // Pagination State for Completed Records
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const [modalConfig, setModalConfig] = useState<{ isOpen: boolean; title?: string; message: string; type: ModalType; }>({
    isOpen: false, message: '', type: 'info'
  });

  const showAlert = (message: string, type: ModalType = 'info', title?: string) => {
    setModalConfig({ isOpen: true, message, type, title });
  };

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [pData, cData, sysAddresses] = await Promise.all([
        getPendingTransactionsAdmin(),
        getCompletedTransactionsAdmin(), 
        getSystemAddresses()
      ]);

      setPendingTxs(pData || []);
      setCompletedTxs(cData || []);

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
        showAlert("System deposit addresses updated successfully.", "success", "Addresses Saved");
      } else {
        showAlert("Failed to save addresses.", "error");
      }
    } catch (error) {
      showAlert("An unexpected error occurred.", "error");
    } finally {
      setIsSaving(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    showAlert("Wallet address copied to clipboard", "success");
  };

  if (isLoading) return <LoadingSpinner label="Loading Configuration..." />;

  const safePending = Array.isArray(pendingTxs) ? pendingTxs : [];
  const safeCompleted = Array.isArray(completedTxs) ? completedTxs : [];

  const totalPages = Math.ceil(safeCompleted.length / itemsPerPage);
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentCompletedTxs = safeCompleted.slice(indexOfFirstItem, indexOfLastItem);

  return (
    <div className="animate-in fade-in duration-300 space-y-4 sm:space-y-6 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 pb-10 min-w-0">

      {/* SYSTEM DEPOSIT ADDRESSES CONFIGURATION */}
      <div className="bg-[#151924] border border-white/5 rounded-2xl sm:rounded-3xl p-4 sm:p-6 shadow-xl w-full min-w-0">
        <div className="border-b border-white/5 pb-4 mb-4 sm:mb-6">
          <h3 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
            <LinkIcon size={18} className="text-blue-400 sm:w-5 sm:h-5" /> System Wallet Configuration
          </h3>
          <p className="text-[10px] sm:text-xs text-gray-400 mt-1">Set the official deposit addresses shown to users on the deposit page.</p>
        </div>

        <form onSubmit={handleSaveAddresses} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 sm:gap-6">

            <div className="space-y-2">
              <label className="text-[10px] sm:text-xs font-bold text-gray-500 uppercase tracking-wider flex items-center gap-2">
                <div className="w-5 h-5 rounded-full bg-orange-500/20 flex items-center justify-center text-orange-500 font-bold">₿</div> Bitcoin (BTC)
              </label>
              <input 
                type="text" 
                value={addresses.BTC}
                onChange={(e) => setAddresses({...addresses, BTC: e.target.value})}
                placeholder="bc1q..."
                className="w-full bg-[#0B0E14] border border-white/10 rounded-xl px-3 sm:px-4 py-2.5 sm:py-3 text-white text-xs sm:text-sm focus:outline-none focus:border-blue-500 font-mono"
              />
            </div>

            <div className="space-y-2">
              <label className="text-[10px] sm:text-xs font-bold text-gray-500 uppercase tracking-wider flex items-center gap-2">
                <div className="w-5 h-5 rounded-full bg-indigo-500/20 flex items-center justify-center text-indigo-400 font-bold">Ξ</div> Ethereum (ERC20)
              </label>
              <input 
                type="text" 
                value={addresses.ETH}
                onChange={(e) => setAddresses({...addresses, ETH: e.target.value})}
                placeholder="0x..."
                className="w-full bg-[#0B0E14] border border-white/10 rounded-xl px-3 sm:px-4 py-2.5 sm:py-3 text-white text-xs sm:text-sm focus:outline-none focus:border-blue-500 font-mono"
              />
            </div>

            <div className="space-y-2">
              <label className="text-[10px] sm:text-xs font-bold text-gray-500 uppercase tracking-wider flex items-center gap-2">
                <div className="w-5 h-5 rounded-full bg-green-500/20 flex items-center justify-center text-green-500 font-bold">$</div> USDT (TRC20)
              </label>
              <input 
                type="text" 
                value={addresses.USDT_TRC20}
                onChange={(e) => setAddresses({...addresses, USDT_TRC20: e.target.value})}
                placeholder="T..."
                className="w-full bg-[#0B0E14] border border-white/10 rounded-xl px-3 sm:px-4 py-2.5 sm:py-3 text-white text-xs sm:text-sm focus:outline-none focus:border-blue-500 font-mono"
              />
            </div>

            <div className="space-y-2">
              <label className="text-[10px] sm:text-xs font-bold text-gray-500 uppercase tracking-wider flex items-center gap-2">
                <div className="w-5 h-5 rounded-full bg-purple-500/20 flex items-center justify-center text-purple-400 font-bold">◎</div> Solana (SOL)
              </label>
              <input 
                type="text" 
                value={addresses.SOL}
                onChange={(e) => setAddresses({...addresses, SOL: e.target.value})}
                placeholder="Solana address..."
                className="w-full bg-[#0B0E14] border border-white/10 rounded-xl px-3 sm:px-4 py-2.5 sm:py-3 text-white text-xs sm:text-sm focus:outline-none focus:border-blue-500 font-mono"
              />
            </div>

          </div>

          <div className="pt-2 flex justify-end">
            <button 
              type="submit" 
              disabled={isSaving}
              className="w-full sm:w-auto px-6 py-3 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white rounded-xl text-xs sm:text-sm font-bold transition-all shadow-lg shadow-blue-600/20 flex items-center justify-center gap-2"
            >
              <Save size={16} className="sm:w-4 sm:h-4" /> {isSaving ? 'Saving...' : 'Save Addresses'}
            </button>
          </div>
        </form>
      </div>

      {/* PENDING WITHDRAWALS TABLE WITH FULL DETAILS */}
      <div className="bg-[#151924] border border-white/5 rounded-2xl sm:rounded-3xl p-4 sm:p-6 shadow-xl space-y-4 sm:space-y-6 w-full min-w-0">
        <div className="border-b border-white/5 pb-4">
          <h3 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
            <Wallet size={18} className="text-yellow-400 sm:w-5 sm:h-5" /> Pending Withdrawal Requests
          </h3>
          <p className="text-[10px] sm:text-xs text-gray-400 mt-1">Review user withdrawal requests, confirm destination addresses, and process outbound payments.</p>
        </div>

        {safePending.length === 0 ? (
          <div className="text-center py-10 sm:py-16 border border-dashed border-white/5 rounded-xl sm:rounded-2xl text-gray-500 text-xs sm:text-sm">
            No pending withdrawal transactions awaiting review.
          </div>
        ) : (
          <div className="overflow-x-auto w-full scrollbar-thin scrollbar-thumb-white/10 pb-2">
            <table className="w-full text-left min-w-[850px]">
              <thead>
                <tr className="border-b border-white/5 text-[10px] sm:text-xs uppercase text-gray-500 bg-[#0B0E14]/50">
                  <th className="p-3 sm:p-4 font-semibold whitespace-nowrap">User</th>
                  <th className="p-3 sm:p-4 font-semibold whitespace-nowrap">Asset & Address</th>
                  <th className="p-3 sm:p-4 font-semibold whitespace-nowrap">Amount & Date</th>
                  <th className="p-3 sm:p-4 font-semibold text-right whitespace-nowrap">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 text-xs sm:text-sm font-sans">
                {safePending.map((tx) => (
                  <tr key={tx.id} className="hover:bg-white/[0.02] transition-colors">
                    <td className="p-3 sm:p-4 whitespace-nowrap">
                      <p className="font-bold text-white">{tx.firstName} {tx.lastName}</p>
                      <p className="text-[10px] sm:text-xs text-gray-500 font-mono">{tx.email}</p>
                    </td>

                    {/* DETAILED ASSET AND ADDRESS COLUMN */}
                    <td className="p-3 sm:p-4 whitespace-nowrap">
                      <p className="text-white font-medium">{tx.asset}</p>
                      {tx.destinationAddress ? (
                        <div className="flex items-center gap-1 mt-0.5">
                          <p className="text-[10px] text-gray-500 font-mono truncate max-w-[200px]" title={tx.destinationAddress}>
                            {tx.destinationAddress}
                          </p>
                          <button 
                            onClick={() => copyToClipboard(tx.destinationAddress)}
                            className="text-gray-500 hover:text-white p-1 rounded-md transition-colors"
                            title="Copy Wallet Address"
                          >
                            <Copy size={12} />
                          </button>
                        </div>
                      ) : (
                        <p className="text-[10px] text-gray-600 italic">No address provided</p>
                      )}
                    </td>

                    {/* AMOUNT AND DATE COLUMN */}
                    <td className="p-3 sm:p-4 whitespace-nowrap">
                      <p className="font-mono font-bold text-yellow-400">{tx.amount}</p>
                      <p className="text-[10px] sm:text-xs text-gray-500 mt-0.5">{formatDate(tx.createdAt)}</p>
                    </td>

                    <td className="p-3 sm:p-4 text-right space-x-2 whitespace-nowrap">
                      <button
                        onClick={() => handleApproveTx(tx.id)}
                        className="px-3 py-1.5 sm:px-3.5 bg-green-600 hover:bg-green-500 text-white rounded-lg sm:rounded-xl text-[10px] sm:text-xs font-bold transition-all shadow-lg shadow-green-600/20 inline-flex items-center gap-1"
                      >
                        <Check size={14} /> Approve
                      </button>
                      <button
                        onClick={() => handleRejectTx(tx.id)}
                        className="px-3 py-1.5 sm:px-3.5 bg-red-600/20 text-red-400 hover:bg-red-600 hover:text-white rounded-lg sm:rounded-xl text-[10px] sm:text-xs font-bold transition-all inline-flex items-center gap-1"
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

      {/* COMPLETED TRANSACTIONS & MANUAL RECORDS TABLE */}
      <div className="bg-[#151924] border border-white/5 rounded-2xl sm:rounded-3xl p-4 sm:p-6 shadow-xl space-y-4 sm:space-y-6 w-full min-w-0">
        <div className="border-b border-white/5 pb-4">
          <h3 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
            <History size={18} className="text-blue-400 sm:w-5 sm:h-5" /> Processed & Manual Records
          </h3>
          <p className="text-[10px] sm:text-xs text-gray-400 mt-1">A history of completed deposits, withdrawals, and manual balance changes.</p>
        </div>

        {safeCompleted.length === 0 ? (
          <div className="text-center py-10 sm:py-16 border border-dashed border-white/5 rounded-xl sm:rounded-2xl text-gray-500 text-xs sm:text-sm">
            No completed transaction records found.
          </div>
        ) : (
          <div className="overflow-x-auto w-full scrollbar-thin scrollbar-thumb-white/10 pb-2">
            <table className="w-full text-left min-w-[850px]">
              <thead>
                <tr className="border-b border-white/5 text-[10px] sm:text-xs uppercase text-gray-500 bg-[#0B0E14]/50">
                  <th className="p-3 sm:p-4 font-semibold whitespace-nowrap">User</th>
                  <th className="p-3 sm:p-4 font-semibold whitespace-nowrap">Asset & Address</th>
                  <th className="p-3 sm:p-4 font-semibold whitespace-nowrap">Amount & Date</th>
                  <th className="p-3 sm:p-4 font-semibold text-right whitespace-nowrap">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 text-xs sm:text-sm font-sans">
                {currentCompletedTxs.map((tx) => (
                  <tr key={tx.id} className="hover:bg-white/[0.02] transition-colors">
                    <td className="p-3 sm:p-4 whitespace-nowrap">
                      <p className="font-bold text-white">{tx.firstName} {tx.lastName}</p>
                      <p className="text-[10px] text-gray-500 font-mono">{tx.email}</p>
                    </td>

                    {/* NEW DETAILED ASSET AND ADDRESS COLUMN FOR COMPLETED RECORDS */}
                    <td className="p-3 sm:p-4 whitespace-nowrap">
                      <p className="text-white font-medium">{tx.type} <span className="text-gray-400 text-xs font-normal">({tx.asset || tx.network})</span></p>
                      {tx.destinationAddress ? (
                        <div className="flex items-center gap-1 mt-0.5">
                          <p className="text-[10px] text-blue-400 font-mono truncate max-w-[200px]" title={tx.destinationAddress}>
                            {tx.destinationAddress}
                          </p>
                          <button 
                            onClick={() => copyToClipboard(tx.destinationAddress)}
                            className="text-gray-500 hover:text-white p-1 rounded-md transition-colors"
                            title="Copy Wallet Address"
                          >
                            <Copy size={12} />
                          </button>
                        </div>
                      ) : (
                        <p className="text-[10px] text-gray-500 max-w-[150px] sm:max-w-[200px] truncate" title={tx.network}>{tx.network}</p>
                      )}
                    </td>

                    <td className="p-3 sm:p-4 whitespace-nowrap">
                      <p className={`font-mono font-bold ${String(tx.amount).includes('-') ? 'text-red-400' : 'text-green-400'}`}>
                        {tx.amount}
                      </p>
                      <p className="text-[10px] sm:text-xs font-mono text-gray-400 mt-0.5">
                        {formatDate(tx.createdAt)}
                      </p>
                    </td>

                    <td className="p-3 sm:p-4 text-right whitespace-nowrap">
                      <span className={`inline-flex items-center gap-1 text-[10px] sm:text-[11px] font-bold px-2 sm:px-2.5 py-1 rounded-md border ${
                        tx.status === 'Completed' 
                          ? 'text-green-400 bg-green-500/10 border-green-500/20' 
                          : 'text-red-400 bg-red-500/10 border-red-500/20'
                      }`}>
                        {tx.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Pagination Component */}
            {totalPages > 1 && (
              <div className="mt-4 sm:mt-6 pt-4 border-t border-white/5">
                <Pagination 
                  currentPage={currentPage}
                  totalPages={totalPages}
                  onPageChange={setCurrentPage}
                  totalItems={safeCompleted.length}
                  itemsPerPage={itemsPerPage}
                  itemLabel="records"
                />
              </div>
            )}
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
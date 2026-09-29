"use client";

import React, { useState, useEffect } from 'react';
import { ShieldAlert, RefreshCw } from 'lucide-react';

import AdminMetrics from './components/AdminMetrics';
import UsersTab from './components/UsersTab';
import NotificationModal, { ModalType } from '@/app/components/ui/NotificationModal';
import { getAllUsersAdmin, getPendingTransactionsAdmin } from '@/app/actions/admin';
import LoadingSpinner from '@/app/components/ui/LoadingSpinner';

export default function AdminDashboardRoot() {
  const [isLoading, setIsLoading] = useState(true);
  const [users, setUsers] = useState<any[]>([]);
  const [pendingTxs, setPendingTxs] = useState<any[]>([]);

  const [modalConfig, setModalConfig] = useState<{
    isOpen: boolean;
    title?: string;
    message: string;
    type: ModalType;
  }>({
    isOpen: false,
    message: '',
    type: 'info'
  });

  const showAlert = (message: string, type: ModalType = 'info', title?: string) => {
    setModalConfig({ isOpen: true, message, type, title });
  };

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [uData, pData] = await Promise.all([
        getAllUsersAdmin(),
        getPendingTransactionsAdmin()
      ]);
      setUsers(uData);
      setPendingTxs(pData);
    } catch (error) {
      console.error("Failed to load admin data:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { 
    loadData(); 
  }, []);

  const totalSystemLiquidity = users.reduce((acc, curr) => acc + (curr.balance || 0), 0);

  if (isLoading) {
    return <LoadingSpinner label="Synchronizing Admin Desk & User Ledgers..." />;
  }

  return (
    <div className="animate-in fade-in duration-300">
      
      {/* EXECUTIVE CONTROL BANNER */}
      <div className="w-full rounded-2xl bg-gradient-to-r from-red-900/40 via-blue-900/20 to-[#0B0E14] border border-red-500/30 p-6 flex flex-col md:flex-row items-center justify-between gap-6 relative overflow-hidden shadow-[0_0_30px_rgba(239,68,68,0.1)] mb-6">
        <div className="absolute -right-20 -top-20 w-64 h-64 bg-red-500/10 rounded-full blur-3xl pointer-events-none"></div>
        
        <div className="flex items-center gap-5 relative z-10">
          <div className="w-14 h-14 rounded-2xl bg-red-600 flex items-center justify-center text-white shrink-0 shadow-xl shadow-red-600/30 border border-red-400/50">
            <ShieldAlert size={28} />
          </div>
          <div>
            <div className="flex items-center gap-2 mb-1">
              <h3 className="text-xl font-extrabold text-white">Citadel Executive Control Desk</h3>
              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-red-500/20 text-red-400 uppercase tracking-wider">Root Access Active</span>
            </div>
            <p className="text-sm text-gray-400 max-w-xl">
              Total operational control over user accounts, wallet balance overrides, pending deposit approvals, master traders, and live signal feeds.
            </p>
          </div>
        </div>

        <button 
          onClick={loadData} 
          className="shrink-0 px-6 py-3 bg-white/5 hover:bg-white/10 border border-white/10 rounded-full text-xs font-bold text-white transition-all flex items-center gap-2 relative z-10 shadow-lg"
        >
          <RefreshCw size={14} /> Refresh System Ledger
        </button>
      </div>

      {/* ADMIN METRICS */}
      <AdminMetrics 
        usersCount={users.length} 
        pendingCount={pendingTxs.length} 
        totalLiquidity={totalSystemLiquidity} 
      />
      
      {/* ROOT TAB COMPONENT (Users Ledger) */}
      <div className="mt-6">
        <UsersTab users={users} refreshData={loadData} showAlert={showAlert} />
      </div>

      {/* GLOBAL MODAL */}
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
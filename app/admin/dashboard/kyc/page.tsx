"use client";

import React, { useState, useEffect } from 'react';
import { Loader2, CheckCircle2, XCircle, ShieldAlert, ExternalLink, AlertTriangle } from 'lucide-react';
import { getPendingKycRequests, resolveKycRequest } from '@/app/actions/kyc';

export default function AdminKYCPage() {
  const [requests, setRequests] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [processingId, setProcessingId] = useState<number | null>(null);

  // Custom Inline Confirmation Modal State
  const [confirmConfig, setConfirmConfig] = useState<{
    isOpen: boolean;
    userId: number;
    status: 'verified' | 'unverified';
  }>({
    isOpen: false,
    userId: 0,
    status: 'unverified',
  });

  const fetchRequests = async () => {
    setIsLoading(true);
    const res = await getPendingKycRequests();
    if (res.success) {
      setRequests(res.data);
    }
    setIsLoading(false);
  };

  useEffect(() => {
    fetchRequests();
  }, []);

  const promptResolve = (userId: number, status: 'verified' | 'unverified') => {
    setConfirmConfig({ isOpen: true, userId, status });
  };

  const handleConfirmResolve = async () => {
    const { userId, status } = confirmConfig;
    
    // Close modal immediately
    setConfirmConfig(prev => ({ ...prev, isOpen: false }));
    setProcessingId(userId);
    
    const res = await resolveKycRequest(userId, status);
    
    if (res.success) {
      // Remove the processed user from the UI
      setRequests(requests.filter(req => req.id !== userId));
    } else {
      alert("Failed to update KYC status.");
    }
    setProcessingId(null);
  };

  return (
    <div className="animate-in fade-in duration-300">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-extrabold text-white tracking-tight mb-2">KYC Approvals</h1>
          <p className="text-gray-400 text-sm">Review and verify user identity documents.</p>
        </div>
        <div className="bg-[#151924] border border-white/5 rounded-xl px-4 py-2 flex items-center gap-2">
          <ShieldAlert size={18} className="text-yellow-500" />
          <span className="text-white font-bold">{requests.length} Pending</span>
        </div>
      </div>

      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-32 bg-[#151924] border border-white/5 rounded-3xl">
          <Loader2 size={32} className="text-blue-500 animate-spin mb-4" />
          <p className="text-gray-500 text-sm">Fetching pending KYC requests...</p>
        </div>
      ) : requests.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-32 bg-[#151924] border border-white/5 rounded-3xl">
          <CheckCircle2 size={48} className="text-green-500/50 mb-4" />
          <h3 className="text-white font-bold text-lg mb-1">All Caught Up!</h3>
          <p className="text-gray-500 text-sm">There are no pending KYC requests to review.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
          {requests.map((req) => (
            <div key={req.id} className="bg-[#151924] border border-white/5 rounded-3xl overflow-hidden shadow-xl flex flex-col">
              {/* Document Image Viewer */}
              <div className="h-48 bg-[#0B0E14] relative group border-b border-white/5 flex items-center justify-center p-2">
                {req.kyc_document_url ? (
                  <>
                    <img 
                      src={req.kyc_document_url} 
                      alt="KYC Document" 
                      className="max-h-full max-w-full object-contain"
                    />
                    <a 
                      href={req.kyc_document_url} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2 text-white font-bold text-sm backdrop-blur-sm"
                    >
                      <ExternalLink size={18} /> View Full Size
                    </a>
                  </>
                ) : (
                  <span className="text-gray-500 text-sm">No Document Attached</span>
                )}
              </div>

              {/* User Data */}
              <div className="p-6 flex-1 flex flex-col justify-between">
                <div>
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h3 className="text-lg font-bold text-white">{req.first_name} {req.last_name}</h3>
                      <p className="text-gray-500 text-xs mt-1">{req.email}</p>
                    </div>
                    <span className="px-2 py-1 bg-yellow-500/10 text-yellow-500 border border-yellow-500/20 text-[10px] font-bold uppercase rounded">
                      Pending
                    </span>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="grid grid-cols-2 gap-3 mt-6">
                  <button 
                    onClick={() => promptResolve(req.id, 'unverified')}
                    disabled={processingId === req.id}
                    className="py-2.5 bg-red-500/10 hover:bg-red-500/20 text-red-500 border border-red-500/20 rounded-xl text-xs font-bold transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    {processingId === req.id ? <Loader2 size={16} className="animate-spin" /> : <XCircle size={16} />}
                    Reject
                  </button>
                  <button 
                    onClick={() => promptResolve(req.id, 'verified')}
                    disabled={processingId === req.id}
                    className="py-2.5 bg-green-500/10 hover:bg-green-500/20 text-green-500 border border-green-500/20 rounded-xl text-xs font-bold transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    {processingId === req.id ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle2 size={16} />}
                    Approve
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* INLINE CONFIRMATION MODAL */}
      {confirmConfig.isOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-[#151924] border border-yellow-500/20 rounded-3xl w-full max-w-sm p-6 sm:p-8 shadow-2xl relative text-center">
            <div className="w-16 h-16 rounded-2xl bg-yellow-500/10 border border-yellow-500/20 flex items-center justify-center mx-auto mb-4">
              <AlertTriangle className="w-10 h-10 text-yellow-400" />
            </div>
            
            <h3 className="text-xl font-bold text-white mb-2">Confirm Action</h3>
            <p className="text-sm text-gray-400 mb-6 leading-relaxed">
              Are you sure you want to mark this user as <span className="font-bold text-white">{confirmConfig.status.toUpperCase()}</span>?
            </p>
            
            <div className="flex gap-3">
              <button
                onClick={() => setConfirmConfig(prev => ({ ...prev, isOpen: false }))}
                className="flex-1 py-3.5 rounded-xl text-sm font-bold transition-all bg-white/5 hover:bg-white/10 text-white border border-white/10"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmResolve}
                className="flex-1 py-3.5 rounded-xl text-sm font-bold transition-all shadow-lg bg-blue-600 hover:bg-blue-500 text-white shadow-blue-600/20"
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { 
  Search, Crown, Filter, CheckCircle2, XCircle, 
  Calendar, Loader2, MoreVertical, DollarSign, Users, AlertCircle 
} from 'lucide-react';
import Pagination from '@/app/components/ui/Pagination';
import { getProSubscriptionsAdmin } from '@/app/actions/admin';

export interface SubscriptionRecord {
  id: string;
  userId: string;
  name: string;
  email: string;
  planType: 'Monthly' | 'Annual';
  amount: number;
  startDate: string;
  expiryDate: string;
  status: 'Active' | 'Expired' | 'Cancelled';
}

export default function SubscriptionsTab() {
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filter, setFilter] = useState<'All' | 'Active' | 'Expired'>('All');
  
  const [subscriptions, setSubscriptions] = useState<SubscriptionRecord[]>([]);
  
  // Pagination State
  const [currentPage, setCurrentPage] = useState<number>(1);
  const itemsPerPage = 10;

  useEffect(() => {
    const fetchSubscriptions = async () => {
      setIsLoading(true);
      try {
        const data = await getProSubscriptionsAdmin();
        if (data) {
          // Added Type Assertion to fix the TS error here
          setSubscriptions(data as SubscriptionRecord[]);
        }
      } catch (error) {
        console.error("Error loading subscriptions:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchSubscriptions();
  }, []);

  // Filter and Search Logic
  const filteredSubs = useMemo(() => {
    return subscriptions.filter(sub => {
      const matchesSearch = sub.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                            sub.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
                            sub.id.toLowerCase().includes(searchQuery.toLowerCase());
      
      if (filter === 'All') return matchesSearch;
      return matchesSearch && sub.status === filter;
    });
  }, [subscriptions, searchQuery, filter]);

  const totalPages = Math.ceil(filteredSubs.length / itemsPerPage) || 1;
  const currentDisplayedSubs = filteredSubs.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  // Quick Metrics Calculation
  const activeSubs = subscriptions.filter(s => s.status === 'Active');
  const monthlyRevenue = activeSubs.filter(s => s.planType === 'Monthly').reduce((acc, curr) => acc + curr.amount, 0);
  const annualRevenue = activeSubs.filter(s => s.planType === 'Annual').reduce((acc, curr) => acc + curr.amount, 0);

  return (
    <div className="space-y-6">
      <div className="w-full rounded-2xl bg-gradient-to-r from-yellow-900/40 via-yellow-800/20 to-[#0B0E14] border border-yellow-500/30 p-6 flex flex-col md:flex-row items-center justify-between gap-6 relative overflow-hidden shadow-[0_0_30px_rgba(234,179,8,0.05)]">
        <div className="absolute -right-20 -top-20 w-64 h-64 bg-yellow-500/10 rounded-full blur-3xl pointer-events-none"></div>
        <div className="flex items-center gap-5 relative z-10">
          <div className="w-14 h-14 rounded-2xl bg-yellow-600 flex items-center justify-center text-white shrink-0 shadow-xl shadow-yellow-600/30 border border-yellow-400/50">
            <Crown size={28} />
          </div>
          <div>
            <h3 className="text-xl font-extrabold text-white mb-1">Pro Subscriptions</h3>
            <p className="text-sm text-gray-400 max-w-xl">Monitor user upgrades, billing cycles, and premium tier revenue.</p>
          </div>
        </div>
        <button 
          onClick={() => { 
            setIsLoading(true); 
            getProSubscriptionsAdmin().then(d => { 
              // Added Type Assertion to fix the TS error here as well
              setSubscriptions((d as SubscriptionRecord[]) || []); 
              setIsLoading(false); 
            }); 
          }}
          disabled={isLoading}
          className="shrink-0 px-6 py-3 bg-white/5 hover:bg-white/10 border border-white/10 rounded-full text-xs font-bold text-white transition-all flex items-center gap-2 relative z-10 shadow-lg disabled:opacity-50"
        >
          {isLoading ? <Loader2 size={14} className="animate-spin" /> : <Loader2 size={14} />} Refresh Data
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-[#151924] border border-white/5 rounded-2xl p-6 shadow-lg">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Active Pro Users</span>
            <Users size={16} className="text-blue-400" />
          </div>
          <div className="text-3xl font-mono font-extrabold text-white">{activeSubs.length}</div>
        </div>
        <div className="bg-[#151924] border border-white/5 rounded-2xl p-6 shadow-lg">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Monthly MRR</span>
            <DollarSign size={16} className="text-green-400" />
          </div>
          <div className="text-3xl font-mono font-extrabold text-green-400">${monthlyRevenue.toLocaleString()}</div>
        </div>
        <div className="bg-[#151924] border border-white/5 rounded-2xl p-6 shadow-lg">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Annual ARR</span>
            <Crown size={16} className="text-yellow-400" />
          </div>
          <div className="text-3xl font-mono font-extrabold text-yellow-400">${annualRevenue.toLocaleString()}</div>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-[#151924] border border-white/5 p-4 rounded-2xl shadow-lg">
        <div className="relative w-full sm:w-96">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500" size={16}/>
          <input 
            type="text" 
            placeholder="Search by Name, Email, or ID..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-[#0B0E14] border border-white/10 rounded-xl py-2.5 pl-10 pr-4 text-xs text-white focus:outline-none focus:border-blue-500 transition-colors"
          />
        </div>
        <div className="flex items-center gap-2 w-full sm:w-auto overflow-x-auto">
          {(['All', 'Active', 'Expired'] as const).map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                filter === f ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20' : 'bg-[#0B0E14] border border-white/10 text-gray-400 hover:text-white'
              }`}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      <div className="bg-[#151924] border border-white/5 rounded-2xl shadow-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead className="bg-[#0B0E14]/50 border-b border-white/5">
              <tr className="text-xs uppercase tracking-wider text-gray-500">
                <th className="px-6 py-4 font-bold">User Details</th>
                <th className="px-6 py-4 font-bold">Plan Details</th>
                <th className="px-6 py-4 font-bold">Cycle (Start - Expiry)</th>
                <th className="px-6 py-4 font-bold">Status</th>
                <th className="px-6 py-4 text-right font-bold">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {isLoading ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center">
                    <Loader2 size={24} className="animate-spin text-blue-500 mx-auto" />
                  </td>
                </tr>
              ) : currentDisplayedSubs.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-gray-500">
                    No subscriptions found matching your criteria.
                  </td>
                </tr>
              ) : (
                currentDisplayedSubs.map((sub) => (
                  <tr key={sub.id} className="hover:bg-white/[0.02] transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex flex-col">
                        <span className="text-white font-bold">{sub.name}</span>
                        <span className="text-xs text-gray-500">{sub.email}</span>
                        <span className="text-[10px] text-gray-600 font-mono mt-0.5">{sub.id}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-col gap-1">
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold w-fit ${
                          sub.planType === 'Annual' ? 'bg-purple-500/10 text-purple-400 border border-purple-500/20' : 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
                        }`}>
                          {sub.planType}
                        </span>
                        <span className="text-white font-mono font-bold">${sub.amount.toFixed(2)}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-col text-xs font-mono text-gray-400 gap-1">
                        <div className="flex items-center gap-2">
                          <Calendar size={12} className="text-gray-500" /> {sub.startDate}
                        </div>
                        <div className="flex items-center gap-2">
                          <AlertCircle size={12} className={sub.status === 'Expired' ? 'text-red-400' : 'text-gray-500'} /> {sub.expiryDate}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider border ${
                        sub.status === 'Active' ? 'bg-green-500/10 text-green-400 border-green-500/20' :
                        sub.status === 'Cancelled' ? 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20' :
                        'bg-red-500/10 text-red-400 border-red-500/20'
                      }`}>
                        {sub.status === 'Active' ? <CheckCircle2 size={12}/> : <XCircle size={12}/>}
                        {sub.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button className="p-2 hover:bg-white/5 rounded-lg text-gray-400 hover:text-white transition-colors">
                        <MoreVertical size={16} />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        
        {!isLoading && filteredSubs.length > 0 && (
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={setCurrentPage}
            totalItems={filteredSubs.length}
            itemsPerPage={itemsPerPage}
            itemLabel="Subscriptions"
            className="p-4 border-t border-white/5 bg-[#0B0E14]/20"
          />
        )}
      </div>
    </div>
  );
}
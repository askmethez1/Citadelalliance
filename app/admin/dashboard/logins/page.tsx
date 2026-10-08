"use client";

import React, { useState, useEffect } from 'react';
import { Loader2, LogIn, Clock, User, Mail, ChevronLeft, ChevronRight, Search, Activity } from 'lucide-react';
import { getLoginLogs } from '@/app/actions/logs';

export default function AdminLoginsPage() {
  const [logs, setLogs] = useState<any[]>([]);
  const [filteredLogs, setFilteredLogs] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  useEffect(() => {
    const fetchLogs = async () => {
      setIsLoading(true);
      const res = await getLoginLogs();
      if (res.success) {
        setLogs(res.data);
        setFilteredLogs(res.data);
      }
      setIsLoading(false);
    };

    fetchLogs();
  }, []);

  // Search Filter
  useEffect(() => {
    if (!searchQuery.trim()) {
      setFilteredLogs(logs);
    } else {
      const lowerQuery = searchQuery.toLowerCase();
      const filtered = logs.filter(log => 
        log.email?.toLowerCase().includes(lowerQuery) || 
        log.first_name?.toLowerCase().includes(lowerQuery) ||
        log.last_name?.toLowerCase().includes(lowerQuery)
      );
      setFilteredLogs(filtered);
    }
    setCurrentPage(1); // Reset to first page on search
  }, [searchQuery, logs]);

  // Pagination Calculations
  const totalPages = Math.ceil(filteredLogs.length / itemsPerPage);
  const currentLogs = filteredLogs.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('en-US', {
      month: 'short', day: 'numeric', year: 'numeric',
      hour: '2-digit', minute: '2-digit', second: '2-digit'
    }).format(date);
  };

  return (
    <div className="animate-in fade-in duration-300">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6 sm:mb-8">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight mb-2">System Logins</h1>
          <p className="text-gray-400 text-xs sm:text-sm">Monitor user authentication and daily login activity.</p>
        </div>
        
        {/* Search Bar */}
        <div className="relative w-full md:w-72 shrink-0">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={18} />
          <input 
            type="text" 
            placeholder="Search by name or email..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-[#151924] border border-white/10 rounded-xl py-2.5 pl-10 pr-4 text-sm text-white focus:outline-none focus:border-blue-500 transition-colors"
          />
        </div>
      </div>

      <div className="bg-[#151924] border border-white/5 rounded-2xl sm:rounded-3xl overflow-hidden shadow-xl flex flex-col">
        
        {/* Table wrapper for horizontal scroll */}
        <div className="overflow-x-auto custom-scrollbar">
          <table className="w-full text-left border-collapse min-w-[700px]">
            <thead>
              <tr className="border-b border-white/5 bg-white/[0.02]">
                <th className="p-3 sm:p-4 text-[10px] sm:text-xs font-bold text-gray-500 uppercase tracking-wider whitespace-nowrap">User</th>
                <th className="p-3 sm:p-4 text-[10px] sm:text-xs font-bold text-gray-500 uppercase tracking-wider whitespace-nowrap">Email Address</th>
                <th className="p-3 sm:p-4 text-[10px] sm:text-xs font-bold text-gray-500 uppercase tracking-wider whitespace-nowrap">Timestamp</th>
                <th className="p-3 sm:p-4 text-[10px] sm:text-xs font-bold text-gray-500 uppercase tracking-wider whitespace-nowrap">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {isLoading ? (
                <tr>
                  <td colSpan={4} className="py-20 text-center">
                    <Loader2 size={32} className="text-blue-500 animate-spin mx-auto mb-4" />
                    <p className="text-gray-500 text-sm">Loading activity logs...</p>
                  </td>
                </tr>
              ) : currentLogs.length === 0 ? (
                <tr>
                  <td colSpan={4} className="py-20 text-center">
                    <Activity size={48} className="text-gray-600 mx-auto mb-4" />
                    <p className="text-white font-bold text-lg mb-1">No Logs Found</p>
                    <p className="text-gray-500 text-sm">No login activity matches your criteria.</p>
                  </td>
                </tr>
              ) : (
                currentLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-white/[0.02] transition-colors">
                    <td className="p-3 sm:p-4 whitespace-nowrap">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-blue-500/10 flex items-center justify-center text-blue-500 shrink-0">
                          <User size={14} />
                        </div>
                        <span className="text-xs sm:text-sm font-bold text-white">
                          {log.first_name} {log.last_name}
                        </span>
                      </div>
                    </td>
                    <td className="p-3 sm:p-4 whitespace-nowrap">
                      <div className="flex items-center gap-2 text-gray-400 text-xs sm:text-sm">
                        <Mail size={14} className="shrink-0" />
                        {log.email}
                      </div>
                    </td>
                    <td className="p-3 sm:p-4 whitespace-nowrap">
                      <div className="flex items-center gap-2 text-gray-400 text-xs sm:text-sm">
                        <Clock size={14} className="shrink-0" />
                        {formatDate(log.created_at)}
                      </div>
                    </td>
                    <td className="p-3 sm:p-4 whitespace-nowrap">
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-green-500/10 text-green-400 border border-green-500/20 text-[10px] font-bold uppercase rounded-md">
                        <LogIn size={12} className="shrink-0" />
                        Success
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* PAGINATION CONTROLS */}
        {!isLoading && totalPages > 1 && (
          <div className="p-4 border-t border-white/5 bg-white/[0.01] flex flex-col sm:flex-row items-center justify-between gap-4">
            <button
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="w-full sm:w-auto px-4 py-2 bg-[#0B0E14] hover:bg-white/5 border border-white/10 disabled:opacity-50 disabled:cursor-not-allowed rounded-xl text-sm font-bold text-white flex items-center justify-center gap-2 transition-colors"
            >
              <ChevronLeft size={16} /> Previous
            </button>
            <span className="text-gray-400 text-xs sm:text-sm font-medium order-first sm:order-none">
              Page <span className="text-white font-bold">{currentPage}</span> of {totalPages}
            </span>
            <button
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="w-full sm:w-auto px-4 py-2 bg-[#0B0E14] hover:bg-white/5 border border-white/10 disabled:opacity-50 disabled:cursor-not-allowed rounded-xl text-sm font-bold text-white flex items-center justify-center gap-2 transition-colors"
            >
              Next <ChevronRight size={16} />
            </button>
          </div>
        )}

      </div>
    </div>
  );
}
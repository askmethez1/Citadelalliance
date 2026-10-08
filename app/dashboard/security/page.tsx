"use client";

import React, { useState, useEffect } from 'react';
import Sidebar from '../components/Sidebar';
import TopHeader from '../components/TopHeader';
import { 
  ShieldCheck, 
  Key, 
  Globe, 
  Smartphone, 
  Clock, 
  Search, 
  CheckCircle2, 
  Loader2,
  Lock,
  History
} from 'lucide-react';
import { getUserSecurityLogs, ActivityLog } from '@/app/actions/security';
import { getUserProfile } from '@/app/actions/profile';
import Pagination from '../../components/ui/Pagination';

export default function SecurityPage() {
  const [activeTab, setActiveTab] = useState('security');
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [userCountry, setUserCountry] = useState('Nigeria');
  
  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 10;

  const loadSecurityData = async () => {
    setIsLoading(true);
    const [logData, profile] = await Promise.all([
      getUserSecurityLogs(),
      getUserProfile()
    ]);

    setLogs(logData);
    if (profile?.country) setUserCountry(profile.country);
    setIsLoading(false);
  };

  useEffect(() => {
    loadSecurityData();
  }, []);

  const filteredLogs = logs.filter(log => 
    searchQuery === '' ||
    log.action.toLowerCase().includes(searchQuery.toLowerCase()) ||
    log.ip_address.toLowerCase().includes(searchQuery.toLowerCase()) ||
    log.location.toLowerCase().includes(searchQuery.toLowerCase()) ||
    log.device.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Reset to first page when search changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery]);

  // Calculate Paginated Logs
  const totalPages = Math.ceil(filteredLogs.length / ITEMS_PER_PAGE);
  const paginatedLogs = filteredLogs.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  return (
    <div className="min-h-screen bg-[#0B0E14] text-gray-300 font-sans flex selection:bg-blue-500/30 w-full relative">
      <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} location={userCountry} />

      <main className="flex-1 flex flex-col min-h-screen relative min-w-0 overflow-x-hidden">
        <TopHeader />

        <div className="flex-1 p-4 sm:p-6 lg:p-8 w-full">
          <div className="max-w-6xl mx-auto space-y-6 sm:space-y-8">
            
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h1 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-white mb-2 tracking-tight flex items-center gap-2 sm:gap-3">
                  <ShieldCheck className="text-blue-500 shrink-0" size={28} /> 
                  <span className="truncate">Security & Audit Logs</span>
                </h1>
                <p className="text-gray-400 text-xs sm:text-sm">Monitor live session history, active devices, and database security events.</p>
              </div>
            </div>

            {/* Quick Security Metrics */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
              <div className="bg-[#151924] border border-white/5 rounded-2xl p-4 sm:p-6 shadow-xl flex items-center gap-4">
                <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-2xl bg-green-500/10 border border-green-500/20 text-green-400 flex items-center justify-center shrink-0">
                  <CheckCircle2 size={20} className="sm:w-6 sm:h-6" />
                </div>
                <div>
                  <div className="text-[10px] sm:text-xs font-bold text-gray-500 uppercase tracking-wider">Account Protection</div>
                  <div className="text-base sm:text-lg font-bold text-white mt-0.5">High Security</div>
                  <div className="text-[10px] sm:text-[11px] text-green-400">Database encrypted</div>
                </div>
              </div>

              <div className="bg-[#151924] border border-white/5 rounded-2xl p-4 sm:p-6 shadow-xl flex items-center gap-4">
                <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-2xl bg-blue-500/10 border border-blue-500/20 text-blue-400 flex items-center justify-center shrink-0">
                  <Globe size={20} className="sm:w-6 sm:h-6" />
                </div>
                <div>
                  <div className="text-[10px] sm:text-xs font-bold text-gray-500 uppercase tracking-wider">Active Region</div>
                  <div className="text-base sm:text-lg font-bold text-white mt-0.5 truncate max-w-[120px] sm:max-w-[150px]">{userCountry}</div>
                  <div className="text-[10px] sm:text-[11px] text-gray-400">Current active session</div>
                </div>
              </div>

              <div className="bg-[#151924] border border-white/5 rounded-2xl p-4 sm:p-6 shadow-xl flex items-center gap-4">
                <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-2xl bg-purple-500/10 border border-purple-500/20 text-purple-400 flex items-center justify-center shrink-0">
                  <History size={20} className="sm:w-6 sm:h-6" />
                </div>
                <div>
                  <div className="text-[10px] sm:text-xs font-bold text-gray-500 uppercase tracking-wider">Total Audit Records</div>
                  <div className="text-base sm:text-lg font-bold text-white mt-0.5">{logs.length} Logged</div>
                  <div className="text-[10px] sm:text-[11px] text-gray-400">Neon Postgres records</div>
                </div>
              </div>
            </div>

            {/* LOGS TABLE CONTAINER */}
            <div className="bg-[#151924] border border-white/5 rounded-3xl p-4 sm:p-6 lg:p-8 shadow-xl space-y-4 sm:space-y-6">
              
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/5 pb-4 sm:pb-6">
                <div>
                  <h3 className="text-lg sm:text-xl font-bold text-white flex items-center gap-2">
                    <Clock size={18} className="text-blue-400 shrink-0" /> Recent Activity
                  </h3>
                  <p className="text-[11px] sm:text-xs text-gray-400 mt-1">Real-time verification logs captured during user operations.</p>
                </div>

                {/* Search Bar */}
                <div className="relative w-full sm:w-64 lg:w-72 shrink-0">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={16}/>
                  <input 
                    type="text" 
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search IP, Location, Action..."
                    className="w-full bg-[#0B0E14] border border-white/10 rounded-xl py-2.5 pl-10 pr-4 text-xs text-white focus:outline-none focus:border-blue-500 transition-colors"
                  />
                </div>
              </div>

              {/* Table wrapper for horizontal scroll */}
              <div className="overflow-x-auto -mx-4 sm:mx-0 px-4 sm:px-0 custom-scrollbar">
                {isLoading ? (
                  <div className="flex items-center justify-center py-16 text-white gap-2 min-w-[800px]">
                    <Loader2 className="w-5 h-5 text-blue-500 animate-spin" />
                    <span className="text-sm font-medium text-gray-400">Loading security logs from Neon DB...</span>
                  </div>
                ) : filteredLogs.length === 0 ? (
                  <div className="text-center py-12 border border-dashed border-white/5 rounded-2xl text-gray-500 text-sm min-w-[800px]">
                    No activity logs recorded yet.
                  </div>
                ) : (
                  <table className="w-full text-left border-collapse min-w-[800px]">
                    <thead>
                      <tr className="border-b border-white/5 text-xs uppercase tracking-wider text-gray-500 bg-[#0B0E14]/40">
                        <th className="p-3 sm:p-4 font-semibold whitespace-nowrap">Event Action</th>
                        <th className="p-3 sm:p-4 font-semibold whitespace-nowrap">IP Address</th>
                        <th className="p-3 sm:p-4 font-semibold whitespace-nowrap">Location</th>
                        <th className="p-3 sm:p-4 font-semibold whitespace-nowrap">Device & Browser</th>
                        <th className="p-3 sm:p-4 font-semibold text-right whitespace-nowrap">Timestamp</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5 text-sm font-sans">
                      {paginatedLogs.map((log) => (
                        <tr key={log.id} className="hover:bg-white/[0.02] transition-colors">
                          <td className="p-3 sm:p-4 whitespace-nowrap">
                            <span className="inline-flex items-center gap-1.5 font-bold text-white text-[11px] sm:text-xs bg-white/5 px-2.5 py-1 rounded-lg border border-white/5">
                              <Lock size={12} className="text-blue-400" />
                              {log.action}
                            </span>
                          </td>
                          <td className="p-3 sm:p-4 font-mono text-[11px] sm:text-xs text-gray-300 whitespace-nowrap">
                            {log.ip_address}
                          </td>
                          <td className="p-3 sm:p-4 text-[11px] sm:text-xs text-gray-300 whitespace-nowrap">
                            <div className="flex items-center gap-1.5">
                              <Globe size={14} className="text-gray-500 shrink-0" />
                              {log.location}
                            </div>
                          </td>
                          <td className="p-3 sm:p-4 text-[11px] sm:text-xs text-gray-400 font-mono truncate max-w-[200px]">
                            {log.device}
                          </td>
                          <td className="p-3 sm:p-4 text-[11px] sm:text-xs font-mono text-gray-400 text-right whitespace-nowrap">
                            {log.created_at}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>

              {/* Pagination Controller */}
              {!isLoading && filteredLogs.length > 0 && (
                <div className="pt-4 border-t border-white/5">
                  <Pagination 
                    currentPage={currentPage}
                    totalPages={totalPages}
                    onPageChange={setCurrentPage}
                    totalItems={filteredLogs.length}
                    itemsPerPage={ITEMS_PER_PAGE}
                    itemLabel="activity records"
                  />
                  <div className="text-right text-[9px] sm:text-[10px] text-gray-600 mt-2 font-mono uppercase tracking-widest">
                    IP & Geo Audit Active
                  </div>
                </div>
              )}

            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
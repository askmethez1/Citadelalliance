"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { SlidersHorizontal, CheckCircle2, UserPlus, ArrowRightLeft, ShieldCheck, Loader2 } from 'lucide-react';
import { getRecentActivity } from '@/app/actions/activity';
import Pagination from '@/app/components/ui/Pagination';

interface ActivityLog {
  id: string;
  action: string;
  metadata: string;
  timestamp: string;
}

export default function RecentActivity({ location }: { location: string }) {
  const [activities, setActivities] = useState<ActivityLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Pagination State
  const [currentPage, setCurrentPage] = useState<number>(1);
  const itemsPerPage = 5;

  useEffect(() => {
    const fetchActivity = async () => {
      const data = await getRecentActivity();
      
      // If the user is brand new and has no logs, inject a default welcome log
      if (data.length === 0) {
        setActivities([{
          id: 'welcome',
          action: 'SYSTEM_INIT',
          metadata: `Workspace initialized • IP Location: ${location}`,
          timestamp: new Date().toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
        }]);
      } else {
        setActivities(data);
      }
      
      setIsLoading(false);
    };

    fetchActivity();
    const interval = setInterval(fetchActivity, 10000); // Sync every 10 seconds
    return () => clearInterval(interval);
  }, [location]);

  // Calculate pagination details
  const totalPages = Math.ceil(activities.length / itemsPerPage) || 1;

  // Auto-adjust page if current page exceeds total pages after a data update
  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [activities.length, totalPages, currentPage]);

  // Get current page activities
  const paginatedActivities = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return activities.slice(start, start + itemsPerPage);
  }, [activities, currentPage, itemsPerPage]);

  // Dynamic icon routing based on action type
  const getActionConfig = (action: string) => {
    if (action.includes('LOGIN') || action.includes('AUTH')) {
      return { icon: <ShieldCheck size={12} />, color: 'text-blue-500 bg-blue-500/10', label: 'Authentication' };
    }
    if (action.includes('TRADE')) {
      return { icon: <ArrowRightLeft size={12} />, color: 'text-purple-500 bg-purple-500/10', label: 'Trade Execution' };
    }
    if (action.includes('DEPOSIT') || action.includes('WITHDRAW')) {
      return { icon: <CheckCircle2 size={12} />, color: 'text-green-500 bg-green-500/10', label: 'Transfer' };
    }
    return { icon: <UserPlus size={12} />, color: 'text-gray-400 bg-gray-500/10', label: 'System Event' };
  };

  return (
    <div className="bg-[#151924] border border-white/5 rounded-2xl overflow-hidden shadow-lg flex flex-col justify-between h-full">
      <div>
        <div className="p-5 border-b border-white/5 flex items-center justify-between bg-[#0B0E14]/40">
          <h3 className="font-bold text-white flex items-center gap-2">
            <SlidersHorizontal size={16} className="text-blue-400" /> Recent Activity Log
          </h3>
          {isLoading ? (
            <Loader2 size={16} className="text-blue-500 animate-spin" />
          ) : (
            <button className="text-xs text-gray-400 hover:text-white transition-colors font-medium bg-white/5 px-3 py-1.5 rounded-lg border border-white/10">
              View Full Statement
            </button>
          )}
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-white/5 text-xs uppercase tracking-wider text-gray-500 bg-[#080a0f]">
                <th className="p-4 font-semibold">Event</th>
                <th className="p-4 font-semibold">Details</th>
                <th className="p-4 font-semibold">Date & Time</th>
                <th className="p-4 font-semibold text-right">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5 text-sm">
              {paginatedActivities.map((log) => {
                const config = getActionConfig(log.action);
                return (
                  <tr key={log.id} className="hover:bg-white/[0.02] transition-colors">
                    <td className="p-4 text-white font-medium flex items-center gap-2">
                      <div className={`w-6 h-6 rounded flex items-center justify-center shrink-0 ${config.color}`}>
                        {config.icon}
                      </div>
                      <span className="truncate">{config.label}</span>
                    </td>
                    <td className="p-4 text-gray-400 truncate max-w-[200px]">{log.metadata || log.action}</td>
                    <td className="p-4 text-gray-400 font-mono text-xs whitespace-nowrap">{log.timestamp}</td>
                    <td className="p-4 text-right text-green-400 font-medium text-xs">Logged</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Reusable Pagination Component */}
      {!isLoading && activities.length > 0 && (
        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          onPageChange={setCurrentPage}
          totalItems={activities.length}
          itemsPerPage={itemsPerPage}
          itemLabel="Activities"
          className="p-5 border-t border-white/5 bg-[#0B0E14]/20"
        />
      )}
    </div>
  );
}
"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { Clock, ArrowUpRight, ArrowDownRight, Loader2, Gift, Users } from 'lucide-react';
import { getTradingData } from '@/app/actions/trading';
import Pagination from '@/app/components/ui/Pagination';

interface Trade {
  id: string;
  symbol: string;
  type: string;
  volume: number;
  openPrice: number;
  openTime: string;
  status: string;
  walletType?: 'REAL' | 'BONUS';
}

export default function RecentTrades() {
  const [allTrades, setAllTrades] = useState<Trade[]>([]);
  const [aiMeta, setAiMeta] = useState<Record<string, any>>({});
  const [isLoading, setIsLoading] = useState(true);
  
  // Pagination State
  const [currentPage, setCurrentPage] = useState<number>(1);
  const itemsPerPage = 5;

  useEffect(() => {
    const fetchTrades = async () => {
      const data = await getTradingData();
      if (data && data.trades) {
        setAllTrades(data.trades);
      }
      
      // Pull copy trading metadata to identify AI trades
      const storedMeta = JSON.parse(localStorage.getItem('ai_copy_meta') || '{}');
      setAiMeta(storedMeta);
      
      setIsLoading(false);
    };

    fetchTrades();
    
    // Poll every 5 seconds to keep synced with the Trading Terminal
    const interval = setInterval(fetchTrades, 5000);
    return () => clearInterval(interval);
  }, []);

  const totalPages = Math.ceil(allTrades.length / itemsPerPage) || 1;

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [allTrades.length, totalPages, currentPage]);

  const paginatedTrades = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return allTrades.slice(start, start + itemsPerPage);
  }, [allTrades, currentPage, itemsPerPage]);

  return (
    <div className="bg-[#151924] border border-white/5 rounded-2xl p-6 shadow-lg overflow-hidden flex flex-col justify-between h-full">
      <div>
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-bold text-white flex items-center gap-2">
            <Clock className="w-5 h-5 text-blue-500" /> Recent Trades
          </h3>
          {isLoading && (
            <Loader2 size={16} className="text-blue-500 animate-spin" />
          )}
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="text-xs text-gray-500 uppercase bg-[#0B0E14]/50 border-y border-white/5">
              <tr>
                <th className="px-4 py-3 font-medium rounded-tl-lg">Pair</th>
                <th className="px-4 py-3 font-medium">Type</th>
                <th className="px-4 py-3 font-medium">Amount (Size)</th>
                <th className="px-4 py-3 font-medium">Entry Price</th>
                <th className="px-4 py-3 font-medium">Time</th>
                <th className="px-4 py-3 font-medium text-right rounded-tr-lg">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {!isLoading && allTrades.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-gray-500">
                    No recent trades found.
                  </td>
                </tr>
              )}
              
              {paginatedTrades.map((trade) => {
                const meta = aiMeta[trade.id];
                return (
                  <tr key={trade.id} className="hover:bg-white/[0.02] transition-colors">
                    <td className="px-4 py-4">
                      <div className="flex flex-col gap-1.5">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-white">{trade.symbol}</span>
                          {trade.walletType === 'BONUS' && (
                            <span className="px-1.5 py-0.5 rounded bg-purple-500/10 text-purple-400 text-[9px] uppercase tracking-wider font-bold flex items-center gap-1">
                              <Gift size={10} /> Bonus
                            </span>
                          )}
                        </div>
                        {meta && (
                          <div className="flex items-center gap-1 text-[9px] text-blue-400 font-bold bg-blue-500/10 border border-blue-500/20 px-1.5 py-0.5 rounded w-fit">
                            <Users size={10} /> Copying: {meta.traderName}
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <span className={`inline-flex items-center gap-1 px-2 py-1 rounded text-[10px] uppercase font-bold tracking-wider ${
                        trade.type === 'BUY' ? 'text-green-400 bg-green-400/10' : 'text-red-400 bg-red-400/10'
                      }`}>
                        {trade.type === 'BUY' ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}
                        {trade.type}
                      </span>
                    </td>
                    <td className="px-4 py-4 font-mono text-gray-300">{trade.volume.toFixed(3)}</td>
                    <td className="px-4 py-4 font-mono text-gray-300">
                      ${trade.openPrice.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 6 })}
                    </td>
                    <td className="px-4 py-4 text-gray-500 text-xs">{trade.openTime}</td>
                    <td className="px-4 py-4 text-right">
                      <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded ${
                        trade.status === 'CLOSED' 
                          ? 'text-green-500 bg-green-500/10' 
                          : 'text-blue-500 bg-blue-500/10'
                      }`}>
                        {trade.status === 'CLOSED' ? 'Completed' : 'Active'}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {!isLoading && allTrades.length > 0 && (
        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          onPageChange={setCurrentPage}
          totalItems={allTrades.length}
          itemsPerPage={itemsPerPage}
          itemLabel="Trades"
          className="mt-6 pt-4 border-t border-white/5"
        />
      )}
    </div>
  );
}
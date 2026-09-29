"use client";

import React from 'react';

interface AdminMetricsProps {
  usersCount: number;
  pendingCount: number;
  totalLiquidity: number;
}

export default function AdminMetrics({ usersCount, pendingCount, totalLiquidity }: AdminMetricsProps) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      <div className="bg-[#151924] border border-white/5 rounded-2xl p-5 shadow-lg">
        <div className="text-gray-500 text-xs font-medium mb-2 uppercase tracking-wider">Total Platform Users</div>
        <div className="text-2xl font-mono font-bold text-white mb-2">{usersCount}</div>
        <div className="text-xs text-blue-400">Registered Accounts</div>
      </div>

      <div className="bg-[#151924] border border-white/5 rounded-2xl p-5 shadow-lg">
        <div className="text-gray-500 text-xs font-medium mb-2 uppercase tracking-wider">Pending Deposits</div>
        <div className="text-2xl font-mono font-bold text-yellow-400 mb-2">{pendingCount} Requests</div>
        <div className="text-xs text-gray-500">Requires manual review</div>
      </div>

      <div className="bg-[#151924] border border-white/5 rounded-2xl p-5 shadow-lg">
        <div className="text-gray-500 text-xs font-medium mb-2 uppercase tracking-wider">Platform Liquidity</div>
        <div className="text-2xl font-mono font-bold text-green-400 mb-2">
          ${totalLiquidity.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
        </div>
        <div className="text-xs text-gray-500">Aggregate User Balances</div>
      </div>

      <div className="bg-[#151924] border border-white/5 rounded-2xl p-5 shadow-lg">
        <div className="text-gray-500 text-xs font-medium mb-2 uppercase tracking-wider">System Status</div>
        <div className="text-2xl font-mono font-bold text-blue-400 mb-2">100% Operational</div>
        <div className="text-xs text-gray-500">Neon Postgres Engine</div>
      </div>
    </div>
  );
}
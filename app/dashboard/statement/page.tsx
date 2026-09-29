"use client";

import React, { useState, useEffect } from 'react';
import { 
  Download, 
  Calendar, 
  Search, 
  Filter, 
  ArrowDownToLine, 
  ArrowUpFromLine, 
  Receipt, 
  PieChart,
  Loader2
} from 'lucide-react';
import Sidebar from '../components/Sidebar';
import TopHeader from '../components/TopHeader';
import { getUserAccountStatement, StatementItem, StatementSummary } from '@/app/actions/statement';

export default function StatementPage() {
  const [activeTab, setActiveTab] = useState('statement');
  const [location, setLocation] = useState('Detecting...');
  const [filter, setFilter] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');

  // DB Data States
  const [isLoading, setIsLoading] = useState(true);
  const [summary, setSummary] = useState<StatementSummary>({
    totalDeposits: 0,
    totalWithdrawals: 0,
    netPnL: 0,
    totalFees: 0,
  });
  const [statementData, setStatementData] = useState<StatementItem[]>([]);

  // Fetch location via IP
  useEffect(() => {
    const fetchLocation = async () => {
      try {
        const response = await fetch('https://ipapi.co/json/');
        if (!response.ok) throw new Error('Network response failed');
        const data = await response.json();
        setLocation(`${data.city}, ${data.country_name}`);
      } catch (error) {
        setLocation('Location Unavailable');
      }
    };
    
    fetchLocation();
  }, []);

  // Fetch real statement records from Neon Postgres
  useEffect(() => {
    const loadStatement = async () => {
      setIsLoading(true);
      try {
        const res = await getUserAccountStatement();
        if (res) {
          setSummary(res.summary);
          setStatementData(res.records);
        }
      } catch (error) {
        console.error("Failed to fetch statement records", error);
      } finally {
        setIsLoading(false);
      }
    };

    loadStatement();
  }, []);

  // Filter & Search Logic
  const filteredData = statementData.filter(item => {
    const matchesFilter = filter === 'All' || item.type.toLowerCase().includes(filter.toLowerCase());
    const matchesSearch = searchQuery === '' || 
      item.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.asset.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  // Export CSV Functionality
  const handleExportCSV = () => {
    if (filteredData.length === 0) return;

    const headers = ["Date & Time", "TXN ID", "Type", "Asset", "Amount", "Balance", "Status"];
    const rows = filteredData.map(item => [
      item.date,
      item.id,
      item.type,
      item.asset,
      `"${item.amount}"`,
      `"${item.balance}"`,
      item.status
    ]);

    const csvContent = "data:text/csv;charset=utf-8," 
      + [headers.join(","), ...rows.map(e => e.join(","))].join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `Citadel_Account_Statement_${new Date().toISOString().substring(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="min-h-screen bg-[#0B0E14] text-gray-300 font-sans flex selection:bg-blue-500/30">
      
      {/* SIDEBAR */}
      <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} location={location} />

      {/* MAIN CONTENT AREA */}
      <main className="flex-1 flex flex-col min-h-screen relative min-w-0 overflow-x-hidden">
        
        {/* TOP HEADER */}
        <TopHeader />

        {/* Dashboard Content */}
        <div className="flex-1 p-4 sm:p-6 lg:p-8 w-full">
          <div className="max-w-7xl mx-auto space-y-6">

            {/* PAGE HEADER & CONTROLS */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 animate-in fade-in duration-300">
              <div>
                <h1 className="text-3xl font-black text-white tracking-tight">Account Statement</h1>
                <p className="text-gray-500 text-sm mt-1">Live audit log of deposits, withdrawals, and trading executions from database.</p>
              </div>
              
              <div className="flex flex-wrap items-center gap-3">
                <div className="relative w-full md:w-auto">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={16} />
                  <input 
                    type="text" 
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search TXN ID or Asset..." 
                    className="bg-[#151924] border border-white/10 rounded-xl py-2.5 pl-10 pr-4 text-sm text-white focus:outline-none focus:border-blue-500 w-full md:w-56 transition-colors"
                  />
                </div>
                <button 
                  onClick={handleExportCSV}
                  disabled={filteredData.length === 0}
                  className="flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:hover:bg-blue-600 rounded-xl py-2.5 px-4 text-sm font-bold text-white transition-colors shadow-lg shadow-blue-600/20"
                >
                  <Download size={16} />
                  Export CSV
                </button>
              </div>
            </div>

            {/* FINANCIAL SUMMARY CARDS */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-[#151924] border border-white/5 rounded-2xl p-5 shadow-lg relative overflow-hidden">
                <div className="absolute top-0 right-0 p-5 opacity-10">
                  <ArrowDownToLine size={48} />
                </div>
                <div className="text-gray-500 text-xs font-medium mb-2 uppercase tracking-wider">Total Deposits</div>
                <div className="text-2xl font-mono font-bold text-white mb-1">
                  ${summary.totalDeposits.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </div>
                <div className="text-xs text-green-400">Database verified</div>
              </div>
              
              <div className="bg-[#151924] border border-white/5 rounded-2xl p-5 shadow-lg relative overflow-hidden">
                <div className="absolute top-0 right-0 p-5 opacity-10">
                  <ArrowUpFromLine size={48} />
                </div>
                <div className="text-gray-500 text-xs font-medium mb-2 uppercase tracking-wider">Total Withdrawals</div>
                <div className="text-2xl font-mono font-bold text-white mb-1">
                  ${summary.totalWithdrawals.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </div>
                <div className="text-xs text-gray-500">Outbound execution</div>
              </div>
              
              <div className="bg-[#151924] border border-white/5 rounded-2xl p-5 shadow-lg relative overflow-hidden">
                <div className="absolute top-0 right-0 p-5 opacity-10">
                  <PieChart size={48} />
                </div>
                <div className="text-gray-500 text-xs font-medium mb-2 uppercase tracking-wider">Net Trading PnL</div>
                <div className={`text-2xl font-mono font-bold mb-1 ${summary.netPnL >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                  {summary.netPnL >= 0 ? '+' : ''}${summary.netPnL.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </div>
                <div className="text-xs text-gray-500">Realized PnL</div>
              </div>
              
              <div className="bg-[#151924] border border-white/5 rounded-2xl p-5 shadow-lg relative overflow-hidden">
                <div className="absolute top-0 right-0 p-5 opacity-10">
                  <Receipt size={48} />
                </div>
                <div className="text-gray-500 text-xs font-medium mb-2 uppercase tracking-wider">Fees Paid</div>
                <div className="text-2xl font-mono font-bold text-white mb-1">
                  ${summary.totalFees.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </div>
                <div className="text-xs text-gray-500">Network fees</div>
              </div>
            </div>

            {/* TRANSACTION HISTORY TABLE */}
            <div className="bg-[#151924] border border-white/5 rounded-2xl shadow-lg overflow-hidden flex flex-col">
              
              {/* Table Tabs */}
              <div className="flex items-center gap-6 px-6 border-b border-white/5 overflow-x-auto scrollbar-none">
                {['All', 'Deposit', 'Withdrawal', 'Buy Crypto', 'Realized PnL', 'Fee'].map((tab) => (
                  <button 
                    key={tab}
                    onClick={() => setFilter(tab)}
                    className={`py-4 text-sm font-bold whitespace-nowrap border-b-2 transition-colors ${
                      filter === tab 
                        ? 'border-blue-500 text-white' 
                        : 'border-transparent text-gray-500 hover:text-gray-300'
                    }`}
                  >
                    {tab === 'Fee' ? 'Fees' : tab}
                  </button>
                ))}
              </div>
              
              <div className="overflow-x-auto">
                {isLoading ? (
                  <div className="flex items-center justify-center py-20 text-white gap-3">
                    <Loader2 className="w-5 h-5 text-blue-500 animate-spin" />
                    <span className="text-sm font-medium text-gray-400">Loading live statement ledger...</span>
                  </div>
                ) : (
                  <table className="w-full text-sm text-left">
                    <thead className="text-xs text-gray-500 uppercase bg-[#0B0E14]/50 border-b border-white/5">
                      <tr>
                        <th className="px-6 py-4 font-medium tracking-wider">Date & Time</th>
                        <th className="px-6 py-4 font-medium tracking-wider">TXN ID</th>
                        <th className="px-6 py-4 font-medium tracking-wider">Type</th>
                        <th className="px-6 py-4 font-medium tracking-wider">Asset</th>
                        <th className="px-6 py-4 font-medium text-right tracking-wider">Amount</th>
                        <th className="px-6 py-4 font-medium text-right tracking-wider">Running Balance</th>
                        <th className="px-6 py-4 font-medium text-right tracking-wider">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {filteredData.map((txn, idx) => (
                        <tr key={idx} className="hover:bg-white/[0.02] transition-colors">
                          <td className="px-6 py-4 text-gray-400 whitespace-nowrap font-mono text-xs">{txn.date}</td>
                          <td className="px-6 py-4 font-mono text-gray-500 text-xs">{txn.id}</td>
                          <td className="px-6 py-4">
                            <span className={`inline-flex items-center px-2.5 py-1 rounded text-[11px] font-bold uppercase tracking-wider ${
                              txn.type === 'Deposit' || txn.type === 'Buy Crypto' ? 'text-blue-400 bg-blue-400/10' :
                              txn.type === 'Withdrawal' ? 'text-orange-400 bg-orange-400/10' :
                              txn.type === 'Realized PnL' ? 'text-purple-400 bg-purple-400/10' :
                              'text-gray-400 bg-gray-400/10'
                            }`}>
                              {txn.type}
                            </span>
                          </td>
                          <td className="px-6 py-4 font-bold text-white">{txn.asset}</td>
                          <td className={`px-6 py-4 font-mono text-right font-bold whitespace-nowrap ${
                            txn.amount.startsWith('+') ? 'text-green-400' : 'text-red-400'
                          }`}>
                            {txn.amount}
                          </td>
                          <td className="px-6 py-4 font-mono text-gray-300 text-right whitespace-nowrap">{txn.balance}</td>
                          <td className="px-6 py-4 text-right">
                            <span className={`text-xs font-medium px-2.5 py-1 rounded-md border ${
                              txn.status === 'Completed' 
                                ? 'text-green-400 bg-green-500/10 border-green-500/20' 
                                : txn.status === 'Failed'
                                  ? 'text-red-400 bg-red-500/10 border-red-500/20'
                                  : 'text-yellow-400 bg-yellow-500/10 border-yellow-500/20'
                            }`}>
                              {txn.status}
                            </span>
                          </td>
                        </tr>
                      ))}
                      {filteredData.length === 0 && (
                        <tr>
                          <td colSpan={7} className="px-6 py-16 text-center text-gray-500">
                            <div className="flex flex-col items-center justify-center gap-3">
                              <Filter size={32} className="text-gray-600 mb-1" />
                              <p>No transaction records found matching your criteria.</p>
                            </div>
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                )}
              </div>

              {/* Entry Count Footer */}
              <div className="p-4 border-t border-white/5 flex items-center justify-between text-xs text-gray-500 bg-[#0B0E14]/30">
                <span>Showing {filteredData.length} entries from database ledger</span>
              </div>

            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
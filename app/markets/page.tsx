"use client";

import Navbar from '../components/Navbar';
import TradingViewChart from '../components/TradingViewChart';
import { TrendingUp, TrendingDown, Search, Activity, ShieldCheck, X, Maximize2 } from 'lucide-react';
import Link from 'next/link';
import { useState, useMemo, useEffect } from 'react';
import { useMarket } from '../context/MarketContext';

export default function MarketsPage() {
  const { assets } = useMarket();
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'All' | 'Crypto' | 'Stocks' | 'Forex' | 'Commodities'>('All');

  // Store the string ID instead of a frozen object snapshot
  const [selectedModalSymbol, setSelectedModalSymbol] = useState<string | null>(null);

  // Derive the live asset directly from the ticking context
  const selectedAsset = useMemo(() =>
    assets.find(a => a.symbol === selectedModalSymbol) || null
  , [assets, selectedModalSymbol]);

  // Safe Client Mount to prevent hydration issues with Modal
  const [isClient, setIsClient] = useState(false);
  useEffect(() => {
    setIsClient(true);
  }, []);

  const filteredAssets = useMemo(() => {
    return assets.filter((asset) => {
      const matchesTab = activeTab === 'All' || asset.category === activeTab;
      const matchesSearch =
        asset.symbol.toLowerCase().includes(searchQuery.toLowerCase()) ||
        asset.name.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesTab && matchesSearch;
    });
  }, [assets, activeTab, searchQuery]);

  // Safe fallback values for the Modal Header to prevent crashes when API is blocked
  const modalSafePrice = selectedAsset?.price || 0;
  const modalSafeChange = selectedAsset?.change24h || 0;
  const modalIsUp = modalSafeChange >= 0;

  return (
    <div className="bg-[#0B0E14] min-h-screen text-gray-300 font-sans selection:bg-blue-500/30">
      <Navbar />

      <main className="pt-32 pb-24 px-6 max-w-7xl mx-auto">
        <div className="mb-10 md:flex justify-between items-end gap-6">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-blue-500/30 bg-blue-500/10 text-blue-400 text-xs font-bold mb-4">
              <Activity size={14} className="animate-pulse" /> Live Execution Desk
            </div>
            <h1 className="text-4xl md:text-5xl font-extrabold text-white mb-3 tracking-tight">
              Global Markets
            </h1>
            <p className="text-gray-400 max-w-xl">
              Click any asset row to launch the interactive live candlestick chart terminal.
            </p>
          </div>

          <div className="mt-6 md:mt-0 relative w-full md:w-80">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" size={18} />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search S&P 500, Crypto, Forex..."
              className="w-full bg-[#151924] border border-white/10 rounded-full py-3 pl-12 pr-4 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 transition-colors text-sm"
            />
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex items-center gap-2 border-b border-white/5 pb-4 mb-8 overflow-x-auto scrollbar-none">
          {['All', 'Crypto', 'Stocks', 'Forex', 'Commodities'].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab as any)}
              className={`px-5 py-2.5 rounded-full text-sm font-semibold whitespace-nowrap transition-all ${
                activeTab === tab
                  ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20'
                  : 'bg-[#151924] text-gray-400 hover:text-white hover:bg-white/5 border border-white/5'
              }`}
            >
              {tab === 'All' ? 'All Markets' : tab}
            </button>
          ))}
        </div>

        {/* Markets Table */}
        <div className="bg-[#151924] border border-white/5 rounded-3xl overflow-hidden shadow-2xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-white/5 text-xs uppercase tracking-wider text-gray-500 bg-[#0B0E14]/40">
                  <th className="p-6 font-semibold">Asset Name</th>
                  <th className="p-6 font-semibold">Market Price</th>
                  <th className="p-6 font-semibold">24h Change</th>
                  <th className="p-6 font-semibold hidden sm:table-cell">Asset Type</th>
                  <th className="p-6 font-semibold text-right">Interactive Chart</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {filteredAssets.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="p-12 text-center text-gray-500 text-sm">
                      No assets found matching "{searchQuery}".
                    </td>
                  </tr>
                ) : (
                  filteredAssets.map((asset) => {
                    // Safe values for the table rows
                    const safePrice = asset.price || 0;
                    const safeChange = asset.change24h || 0;
                    const isUp = safeChange >= 0;

                    return (
                      <tr
                        key={asset.symbol}
                        onClick={() => setSelectedModalSymbol(asset.symbol)}
                        className="hover:bg-blue-600/5 transition-colors cursor-pointer group"
                      >
                        <td className="p-6">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-[#0B0E14] border border-white/10 flex items-center justify-center font-bold text-white text-xs shrink-0 group-hover:border-blue-500/50 transition-colors">
                              {asset.symbol.slice(0, 3)}
                            </div>
                            <div>
                              <div className="font-bold text-white flex items-center gap-2 group-hover:text-blue-400 transition-colors">
                                {asset.symbol}
                                {asset.category === 'Crypto' && (
                                  <span className="flex h-2 w-2 relative">
                                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                                    <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
                                  </span>
                                )}
                              </div>
                              <div className="text-xs text-gray-400">{asset.name}</div>
                            </div>
                          </div>
                        </td>

                        <td className="p-6 font-medium font-mono text-white text-base">
                          ${safePrice.toLocaleString(undefined, { minimumFractionDigits: safePrice < 1 ? 4 : 2, maximumFractionDigits: safePrice < 1 ? 4 : 2 })}
                        </td>

                        <td className="p-6">
                          <div className={`inline-flex items-center gap-1 font-medium font-mono text-sm ${isUp ? 'text-green-400' : 'text-red-400'}`}>
                            {isUp ? <TrendingUp size={16} /> : <TrendingDown size={16} />}
                            {safeChange > 0 ? '+' : ''}{safeChange.toFixed(2)}%
                          </div>
                        </td>

                        <td className="p-6 hidden sm:table-cell">
                          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/5 border border-white/10 text-xs font-medium text-gray-300">
                            {asset.category}
                          </span>
                        </td>

                        <td className="p-6 text-right">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedModalSymbol(asset.symbol);
                            }}
                            className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-blue-600/10 hover:bg-blue-600 text-blue-400 hover:text-white rounded-full text-xs font-bold transition-all border border-blue-500/20 shadow-sm"
                          >
                            <Maximize2 size={13} /> Open Chart
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </main>

      {/* CHART TERMINAL MODAL */}
      {isClient && selectedAsset && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 md:p-8">
          <div className="bg-[#151924] border border-white/10 rounded-3xl w-full max-w-6xl h-[88vh] flex flex-col shadow-2xl overflow-hidden relative animate-in fade-in zoom-in-95 duration-200">

            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-white/5 flex items-center justify-between bg-[#0B0E14]">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-full bg-blue-600/20 border border-blue-500/30 flex items-center justify-center font-bold text-blue-400 text-sm">
                  {selectedAsset.symbol.slice(0, 3)}
                </div>
                <div>
                  <h3 className="text-lg font-extrabold text-white flex items-center gap-2">
                    {selectedAsset.name} <span className="text-sm font-normal text-gray-400">({selectedAsset.symbol})</span>
                  </h3>
                  <div className="flex items-center gap-3 text-xs">
                    <span className="font-mono text-white font-bold">
                      ${modalSafePrice.toLocaleString(undefined, { minimumFractionDigits: modalSafePrice < 1 ? 4 : 2 })}
                    </span>
                    <span className={`font-mono font-medium ${modalIsUp ? 'text-green-400' : 'text-red-400'}`}>
                      {modalSafeChange > 0 ? '+' : ''}{modalSafeChange.toFixed(2)}%
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <Link
                  href="/dashboard"
                  className="hidden sm:inline-flex px-5 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-full text-xs font-bold transition-colors"
                >
                  Trade {selectedAsset.symbol}
                </Link>
                <button
                  onClick={() => setSelectedModalSymbol(null)}
                  className="p-2 rounded-full bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white transition-colors"
                >
                  <X size={20} />
                </button>
              </div>
            </div>

            {/* Modal Chart Body */}
            <div className="flex-1 p-4 bg-[#0B0E14] relative">
              <TradingViewChart symbol={selectedAsset.symbol} />
            </div>

          </div>
        </div>
      )}
    </div>
  );
}

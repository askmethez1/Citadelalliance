"use client";

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import Sidebar from '../../components/Sidebar';
import TopHeader from '../../components/TopHeader';
import DashboardSkeleton from '../../components/DashboardSkeleton';
import NotificationModal, { ModalType } from '@/app/components/ui/NotificationModal';
import { ChevronLeft, Activity, Square, TrendingUp, TrendingDown, Loader2, Edit2, Check, X as CancelIcon, Wallet } from 'lucide-react';

import { getUserProfile } from '@/app/actions/profile';
import { getTradingData, closeTrade, updateTradeSLTP } from '@/app/actions/trading';
import { usePricingEngine } from '@/app/hooks/usePricingEngine'; 
import { calculatePnL } from '@/app/utils/tradingEngine';

interface Trade {
  id: string;
  symbol: string;
  type: 'BUY' | 'SELL';
  marginMode: string;
  leverage: number;
  volume: number;
  openPrice: number;
  tp: number;
  sl: number;
  pnl: number;
  status: string;
  openTime: string;
}

export default function ActiveCopyTradesPage() {
  const [sidebarTab, setSidebarTab] = useState('copy-trading');
  const [userCountry, setUserCountry] = useState('Nigeria');
  
  const { getLivePrice } = usePricingEngine();
  
  const [balance, setBalance] = useState<number>(0);
  const [trades, setTrades] = useState<Trade[]>([]);
  const [aiMeta, setAiMeta] = useState<Record<string, any>>({});
  const [isLoading, setIsLoading] = useState(true);
  
  const [closingId, setClosingId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTp, setEditTp] = useState<string>('');
  const [editSl, setEditSl] = useState<string>('');
  const [isSavingEdit, setIsSavingEdit] = useState(false);

  const [modalConfig, setModalConfig] = useState<{ isOpen: boolean; title?: string; message: string; type: ModalType; }>({
    isOpen: false, message: '', type: 'info'
  });

  useEffect(() => {
    const initData = async () => {
      const [tradingData, profile] = await Promise.all([
        getTradingData(),
        getUserProfile()
      ]);

      if (profile?.country) setUserCountry(profile.country);
      if (tradingData) {
        setBalance(tradingData.balance || 0);
        if (tradingData.trades) {
          setTrades(tradingData.trades.filter((t: any) => t.status === 'OPEN'));
        }
      }
      
      const storedMeta = JSON.parse(localStorage.getItem('ai_copy_meta') || '{}');
      setAiMeta(storedMeta);
      
      setIsLoading(false);
    };

    initData();
    const interval = setInterval(initData, 10000);
    return () => clearInterval(interval);
  }, []);

  const showAlert = (message: string, type: ModalType = 'info', title?: string) => {
    setModalConfig({ isOpen: true, message, type, title });
  };

  const handleStopCopying = async (trade: Trade) => {
    setClosingId(trade.id);
    const currentPrice = getLivePrice(trade.symbol) || trade.openPrice;
    
    const livePnl = calculatePnL(trade.type, trade.openPrice, currentPrice, trade.volume);
    
    const res = await closeTrade(trade.id, currentPrice, livePnl);
    
    if (res.success) {
      setTrades(prev => prev.filter(t => t.id !== trade.id));
      setBalance(res.newBalance || balance); 
      showAlert(`AI trade for ${trade.symbol} closed. Balance credited with ${livePnl >= 0 ? '+' : ''}$${livePnl.toFixed(2)} Profit/Loss.`, 'success', 'Copy Trade Closed');
    } else {
      showAlert("Failed to close trade in engine.", "error");
    }
    setClosingId(null);
  };

  const handleSaveSLTP = async (trade: Trade) => {
    if (isSavingEdit) return;
    setIsSavingEdit(true);
    
    const newTp = parseFloat(editTp) || 0;
    const newSl = parseFloat(editSl) || 0;

    const res = await updateTradeSLTP(trade.id, newSl, newTp);
    if (res.success) {
      setTrades(prev => prev.map(t => t.id === trade.id ? { ...t, tp: newTp, sl: newSl } : t));
      showAlert(`Take Profit and Stop Loss updated successfully.`, "success", "Modification Complete");
      setEditingId(null);
    } else {
      showAlert("Failed to update TP/SL. Please try again.", "error");
    }
    setIsSavingEdit(false);
  };

  const activeAiTrades = useMemo(() => {
    return trades.filter(t => aiMeta[t.id] !== undefined);
  }, [trades, aiMeta]);

  // Calculate the total funds currently allocated to active copy trades
  const totalAllocated = useMemo(() => {
    return activeAiTrades.reduce((sum, trade) => {
      const meta = aiMeta[trade.id];
      return sum + (meta?.allocated || 0);
    }, 0);
  }, [activeAiTrades, aiMeta]);

  if (isLoading) return <DashboardSkeleton activeTab={sidebarTab} location={userCountry} />;

  return (
    <div className="min-h-screen bg-[#0B0E14] text-gray-300 font-sans flex selection:bg-blue-500/30 w-full relative">
      <Sidebar activeTab={sidebarTab} setActiveTab={setSidebarTab} location={userCountry} />

      <main className="flex-1 flex flex-col min-h-screen relative min-w-0 overflow-x-hidden">
        <TopHeader />

        <div className="flex-1 p-4 sm:p-6 lg:p-8 w-full flex flex-col">
          <div className="max-w-7xl mx-auto space-y-8 w-full flex-1">
            
            {/* Header Section with Total Allocated Badge */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 border-b border-white/5 pb-6">
              <div className="flex items-center gap-4">
                <Link href="/dashboard/copy-trading" className="p-2 bg-[#151924] border border-white/10 rounded-xl hover:bg-white/5 transition-colors">
                  <ChevronLeft size={20} className="text-white" />
                </Link>
                <div>
                  <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight flex items-center gap-3">
                    <Activity className="text-blue-500" size={28} /> Active AI Trades
                  </h1>
                  <p className="text-gray-400 text-sm mt-1">Live overview of all automated positions mirroring your Master Traders.</p>
                </div>
              </div>

              {/* Display Total Allocated Capital */}
              <div className="bg-blue-900/20 border border-blue-500/30 px-5 py-3 rounded-2xl flex items-center gap-4 sm:ml-auto">
                <div className="p-2 bg-blue-500/20 rounded-lg text-blue-400">
                  <Wallet size={20} />
                </div>
                <div className="flex flex-col">
                  <span className="text-blue-400/80 text-[10px] font-bold uppercase tracking-wider">Total Allocated</span>
                  <span className="text-white font-mono font-bold text-xl">${totalAllocated.toFixed(2)}</span>
                </div>
              </div>
            </div>

            {activeAiTrades.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-32 bg-[#151924] border border-white/5 rounded-3xl">
                <Activity size={48} className="text-gray-600 mb-4" />
                <h2 className="text-xl font-bold text-white mb-2">No Active AI Trades</h2>
                <p className="text-gray-400 text-sm mb-6">You are not currently mirroring any traders.</p>
                <Link href="/dashboard/copy-trading" className="px-6 py-3 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl transition-colors">
                  Find a Master Trader
                </Link>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {activeAiTrades.map((trade) => {
                  const meta = aiMeta[trade.id];
                  const livePrice = getLivePrice(trade.symbol) || trade.openPrice;
                  const isPriceReady = livePrice > 0;
                  
                  const livePnl = calculatePnL(trade.type, trade.openPrice, livePrice, trade.volume);
                  const isProfit = livePnl >= 0;
                  const isLong = trade.type === 'BUY';
                  const isEditing = editingId === trade.id;

                  return (
                    <div key={trade.id} className="bg-[#151924] border border-blue-500/50 bg-blue-950/10 rounded-3xl p-6 shadow-xl relative flex flex-col justify-between">
                      <div>
                        <div className="flex items-center justify-between mb-4">
                          <div className="flex items-center gap-3">
                            <img src={meta.avatar} alt={meta.traderName} className="w-12 h-12 rounded-2xl bg-[#0B0E14] border border-white/10 p-1" />
                            <div>
                              <h3 className="text-base font-bold text-white">{meta.traderName}</h3>
                              <p className="text-xs text-gray-500 font-mono">ID: {trade.id}</p>
                            </div>
                          </div>
                          <span className={`font-mono font-bold text-[10px] px-2.5 py-1 rounded-lg ${isLong ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
                            {isLong ? 'LONG' : 'SHORT'} {trade.leverage}x
                          </span>
                        </div>

                        <div className="bg-[#0B0E14] border border-white/5 rounded-2xl p-4 mb-4">
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-white font-bold text-lg">{trade.symbol}</span>
                            <span className={`font-mono font-extrabold text-lg flex items-center gap-1 ${isProfit ? 'text-green-400' : 'text-red-400'}`}>
                              {isPriceReady ? (
                                <>
                                  {isProfit ? <TrendingUp size={18} /> : <TrendingDown size={18} />}
                                  {isProfit ? '+' : ''}${livePnl.toFixed(2)}
                                </>
                              ) : (
                                <><Loader2 size={14} className="animate-spin" /> ...</>
                              )}
                            </span>
                          </div>
                          
                          <div className="grid grid-cols-2 gap-y-3 mt-4 text-[11px] font-mono border-t border-white/5 pt-3">
                            <div>
                              <div className="text-gray-500 mb-0.5">Allocated</div>
                              <div className="text-white font-bold">${meta.allocated?.toFixed(2) || '---'}</div>
                            </div>
                            <div className="text-right">
                              <div className="text-gray-500 mb-0.5">Volume</div>
                              <div className="text-white font-bold">{trade.volume.toFixed(4)}</div>
                            </div>
                            <div>
                              <div className="text-gray-500 mb-0.5">Entry Price</div>
                              <div className="text-gray-300">${trade.openPrice.toFixed(2)}</div>
                            </div>
                            <div className="text-right">
                              <div className="text-gray-500 mb-0.5">Live Mark</div>
                              <div className={isPriceReady ? "text-white" : "text-gray-500 animate-pulse"}>
                                ${livePrice > 0 ? livePrice.toFixed(2) : 'Fetching...'}
                              </div>
                            </div>
                          </div>

                          <div className="grid grid-cols-2 gap-2 mt-3 pt-3 border-t border-white/5 relative group">
                            {!isEditing && (
                              <button 
                                onClick={() => {
                                  setEditingId(trade.id);
                                  setEditTp(trade.tp ? trade.tp.toString() : '');
                                  setEditSl(trade.sl ? trade.sl.toString() : '');
                                }}
                                className="absolute right-0 top-1 text-gray-500 hover:text-blue-400 opacity-0 group-hover:opacity-100 transition-opacity p-1 bg-white/5 rounded"
                                title="Edit TP/SL"
                              >
                                <Edit2 size={12} />
                              </button>
                            )}

                            <div className="pr-2 border-r border-white/5">
                              <div className="text-emerald-500/80 mb-0.5 text-[10px] uppercase font-bold">Take Profit</div>
                              {isEditing ? (
                                <input
                                  type="number"
                                  placeholder="0.00"
                                  value={editTp}
                                  onChange={(e) => setEditTp(e.target.value)}
                                  className="w-full bg-[#151924] border border-white/10 rounded px-2 py-1 text-xs text-white focus:outline-none"
                                />
                              ) : (
                                <div className="text-emerald-400 font-bold">{trade.tp > 0 ? `$${trade.tp.toFixed(2)}` : 'None'}</div>
                              )}
                            </div>

                            <div className="pl-2">
                              <div className="text-rose-500/80 mb-0.5 text-[10px] uppercase font-bold">Stop Loss</div>
                              {isEditing ? (
                                <div className="flex gap-1">
                                  <input
                                    type="number"
                                    placeholder="0.00"
                                    value={editSl}
                                    onChange={(e) => setEditSl(e.target.value)}
                                    className="w-full bg-[#151924] border border-white/10 rounded px-2 py-1 text-xs text-white focus:outline-none"
                                  />
                                </div>
                              ) : (
                                <div className="text-rose-400 font-bold">{trade.sl > 0 ? `$${trade.sl.toFixed(2)}` : 'None'}</div>
                              )}
                            </div>

                            {isEditing && (
                              <div className="col-span-2 flex items-center justify-end gap-2 mt-2">
                                <button 
                                  onClick={() => setEditingId(null)} 
                                  className="text-gray-400 hover:text-white flex items-center gap-1 text-[10px] bg-white/5 px-2 py-1 rounded"
                                >
                                  <CancelIcon size={12}/> Cancel
                                </button>
                                <button 
                                  onClick={() => handleSaveSLTP(trade)} 
                                  disabled={isSavingEdit}
                                  className="text-green-400 hover:text-green-300 flex items-center gap-1 text-[10px] bg-green-500/10 px-2 py-1 rounded"
                                >
                                  {isSavingEdit ? <Loader2 size={12} className="animate-spin"/> : <Check size={12}/>} Save
                                </button>
                              </div>
                            )}
                          </div>

                        </div>
                      </div>

                      <button
                        onClick={() => handleStopCopying(trade)}
                        disabled={closingId === trade.id || !isPriceReady}
                        className="w-full py-3 bg-red-600/20 hover:bg-red-600 text-red-400 hover:text-white border border-red-500/30 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                      >
                        {closingId === trade.id ? (
                          <><Loader2 size={14} className="animate-spin" /> Closing Route...</>
                        ) : (
                          <><Square size={14} /> Stop Copying & Realize</>
                        )}
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </main>

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
"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { Loader2, Zap, Send, Trash2, CheckCircle2, XCircle, Activity, Calculator, RefreshCw, TrendingUp, TrendingDown, AlertTriangle } from 'lucide-react';
import { getSignals, createSignal, updateSignalStatus, deleteSignal } from '@/app/actions/signals';
import { TRADING_ASSETS } from '@/app/config/assets';
import NotificationModal, { ModalType } from '@/app/components/ui/NotificationModal';

export default function AdminSignalsPage() {
  const [modalConfig, setModalConfig] = useState<{ isOpen: boolean; title?: string; message: string; type: ModalType; }>({
    isOpen: false, message: '', type: 'info'
  });

  const showAlert = (message: string, type: ModalType = 'info', title?: string) => {
    setModalConfig({ isOpen: true, message, type, title });
  };

  const [signals, setSignals] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [livePrices, setLivePrices] = useState<Record<string, number>>({});
  const [isFetchingPrices, setIsFetchingPrices] = useState(false);

  const [formData, setFormData] = useState({
    pair: TRADING_ASSETS[0].symbol,
    type: 'LONG' as 'LONG' | 'SHORT',
    leverage: 10,
    entryPrice: '',
    targetPrice1: '',
    targetPrice2: '',
    stopLoss: '',
    timeframe: '4H Swing',
    riskLevel: 'Medium' as 'Low' | 'Medium' | 'High',
    notes: '',
  });

  const loadSignals = async () => {
    setIsLoading(true);
    const data = await getSignals();
    setSignals(data);
    setIsLoading(false);
  };

  const fetchLivePrices = useCallback(async () => {
    setIsFetchingPrices(true);
    try {
      const currentAsset = TRADING_ASSETS.find(a => a.symbol === formData.pair);
      
      if (currentAsset?.type === 'crypto') {
        const cgResponse = await fetch(
          `https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=100&page=1`,
          {
            headers: process.env.NEXT_PUBLIC_COINGECKO_API_KEY ? {
              'x-cg-demo-api-key': process.env.NEXT_PUBLIC_COINGECKO_API_KEY
            } : undefined
          }
        );
        if (cgResponse.ok) {
          const cgData = await cgResponse.json();
          const priceMap: Record<string, number> = { ...livePrices };
          if (Array.isArray(cgData)) {
            cgData.forEach((coin: any) => {
              priceMap[coin.symbol.toUpperCase()] = coin.current_price;
            });
            setLivePrices(priceMap);
            
            const lookupSymbol = formData.pair.replace('USD', '').replace('/', '');
            if (priceMap[lookupSymbol]) {
              setFormData(prev => ({ ...prev, entryPrice: priceMap[lookupSymbol].toString() }));
            }
          }
        }
      } else if (currentAsset?.type === 'stock') {
        const finnhubKey = process.env.NEXT_PUBLIC_FINNHUB_API_KEY;
        if (finnhubKey) {
          const res = await fetch(`https://finnhub.io/api/v1/quote?symbol=${formData.pair}&token=${finnhubKey}`);
          if (res.ok) {
            const data = await res.json();
            if (data && data.c) {
              setLivePrices(prev => ({ ...prev, [formData.pair]: data.c }));
              setFormData(prev => ({ ...prev, entryPrice: data.c.toString() }));
            }
          }
        }
      }
    } catch (error) {
      console.error("Live Price Engine Error:", error);
    } finally {
      setIsFetchingPrices(false);
    }
  }, [formData.pair, livePrices]);

  useEffect(() => {
    loadSignals();
  }, []);

  useEffect(() => {
    fetchLivePrices();
  }, [formData.pair, fetchLivePrices]);

  const autoCalculate = (targetPct: number, stopLossPct: number) => {
    const entry = parseFloat(formData.entryPrice);
    if (!entry || isNaN(entry)) {
      return showAlert("Please enter an Entry Price first.", "warning");
    }

    const isLong = formData.type === 'LONG';
    const t1Mult = isLong ? (1 + targetPct / 100) : (1 - targetPct / 100);
    const t2Mult = isLong ? (1 + (targetPct * 1.5) / 100) : (1 - (targetPct * 1.5) / 100);
    const slMult = isLong ? (1 - stopLossPct / 100) : (1 + stopLossPct / 100);
    const decimals = entry < 1 ? 4 : 2;

    setFormData(prev => ({
      ...prev,
      targetPrice1: (entry * t1Mult).toFixed(decimals),
      targetPrice2: (entry * t2Mult).toFixed(decimals),
      stopLoss: (entry * slMult).toFixed(decimals),
    }));
  };

  const handleCreateSignal = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    const payload = {
      ...formData,
      entryPrice: parseFloat(formData.entryPrice),
      targetPrice1: parseFloat(formData.targetPrice1),
      targetPrice2: parseFloat(formData.targetPrice2),
      stopLoss: parseFloat(formData.stopLoss),
    };

    if (!payload.pair || isNaN(payload.entryPrice) || isNaN(payload.targetPrice1) || isNaN(payload.stopLoss)) {
      showAlert("Please fill in all required numerical fields correctly.", "error", "Validation Error");
      setIsSubmitting(false);
      return;
    }

    const res = await createSignal(payload);
    
    if (res.success) {
      showAlert(`Signal broadcasted successfully to all users.`, "success", "Broadcast Live");
      setFormData(prev => ({
        ...prev, targetPrice1: '', targetPrice2: '', stopLoss: '', notes: ''
      }));
      loadSignals();
    } else {
      showAlert(res.error || "Failed to broadcast signal.", "error");
    }
    
    setIsSubmitting(false);
  };

  const handleStatusUpdate = async (id: string, newStatus: 'ACTIVE' | 'CLOSED' | 'TARGET_HIT') => {
    const res = await updateSignalStatus(id, newStatus);
    if (res.success) {
      showAlert(`Signal marked as ${newStatus}.`, "success");
      loadSignals();
    } else {
      showAlert("Failed to update status.", "error");
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm(`Are you sure you want to permanently delete this signal?`)) return;
    
    const res = await deleteSignal(id);
    if (res.success) {
      showAlert(`Signal deleted successfully.`, "success");
      loadSignals();
    } else {
      showAlert("Failed to delete signal.", "error");
    }
  };

  const formEntry = parseFloat(formData.entryPrice);
  const formLev = formData.leverage || 10;
  const previewLiqPrice = formEntry > 0 ? (formData.type === 'LONG' ? formEntry * (1 - 1 / formLev) : formEntry * (1 + 1 / formLev)) : 0;

  return (
    <div className="animate-in fade-in duration-300 relative">
      <div className="grid lg:grid-cols-3 gap-6">
        
        {/* LEFT: CREATE SIGNAL FORM */}
        <div className="lg:col-span-1 bg-[#151924] border border-white/5 rounded-3xl p-6 shadow-xl h-fit">
          <div className="flex items-center justify-between mb-6 border-b border-white/5 pb-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-yellow-500/10 rounded-lg text-yellow-400">
                <Zap size={20} />
              </div>
              <div>
                <h2 className="text-lg font-extrabold text-white">Broadcast Setup</h2>
                <p className="text-xs text-gray-500">Push live trading signals</p>
              </div>
            </div>
            <button onClick={fetchLivePrices} disabled={isFetchingPrices} className="p-2 bg-white/5 hover:bg-white/10 rounded-lg text-gray-400 hover:text-white transition-colors" title="Sync Live Prices">
              <RefreshCw size={16} className={isFetchingPrices ? "animate-spin" : ""} />
            </button>
          </div>

          <form onSubmit={handleCreateSignal} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-[10px] text-gray-500 font-bold uppercase mb-1 block">Asset Pair</label>
                <select value={formData.pair} onChange={e => setFormData({...formData, pair: e.target.value})} className="w-full bg-[#0B0E14] border border-white/10 rounded-xl py-2 px-3 text-sm text-white focus:outline-none focus:border-blue-500">
                  <optgroup label="Crypto">
                    {TRADING_ASSETS.filter(a => a.type === 'crypto').map(asset => (
                      <option key={asset.symbol} value={asset.symbol}>{asset.symbol} - {asset.name}</option>
                    ))}
                  </optgroup>
                  <optgroup label="Stocks / ETFs">
                    {TRADING_ASSETS.filter(a => a.type === 'stock').map(asset => (
                      <option key={asset.symbol} value={asset.symbol}>{asset.symbol} - {asset.name}</option>
                    ))}
                  </optgroup>
                </select>
              </div>
              <div>
                <label className="text-[10px] text-gray-500 font-bold uppercase mb-1 block">Direction</label>
                <select value={formData.type} onChange={e => setFormData({...formData, type: e.target.value as any})} className="w-full bg-[#0B0E14] border border-white/10 rounded-xl py-2 px-3 text-sm text-white focus:outline-none focus:border-blue-500">
                  <option value="LONG">LONG</option>
                  <option value="SHORT">SHORT</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-[10px] text-gray-500 font-bold uppercase mb-1 block">Entry Price</label>
                <input required type="number" step="any" placeholder="0.00" value={formData.entryPrice} onChange={e => setFormData({...formData, entryPrice: e.target.value})} className="w-full bg-[#0B0E14] border border-white/10 rounded-xl py-2 px-3 text-sm text-white focus:outline-none focus:border-blue-500" />
              </div>
              <div>
                <label className="text-[10px] text-gray-500 font-bold uppercase mb-1 block">Leverage (x)</label>
                <select 
                  required 
                  value={formData.leverage} 
                  onChange={e => setFormData({...formData, leverage: parseInt(e.target.value) || 10})} 
                  className="w-full bg-[#0B0E14] border border-white/10 rounded-xl py-2 px-3 text-sm text-white focus:outline-none focus:border-blue-500"
                >
                  <option value={1}>1x</option>
                  <option value={2}>2x</option>
                  <option value={5}>5x</option>
                  <option value={10}>10x</option>
                  <option value={20}>20x</option>
                  <option value={50}>50x</option>
                  <option value={100}>100x</option>
                  <option value={125}>125x</option>
                </select>
              </div>
            </div>

            {previewLiqPrice > 0 && (
              <div className="text-[10px] text-orange-400 bg-orange-500/10 border border-orange-500/20 px-3 py-2 rounded-lg flex items-center justify-between font-mono">
                <span>Estimated Liquidation:</span>
                <span className="font-bold">${previewLiqPrice.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
              </div>
            )}

            <div className="bg-blue-500/5 border border-blue-500/20 p-3 rounded-xl">
              <label className="text-[10px] text-blue-400 font-bold uppercase mb-2 flex items-center gap-1">
                <Calculator size={12} /> Auto-Calculate Targets & SL
              </label>
              <div className="grid grid-cols-3 gap-2">
                <button type="button" onClick={() => autoCalculate(10, 5)} className="py-1.5 bg-blue-600/20 hover:bg-blue-600/40 text-blue-300 text-[10px] font-bold rounded-lg transition-colors">10% Profit</button>
                <button type="button" onClick={() => autoCalculate(20, 10)} className="py-1.5 bg-blue-600/20 hover:bg-blue-600/40 text-blue-300 text-[10px] font-bold rounded-lg transition-colors">20% Profit</button>
                <button type="button" onClick={() => autoCalculate(30, 15)} className="py-1.5 bg-blue-600/20 hover:bg-blue-600/40 text-blue-300 text-[10px] font-bold rounded-lg transition-colors">30% Profit</button>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-[10px] text-gray-500 font-bold uppercase mb-1 block">Target 1</label>
                <input required type="number" step="any" placeholder="0.00" value={formData.targetPrice1} onChange={e => setFormData({...formData, targetPrice1: e.target.value})} className="w-full bg-[#0B0E14] border border-white/10 rounded-xl py-2 px-3 text-sm text-green-400 focus:outline-none focus:border-green-500" />
              </div>
              <div>
                <label className="text-[10px] text-gray-500 font-bold uppercase mb-1 block">Target 2</label>
                <input required type="number" step="any" placeholder="0.00" value={formData.targetPrice2} onChange={e => setFormData({...formData, targetPrice2: e.target.value})} className="w-full bg-[#0B0E14] border border-white/10 rounded-xl py-2 px-3 text-sm text-green-400 focus:outline-none focus:border-green-500" />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-[10px] text-gray-500 font-bold uppercase mb-1 block">Stop Loss</label>
                <input required type="number" step="any" placeholder="0.00" value={formData.stopLoss} onChange={e => setFormData({...formData, stopLoss: e.target.value})} className="w-full bg-[#0B0E14] border border-white/10 rounded-xl py-2 px-3 text-sm text-red-400 focus:outline-none focus:border-red-500" />
              </div>
              <div>
                <label className="text-[10px] text-gray-500 font-bold uppercase mb-1 block">Timeframe</label>
                <input required type="text" placeholder="e.g. 4H Swing" value={formData.timeframe} onChange={e => setFormData({...formData, timeframe: e.target.value})} className="w-full bg-[#0B0E14] border border-white/10 rounded-xl py-2 px-3 text-sm text-white focus:outline-none focus:border-blue-500" />
              </div>
            </div>

            <div>
              <label className="text-[10px] text-gray-500 font-bold uppercase mb-1 block">Analyst Notes</label>
              <textarea rows={3} placeholder="Brief rationale for this setup..." value={formData.notes} onChange={e => setFormData({...formData, notes: e.target.value})} className="w-full bg-[#0B0E14] border border-white/10 rounded-xl py-2 px-3 text-sm text-white focus:outline-none focus:border-blue-500 resize-none"></textarea>
            </div>

            <button disabled={isSubmitting} type="submit" className="w-full py-3 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white rounded-xl text-sm font-bold transition-all flex items-center justify-center gap-2 shadow-lg shadow-blue-600/20 mt-4">
              {isSubmitting ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
              Broadcast Signal
            </button>
          </form>
        </div>

        {/* RIGHT: ACTIVE & PAST SIGNALS LEDGER */}
        <div className="lg:col-span-2 space-y-4">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-32 bg-[#151924] border border-white/5 rounded-3xl">
              <Loader2 size={32} className="text-blue-500 animate-spin mb-4" />
              <p className="text-gray-500 text-sm">Loading signal ledger...</p>
            </div>
          ) : signals.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-32 bg-[#151924] border border-white/5 rounded-3xl">
              <Activity size={48} className="text-gray-600 mb-4" />
              <h3 className="text-white font-bold text-lg mb-1">No Broadcasts Found</h3>
              <p className="text-gray-500 text-sm">Create a new setup using the form to alert your users.</p>
            </div>
          ) : (
            signals.map(signal => {
              const isLong = signal.type === 'LONG';
              const lev = signal.leverage || 10;
              const entry = parseFloat(signal.entryPrice);
              const target1 = parseFloat(signal.targetPrice1);
              const sl = parseFloat(signal.stopLoss);

              let projectedProfitPct = 0;
              let projectedLossPct = 0;
              let liqPrice = 0;

              if (entry > 0) {
                liqPrice = isLong ? entry * (1 - 1 / lev) : entry * (1 + 1 / lev);
                projectedProfitPct = isLong ? ((target1 - entry) / entry) * 100 * lev : ((entry - target1) / entry) * 100 * lev;
                projectedLossPct = isLong ? ((entry - sl) / entry) * 100 * lev : ((sl - entry) / entry) * 100 * lev;
              }

              return (
                <div key={signal.id} className="bg-[#151924] border border-white/5 rounded-2xl p-5 shadow-lg flex flex-col xl:flex-row gap-6 justify-between transition-colors hover:border-white/10">
                  
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-4">
                      <span className={`px-2 py-1 rounded text-[10px] font-extrabold font-mono uppercase ${
                        isLong ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'
                      }`}>
                        {signal.type} {lev}x
                      </span>
                      <span className="text-lg font-extrabold text-white">{signal.pair}</span>
                      <span className="text-xs text-gray-500 font-mono">SIG-{signal.id}</span>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-5 gap-4 mb-4 bg-[#0B0E14] p-4 rounded-xl border border-white/5 font-mono text-xs relative overflow-hidden">
                      <div className="relative z-10">
                        <span className="text-gray-500 block text-[9px] uppercase mb-0.5">Entry</span>
                        <span className="text-white">${entry.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                      </div>
                      <div className="relative z-10">
                        <span className="text-orange-400 block text-[9px] uppercase mb-0.5 flex items-center gap-1"><AlertTriangle size={10} /> Liq. Price</span>
                        <span className="text-orange-400 font-bold">${liqPrice.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                      </div>
                      <div className="relative z-10">
                        <span className="text-gray-500 block text-[9px] uppercase mb-0.5">Target 1</span>
                        <span className="text-green-400">${target1.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                      </div>
                      <div className="relative z-10">
                        <span className="text-gray-500 block text-[9px] uppercase mb-0.5">Proj. Profit</span>
                        <span className="text-green-400 flex items-center gap-1"><TrendingUp size={12}/> +{projectedProfitPct.toFixed(2)}%</span>
                      </div>
                      <div className="relative z-10">
                        <span className="text-gray-500 block text-[9px] uppercase mb-0.5">Proj. Loss (SL)</span>
                        <span className="text-red-400 flex items-center gap-1"><TrendingDown size={12}/> -{projectedLossPct.toFixed(2)}%</span>
                      </div>
                    </div>
                    
                    <p className="text-xs text-gray-400"><b>Note:</b> {signal.notes}</p>
                  </div>

                  <div className="flex flex-row xl:flex-col justify-between items-center xl:items-end min-w-[120px] border-t xl:border-t-0 xl:border-l border-white/5 pt-4 xl:pt-0 xl:pl-6">
                    <div className="text-right hidden xl:block mb-4">
                      <div className="text-[10px] text-gray-500 uppercase font-bold mb-1">Status</div>
                      <span className={`inline-flex items-center px-2 py-1 rounded text-[10px] font-bold ${
                        signal.status === 'ACTIVE' ? 'bg-yellow-500/10 text-yellow-400 border border-yellow-500/20' :
                        signal.status === 'TARGET_HIT' ? 'bg-green-500/10 text-green-400 border border-green-500/20' :
                        'bg-gray-500/10 text-gray-400 border border-gray-500/20'
                      }`}>
                        {signal.status.replace('_', ' ')}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      {signal.status === 'ACTIVE' && (
                        <>
                          <button onClick={() => handleStatusUpdate(signal.id, 'TARGET_HIT')} className="p-2 bg-green-500/10 text-green-400 hover:bg-green-500 hover:text-white rounded-lg transition-colors" title="Mark Target Hit">
                            <CheckCircle2 size={16} />
                          </button>
                          <button onClick={() => handleStatusUpdate(signal.id, 'CLOSED')} className="p-2 bg-gray-500/10 text-gray-400 hover:bg-gray-500 hover:text-white rounded-lg transition-colors" title="Mark Closed">
                            <XCircle size={16} />
                          </button>
                        </>
                      )}
                      <button onClick={() => handleDelete(signal.id)} className="p-2 bg-red-500/10 text-red-400 hover:bg-red-500 hover:text-white rounded-lg transition-colors" title="Delete Signal">
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>

                </div>
              );
            })
          )}
        </div>
      </div>

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
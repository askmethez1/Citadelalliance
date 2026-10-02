"use client";

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Settings, Maximize2, ChevronDown, Edit2, Check, X as CancelIcon, Star, Loader2, Minimize2, AlertTriangle } from 'lucide-react';
import { getTradingData, openTrade, closeTrade, updateTradeSLTP } from '@/app/actions/trading';
import NotificationModal, { ModalType } from '@/app/components/ui/NotificationModal';
import TradingViewChart from '@/app/components/TradingViewChart';
import OrderPanel from './OrderPanel';
import { TRADING_ASSETS, TradingAsset } from '@/app/config/assets';
import { calculatePnL, calculateLiquidationPrice, validateOrderRisk, evaluateTradeClosure } from '@/app/utils/tradingEngine';
import { usePricingEngine } from '@/app/hooks/usePricingEngine';

interface Position {
  id: string;
  symbol: string;
  type: 'BUY' | 'SELL';
  marginMode: 'CROSS' | 'ISOLATED';
  leverage: number;
  volume: number;
  openPrice: number;
  sl: number;
  tp: number;
  currentPrice: number;
  pnl: number;
  status: 'OPEN' | 'CLOSED';
  openTime: string;
  closeTime?: string;
}

export default function TradingTerminal({ onLiveStats }: { onLiveStats?: (stats: any) => void }) {
  const [selectedAsset, setSelectedAsset] = useState<TradingAsset>(TRADING_ASSETS[0]);
  const [favorites, setFavorites] = useState<string[]>([]);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Diagnostic Pricing Hook
  const { getLivePrice, cryptoError, stockError } = usePricingEngine();

  const [balance, setBalance] = useState<number>(0);
  const [positions, setPositions] = useState<Position[]>([]);
  const [activeTab, setActiveTab] = useState<'positions' | 'history'>('positions');
  const [closingIds, setClosingIds] = useState<Set<string>>(new Set());
  const [isProcessing, setIsProcessing] = useState(false);

  const [priceChange, setPriceChange] = useState<'UP' | 'DOWN'>('UP');
  const [prevPrice, setPrevPrice] = useState<number>(0);

  const [editPosId, setEditPosId] = useState<string | null>(null);
  const [editSl, setEditSl] = useState<string>('');
  const [editTp, setEditTp] = useState<string>('');
  const [isSavingEdit, setIsSavingEdit] = useState(false);

  const [modalConfig, setModalConfig] = useState<{ isOpen: boolean; title?: string; message: string; type: ModalType; }>({ isOpen: false, message: '', type: 'info' });

  const showAlert = useCallback((message: string, type: 'info' | 'error' | 'success' | 'warning', title?: string) => {
    setModalConfig({ isOpen: true, message, type: type as ModalType, title });
  }, []);

  useEffect(() => {
    const savedSymbol = localStorage.getItem('citadel_active_symbol');
    if (savedSymbol) {
      const asset = TRADING_ASSETS.find(a => a.symbol === savedSymbol);
      if (asset) setSelectedAsset(asset);
    }
    const savedFavs = localStorage.getItem('citadel_favorites');
    if (savedFavs) { try { setFavorites(JSON.parse(savedFavs)); } catch (e) {} }
  }, []);

  const handleSelectAsset = (asset: TradingAsset) => {
    setSelectedAsset(asset);
    localStorage.setItem('citadel_active_symbol', asset.symbol);
    setIsDropdownOpen(false);
  };

  const toggleFavorite = (e: React.MouseEvent, symbol: string) => {
    e.stopPropagation();
    const updated = favorites.includes(symbol) ? favorites.filter(s => s !== symbol) : [...favorites, symbol];
    setFavorites(updated);
    localStorage.setItem('citadel_favorites', JSON.stringify(updated));
  };

  useEffect(() => {
    const initData = async () => {
      const data = await getTradingData();
      if (data) {
        setBalance(Math.max(0, data.balance));
        setPositions(data.trades.map((t: any) => ({
          ...t, 
          currentPrice: t.status === 'OPEN' ? (getLivePrice(t.symbol) || t.openPrice) : t.closePrice, 
          pnl: t.status === 'OPEN' ? 0 : t.pnl 
        })));
      }
    };
    initData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const livePrice = getLivePrice(selectedAsset.symbol);
  const isPriceLoading = livePrice === 0;
  const currentAssetError = selectedAsset.type === 'crypto' ? cryptoError : stockError;

  useEffect(() => {
    if (livePrice > 0 && livePrice !== prevPrice) {
      setPriceChange(livePrice > prevPrice ? 'UP' : 'DOWN');
      setPrevPrice(livePrice);
    }
  }, [livePrice, prevPrice]);

  const { activeTrades, historyTrades, totalFloatingPnL, freeMargin, marginUtilized } = useMemo(() => {
    let floatingPnL = 0;
    let marginLocked = 0;

    const evaluatedPositions = positions.map(pos => {
      if (pos.status === 'CLOSED') return pos;

      const activePrice = getLivePrice(pos.symbol) || pos.openPrice;
      const pnl = calculatePnL(pos.type, pos.openPrice, activePrice, pos.volume);

      floatingPnL += pnl;
      marginLocked += (pos.openPrice * pos.volume) / pos.leverage;

      return { ...pos, currentPrice: activePrice, pnl };
    });

    const currentEquity = Math.max(0, balance + floatingPnL);
    const availableMargin = Math.max(0, currentEquity - marginLocked);
    const utilization = balance > 0 ? Math.min(100, (marginLocked / currentEquity) * 100) : 0;

    return {
      activeTrades: evaluatedPositions.filter(p => p.status === 'OPEN'),
      historyTrades: evaluatedPositions.filter(p => p.status === 'CLOSED'),
      totalFloatingPnL: floatingPnL,
      totalMarginLocked: marginLocked,
      equity: currentEquity,
      freeMargin: availableMargin,
      marginUtilized: utilization
    };
  }, [positions, getLivePrice, balance]);

  useEffect(() => {
    if (onLiveStats) {
      onLiveStats((prev: any) => ({ ...prev, balance, pnl: totalFloatingPnL, marginUtilized }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [balance, totalFloatingPnL, marginUtilized]);

  // LIVE RISK ENGINE EVALUATION
  useEffect(() => {
    activeTrades.forEach(pos => {
      if (closingIds.has(pos.id)) return;
      const tickPrice = getLivePrice(pos.symbol);
      if (!tickPrice || tickPrice <= 0) return;

      const liqPrice = calculateLiquidationPrice(pos.type, pos.marginMode, pos.openPrice, pos.volume, pos.leverage, freeMargin);
      const { shouldClose, reason } = evaluateTradeClosure(pos.type, tickPrice, pos.openPrice, pos.tp, pos.sl, liqPrice);

      if (shouldClose) handleClosePosition(pos, reason);
    });
  }, [getLivePrice, activeTrades, freeMargin, closingIds]);

  const handleExecuteOrder = async (order: any) => {
    const requiredMargin = (order.limitPrice * order.size) / order.leverage;
    const totalCost = requiredMargin + order.fee;

    if (totalCost > freeMargin) {
      showAlert(`Insufficient funds. This trade requires $${totalCost.toFixed(2)} to open, but your available margin is only $${freeMargin.toFixed(2)}.`, "error", "Margin Error");
      return;
    }

    const liqPrice = calculateLiquidationPrice(order.type, order.marginMode, order.limitPrice, order.size, order.leverage, freeMargin);
    const validation = validateOrderRisk(order.type, order.limitPrice, order.tp, order.sl, liqPrice);

    if (!validation.isValid) {
      showAlert(validation.error!, "error", validation.errorTitle!);
      return;
    }

    setIsProcessing(true);

    const payload = {
      symbol: selectedAsset.symbol,
      type: order.type,
      orderType: order.orderType,
      marginMode: order.marginMode,
      leverage: order.leverage,
      volume: order.size,
      openPrice: order.limitPrice,
      sl: order.sl,
      tp: order.tp,
      fee: order.fee
    };

    const res = await openTrade(payload);

    if (res.success && res.ticket) {
      setBalance(prev => Math.max(0, prev - order.fee)); 
      const newPos: Position = { 
        id: res.ticket, 
        symbol: selectedAsset.symbol, 
        status: 'OPEN', 
        currentPrice: order.limitPrice, 
        pnl: -order.fee, 
        openTime: new Date().toLocaleString(), 
        ...payload 
      };
      setPositions(prev => [newPos, ...prev]);
      showAlert(`${order.orderType} ${order.type} placed.`, "success", "Order Executed");
    } else {
      showAlert("Execution failed. Engine rejected order.", "error", "Execution Error");
    }
    setIsProcessing(false);
  };

  const handleClosePosition = async (pos: Position, customReason?: string) => {
    setClosingIds(prev => new Set(prev).add(pos.id));
    const closePrice = getLivePrice(pos.symbol) || pos.currentPrice;

    const res = await closeTrade(pos.id, closePrice, pos.pnl);
    if (res.success && res.newBalance !== undefined) {
      setBalance(Math.max(0, res.newBalance)); 
      setPositions(prev => prev.map(p => p.id === pos.id ? { ...p, status: 'CLOSED', closePrice, closeTime: new Date().toLocaleString() } : p));
      showAlert(customReason || `Position Closed at Market. Realized PnL: $${pos.pnl.toFixed(2)}`, "success", "Trade Settled");
    }
    setClosingIds(prev => { const next = new Set(prev); next.delete(pos.id); return next; });
  };

  const saveEdit = async (pos: Position) => {
    if (isSavingEdit) return;
    setIsSavingEdit(true);
    const newSl = parseFloat(editSl) || 0;
    const newTp = parseFloat(editTp) || 0;

    const liqPrice = calculateLiquidationPrice(pos.type, pos.marginMode, pos.openPrice, pos.volume, pos.leverage, freeMargin);
    const validation = validateOrderRisk(pos.type, pos.openPrice, newTp, newSl, liqPrice);

    if (!validation.isValid) {
      showAlert(validation.error!, "error", validation.errorTitle!);
      setIsSavingEdit(false);
      return;
    }

    const res = await updateTradeSLTP(pos.id, newSl, newTp);
    if (res.success) {
      setPositions(prev => prev.map(p => p.id === pos.id ? { ...p, sl: newSl, tp: newTp } : p));
      showAlert(`Order modified. Stop Loss / Take Profit successfully updated.`, "success", "Modification Complete");
      setEditPosId(null);
    }
    setIsSavingEdit(false);
  };

  return (
    <div className="flex flex-col gap-4 relative font-sans">

      {isFullscreen && (
        <div className="fixed inset-0 bg-[#080a0f]/95 z-[90] backdrop-blur-md" onClick={() => setIsFullscreen(false)} />
      )}

      <div className="flex flex-col lg:flex-row gap-4 h-[550px]">

        <div className={isFullscreen 
          ? "fixed inset-4 md:inset-8 lg:inset-12 z-[100] bg-[#131722] border border-white/10 rounded-2xl shadow-2xl flex flex-col transition-all duration-300" 
          : "flex-1 bg-[#131722] border border-white/5 rounded-2xl shadow-lg flex flex-col relative z-20 transition-all duration-300"
        }>
          <div className="h-14 bg-[#1e222d] border-b border-white/5 rounded-t-2xl flex items-center px-4 justify-between shrink-0 z-30">
            <div className="flex items-center gap-6">
              <div className="relative">
                <button onClick={() => setIsDropdownOpen(!isDropdownOpen)} className="flex items-center gap-2 text-xl font-extrabold text-white hover:text-blue-400 focus:outline-none">
                  {selectedAsset.symbol} <ChevronDown size={18} className={`transition-transform ${isDropdownOpen ? 'rotate-180' : ''}`} />
                </button>
                {isDropdownOpen && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => setIsDropdownOpen(false)} />
                    <div className="absolute top-full left-0 mt-3 w-72 bg-[#1e222d] border border-white/10 rounded-xl shadow-2xl z-50 overflow-hidden">
                      <div className="max-h-80 overflow-y-auto scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent">
                        {TRADING_ASSETS.map(asset => {
                          const isFav = favorites.includes(asset.symbol);
                          return (
                            <div key={asset.symbol} onClick={() => handleSelectAsset(asset)} className={`w-full flex justify-between items-center px-4 py-3 text-sm cursor-pointer hover:bg-[#2A2E39] transition-colors border-b border-white/5 ${selectedAsset.symbol === asset.symbol ? 'bg-blue-600/10 border-l-2 border-l-blue-500' : ''}`}>
                              <div className="flex flex-col items-start"><span className="font-bold text-white flex items-center gap-2">{asset.symbol}<span className="text-[9px] px-1.5 py-0.5 rounded bg-white/5 text-gray-400 uppercase">{asset.type}</span></span></div>
                              <button onClick={(e) => toggleFavorite(e, asset.symbol)} className={`p-1.5 hover:text-yellow-400 transition-colors ${isFav ? 'text-yellow-400' : 'text-gray-600'}`}><Star size={14} fill={isFav ? 'currentColor' : 'none'} /></button>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </>
                )}
              </div>
              <div className="hidden sm:flex flex-col min-w-[100px]">
                {isPriceLoading ? (
                  currentAssetError ? (
                    <div className="flex items-center gap-1 text-xs text-red-400 font-bold" title={currentAssetError}>
                      <AlertTriangle size={12} className="shrink-0" />
                      <span className="truncate max-w-[150px]">{currentAssetError}</span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-1.5 text-xs text-yellow-500 font-bold">
                      <Loader2 size={12} className="animate-spin" /> Fetching...
                    </div>
                  )
                ) : (
                  <span className={`text-lg font-mono font-bold ${priceChange === 'UP' ? 'text-green-500' : 'text-red-500'}`}>${livePrice.toFixed(2)}</span>
                )}
                <span className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">Mark Price</span>
              </div>
            </div>

            <div className="flex gap-4 items-center">
              <button onClick={() => showAlert("Chart indicators, drawing tools, and display themes are managed natively inside the lower TradingView toolbar.", "info", "Technical Analysis Tools")} className="text-gray-500 hover:text-white transition-colors cursor-pointer" title="Chart Settings"><Settings size={18} /></button>
              <button onClick={() => setIsFullscreen(!isFullscreen)} className="text-gray-500 hover:text-white transition-colors cursor-pointer" title={isFullscreen ? "Exit Fullscreen" : "Fullscreen Chart"}>{isFullscreen ? <Minimize2 size={18} /> : <Maximize2 size={18} />}</button>
            </div>
          </div>

          <div className="flex-1 relative w-full h-full rounded-b-2xl overflow-hidden z-10">
            <TradingViewChart key={selectedAsset.symbol} symbol={selectedAsset.symbol} />
          </div>
        </div>

        {/* ORDER PANEL */}
        <OrderPanel 
          selectedAsset={selectedAsset} 
          currentPrice={livePrice || 0} 
          freeMargin={freeMargin} 
          isProcessing={isProcessing} 
          onExecuteOrder={handleExecuteOrder} 
          {...({ showAlert } as any)} // Bypass TS Error for Vercel Build
        />
      </div>

      <div className="bg-[#1e222d] border border-white/5 rounded-2xl shadow-lg overflow-hidden flex flex-col h-[300px]">
        <div className="flex items-center gap-6 px-4 bg-[#131722] border-b border-white/5">
          <button onClick={() => setActiveTab('positions')} className={`py-3 text-sm font-bold transition-colors border-b-2 ${activeTab === 'positions' ? 'border-blue-500 text-white' : 'border-transparent text-gray-500 hover:text-white'}`}>Positions ({activeTrades.length})</button>
          <button onClick={() => setActiveTab('history')} className={`py-3 text-sm font-bold transition-colors border-b-2 ${activeTab === 'history' ? 'border-blue-500 text-white' : 'border-transparent text-gray-500 hover:text-white'}`}>Order History</button>
        </div>

        <div className="flex-1 overflow-auto scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent">
          <table className="w-full text-left text-xs whitespace-nowrap">
            <thead className="sticky top-0 bg-[#1e222d] z-10 shadow-sm border-b border-white/5">
              <tr className="text-gray-500 font-medium">
                <th className="py-3 px-4">Symbol</th>
                <th className="py-3 px-4">Margin Mode</th>
                <th className="py-3 px-4">Size</th>
                <th className="py-3 px-4">Entry Price</th>
                <th className="py-3 px-4">Mark Price</th>
                <th className="py-3 px-4">Est. Liq Price</th>
                <th className="py-3 px-4 w-32">TP/SL</th>
                <th className="py-3 px-4 text-right">PnL (ROE%)</th>
                <th className="py-3 px-4 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="font-mono">
              {activeTab === 'positions' && activeTrades.length === 0 && (
                <tr><td colSpan={9} className="py-12 text-center text-gray-500 font-sans text-sm">No open positions.</td></tr>
              )}

              {activeTab === 'positions' && activeTrades.map((pos) => {
                const isEditing = editPosId === pos.id;
                const isClosing = closingIds.has(pos.id);

                const posMargin = (pos.openPrice * pos.volume) / pos.leverage;
                const roe = (pos.pnl / posMargin) * 100;
                const renderLiqPrice = calculateLiquidationPrice(pos.type, pos.marginMode, pos.openPrice, pos.volume, pos.leverage, freeMargin);

                const estProfit = pos.tp > 0 ? (pos.type === 'BUY' ? (pos.tp - pos.openPrice) * pos.volume : (pos.openPrice - pos.tp) * pos.volume) : 0;
                const estLoss = pos.sl > 0 ? (pos.type === 'BUY' ? (pos.openPrice - pos.sl) * pos.volume : (pos.sl - pos.openPrice) * pos.volume) : 0;

                return (
                  <tr key={pos.id} className={`border-b border-white/5 transition-colors group ${isClosing ? 'opacity-30 bg-red-500/5' : 'hover:bg-white/[0.02]'}`}>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        <div className={`w-1 h-4 rounded-full ${pos.type === 'BUY' ? 'bg-green-500' : 'bg-red-500'}`}></div>
                        <span className="font-bold text-white font-sans">{pos.symbol}</span>
                        <span className={`text-[10px] px-1.5 rounded ${pos.type === 'BUY' ? 'bg-green-500/10 text-green-500' : 'bg-red-500/10 text-red-500'}`}>{pos.leverage}x</span>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-gray-400 font-sans uppercase text-[10px] font-bold">{pos.marginMode || 'CROSS'}</td>
                    <td className={`py-3 px-4 ${pos.type === 'BUY' ? 'text-green-400' : 'text-red-400'}`}>{pos.volume.toFixed(3)}</td>
                    <td className="py-3 px-4 text-gray-300">${pos.openPrice.toFixed(2)}</td>
                    <td className="py-3 px-4 text-gray-300">${pos.currentPrice.toFixed(2)}</td>
                    <td className="py-3 px-4 text-yellow-500">${renderLiqPrice.toFixed(2)}</td>

                    <td className="py-3 px-4 text-gray-300 relative">
                      {isEditing ? (
                        <div className="flex flex-col gap-1">
                          <input type="text" inputMode="decimal" placeholder="TP" value={editTp} onChange={(e) => { if (e.target.value === '' || /^\d*\.?\d*$/.test(e.target.value)) setEditTp(e.target.value); }} className="w-20 bg-[#131722] border border-white/10 rounded px-1.5 py-0.5 text-xs text-white focus:outline-none" />
                          <input type="text" inputMode="decimal" placeholder="SL" value={editSl} onChange={(e) => { if (e.target.value === '' || /^\d*\.?\d*$/.test(e.target.value)) setEditSl(e.target.value); }} className="w-20 bg-[#131722] border border-white/10 rounded px-1.5 py-0.5 text-xs text-white focus:outline-none" />
                          <div className="flex gap-2 mt-1">
                            <button onClick={() => saveEdit(pos)} disabled={isSavingEdit} className="text-green-500 hover:text-green-400"><Check size={14}/></button>
                            <button onClick={() => setEditPosId(null)} className="text-red-500 hover:text-red-400"><CancelIcon size={14}/></button>
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-center gap-3">
                          <div className="flex flex-col text-[10px] whitespace-nowrap">
                            <span className="text-emerald-500 font-medium">TP: {pos.tp ? `$${pos.tp} (+$${estProfit.toFixed(2)})` : '--'}</span>
                            <span className="text-rose-500 font-medium">SL: {pos.sl ? `$${pos.sl} (-$${Math.abs(estLoss).toFixed(2)})` : '--'}</span>
                          </div>
                          <button onClick={() => { setEditPosId(pos.id); setEditSl(pos.sl ? pos.sl.toString() : ''); setEditTp(pos.tp ? pos.tp.toString() : ''); }} className="text-gray-500 hover:text-blue-400 opacity-0 group-hover:opacity-100 transition-opacity"><Edit2 size={12} /></button>
                        </div>
                      )}
                    </td>

                    <td className={`py-3 px-4 text-right font-bold ${pos.pnl >= 0 ? 'text-green-500' :'text-red-500'}`}>
                      <div>{pos.pnl >= 0 ? '+' : ''}${pos.pnl.toFixed(2)} USDT</div>
                      <div className="text-[10px]">{pos.pnl >= 0 ? '+' : ''}{roe.toFixed(2)}%</div>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <button onClick={() => handleClosePosition(pos)} disabled={isClosing} className="px-3 py-1 bg-white/5 hover:bg-red-500/20 text-gray-400 hover:text-red-400 rounded text-xs transition-all disabled:opacity-50">Market Close</button>
                    </td>
                  </tr>
                );
              })}

              {activeTab === 'history' && historyTrades.map((pos) => (
                <tr key={pos.id} className="border-b border-white/5 opacity-70">
                  <td className="py-3 px-4 font-bold text-gray-400">{pos.symbol}</td>
                  <td className="py-3 px-4 uppercase text-[10px] text-gray-500">{pos.marginMode || 'CROSS'}</td>
                  <td className={`py-3 px-4 ${pos.type === 'BUY' ? 'text-green-500/70' : 'text-red-500/70'}`}>{pos.volume.toFixed(3)}</td>
                  <td className="py-3 px-4 text-gray-500">${pos.openPrice.toFixed(2)}</td>
                  <td className="py-3 px-4 text-gray-500">${pos.currentPrice.toFixed(2)}</td>
                  <td className="py-3 px-4 text-gray-600">--</td>
                  <td className="py-3 px-4 text-gray-600">Closed</td>
                  <td className={`py-3 px-4 text-right ${pos.pnl >= 0 ? 'text-green-500/70' : 'text-red-500/70'}`}>{pos.pnl >= 0 ? '+' : ''}${pos.pnl.toFixed(2)} USDT</td>
                  <td className="py-3 px-4 text-center text-gray-600 text-[10px]">{pos.closeTime}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <NotificationModal isOpen={modalConfig.isOpen} onClose={() => setModalConfig(prev => ({ ...prev, isOpen: false }))} title={modalConfig.title} message={modalConfig.message} type={modalConfig.type} />
    </div>
  );
}
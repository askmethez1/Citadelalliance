"use client";

import React, { useState, useMemo } from 'react';
import { Info, AlertTriangle, ChevronDown, ChevronUp, Loader2, Wallet, Gift, CheckCircle2 } from 'lucide-react';

export interface TradingAsset {
  symbol: string;
  name?: string;
}

interface OrderPanelProps {
  selectedAsset: TradingAsset;
  currentPrice: number;
  freeMargin: number;
  walletType: 'REAL' | 'BONUS';
  setWalletType: (type: 'REAL' | 'BONUS') => void;
  isProcessing: boolean;
  onExecuteOrder: (order: {
    type: 'BUY' | 'SELL';
    orderType: 'MARKET' | 'LIMIT' | 'STOP_LIMIT';
    marginMode: 'CROSS' | 'ISOLATED';
    leverage: number;
    size: number;
    limitPrice: number;
    triggerPrice: number;
    sl: number;
    tp: number;
    fee: number;
  }) => void;
}

export default function OrderPanel({
  selectedAsset,
  currentPrice,
  freeMargin,
  walletType,
  setWalletType,
  isProcessing,
  onExecuteOrder
}: OrderPanelProps) {
  // Mode States
  const [marginMode, setMarginMode] = useState<'CROSS' | 'ISOLATED'>('CROSS');
  const [leverage, setLeverage] = useState<number>(10);
  const [orderType, setOrderType] = useState<'MARKET' | 'LIMIT' | 'STOP_LIMIT'>('MARKET');

  // Input States
  const [size, setSize] = useState<string>('0.10');
  const [limitPrice, setLimitPrice] = useState<string>('');
  const [triggerPrice, setTriggerPrice] = useState<string>('');
  const [sl, setSl] = useState<string>('');
  const [tp, setTp] = useState<string>('');
  
  // Mobile / UI state
  const [showDetails, setShowDetails] = useState<boolean>(true);

  const numericSize = useMemo(() => Math.max(0, parseFloat(size) || 0), [size]);
  const assetBaseSymbol = useMemo(() => selectedAsset.symbol.replace(/USD[T]?$/, ''), [selectedAsset.symbol]);

  // Calculations
  const effectivePrice = useMemo(() => {
    if (orderType === 'MARKET') return currentPrice;
    const parsed = parseFloat(limitPrice);
    return parsed > 0 ? parsed : currentPrice;
  }, [orderType, limitPrice, currentPrice]);

  const notionalValue = useMemo(() => numericSize * (effectivePrice || 0), [numericSize, effectivePrice]);
  const requiredMargin = useMemo(() => (effectivePrice > 0 ? notionalValue / leverage : 0), [effectivePrice, notionalValue, leverage]);
  
  // Taker Fee = 0.04%, Maker Fee = 0.02%
  const feeRate = orderType === 'MARKET' ? 0.0004 : 0.0002;
  const estimatedFee = useMemo(() => notionalValue * feeRate, [notionalValue, feeRate]);

  // Expected Payouts (Dynamic for Long & Short)
  const parsedTp = parseFloat(tp) || 0;
  const parsedSl = parseFloat(sl) || 0;

  const expectedProfitLong = parsedTp > effectivePrice ? (parsedTp - effectivePrice) * numericSize : 0;
  const expectedProfitShort = parsedTp > 0 && parsedTp < effectivePrice ? (effectivePrice - parsedTp) * numericSize : 0;

  const expectedLossLong = parsedSl > 0 && parsedSl < effectivePrice ? (effectivePrice - parsedSl) * numericSize : 0;
  const expectedLossShort = parsedSl > effectivePrice ? (parsedSl - effectivePrice) * numericSize : 0;

  // Liquidation Price Projections
  const estLiqLong = effectivePrice > 0 ? effectivePrice * (1 - 1 / leverage + 0.005) : 0;
  const estLiqShort = effectivePrice > 0 ? effectivePrice * (1 + 1 / leverage - 0.005) : 0;

  // Handle Quick Percent Allocation
  const handlePercentClick = (percent: number) => {
    if (!effectivePrice || effectivePrice <= 0) return;
    const availableNotional = freeMargin * leverage * (percent / 100);
    const calculatedSize = availableNotional / effectivePrice;
    setSize(calculatedSize.toFixed(4));
  };

  const handleOrderSubmit = (type: 'BUY' | 'SELL') => {
    onExecuteOrder({
      type,
      orderType,
      marginMode,
      leverage,
      size: numericSize,
      limitPrice: parseFloat(limitPrice) || currentPrice,
      triggerPrice: parseFloat(triggerPrice) || 0,
      sl: parsedSl,
      tp: parsedTp,
      fee: estimatedFee
    });
  };

  const isMarginExceeded = requiredMargin > freeMargin;

  return (
    <div className="w-full lg:w-[360px] h-full max-h-full bg-[#161922] border border-white/10 rounded-2xl p-4 sm:p-5 shadow-2xl flex flex-col shrink-0 text-gray-200 font-sans select-none overflow-hidden min-h-0">
      
      {/* SCROLLABLE INNER CONTAINER */}
      <div className="flex-1 overflow-y-auto pr-1 space-y-4 custom-scrollbar min-h-0">
        
        {/* WALLET SELECTION - CHECKMARK CARDS */}
        <div className="grid grid-cols-2 gap-2 mb-1">
          {/* Real Fund Option */}
          <div 
            onClick={() => setWalletType('REAL')}
            className={`cursor-pointer rounded-xl p-2.5 border transition-all flex items-center justify-between group ${
              walletType === 'REAL' 
                ? 'bg-blue-500/10 border-blue-500/50 shadow-[0_0_15px_rgba(59,130,246,0.1)]' 
                : 'bg-[#0B0E14] border-white/5 hover:border-white/10'
            }`}
          >
            <div className="flex items-center gap-2">
              <div className={`p-1.5 rounded-lg transition-colors ${walletType === 'REAL' ? 'bg-blue-500/20 text-blue-400' : 'bg-white/5 text-gray-500'}`}>
                <Wallet size={14} />
              </div>
              <span className={`text-[10px] font-bold uppercase tracking-wider transition-colors ${walletType === 'REAL' ? 'text-blue-400' : 'text-gray-400'}`}>
                Real Fund
              </span>
            </div>
            {walletType === 'REAL' ? (
              <CheckCircle2 size={16} className="text-blue-500 shrink-0" />
            ) : (
              <div className="w-4 h-4 rounded-full border-2 border-gray-600 group-hover:border-gray-500 shrink-0 transition-colors" />
            )}
          </div>

          {/* Bonus Option */}
          <div 
            onClick={() => setWalletType('BONUS')}
            className={`cursor-pointer rounded-xl p-2.5 border transition-all flex items-center justify-between group ${
              walletType === 'BONUS' 
                ? 'bg-purple-500/10 border-purple-500/50 shadow-[0_0_15px_rgba(168,85,247,0.1)]' 
                : 'bg-[#0B0E14] border-white/5 hover:border-white/10'
            }`}
          >
            <div className="flex items-center gap-2">
              <div className={`p-1.5 rounded-lg transition-colors ${walletType === 'BONUS' ? 'bg-purple-500/20 text-purple-400' : 'bg-white/5 text-gray-500'}`}>
                <Gift size={14} />
              </div>
              <span className={`text-[10px] font-bold uppercase tracking-wider transition-colors ${walletType === 'BONUS' ? 'text-purple-400' : 'text-gray-400'}`}>
                Bonus
              </span>
            </div>
            {walletType === 'BONUS' ? (
              <CheckCircle2 size={16} className="text-purple-500 shrink-0" />
            ) : (
              <div className="w-4 h-4 rounded-full border-2 border-gray-600 group-hover:border-gray-500 shrink-0 transition-colors" />
            )}
          </div>
        </div>

        {/* 1. MARGIN MODE & LEVERAGE SELECTOR */}
        <div className="flex items-center justify-between gap-2 pb-3 border-b border-white/10">
          <div className="bg-[#0f1117] p-1 rounded-xl flex border border-white/5 w-full max-w-[200px]">
            <button 
              onClick={() => setMarginMode('CROSS')}
              className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition-all text-center ${
                marginMode === 'CROSS' 
                  ? 'bg-[#252a37] text-white shadow-md border border-white/10' 
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              Cross
            </button>
            <button 
              onClick={() => setMarginMode('ISOLATED')}
              className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition-all text-center ${
                marginMode === 'ISOLATED' 
                  ? 'bg-[#252a37] text-white shadow-md border border-white/10' 
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              Isolated
            </button>
          </div>

          <div className="flex items-center gap-1.5 bg-[#0f1117] px-3 py-1.5 rounded-xl border border-white/5 shrink-0">
            <span className="text-[11px] text-gray-400 font-medium">Leverage</span>
            <span className="text-xs text-blue-400 font-mono font-bold">{leverage}x</span>
          </div>
        </div>

        {/* 2. LEVERAGE SLIDER */}
        <div className="space-y-2 bg-[#0f1117]/50 p-2.5 rounded-xl border border-white/5">
          <div className="flex justify-between items-center text-[10px] font-semibold text-gray-400">
            <span>1x</span>
            <span className={`flex items-center gap-1 ${leverage > 20 ? 'text-amber-400 font-bold' : 'text-gray-300'}`}>
              {leverage > 20 && <AlertTriangle size={11} className="animate-pulse" />}{' '}
              {leverage}x Leverage
            </span>
            <span>100x</span>
          </div>
          <input 
            type="range" 
            min="1" 
            max="100" 
            value={leverage} 
            onChange={(e) => setLeverage(parseInt(e.target.value))}
            className="w-full h-1.5 bg-gray-800 rounded-lg appearance-none cursor-pointer accent-blue-500 focus:outline-none"
          />
        </div>

        {/* 3. ORDER TYPE TABS */}
        <div className="flex border-b border-white/10">
          {(['MARKET', 'LIMIT', 'STOP_LIMIT'] as const).map((type) => (
            <button 
              key={type}
              onClick={() => setOrderType(type)}
              className={`flex-1 pb-2 text-xs font-semibold transition-all relative ${
                orderType === type 
                  ? 'text-white' 
                  : 'text-gray-400 hover:text-gray-200'
              }`}
            >
              {type === 'STOP_LIMIT' ? 'Stop Limit' : type.charAt(0) + type.slice(1).toLowerCase()}
              {orderType === type && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-500 rounded-full" />
              )}
            </button>
          ))}
        </div>

        {/* 4. FORM INPUTS */}
        <div className="space-y-3">

          {/* STOP LIMIT TRIGGER PRICE */}
          {orderType === 'STOP_LIMIT' && (
            <div className="bg-[#0f1117] border border-white/10 focus-within:border-blue-500/50 rounded-xl p-2.5 flex items-center justify-between transition-colors">
              <span className="text-xs text-gray-400 font-medium">Stop Price</span>
              <div className="flex items-center gap-1.5">
                <input 
                  type="number" 
                  value={triggerPrice} 
                  onChange={(e) => setTriggerPrice(e.target.value)} 
                  placeholder={currentPrice ? currentPrice.toFixed(2) : "0.00"}
                  className="w-28 bg-transparent text-right text-white font-mono text-xs focus:outline-none placeholder:text-gray-600"
                />
                <span className="text-[10px] text-gray-500 font-mono">USDT</span>
              </div>
            </div>
          )}

          {/* LIMIT PRICE */}
          {(orderType === 'LIMIT' || orderType === 'STOP_LIMIT') && (
            <div className="bg-[#0f1117] border border-white/10 focus-within:border-blue-500/50 rounded-xl p-2.5 flex items-center justify-between transition-colors">
              <span className="text-xs text-gray-400 font-medium">Order Price</span>
              <div className="flex items-center gap-1.5">
                <input 
                  type="number" 
                  value={limitPrice} 
                  onChange={(e) => setLimitPrice(e.target.value)} 
                  placeholder={currentPrice ? currentPrice.toFixed(2) : "0.00"}
                  className="w-28 bg-transparent text-right text-white font-mono text-xs focus:outline-none placeholder:text-gray-600"
                />
                <span className="text-[10px] text-gray-500 font-mono">USDT</span>
              </div>
            </div>
          )}

          {/* ORDER SIZE & QUICK SELECTORS */}
          <div className="space-y-1.5">
            <div className="bg-[#0f1117] border border-white/10 focus-within:border-blue-500/50 rounded-xl p-2.5 flex items-center justify-between transition-colors">
              <span className="text-xs text-gray-400 font-medium">Amount</span>
              <div className="flex items-center gap-1.5">
                <input 
                  type="number" 
                  value={size}
                  onChange={(e) => setSize(e.target.value)}
                  placeholder="0.00"
                  step="0.01"
                  className="w-28 bg-transparent text-right text-white font-mono text-xs font-bold focus:outline-none placeholder:text-gray-600"
                />
                <span className="text-[10px] text-blue-400 font-bold font-mono">{assetBaseSymbol}</span>
              </div>
            </div>

            {/* Quick Percentage Buttons */}
            <div className="grid grid-cols-4 gap-1.5">
              {[25, 50, 75, 100].map((pct) => (
                <button
                  key={pct}
                  type="button"
                  onClick={() => handlePercentClick(pct)}
                  className="py-1 text-[10px] font-semibold bg-[#0f1117] hover:bg-[#252a37] text-gray-400 hover:text-white rounded-lg border border-white/5 transition-colors"
                >
                  {pct}%
                </button>
              ))}
            </div>

            <div className="flex justify-between text-[10px] text-gray-500 font-mono px-1">
              <span>Notional Value:</span>
              <span>≈ ${notionalValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USDT</span>
            </div>
          </div>

          {/* TAKE PROFIT & STOP LOSS INPUTS */}
          <div className="grid grid-cols-2 gap-2">
            <div className="bg-[#0f1117] border border-white/10 focus-within:border-emerald-500/50 rounded-xl p-2 flex items-center justify-between transition-colors">
              <span className="text-[10px] text-emerald-400 font-bold">TP</span>
              <input 
                type="number" 
                value={tp}
                onChange={(e) => setTp(e.target.value)}
                placeholder="Target"
                className="w-16 bg-transparent text-right text-white font-mono text-xs focus:outline-none placeholder:text-gray-600"
              />
            </div>
            <div className="bg-[#0f1117] border border-white/10 focus-within:border-rose-500/50 rounded-xl p-2 flex items-center justify-between transition-colors">
              <span className="text-[10px] text-rose-400 font-bold">SL</span>
              <input 
                type="number" 
                value={sl}
                onChange={(e) => setSl(e.target.value)}
                placeholder="Stop"
                className="w-16 bg-transparent text-right text-white font-mono text-xs focus:outline-none placeholder:text-gray-600"
              />
            </div>
          </div>

          {/* METRICS COLLAPSIBLE BREAKDOWN BOX */}
          <div className="bg-[#0f1117] rounded-xl border border-white/5 overflow-hidden text-xs font-mono">
            <button 
              type="button"
              onClick={() => setShowDetails(!showDetails)}
              className="w-full px-3 py-2 flex justify-between items-center text-gray-400 hover:text-white hover:bg-white/[0.02] transition-colors"
            >
              <span className="flex items-center gap-1 text-[11px] font-sans">
                Order Details
                <Info size={11} className="text-gray-500" />
              </span>
              {showDetails ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            </button>

            {showDetails && (
              <div className="px-3 pb-3 space-y-2 pt-1 border-t border-white/5">
                <div className="flex justify-between items-center text-gray-400">
                  <span className="text-[11px] font-sans">Cost (Margin)</span>
                  <span className={`font-bold ${isMarginExceeded ? 'text-rose-400' : 'text-white'}`}>
                    ${requiredMargin.toFixed(2)}
                  </span>
                </div>

                <div className="flex justify-between items-center text-gray-400">
                  <span className="text-[11px] font-sans">Est. Fee ({orderType === 'MARKET' ? '0.04%' : '0.02%'})</span>
                  <span className="text-amber-400 font-medium">${estimatedFee.toFixed(3)}</span>
                </div>

                {/* DYNAMIC PROFIT PREVIEW */}
                {(parsedTp > 0 || parsedSl > 0) && (
                  <>
                    {(expectedProfitLong > 0 || expectedLossLong > 0) && (
                      <div className="flex justify-between items-center text-gray-400">
                        <span className="text-[11px] font-sans">Est. PnL (Long)</span>
                        <span className="text-[11px]">
                          <span className="text-emerald-400">{expectedProfitLong > 0 ? `+$${expectedProfitLong.toFixed(2)}` : '--'}</span> / <span className="text-rose-400">{expectedLossLong > 0 ? `-$${expectedLossLong.toFixed(2)}` : '--'}</span>
                        </span>
                      </div>
                    )}
                    {(expectedProfitShort > 0 || expectedLossShort > 0) && (
                      <div className="flex justify-between items-center text-gray-400">
                        <span className="text-[11px] font-sans">Est. PnL (Short)</span>
                        <span className="text-[11px]">
                          <span className="text-emerald-400">{expectedProfitShort > 0 ? `+$${expectedProfitShort.toFixed(2)}` : '--'}</span> / <span className="text-rose-400">{expectedLossShort > 0 ? `-$${expectedLossShort.toFixed(2)}` : '--'}</span>
                        </span>
                      </div>
                    )}
                  </>
                )}

                <div className="flex justify-between items-center text-gray-400 pt-1 border-t border-white/5">
                  <span className="text-[11px] font-sans text-rose-400/80">Est. Liq (Long/Short)</span>
                  <span className="text-rose-400/90 text-[10px]">
                    ${estLiqLong.toFixed(1)} /${estLiqShort.toFixed(1)}
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* AVAILABLE BALANCE */}
          <div className="flex justify-between items-center text-xs px-1">
            <span className="text-gray-400 font-medium flex items-center gap-1.5">
              Available {walletType === 'BONUS' ? 'Bonus' : 'Margin'}
            </span>
            <span className={`font-mono font-bold ${isMarginExceeded ? 'text-rose-400' : (walletType === 'BONUS' ? 'text-purple-400' : 'text-white')}`}>
              ${freeMargin.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
          </div>

        </div>
      </div>

      {/* FIXED BOTTOM ORDER BUTTONS */}
      <div className="grid grid-cols-2 gap-2.5 pt-3 mt-2 border-t border-white/10 shrink-0 bg-[#161922]">
        <button 
          onClick={() => handleOrderSubmit('BUY')}
          disabled={isProcessing || currentPrice === 0 || isMarginExceeded || numericSize <= 0}
          className="py-2.5 bg-emerald-600 hover:bg-emerald-500 active:scale-[0.98] disabled:opacity-40 disabled:hover:bg-emerald-600 disabled:active:scale-100 text-white rounded-xl font-bold transition-all shadow-lg shadow-emerald-950/40 flex flex-col items-center justify-center relative overflow-hidden"
        >
          {isProcessing ? (
            <Loader2 size={16} className="animate-spin my-1" />
          ) : (
            <>
              <span className="text-xs uppercase tracking-wider">Buy / Long</span>
              <span className="text-[9px] opacity-75 font-mono font-normal">Bullish</span>
            </>
          )}
        </button>
        
        <button 
          onClick={() => handleOrderSubmit('SELL')}
          disabled={isProcessing || currentPrice === 0 || isMarginExceeded || numericSize <= 0}
          className="py-2.5 bg-rose-600 hover:bg-rose-500 active:scale-[0.98] disabled:opacity-40 disabled:hover:bg-rose-600 disabled:active:scale-100 text-white rounded-xl font-bold transition-all shadow-lg shadow-rose-950/40 flex flex-col items-center justify-center relative overflow-hidden"
        >
          {isProcessing ? (
            <Loader2 size={16} className="animate-spin my-1" />
          ) : (
            <>
              <span className="text-xs uppercase tracking-wider">Sell / Short</span>
              <span className="text-[9px] opacity-75 font-mono font-normal">Bearish</span>
            </>
          )}
        </button>
      </div>

    </div>
  );
}
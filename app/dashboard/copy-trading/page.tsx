"use client";

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import Sidebar from '../components/Sidebar';
import TopHeader from '../components/TopHeader';
import DashboardSkeleton from '../components/DashboardSkeleton';
import TradingViewChart from '@/app/components/TradingViewChart';
import NotificationModal, { ModalType } from '@/app/components/ui/NotificationModal';
import Pagination from '@/app/components/ui/Pagination';
import { 
  Users, TrendingUp, TrendingDown, 
  Search, Play, Activity, Loader2, LineChart, Wallet, Calculator, X
} from 'lucide-react';

import { getUserProfile } from '@/app/actions/profile';
import { getCopyTradingData, MasterTraderRecord } from '@/app/actions/copytrading';
import { openTrade } from '@/app/actions/trading';
import { usePricingEngine } from '@/app/hooks/usePricingEngine'; 
import { TRADING_ASSETS } from '@/app/config/assets';

interface ExtendedTrade {
  type: 'LONG' | 'SHORT';
  pair: string;
  leverage: number;
}

interface TraderWithLiveStats extends Omit<MasterTraderRecord, 'activeTrade'> {
  activeTrade: ExtendedTrade;
}

export default function CopyTradingPage() {
  const [sidebarTab, setSidebarTab] = useState('copy-trading');
  const [userCountry, setUserCountry] = useState('Nigeria');
  
  const { getLivePrice } = usePricingEngine();
  
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  const [isLoading, setIsLoading] = useState(true);
  const [processingId, setProcessingId] = useState<number | null>(null);
  
  const [realizedBalance, setRealizedBalance] = useState<number>(0.00);
  const [traders, setTraders] = useState<TraderWithLiveStats[]>([]);
  const [masterEntries, setMasterEntries] = useState<Record<string, number>>({});
  
  const [allocations, setAllocations] = useState<Record<number, string>>({});
  const [takeProfits, setTakeProfits] = useState<Record<number, string>>({});
  const [stopLosses, setStopLosses] = useState<Record<number, string>>({});
  
  const [chartModal, setChartModal] = useState<{ isOpen: boolean; symbol: string }>({ isOpen: false, symbol: '' });

  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<'ALL' | 'LONG' | 'SHORT'>('ALL');
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [totalTraders, setTotalTraders] = useState<number>(0);
  const itemsPerPage = 9;

  const [modalConfig, setModalConfig] = useState<{ isOpen: boolean; title?: string; message: string; type: ModalType; }>({
    isOpen: false, message: '', type: 'info'
  });

  const loadData = async (page: number) => {
    setIsLoading(true);
    const [copyData, profile] = await Promise.all([
      getCopyTradingData(page, itemsPerPage),
      getUserProfile()
    ]);

    if (profile?.country) setUserCountry(profile.country);
    
    if (isInitialLoad) {
      setRealizedBalance(copyData.userBalance);
    }
    
    setTotalTraders(copyData.totalTraders);

    const formattedTraders: TraderWithLiveStats[] = copyData.traders.map((t, index) => {
      const asset = TRADING_ASSETS[index % TRADING_ASSETS.length];
      return {
        ...t,
        activeTrade: {
          ...t.activeTrade,
          pair: asset.symbol,
        }
      };
    });

    setTraders(formattedTraders);
    setIsLoading(false);
    setIsInitialLoad(false);
  };

  useEffect(() => {
    loadData(currentPage);
  }, [currentPage]);

  useEffect(() => {
    traders.forEach(t => {
      if (!masterEntries[t.id]) {
        const livePrice = getLivePrice(t.activeTrade.pair);
        if (livePrice > 0) {
          const offset = t.activeTrade.type === 'LONG' ? 0.998 : 1.002;
          setMasterEntries(prev => ({ ...prev, [t.id]: livePrice * offset }));
        }
      }
    });
  }, [getLivePrice, traders, masterEntries]);

  const showAlert = (message: string, type: ModalType = 'info', title?: string) => {
    setModalConfig({ isOpen: true, message, type, title });
  };

  const executeCopyTrade = async (trader: TraderWithLiveStats) => {
    const livePrice = getLivePrice(trader.activeTrade.pair);
    const requestedAmount = parseFloat(allocations[trader.id] ?? '100');
    
    const tpPrice = parseFloat(takeProfits[trader.id]) || 0;
    const slPrice = parseFloat(stopLosses[trader.id]) || 0;
    const orderType = trader.activeTrade.type === 'LONG' ? 'BUY' : 'SELL';

    if (isNaN(requestedAmount) || requestedAmount < 5) {
      return showAlert("The minimum allocation amount is $5.", "warning", "Invalid Amount");
    }
    if (realizedBalance < requestedAmount) {
      return showAlert(`Insufficient balance. You need $${requestedAmount.toFixed(2)}.`, "error", "Balance Error");
    }
    if (livePrice === 0) {
      return showAlert("Awaiting live market data. Please try again in a few seconds.", "warning", "Fetching Data");
    }

    // Strict Risk Validation
    if (tpPrice > 0) {
      if (orderType === 'BUY' && tpPrice <= livePrice) return showAlert("Take Profit must be higher than current price for LONG positions.", "error");
      if (orderType === 'SELL' && tpPrice >= livePrice) return showAlert("Take Profit must be lower than current price for SHORT positions.", "error");
    }
    if (slPrice > 0) {
      if (orderType === 'BUY' && slPrice >= livePrice) return showAlert("Stop Loss must be lower than current price for LONG positions.", "error");
      if (orderType === 'SELL' && slPrice <= livePrice) return showAlert("Stop Loss must be higher than current price for SHORT positions.", "error");
    }

    setProcessingId(trader.id);

    const volume = (requestedAmount * trader.activeTrade.leverage) / livePrice;
    const fee = requestedAmount * 0.001; // 0.1% execution fee

    const payload = {
      symbol: trader.activeTrade.pair,
      type: orderType,
      orderType: 'MARKET',
      marginMode: 'CROSS',
      leverage: trader.activeTrade.leverage,
      volume: parseFloat(volume.toFixed(5)),
      openPrice: livePrice,
      tp: tpPrice,
      sl: slPrice,
      fee: parseFloat(fee.toFixed(2))
    };

    const res = await openTrade(payload);

    if (res.success && res.ticket) {
      const aiMeta = JSON.parse(localStorage.getItem('ai_copy_meta') || '{}');
      aiMeta[res.ticket] = {
        traderName: trader.name,
        avatar: trader.avatar,
        strategy: trader.strategy,
        allocated: requestedAmount
      };
      localStorage.setItem('ai_copy_meta', JSON.stringify(aiMeta));

      // Lock funds immediately from UI balance
      setRealizedBalance(prev => prev - requestedAmount);
      
      showAlert(
        `Successfully allocated $${requestedAmount.toFixed(2)} to mirror ${trader.name}. View it in Active Trades.`,
        'success',
        'Copy Trade Activated'
      );
      
      // Reset inputs
      setAllocations(prev => ({ ...prev, [trader.id]: '100' }));
      setTakeProfits(prev => ({ ...prev, [trader.id]: '' }));
      setStopLosses(prev => ({ ...prev, [trader.id]: '' }));
    } else {
      showAlert("Execution failed in trading engine. Please try again.", "error");
    }

    setProcessingId(null);
  };

  const totalPages = Math.ceil(totalTraders / itemsPerPage) || 1;
  const filteredTraders = traders.filter(t => t.name.toLowerCase().includes(searchQuery.toLowerCase()) || t.activeTrade.pair.toLowerCase().includes(searchQuery.toLowerCase()));

  if (isInitialLoad) return <DashboardSkeleton activeTab={sidebarTab} location={userCountry} />;

  return (
    <div className="min-h-screen bg-[#0B0E14] text-gray-300 font-sans flex selection:bg-blue-500/30 w-full relative">
      <Sidebar activeTab={sidebarTab} setActiveTab={setSidebarTab} location={userCountry} />

      <main className="flex-1 flex flex-col min-h-screen relative min-w-0 overflow-x-hidden">
        <TopHeader />

        <div className="flex-1 p-4 sm:p-6 lg:p-8 w-full flex flex-col">
          <div className="max-w-7xl mx-auto space-y-8 w-full flex-1 flex flex-col">
            
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/5 pb-6">
              <div>
                <h1 className="text-3xl sm:text-4xl font-extrabold text-white mb-2 tracking-tight flex items-center gap-3">
                  <Users className="text-blue-500" size={32} /> AI Copy-Trading Hub
                </h1>
                <p className="text-gray-400 text-sm">Allocate funds to AI Master Traders. Trades execute instantly and persist securely.</p>
              </div>

              <div className="flex flex-col sm:flex-row items-center gap-4">
                <Link href="/dashboard/copy-trading/active" className="flex items-center gap-2 px-5 py-3 bg-blue-600 hover:bg-blue-500 text-white font-bold text-sm rounded-xl transition-all shadow-lg shadow-blue-600/20 w-full sm:w-auto justify-center">
                  <Activity size={18} /> Active AI Trades
                </Link>
                
                <div className="flex items-center gap-3 bg-[#151924] border border-white/10 px-5 py-3 rounded-xl w-full sm:w-auto">
                  <Wallet size={18} className="text-gray-400" />
                  <div>
                    <div className="text-[10px] text-gray-500 font-bold uppercase">Available Balance</div>
                    <div className="text-sm font-mono font-extrabold text-white">
                      ${realizedBalance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-[#151924] border border-white/5 p-4 rounded-2xl">
              <div className="relative w-full sm:w-96">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500" size={16}/>
                <input 
                  type="text" 
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search Master Trader or Pair..." 
                  className="w-full bg-[#0B0E14] border border-white/10 rounded-xl py-2.5 pl-10 pr-4 text-xs text-white focus:outline-none focus:border-blue-500 transition-colors"
                />
              </div>

              <div className="flex items-center gap-2 w-full sm:w-auto">
                {(['ALL', 'LONG', 'SHORT'] as const).map(type => (
                  <button
                    key={type}
                    onClick={() => setFilterType(type)}
                    className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                      filterType === type 
                        ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20' 
                        : 'bg-[#0B0E14] border border-white/10 text-gray-400 hover:text-white'
                    }`}
                  >
                    {type}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex-1 flex flex-col justify-center min-h-[40vh]">
              {isLoading ? (
                <div className="flex flex-col items-center justify-center py-20 w-full gap-3 text-blue-500">
                  <Loader2 className="w-6 h-6 animate-spin" />
                  <span className="text-sm font-medium text-gray-400">Loading Market Data...</span>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {filteredTraders.map((trader) => {
                    const livePrice = getLivePrice(trader.activeTrade.pair);
                    const isPriceReady = livePrice > 0;
                    
                    return (
                      <div key={trader.id} className="bg-[#151924] border border-white/5 hover:border-white/20 rounded-3xl p-6 shadow-xl transition-all flex flex-col justify-between">
                        <div>
                          <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center gap-3">
                              <img src={trader.avatar} alt={trader.name} className="w-12 h-12 rounded-2xl bg-[#0B0E14] border border-white/10 p-1" />
                              <div>
                                <h3 className="text-base font-bold text-white flex items-center gap-1.5">{trader.name}</h3>
                                <p className="text-[10px] text-blue-400 font-bold uppercase">{trader.strategy}</p>
                              </div>
                            </div>
                            <span className={`text-xs font-mono font-bold px-2.5 py-1 rounded-lg ${trader.activeTrade.type === 'LONG' ? 'bg-green-500/10 text-green-400 border border-green-500/20' : 'bg-red-500/10 text-red-400 border border-red-500/20'}`}>
                              {trader.activeTrade.type} {trader.activeTrade.leverage}x
                            </span>
                          </div>

                          <div className="bg-[#0B0E14] border border-white/5 rounded-xl p-3 mb-4 space-y-2">
                            <div className="flex items-center justify-between font-mono text-xs">
                              <span className="text-white font-bold">{trader.activeTrade.pair}</span>
                              <span className="text-gray-300">Mark: ${livePrice > 0 ? livePrice.toFixed(2) : '---'}</span>
                            </div>
                            <div className="flex items-center justify-between text-[10px] text-gray-500 font-mono">
                              <span>Win Rate: <b className="text-green-400">{trader.winRate}%</b></span>
                              <span>ROI: <b className="text-blue-400">+{trader.monthlyReturn}%/mo</b></span>
                            </div>
                          </div>
                        </div>

                        <div className="space-y-3">
                          <div className="bg-[#0B0E14] border border-white/5 p-3 rounded-xl space-y-3">
                            <div className="flex items-center justify-between">
                              <span className="text-[11px] text-gray-500 font-bold ml-1 uppercase">Allocation</span>
                              <div className="relative w-28">
                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-xs font-bold">$</span>
                                <input
                                  type="number"
                                  min="5"
                                  value={allocations[trader.id] !== undefined ? allocations[trader.id] : '100'}
                                  onChange={(e) => setAllocations(prev => ({ ...prev, [trader.id]: e.target.value }))}
                                  className="w-full bg-[#151924] border border-white/10 rounded-lg py-1.5 pl-6 pr-3 text-white text-xs font-mono focus:outline-none focus:border-blue-500 transition-colors"
                                />
                              </div>
                            </div>
                            
                            <div className="grid grid-cols-2 gap-2 border-t border-white/5 pt-3">
                              <div>
                                <span className="text-[10px] text-gray-500 font-bold ml-1 uppercase block mb-1">Take Profit</span>
                                <input
                                  type="number"
                                  placeholder="Price (Opt)"
                                  value={takeProfits[trader.id] || ''}
                                  onChange={(e) => setTakeProfits(prev => ({ ...prev, [trader.id]: e.target.value }))}
                                  className="w-full bg-[#151924] border border-white/10 rounded-lg py-1.5 px-3 text-emerald-400 placeholder:text-gray-600 text-xs font-mono focus:outline-none focus:border-blue-500 transition-colors"
                                />
                              </div>
                              <div>
                                <span className="text-[10px] text-gray-500 font-bold ml-1 uppercase block mb-1">Stop Loss</span>
                                <input
                                  type="number"
                                  placeholder="Price (Opt)"
                                  value={stopLosses[trader.id] || ''}
                                  onChange={(e) => setStopLosses(prev => ({ ...prev, [trader.id]: e.target.value }))}
                                  className="w-full bg-[#151924] border border-white/10 rounded-lg py-1.5 px-3 text-rose-400 placeholder:text-gray-600 text-xs font-mono focus:outline-none focus:border-blue-500 transition-colors"
                                />
                              </div>
                            </div>
                          </div>

                          <button
                            onClick={() => executeCopyTrade(trader)}
                            disabled={!isPriceReady || processingId === trader.id}
                            className="w-full py-3 bg-white text-black hover:bg-gray-200 rounded-xl text-xs font-bold transition-all shadow-lg flex items-center justify-center gap-2 disabled:opacity-50"
                          >
                            {processingId === trader.id ? (
                              <><Loader2 size={14} className="animate-spin" /> Executing Trade...</>
                            ) : !isPriceReady ? (
                              <><Loader2 size={14} className="animate-spin" /> Fetching Market Price...</>
                            ) : (
                              <><Play size={14} /> Allocate & Start Copying</>
                            )}
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {!isLoading && filteredTraders.length > 0 && (
              <Pagination
                currentPage={currentPage}
                totalPages={totalPages}
                onPageChange={setCurrentPage}
                totalItems={totalTraders}
                itemsPerPage={itemsPerPage}
                itemLabel="Traders"
                className="bg-[#151924] border border-white/5 rounded-2xl p-4 mt-auto"
              />
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
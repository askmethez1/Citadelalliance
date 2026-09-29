"use client";

import React, { useState } from 'react';
import { UserPlus } from 'lucide-react';
import { createMasterTraderAdmin } from '@/app/actions/admin';
import { ModalType } from '@/app/components/ui/NotificationModal';

interface TradersTabProps {
  showAlert: (message: string, type: ModalType, title?: string) => void;
}

export default function TradersTab({ showAlert }: TradersTabProps) {
  const [traderForm, setTraderForm] = useState({
    name: '', strategy: 'Neural HFT', winRate: '88.5',
    totalProfit: '50000', monthlyReturn: '22.4',
    activePair: 'BTC/USDT', tradeType: 'LONG', leverage: 20
  });

  const handleCreateTrader = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await createMasterTraderAdmin({
      ...traderForm,
      winRate: parseFloat(traderForm.winRate),
      totalProfit: parseFloat(traderForm.totalProfit),
      monthlyReturn: parseFloat(traderForm.monthlyReturn),
      leverage: Number(traderForm.leverage)
    });
    if (res.success) {
      showAlert(res.message, 'success', 'Master Trader Added');
      setTraderForm({
        name: '', strategy: 'Neural HFT', winRate: '88.5',
        totalProfit: '50000', monthlyReturn: '22.4',
        activePair: 'BTC/USDT', tradeType: 'LONG', leverage: 20
      });
    } else {
      showAlert(res.message, 'error', 'Error Creating Trader');
    }
  };

  return (
    <div className="bg-[#151924] border border-white/5 rounded-3xl p-6 sm:p-8 shadow-xl max-w-2xl space-y-6">
      <div className="border-b border-white/5 pb-4">
        <h3 className="text-lg font-bold text-white flex items-center gap-2">
          <UserPlus size={20} className="text-blue-400" /> Register Master AI Trader
        </h3>
        <p className="text-xs text-gray-400 mt-0.5">Publish a new algorithm to the 24/7 AI Copy-Trading Hub.</p>
      </div>

      <form onSubmit={handleCreateTrader} className="space-y-4 text-xs font-sans">
        <div>
          <label className="text-gray-400 font-bold block mb-1">Trader / AI Name</label>
          <input 
            type="text" 
            placeholder="e.g. Apex Quant Bot" 
            value={traderForm.name} 
            onChange={e => setTraderForm({...traderForm, name: e.target.value})}
            className="w-full bg-[#0B0E14] border border-white/10 rounded-xl p-3 text-sm text-white focus:outline-none focus:border-blue-500" 
            required 
          />
        </div>

        <div>
          <label className="text-gray-400 font-bold block mb-1">Trading Strategy</label>
          <input 
            type="text" 
            placeholder="e.g. Neural High-Freq Arbitrage" 
            value={traderForm.strategy} 
            onChange={e => setTraderForm({...traderForm, strategy: e.target.value})}
            className="w-full bg-[#0B0E14] border border-white/10 rounded-xl p-3 text-sm text-white focus:outline-none focus:border-blue-500" 
            required 
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-gray-400 font-bold block mb-1">Historical Win Rate (%)</label>
            <input 
              type="number" step="any" 
              value={traderForm.winRate} 
              onChange={e => setTraderForm({...traderForm, winRate: e.target.value})}
              className="w-full bg-[#0B0E14] border border-white/10 rounded-xl p-3 text-sm text-white focus:outline-none focus:border-blue-500" 
              required 
            />
          </div>
          <div>
            <label className="text-gray-400 font-bold block mb-1">Monthly Return PnL (%)</label>
            <input 
              type="number" step="any" 
              value={traderForm.monthlyReturn} 
              onChange={e => setTraderForm({...traderForm, monthlyReturn: e.target.value})}
              className="w-full bg-[#0B0E14] border border-white/10 rounded-xl p-3 text-sm text-white focus:outline-none focus:border-blue-500" 
              required 
            />
          </div>
        </div>

        <button 
          type="submit" 
          className="w-full py-3.5 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl text-xs transition-all shadow-lg shadow-blue-600/20 mt-2"
        >
          Publish Master Trader to Database
        </button>
      </form>
    </div>
  );
}
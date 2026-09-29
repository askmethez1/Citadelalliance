"use client";

import React, { useState, useEffect } from 'react';
import Sidebar from '../components/Sidebar';
import TopHeader from '../components/TopHeader';
import DashboardSkeleton from '../components/DashboardSkeleton';
import NotificationModal, { ModalType } from '@/app/components/ui/NotificationModal';
import Pagination from '@/app/components/ui/Pagination'; // Imported Pagination
import { 
  Wallet, ArrowDownLeft, ArrowUpRight, Copy, Check, 
  ShieldCheck, AlertCircle, History, Loader2 
} from 'lucide-react';

import { 
  getTransactionHistory, 
  createWithdrawalRequest, 
  TransactionRecord 
} from '@/app/actions/wallet';
import { getUserProfile } from '@/app/actions/profile';
import { getSystemAddresses } from '@/app/actions/admin'; 
import { useWalletEngine } from '@/app/hooks/useWalletEngine';

type TabType = 'deposit' | 'withdraw';

interface DepositMethod {
  symbol: string;
  name: string;
  networks: { name: string; address: string; minDeposit: string }[];
}

export default function WalletPage() {
  const [sidebarTab, setSidebarTab] = useState('wallet');
  const [activeAction, setActiveAction] = useState<TabType>('deposit');
  
  // Hook into Central Balance Engine
  const { balance, liveEquity, lockedMargin, marginUtilized, isWalletLoading, refreshWallet } = useWalletEngine();

  // Local Page States
  const [isLoading, setIsLoading] = useState(true);
  const [userCountry, setUserCountry] = useState<string>('Nigeria');
  const [transactions, setTransactions] = useState<TransactionRecord[]>([]);

  // Database System Addresses
  const [sysAddresses, setSysAddresses] = useState({ BTC: '', ETH: '', USDT_TRC20: '' });

  // Selection & Form States
  const [selectedAssetSymbol, setSelectedAssetSymbol] = useState<string>('USDT');
  const [selectedNetworkIndex, setSelectedNetworkIndex] = useState<number>(0);
  const [copied, setCopied] = useState(false);
  const [withdrawAddress, setWithdrawAddress] = useState('');
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // Modal Notification State
  const [modalConfig, setModalConfig] = useState<{
    isOpen: boolean;
    title?: string;
    message: string;
    type: ModalType;
  }>({
    isOpen: false,
    message: '',
    type: 'info'
  });

  const loadData = async () => {
    setIsLoading(true);
    const [profile, txs, addresses] = await Promise.all([
      getUserProfile(),
      getTransactionHistory(),
      getSystemAddresses()
    ]);

    if (profile?.country) {
      setUserCountry(profile.country);
    }
    if (addresses) {
      setSysAddresses(addresses);
    }
    
    setTransactions(txs);
    setIsLoading(false);
  };

  useEffect(() => {
    loadData();
  }, []);

  const showAlert = (message: string, type: ModalType = 'info', title?: string) => {
    setModalConfig({ isOpen: true, message, type, title });
  };

  // Dynamically build the deposit methods based on the admin's database configuration
  const DEPOSIT_METHODS: DepositMethod[] = [
    {
      symbol: "USDT",
      name: "Tether USD",
      networks: [
        { name: "TRC20 (Tron)", address: sysAddresses.USDT_TRC20 || "Contact Support for Address", minDeposit: "10 USDT" },
      ]
    },
    {
      symbol: "BTC",
      name: "Bitcoin",
      networks: [
        { name: "Bitcoin Network", address: sysAddresses.BTC || "Contact Support for Address", minDeposit: "0.0005 BTC" }
      ]
    },
    {
      symbol: "ETH",
      name: "Ethereum",
      networks: [
        { name: "ERC20 (Ethereum)", address: sysAddresses.ETH || "Contact Support for Address", minDeposit: "0.01 ETH" }
      ]
    }
  ];

  // Resolve current active asset and network
  const activeAsset = DEPOSIT_METHODS.find(m => m.symbol === selectedAssetSymbol) || DEPOSIT_METHODS[0];
  const activeNetwork = activeAsset.networks[selectedNetworkIndex] || activeAsset.networks[0];

  const copyAddress = () => {
    navigator.clipboard.writeText(activeNetwork.address);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    showAlert("Deposit address copied to clipboard.", "info", "Address Copied");
  };

  const handleWithdrawalSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const amountNum = parseFloat(withdrawAmount);

    if (!withdrawAddress || withdrawAddress.length < 10) {
      showAlert("Please enter a valid destination wallet address.", "warning", "Invalid Address");
      return;
    }

    if (!amountNum || amountNum <= 0) {
      showAlert("Please enter a valid withdrawal amount.", "warning", "Invalid Amount");
      return;
    }

    if (amountNum > balance) {
      showAlert("Insufficient available account balance. Note: Locked margin cannot be withdrawn.", "error", "Insufficient Funds");
      return;
    }

    setIsSubmitting(true);

    const result = await createWithdrawalRequest({
      asset: activeAsset.symbol,
      network: activeNetwork.name,
      address: withdrawAddress,
      amount: amountNum
    });

    setIsSubmitting(false);

    if (result.success) {
      setWithdrawAddress('');
      setWithdrawAmount('');
      showAlert(result.message, "success", "Withdrawal Queued");
      loadData(); // Refresh transaction log
      refreshWallet(); // Instantly update global balance across the dashboard
      setCurrentPage(1); // Automatically jump back to page 1 to see the new transaction
    } else {
      showAlert(result.message, "error", "Transaction Failed");
    }
  };

  // --- Pagination Logic Calculations ---
  const totalPages = Math.ceil(transactions.length / itemsPerPage);
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentTransactions = transactions.slice(indexOfFirstItem, indexOfLastItem);

  // Render Skeleton until both the profile data and wallet engine have initialized
  if (isLoading || isWalletLoading) {
    return <DashboardSkeleton activeTab={sidebarTab} location={userCountry} />;
  }

  return (
    <div className="min-h-screen bg-[#0B0E14] text-gray-300 font-sans flex selection:bg-blue-500/30 w-full relative">
      <Sidebar activeTab={sidebarTab} setActiveTab={setSidebarTab} location={userCountry} />

      <main className="flex-1 flex flex-col min-h-screen relative min-w-0 overflow-x-hidden">
        <TopHeader />

        <div className="flex-1 p-4 sm:p-6 lg:p-8 w-full">
          <div className="max-w-6xl mx-auto space-y-8">
            
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h1 className="text-3xl sm:text-4xl font-extrabold text-white mb-2 tracking-tight flex items-center gap-3">
                  <Wallet className="text-blue-500" size={32} /> Treasury & Wallet
                </h1>
                <p className="text-gray-400 text-sm">Real-time balances and verified database transactions.</p>
              </div>

              <div className="flex items-center gap-2 bg-[#151924] border border-white/10 p-1.5 rounded-2xl shrink-0">
                <button
                  onClick={() => setActiveAction('deposit')}
                  className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold transition-all ${
                    activeAction === 'deposit' 
                      ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20' 
                      : 'text-gray-400 hover:text-white'
                  }`}
                >
                  <ArrowDownLeft size={16} /> Deposit
                </button>
                <button
                  onClick={() => setActiveAction('withdraw')}
                  className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold transition-all ${
                    activeAction === 'withdraw' 
                      ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20' 
                      : 'text-gray-400 hover:text-white'
                  }`}
                >
                  <ArrowUpRight size={16} /> Withdraw
                </button>
              </div>
            </div>

            {/* SYNCHRONIZED BALANCE CARDS */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="bg-[#151924] border border-white/5 rounded-2xl p-6 shadow-xl relative overflow-hidden">
                <div className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Total Net Equity</div>
                <div className="text-3xl font-mono font-extrabold text-white mb-2">
                  ${liveEquity.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </div>
                <div className="text-xs text-gray-400">Balance + Open Margin + Live PnL</div>
              </div>

              <div className="bg-[#151924] border border-white/5 rounded-2xl p-6 shadow-xl relative overflow-hidden">
                <div className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Available Balance</div>
                <div className="text-3xl font-mono font-extrabold text-blue-400 mb-2">
                  ${balance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </div>
                <div className="text-xs text-gray-400">Ready for withdrawal or trading</div>
              </div>

              <div className="bg-[#151924] border border-white/5 rounded-2xl p-6 shadow-xl relative overflow-hidden">
                <div className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">In Open Positions</div>
                <div className="text-3xl font-mono font-extrabold text-gray-400 mb-2">
                  ${lockedMargin.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </div>
                <div className="text-xs text-gray-500">Margin utilization: {marginUtilized.toFixed(1)}%</div>
              </div>
            </div>

            {/* ACTION DESK */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              
              <div className="lg:col-span-2">
                {activeAction === 'deposit' ? (
                  <div className="bg-[#151924] border border-white/5 rounded-3xl p-6 sm:p-8 shadow-xl space-y-6">
                    <div className="border-b border-white/5 pb-4">
                      <h3 className="text-xl font-bold text-white flex items-center gap-2">
                        <ArrowDownLeft size={20} className="text-green-400" /> Crypto Deposit
                      </h3>
                      <p className="text-xs text-gray-400 mt-1">Select asset and send funds to your allocated deposit address.</p>
                    </div>

                    <div className="space-y-2">
                      <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">1. Select Asset</label>
                      <div className="grid grid-cols-3 gap-3">
                        {DEPOSIT_METHODS.map((method) => (
                          <button
                            key={method.symbol}
                            onClick={() => {
                              setSelectedAssetSymbol(method.symbol);
                              setSelectedNetworkIndex(0);
                            }}
                            className={`p-3.5 rounded-2xl border flex items-center justify-center gap-2 font-bold text-sm transition-all ${
                              activeAsset.symbol === method.symbol
                                ? 'border-blue-500 bg-blue-500/10 text-white'
                                : 'border-white/10 bg-[#0B0E14] text-gray-400 hover:text-white'
                            }`}
                          >
                            <span>{method.symbol}</span>
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">2. Deposit Network</label>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {activeAsset.networks.map((net, idx) => (
                          <button
                            key={net.name}
                            onClick={() => setSelectedNetworkIndex(idx)}
                            className={`p-3.5 rounded-2xl border text-left transition-all ${
                              selectedNetworkIndex === idx
                                ? 'border-blue-500 bg-blue-500/10 text-white'
                                : 'border-white/10 bg-[#0B0E14] text-gray-400 hover:text-white'
                            }`}
                          >
                            <p className="text-sm font-bold">{net.name}</p>
                            <p className="text-[10px] text-gray-500 mt-0.5">Min deposit: {net.minDeposit}</p>
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* QR Code removed, full-width address section */}
                    <div className="bg-[#0B0E14] border border-white/5 rounded-2xl p-6">
                      <div className="space-y-4">
                        <div>
                          <p className="text-xs font-bold text-gray-500 uppercase">Deposit Address ({activeNetwork.name})</p>
                          <div className="flex items-center gap-2 mt-1.5 bg-[#151924] border border-white/10 px-4 py-3.5 rounded-xl">
                            <input 
                              type="text" 
                              readOnly 
                              value={activeNetwork.address} 
                              className="bg-transparent font-mono text-sm text-white flex-1 focus:outline-none truncate"
                            />
                            <button 
                              onClick={copyAddress}
                              className="text-blue-400 hover:text-blue-300 shrink-0 p-1.5 rounded-lg hover:bg-white/5 transition-colors"
                            >
                              {copied ? <Check size={18} className="text-green-400" /> : <Copy size={18} />}
                            </button>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 text-xs text-yellow-500/90 bg-yellow-500/10 border border-yellow-500/20 p-3 rounded-xl">
                          <AlertCircle size={16} className="shrink-0" />
                          <span>Send only <b>{activeAsset.symbol}</b> to this network address.</span>
                        </div>
                      </div>
                    </div>

                  </div>
                ) : (
                  <div className="bg-[#151924] border border-white/5 rounded-3xl p-6 sm:p-8 shadow-xl space-y-6">
                    <div className="border-b border-white/5 pb-4">
                      <h3 className="text-xl font-bold text-white flex items-center gap-2">
                        <ArrowUpRight size={20} className="text-blue-400" /> Withdrawal Desk
                      </h3>
                      <p className="text-xs text-gray-400 mt-1">Submit an outbound transfer request to your wallet.</p>
                    </div>

                    <form onSubmit={handleWithdrawalSubmit} className="space-y-5">
                      <div className="space-y-2">
                        <div className="flex justify-between items-center text-xs">
                          <label className="font-bold text-gray-500 uppercase">Select Asset</label>
                          <span className="text-gray-400">Available: <b className="text-white font-mono">${balance.toFixed(2)}</b></span>
                        </div>
                        <select 
                          value={activeAsset.symbol}
                          onChange={(e) => {
                            const found = DEPOSIT_METHODS.find(m => m.symbol === e.target.value);
                            if (found) {
                              setSelectedAssetSymbol(found.symbol);
                              setSelectedNetworkIndex(0);
                            }
                          }}
                          className="w-full bg-[#0B0E14] border border-white/10 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-blue-500"
                        >
                          {DEPOSIT_METHODS.map(m => (
                            <option key={m.symbol} value={m.symbol}>{m.symbol} - {m.name}</option>
                          ))}
                        </select>
                      </div>

                      <div className="space-y-2">
                        <label className="text-xs font-bold text-gray-500 uppercase">Withdrawal Network</label>
                        <select 
                          value={selectedNetworkIndex}
                          onChange={(e) => setSelectedNetworkIndex(Number(e.target.value))}
                          className="w-full bg-[#0B0E14] border border-white/10 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-blue-500"
                        >
                          {activeAsset.networks.map((net, idx) => (
                            <option key={net.name} value={idx}>{net.name}</option>
                          ))}
                        </select>
                      </div>

                      <div className="space-y-2">
                        <label className="text-xs font-bold text-gray-500 uppercase">Destination Wallet Address</label>
                        <input 
                          type="text" 
                          placeholder={`Paste ${activeAsset.symbol} (${activeNetwork.name}) address`}
                          value={withdrawAddress}
                          onChange={(e) => setWithdrawAddress(e.target.value)}
                          className="w-full bg-[#0B0E14] border border-white/10 rounded-xl px-4 py-3 text-white text-sm font-mono focus:outline-none focus:border-blue-500"
                          required
                        />
                      </div>

                      <div className="space-y-2">
                        <div className="flex justify-between items-center text-xs">
                          <label className="font-bold text-gray-500 uppercase">Amount (USD)</label>
                          <button 
                            type="button" 
                            onClick={() => setWithdrawAmount(balance.toString())}
                            className="text-blue-400 hover:underline font-bold"
                          >
                            Use Max
                          </button>
                        </div>
                        <div className="relative">
                          <input 
                            type="number" 
                            step="any"
                            placeholder="0.00"
                            value={withdrawAmount}
                            onChange={(e) => setWithdrawAmount(e.target.value)}
                            className="w-full bg-[#0B0E14] border border-white/10 rounded-xl px-4 py-3 pr-16 text-white font-mono text-sm focus:outline-none focus:border-blue-500"
                            required
                          />
                          <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-bold text-gray-500">USD</span>
                        </div>
                      </div>

                      <button 
                        type="submit"
                        disabled={isSubmitting}
                        className="w-full py-4 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white rounded-xl font-bold text-sm transition-all shadow-lg shadow-blue-600/20 flex items-center justify-center gap-2"
                      >
                        {isSubmitting ? (
                          <>
                            <Loader2 className="w-4 h-4 animate-spin" />
                            Executing Transaction...
                          </>
                        ) : 'Confirm Withdrawal'}
                      </button>
                    </form>
                  </div>
                )}
              </div>

              <div className="space-y-6">
                <div className="bg-[#151924] border border-white/5 rounded-3xl p-6 shadow-xl">
                  <h4 className="text-base font-bold text-white mb-4 flex items-center gap-2">
                    <ShieldCheck size={18} className="text-blue-400" /> Vault Guarantee
                  </h4>
                  <ul className="space-y-3 text-xs text-gray-400 leading-relaxed">
                    <li className="flex items-start gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-blue-500 mt-1 shrink-0" />
                      All transactions are audited directly in Neon Postgres.
                    </li>
                  </ul>
                </div>
              </div>

            </div>

            {/* REAL TRANSACTION TABLE */}
            <div className="bg-[#151924] border border-white/5 rounded-3xl p-6 sm:p-8 shadow-xl">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  <History size={20} className="text-blue-400" />  Transaction History
                </h3>
              </div>

              <div className="overflow-x-auto">
                {transactions.length === 0 ? (
                  <div className="text-center py-12 border border-dashed border-white/5 rounded-2xl text-gray-500 text-sm">
                    No transactions recorded yet in the database.
                  </div>
                ) : (
                  <>
                    <table className="w-full text-left border-collapse mb-6">
                      <thead>
                        <tr className="border-b border-white/5 text-xs uppercase tracking-wider text-gray-500 bg-[#0B0E14]/40">
                          <th className="p-4 font-semibold">Reference ID</th>
                          <th className="p-4 font-semibold">Type & Asset</th>
                          <th className="p-4 font-semibold">Amount</th>
                          <th className="p-4 font-semibold">Date</th>
                          <th className="p-4 font-semibold text-right">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/5 text-sm font-sans">
                        {currentTransactions.map((tx) => (
                          <tr key={tx.id} className="hover:bg-white/[0.02] transition-colors">
                            <td className="p-4 font-mono text-xs text-gray-400">{tx.id}</td>
                            <td className="p-4">
                              <p className="font-bold text-white">{tx.type}</p>
                              <p className="text-[10px] text-gray-500">{tx.asset}</p>
                            </td>
                            <td className={`p-4 font-mono font-bold text-xs ${tx.type === 'Deposit' ? 'text-green-400' : 'text-white'}`}>
                              {tx.amount}
                            </td>
                            <td className="p-4 text-xs font-mono text-gray-400">{tx.created_at}</td>
                            <td className="p-4 text-right">
                              <span className={`inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-1 rounded-md border ${
                                tx.status === 'Completed' 
                                  ? 'text-green-400 bg-green-500/10 border-green-500/20' 
                                  : 'text-yellow-400 bg-yellow-500/10 border-yellow-500/20'
                              }`}>
                                {tx.status}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>

                    {/* PAGINATION COMPONENT */}
                    {totalPages > 1 && (
                      <div className="mt-6 pt-4 border-t border-white/5">
                        <Pagination 
                          currentPage={currentPage}
                          totalPages={totalPages}
                          onPageChange={setCurrentPage}
                          totalItems={transactions.length}
                          itemsPerPage={itemsPerPage}
                          itemLabel="transactions"
                        />
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>

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
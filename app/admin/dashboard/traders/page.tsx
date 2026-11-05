"use client";

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { UserPlus, Upload, Dices, Trash2, Users, Loader2, Eraser, AlertTriangle } from 'lucide-react';
import {
  createMasterTraderAdmin,
  getMasterTradersAdmin,
  deleteMasterTraderAdmin,
  removeDuplicateTradersAdmin,
  AdminTrader,
} from '@/app/actions/admin';
import NotificationModal, { ModalType } from '@/app/components/ui/NotificationModal';

const AVATAR_PRESETS: string[] = [
  ...['Apex', 'Nova', 'Blaze', 'Zen'].map(s => `https://api.dicebear.com/7.x/fun-emoji/svg?seed=${s}`),
  ...['Titan', 'Orion', 'Cipher', 'Vortex'].map(s => `https://api.dicebear.com/7.x/bottts/svg?seed=${s}`),
  ...['Aria', 'Kai', 'Luna', 'Rex'].map(s => `https://api.dicebear.com/7.x/lorelei/svg?seed=${s}`),
];

interface StrategyProfile {
  name: string;
  summary: string;
  frequency: string;
  holding: string;
  risk: 'Low' | 'Medium' | 'High';
  leverage: [number, number];
  winRate: [number, number];
  monthlyReturn: [number, number];
  behavior: string;
}

const STRATEGIES: StrategyProfile[] = [
  {
    name: 'Neural HFT',
    summary: 'AI models scalp tiny price moves at very high speed.',
    frequency: '50+ trades per day',
    holding: 'Seconds to minutes',
    risk: 'Medium',
    leverage: [10, 25],
    winRate: [85, 95],
    monthlyReturn: [15, 30],
    behavior: 'Opens and closes a large number of small positions. Profit per trade is tiny, so results come from volume and a high win rate. Equity curve is smooth with small, frequent gains.',
  },
  {
    name: 'Macro Swing',
    summary: 'Rides multi-day trends driven by news and market cycles.',
    frequency: '3 to 10 trades per week',
    holding: 'Days to weeks',
    risk: 'Medium',
    leverage: [3, 10],
    winRate: [55, 70],
    monthlyReturn: [8, 20],
    behavior: 'Waits for a clear directional move, then holds through short-term noise. Fewer trades, larger wins, and occasional losing streaks while it waits for the trend to play out.',
  },
  {
    name: 'Grid Arbitrage',
    summary: 'Places buy and sell orders in a price range and profits from sideways movement.',
    frequency: '20 to 60 trades per day',
    holding: 'Minutes to hours',
    risk: 'Medium',
    leverage: [3, 10],
    winRate: [75, 90],
    monthlyReturn: [10, 25],
    behavior: 'Buys dips and sells bounces inside a range, collecting small steady gains. Performs best in choppy markets and can draw down when price breaks out of the range in one direction.',
  },
  {
    name: 'Momentum Scalper',
    summary: 'Jumps on breakouts and fast moves, exits quickly.',
    frequency: '15 to 40 trades per day',
    holding: 'Minutes',
    risk: 'High',
    leverage: [20, 50],
    winRate: [60, 75],
    monthlyReturn: [20, 40],
    behavior: 'Enters when price accelerates and leaves as soon as momentum fades. Higher leverage means bigger swings: strong months can be very good, bad stretches cut deeper.',
  },
  {
    name: 'Mean Reversion',
    summary: 'Bets that stretched prices snap back toward their average.',
    frequency: '5 to 15 trades per day',
    holding: 'Hours',
    risk: 'Medium',
    leverage: [5, 15],
    winRate: [65, 80],
    monthlyReturn: [10, 22],
    behavior: 'Sells overextended rallies and buys sharp drops. Wins often but small, and a strong one-way trend can produce a few larger losses before it stops out.',
  },
  {
    name: 'Trend Following',
    summary: 'Follows established trends and stays in until they reverse.',
    frequency: '1 to 5 trades per day',
    holding: 'Hours to days',
    risk: 'Low',
    leverage: [3, 8],
    winRate: [45, 60],
    monthlyReturn: [6, 16],
    behavior: 'Low win rate but winners run much longer than losers. Equity grows in steps during trending markets and stays flat when the market moves sideways.',
  },
];

const CUSTOM = 'Custom';

const riskColor = (r: string) =>
  r === 'High' ? 'text-red-400' : r === 'Low' ? 'text-green-400' : 'text-yellow-400';

const pick = <T,>(arr: T[]) => arr[Math.floor(Math.random() * arr.length)];
const between = (min: number, max: number, d = 1) => Number((Math.random() * (max - min) + min).toFixed(d));
const mid = (r: [number, number]) => ((r[0] + r[1]) / 2).toFixed(1);

const emptyForm = () => ({
  name: '', strategy: STRATEGIES[0].name, winRate: '88.5',
  totalProfit: '50000', monthlyReturn: '22.4',
  leverage: 20,
  avatar: AVATAR_PRESETS[0],
});

const fileToAvatar = (file: File): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Could not read file'));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error('Invalid image'));
      img.onload = () => {
        const size = 256;
        const canvas = document.createElement('canvas');
        canvas.width = size; canvas.height = size;
        const ctx = canvas.getContext('2d')!;
        const s = Math.min(img.width, img.height);
        ctx.drawImage(img, (img.width - s) / 2, (img.height - s) / 2, s, s, 0, 0, size, size);
        resolve(canvas.toDataURL('image/jpeg', 0.85));
      };
      img.src = reader.result as string;
    };
    reader.readAsDataURL(file);
  });

const inputCls = "w-full bg-[#0B0E14] border border-white/10 rounded-xl p-3 text-sm text-white focus:outline-none focus:border-blue-500";

export default function TradersTab() {
  const [modalConfig, setModalConfig] = useState<{ isOpen: boolean; title?: string; message: string; type: ModalType }>({
    isOpen: false, message: '', type: 'info'
  });

  const [confirmConfig, setConfirmConfig] = useState<{ isOpen: boolean; title: string; message: string; onConfirm: () => void }>({
    isOpen: false, title: '', message: '', onConfirm: () => {}
  });

  const showAlert = (message: string, type: ModalType = 'info', title?: string) =>
    setModalConfig({ isOpen: true, message, type, title });

  const [traderForm, setTraderForm] = useState(emptyForm());
  const [strategyChoice, setStrategyChoice] = useState<string>(STRATEGIES[0].name);
  const [submitting, setSubmitting] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const [traders, setTraders] = useState<AdminTrader[]>([]);
  const [listLoading, setListLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [cleaning, setCleaning] = useState(false);

  const set = (patch: Partial<ReturnType<typeof emptyForm>>) =>
    setTraderForm(prev => ({ ...prev, ...patch }));

  const profile = STRATEGIES.find(s => s.name === strategyChoice) || null;

  const loadTraders = useCallback(async () => {
    setListLoading(true);
    try {
      setTraders(await getMasterTradersAdmin());
    } catch {
      showAlert('Could not load traders.', 'error', 'Load Failed');
    } finally {
      setListLoading(false);
    }
  }, []);

  useEffect(() => { loadTraders(); }, [loadTraders]);

  const chooseStrategy = (name: string) => {
    setStrategyChoice(name);
    if (name === CUSTOM) set({ strategy: '' });
    else set({ strategy: name });
  };

  const applyTypicalSettings = () => {
    if (!profile) return;
    set({
      winRate: mid(profile.winRate),
      monthlyReturn: mid(profile.monthlyReturn),
      leverage: Math.round((profile.leverage[0] + profile.leverage[1]) / 2),
    });
  };

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) return showAlert('Please choose an image file.', 'warning', 'Invalid File');
    try {
      set({ avatar: await fileToAvatar(file) });
    } catch {
      showAlert('Could not process that image.', 'error', 'Upload Failed');
    }
    e.target.value = '';
  };

  const randomizeStats = () => {
    const s = pick(STRATEGIES);
    setStrategyChoice(s.name);
    set({
      strategy: s.name,
      winRate: String(between(s.winRate[0], s.winRate[1])),
      monthlyReturn: String(between(s.monthlyReturn[0], s.monthlyReturn[1])),
      totalProfit: String(Math.round(between(15000, 250000, 0) / 100) * 100),
      leverage: Math.round(between(s.leverage[0], s.leverage[1], 0)),
    });
  };

  const handleCreateTrader = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting) return;
    if (!traderForm.strategy.trim()) return showAlert('Enter a strategy name.', 'warning', 'Strategy Required');
    setSubmitting(true);
    try {
      const res = await createMasterTraderAdmin({
        name: traderForm.name,
        strategy: traderForm.strategy,
        winRate: parseFloat(traderForm.winRate),
        totalProfit: parseFloat(traderForm.totalProfit),
        monthlyReturn: parseFloat(traderForm.monthlyReturn),
        leverage: Number(traderForm.leverage),
        avatar: traderForm.avatar,
      });
      if (res.success) {
        showAlert(res.message, 'success', 'Master Trader Added');
        setTraderForm(emptyForm());
        setStrategyChoice(STRATEGIES[0].name);
        loadTraders();
      } else {
        showAlert(res.message, 'error', 'Error Creating Trader');
      }
    } catch {
      showAlert('Unexpected error. Please try again.', 'error', 'Error Creating Trader');
    } finally {
      setSubmitting(false);
    }
  };

  const requestDelete = (t: AdminTrader) => {
    if (deletingId !== null) return;
    const warn = t.activeCopies > 0
      ? `\n\n${t.activeCopies} user(s) currently have an active copy position on this trader. Their funds stay safe and they can still close the position, but the trader card will disappear.`
      : '';

    setConfirmConfig({
      isOpen: true,
      title: 'Confirm Deletion',
      message: `Are you sure you want to delete "${t.name}" from the Copy Trading Plaza?${warn}`,
      onConfirm: async () => {
        setConfirmConfig(prev => ({ ...prev, isOpen: false }));
        setDeletingId(t.id);
        try {
          const res = await deleteMasterTraderAdmin(t.id);
          if (res.success) {
            setTraders(prev => prev.filter(x => x.id !== t.id));
            showAlert(`"${t.name}" was deleted.`, 'success', 'Trader Deleted');
          } else {
            showAlert(res.message, 'error', 'Delete Failed');
          }
        } catch {
          showAlert('Unexpected error. Please try again.', 'error', 'Delete Failed');
        } finally {
          setDeletingId(null);
        }
      }
    });
  };

  const requestRemoveDuplicates = () => {
    if (cleaning) return;
    setConfirmConfig({
      isOpen: true,
      title: 'Remove Duplicates',
      message: 'Keep the oldest trader for each name and delete the repeats? Active copies are moved onto the one that is kept.',
      onConfirm: async () => {
        setConfirmConfig(prev => ({ ...prev, isOpen: false }));
        setCleaning(true);
        try {
          const res = await removeDuplicateTradersAdmin();
          showAlert(res.message, res.success ? 'success' : 'error', res.success ? 'Cleanup Complete' : 'Cleanup Failed');
          loadTraders();
        } catch {
          showAlert('Unexpected error. Please try again.', 'error', 'Cleanup Failed');
        } finally {
          setCleaning(false);
        }
      }
    });
  };

  const hasDuplicates = new Set(traders.map(t => t.name.trim().toLowerCase())).size < traders.length;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start w-full max-w-7xl mx-auto">
      {/* ---------- CREATE FORM ---------- */}
      <div className="bg-[#151924] border border-white/5 rounded-3xl p-6 sm:p-8 shadow-xl space-y-6">
        <div className="border-b border-white/5 pb-4 flex items-start justify-between gap-3">
          <div>
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <UserPlus size={20} className="text-blue-400" /> Register Master AI
            </h3>
            <p className="text-xs text-gray-400 mt-0.5">Publish a new algorithm to the Hub.</p>
          </div>
          <button type="button" onClick={randomizeStats}
            className="shrink-0 flex items-center gap-1.5 px-3 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-xs font-bold text-white transition-colors">
            <Dices size={14} /> Randomize
          </button>
        </div>

        <form onSubmit={handleCreateTrader} className="space-y-5 text-xs font-sans">
          {/* Avatar */}
          <div>
            <label className="text-gray-400 font-bold block mb-2">Trader Photo</label>
            <div className="flex items-center gap-4 mb-3">
              <img src={traderForm.avatar} alt="preview"
                className="w-16 h-16 rounded-2xl bg-[#0B0E14] border border-white/10 p-1 object-cover"/>
              <div className="flex flex-col gap-2">
                <button type="button" onClick={() => fileRef.current?.click()}
                  className="flex items-center gap-2 px-3 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-white font-bold transition-colors">
                  <Upload size={14} /> Upload image
                </button>
                <span className="text-[10px] text-gray-500">or pick one below</span>
              </div>
              <input ref={fileRef} type="file" accept="image/*" onChange={handleUpload} className="hidden" />
            </div>
            <div className="grid grid-cols-6 gap-2">
              {AVATAR_PRESETS.map(url => (
                <button type="button" key={url} onClick={() => set({ avatar: url })}
                  className={`rounded-xl p-1 bg-[#0B0E14] border transition-all ${
                    traderForm.avatar === url ? 'border-blue-500 ring-2 ring-blue-500/40' : 'border-white/10 hover:border-white/30'
                  }`}>
                  <img src={url} alt="" className="w-full aspect-square object-cover rounded-lg" />
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="text-gray-400 font-bold block mb-1">Trader / AI Name</label>
            <input type="text" placeholder="e.g. Apex Quant Bot" value={traderForm.name}
              onChange={e => set({ name: e.target.value })} className={inputCls} required />
          </div>

          {/* Strategy dropdown */}
          <div>
            <label className="text-gray-400 font-bold block mb-1">Trading Strategy</label>
            <select value={strategyChoice} onChange={e => chooseStrategy(e.target.value)} className={inputCls}>
              {STRATEGIES.map(s => <option key={s.name} value={s.name}>{s.name}</option>)}
              <option value={CUSTOM}>Custom (type your own)</option>
            </select>

            {strategyChoice === CUSTOM && (
              <input type="text" placeholder="e.g. Neural High-Freq Arbitrage" value={traderForm.strategy}
                onChange={e => set({ strategy: e.target.value })} className={`${inputCls} mt-2`} required />
            )}

            {profile && (
              <div className="mt-3 bg-[#0B0E14] border border-white/10 rounded-xl p-4 space-y-3">
                <p className="text-sm text-white font-bold">{profile.summary}</p>
                <p className="text-gray-400 leading-relaxed">{profile.behavior}</p>
                <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-[11px]">
                  <div><span className="text-gray-500">Trade frequency</span><div className="text-white font-bold">{profile.frequency}</div></div>
                  <div><span className="text-gray-500">Holding time</span><div className="text-white font-bold">{profile.holding}</div></div>
                  <div><span className="text-gray-500">Risk</span><div className={`font-bold ${riskColor(profile.risk)}`}>{profile.risk}</div></div>
                  <div><span className="text-gray-500">Typical leverage</span><div className="text-white font-bold">{profile.leverage[0]}x to {profile.leverage[1]}x</div></div>
                  <div><span className="text-gray-500">Typical win rate</span><div className="text-white font-bold">{profile.winRate[0]}% to {profile.winRate[1]}%</div></div>
                  <div><span className="text-gray-500">Typical monthly return</span><div className="text-white font-bold">{profile.monthlyReturn[0]}% to {profile.monthlyReturn[1]}%</div></div>
                </div>
                <button type="button" onClick={applyTypicalSettings}
                  className="px-3 py-2 bg-blue-600/20 hover:bg-blue-600/30 border border-blue-500/40 text-blue-300 font-bold rounded-lg mt-1 w-full text-center transition-colors">
                  Use typical settings for this strategy
                </button>
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-gray-400 font-bold block mb-1">Historical Win Rate (%)</label>
              <input type="number" step="any" value={traderForm.winRate}
                onChange={e => set({ winRate: e.target.value })} className={inputCls} required />
            </div>
            <div>
              <label className="text-gray-400 font-bold block mb-1">Monthly Return PnL (%)</label>
              <input type="number" step="any" value={traderForm.monthlyReturn}
                onChange={e => set({ monthlyReturn: e.target.value })} className={inputCls} required />
            </div>
            <div>
              <label className="text-gray-400 font-bold block mb-1">Total Profit ($)</label>
              <input type="number" step="any" value={traderForm.totalProfit}
                onChange={e => set({ totalProfit: e.target.value })} className={inputCls} required />
            </div>
            <div>
              <label className="text-gray-400 font-bold block mb-1">Leverage (x)</label>
              <input type="number" min={1} max={125} value={traderForm.leverage}
                onChange={e => set({ leverage: Number(e.target.value) })} className={inputCls} required />
            </div>
          </div>

          <button type="submit" disabled={submitting}
            className="w-full py-3.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-bold rounded-xl text-xs transition-all shadow-lg shadow-blue-600/20 mt-2">
            {submitting ? 'Publishing...' : 'Publish Master Trader to Database'}
          </button>
        </form>
      </div>

      {/* ---------- PUBLISHED TRADERS LIST ---------- */}
      <div className="bg-[#151924] border border-white/5 rounded-3xl p-6 sm:p-8 shadow-xl flex flex-col max-h-[850px]">
        <div className="border-b border-white/5 pb-4 flex items-start justify-between gap-3 shrink-0">
          <div>
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <Users size={20} className="text-blue-400" /> Published Traders
              <span className="text-xs font-mono text-gray-400">({traders.length})</span>
            </h3>
            <p className="text-xs text-gray-400 mt-0.5">Currently visible in Plaza.</p>
          </div>
          {hasDuplicates && (
            <button type="button" onClick={requestRemoveDuplicates} disabled={cleaning}
              className="shrink-0 flex items-center gap-1.5 px-3 py-2 bg-yellow-500/10 hover:bg-yellow-500/20 border border-yellow-500/40 rounded-xl text-xs font-bold text-yellow-300 disabled:opacity-50 transition-colors">
              {cleaning ? <Loader2 size={14} className="animate-spin" /> : <Eraser size={14} />} Remove duplicates
            </button>
          )}
        </div>

        <div className="mt-5 overflow-y-auto pr-1 flex-1 custom-scrollbar">
          {listLoading ? (
            <div className="flex items-center justify-center py-10 gap-2 text-blue-500">
              <Loader2 className="w-5 h-5 animate-spin" />
              <span className="text-xs text-gray-400">Loading traders...</span>
            </div>
          ) : traders.length === 0 ? (
            <p className="text-xs text-gray-500 text-center py-10">No traders published yet.</p>
          ) : (
            <ul className="space-y-3 pb-2">
              {traders.map(t => (
                <li key={t.id} className="flex items-center gap-3 bg-[#0B0E14] border border-white/5 rounded-2xl p-3">
                  <img src={t.avatar} alt={t.name}
                    className="w-12 h-12 rounded-xl bg-[#151924] border border-white/10 p-1 object-cover shrink-0" />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-white truncate">{t.name}</span>
                      <span className="text-[10px] font-mono text-gray-500">#{t.id}</span>
                    </div>
                    <div className="text-[10px] text-gray-400 font-bold uppercase truncate">{t.strategy}</div>
                    <div className="flex flex-wrap items-center gap-2 mt-1 text-[10px] font-mono">
                      <span className="px-1.5 py-0.5 rounded-md font-bold bg-blue-500/15 text-blue-400">
                        {t.leverage}x Lev
                      </span>
                      <span className="text-gray-400">Win {t.winRate}%</span>
                      <span className="text-gray-400">{t.activeCopies} active cop{t.activeCopies === 1 ? 'y' : 'ies'}</span>
                    </div>
                  </div>
                  <button type="button" onClick={() => requestDelete(t)} disabled={deletingId !== null}
                    aria-label={`Delete ${t.name}`}
                    className="shrink-0 p-2.5 bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 text-red-400 rounded-xl disabled:opacity-50 transition-colors">
                    {deletingId === t.id ? <Loader2 size={16} className="animate-spin" /> : <Trash2 size={16} />}
                  </button>
                </li>
              ))}
            </ul>
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

      {/* Confirmation Modal overlay */}
      {confirmConfig.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-[#151924] border border-white/10 rounded-2xl p-6 max-w-md w-full shadow-2xl animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-red-500/20 flex items-center justify-center shrink-0">
                <AlertTriangle className="text-red-400 w-5 h-5" />
              </div>
              <h3 className="text-lg font-bold text-white">{confirmConfig.title}</h3>
            </div>
            <p className="text-sm text-gray-300 mb-6 whitespace-pre-wrap leading-relaxed">
              {confirmConfig.message}
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setConfirmConfig(prev => ({ ...prev, isOpen: false }))}
                className="px-4 py-2.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-white font-bold text-xs transition-colors">
                Cancel
              </button>
              <button
                onClick={confirmConfig.onConfirm}
                className="px-4 py-2.5 bg-red-600 hover:bg-red-500 text-white font-bold rounded-xl text-xs shadow-lg shadow-red-600/20 transition-colors">
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
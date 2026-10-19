// PATH: app/dashboard/components/BonusCard.tsx

"use client";

import React, { useState } from 'react';
import Link from 'next/link';
import { Gift, CheckCircle2, Loader2, Lock, ArrowUpRight } from 'lucide-react';
import { claimSignupBonus, transferBonusToReal } from '@/app/actions/wallet';
import type { ModalType } from '@/app/components/ui/NotificationModal';

export const BONUS_CONFIG = {
  amount: 100,            // bonus credited on claim
  requiredBalance: 1000,  // REQUIRED WALLET BALANCE to claim
  unlockThreshold: 1000,  // UPDATED: bonus balance needed before it can be moved to real funds
};

type Notify = (message: string, type?: ModalType, title?: string) => void;

const fmt = (n: number) =>
  n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

/* ------------------------------------------------------------------ */
/* 1. CLAIM BANNER  (dashboard home)                                   */
/* ------------------------------------------------------------------ */
interface BonusClaimBannerProps {
  hasClaimed: boolean;
  currentBalance: number;      // Accepts current wallet balance
  onClaimed: () => void;
  notify: Notify;
}

export function BonusClaimBanner({ hasClaimed, currentBalance, onClaimed, notify }: BonusClaimBannerProps) {
  const [isClaiming, setIsClaiming] = useState(false);

  if (hasClaimed) return null;

  const { amount, requiredBalance } = BONUS_CONFIG;
  const eligible = currentBalance >= requiredBalance;
  const progress = Math.min((currentBalance / requiredBalance) * 100, 100);
  const remaining = Math.max(requiredBalance - currentBalance, 0);

  const handleClaim = async () => {
    if (!eligible || isClaiming) return;
    setIsClaiming(true);
    try {
      const res = await claimSignupBonus();
      if (res.success) {
        onClaimed();
        notify(res.message, 'success', 'Bonus Claimed!');
      } else {
        notify(res.message, 'error', 'Claim Failed');
      }
    } catch {
      notify('An error occurred while claiming your bonus.', 'error');
    } finally {
      setIsClaiming(false);
    }
  };

  return (
    <div className="w-full rounded-2xl bg-gradient-to-r from-purple-900/40 via-purple-800/20 to-[#0B0E14] border border-purple-500/30 p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
      <div className="flex items-start sm:items-center gap-3 sm:gap-4 w-full sm:w-auto min-w-0 flex-1">
        <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-purple-500/20 flex items-center justify-center text-purple-400 shrink-0">
          {eligible ? <Gift size={20} /> : <Lock size={20} />}
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="text-white font-bold text-base sm:text-lg">
            {eligible ? `Claim your $${amount} Bonus` : `Unlock your $${amount} Bonus`}
          </h3>
          <p className="text-xs text-gray-400 mt-0.5">
            {eligible
              ? 'Balance requirement met. Trade with bonus funds and multiply it to unlock withdrawals.'
              : `Hold a balance of at least $${requiredBalance.toLocaleString()} to unlock. $${fmt(remaining)} to go.`}
          </p>

          {!eligible && (
            <div className="mt-3 max-w-md">
              <div className="flex justify-between text-[10px] font-mono text-gray-500 mb-1">
                <span>{"$"}{fmt(currentBalance)}</span>
                <span>{"$"}{requiredBalance.toLocaleString()}</span>
              </div>
              <div className="w-full h-1.5 bg-white/5 rounded-full overflow-hidden">
                <div
                  className="h-full bg-purple-500 rounded-full transition-all"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
          )}
        </div>
      </div>

      {eligible ? (
        <button
          onClick={handleClaim}
          disabled={isClaiming}
          className="shrink-0 w-full sm:w-auto px-6 py-3 bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-colors"
        >
          {isClaiming ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle2 size={16} />}
          Claim {"$"}{amount}
        </button>
      ) : (
        <Link
          href="/dashboard/wallet"
          className="shrink-0 w-full sm:w-auto px-6 py-3 bg-white/10 hover:bg-white/20 text-white rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-colors"
        >
          Deposit Now <ArrowUpRight size={16} />
        </Link>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* 2. BONUS BALANCE CARD  (wallet page)                                */
/* ------------------------------------------------------------------ */
interface BonusBalanceCardProps {
  bonusBalance: number;
  onTransferred: () => void;
  notify: Notify;
}

export function BonusBalanceCard({ bonusBalance, onTransferred, notify }: BonusBalanceCardProps) {
  const [isTransferring, setIsTransferring] = useState(false);
  const { unlockThreshold } = BONUS_CONFIG;

  const handleTransfer = async () => {
    if (bonusBalance < unlockThreshold) {
      notify(
        `Bonus must be traded to reach at least $${fmt(unlockThreshold)} to unlock withdrawal. Current bonus: $${fmt(bonusBalance)}.`,
        'warning',
        'Unlock Condition Not Met'
      );
      return;
    }
    setIsTransferring(true);
    const res = await transferBonusToReal();
    setIsTransferring(false);

    if (res.success) {
      notify(res.message, 'success', 'Bonus Unlocked!');
      onTransferred();
    } else {
      notify(res.message, 'error', 'Transfer Failed');
    }
  };

  return (
    <div className="bg-[#151924] border border-purple-500/30 rounded-2xl p-5 sm:p-6 shadow-xl relative overflow-hidden group">
      <div className="absolute top-0 right-0 w-24 h-24 bg-purple-500/5 rounded-full blur-2xl group-hover:bg-purple-500/10 transition-colors" />
      <div className="text-[11px] font-bold text-purple-500/70 uppercase tracking-wider mb-2 flex items-center gap-1.5">
        <Gift size={12} className="text-purple-400" /> Trading Bonus
      </div>
      <div className="text-xl sm:text-2xl font-mono font-extrabold text-purple-400 mb-2 truncate">
        {"$"}{fmt(bonusBalance)}
      </div>
      <div className="flex justify-between items-center mt-1 relative z-10">
        <span className="text-[10px] text-gray-400">Trade to {"$"}{unlockThreshold} to withdraw</span>
        {bonusBalance > 0 && (
          <button
            onClick={handleTransfer}
            disabled={isTransferring}
            className="bg-purple-500/20 hover:bg-purple-500/40 border border-purple-500/30 text-purple-300 text-[10px] font-bold px-2.5 py-1 rounded-lg transition-colors flex items-center gap-1 disabled:opacity-50"
          >
            {isTransferring && <Loader2 size={10} className="animate-spin" />}
            Unlock
          </button>
        )}
      </div>
    </div>
  );
}
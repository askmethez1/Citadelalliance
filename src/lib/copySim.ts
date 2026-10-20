// PATH: app/lib/copySim.ts
// Single source of truth for the copy-trading simulation.
// NOTE: no "use server" here, so it can be imported by client components AND server actions.

export const SIM_RATE_PER_CYCLE = 0.5;            // 50% per 24h cycle
export const CYCLE_MS = 24 * 60 * 60 * 1000;      // 24h cycle

export interface TradeStats {
  profit: number;
  progressPercent: number;
  formattedTimer: string;
  currentCycleNumber: number;
  msRemaining: number;
}

// Uncapped: profit keeps scaling every cycle; the timer just resets every 24h.
export function getTradeStats(allocated: number, startTimestamp: number, now: number): TradeStats {
  const msPassed = Math.max(now - startTimestamp, 0);
  const cyclesPassed = msPassed / CYCLE_MS;
  const currentCycleNumber = Math.floor(cyclesPassed) + 1;
  const profit = allocated * SIM_RATE_PER_CYCLE * cyclesPassed;

  const currentCycleMsPassed = msPassed % CYCLE_MS;
  const progressPercent = (currentCycleMsPassed / CYCLE_MS) * 100;
  const msRemaining = Math.max(CYCLE_MS - currentCycleMsPassed, 0);

  const hours = Math.floor(msRemaining / 3_600_000);
  const minutes = Math.floor((msRemaining % 3_600_000) / 60_000);
  const seconds = Math.floor((msRemaining % 60_000) / 1000);
  const pad = (n: number) => String(n).padStart(2, '0');

  return {
    profit,
    progressPercent,
    formattedTimer: `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`,
    currentCycleNumber,
    msRemaining,
  };
}

export function calcProfit(allocated: number, startTimestamp: number, now: number): number {
  return getTradeStats(allocated, startTimestamp, now).profit;
}

// Same mark/volume the user sees on their card
export function getVolumeAndMark(
  allocated: number,
  leverage: number,
  entryPrice: number,
  isLong: boolean,
  profit: number
) {
  const volume = entryPrice > 0 ? (allocated * leverage) / entryPrice : 0;
  const delta = volume > 0 ? profit / volume : 0;
  const mark = isLong ? entryPrice + delta : Math.max(entryPrice - delta, 0);
  return { volume, mark };
}
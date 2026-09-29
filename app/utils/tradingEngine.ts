// app/utils/tradingEngine.ts

export const MAINTENANCE_MARGIN_RATE = 0.005; // 0.5%
export const TAKER_FEE_RATE = 0.0004;         // 0.04%
export const MAKER_FEE_RATE = 0.0002;         // 0.02%
export const MAX_TICK_ANOMALY = 0.15;         // Ignore sudden 15% price ticks

export function calculatePnL(type: 'BUY' | 'SELL', entryPrice: number, currentPrice: number, volume: number): number {
  if (type === 'BUY') {
    return (currentPrice - entryPrice) * volume;
  } else {
    return (entryPrice - currentPrice) * volume;
  }
}

export function calculateLiquidationPrice(
  type: 'BUY' | 'SELL',
  marginMode: 'CROSS' | 'ISOLATED',
  entryPrice: number,
  volume: number,
  leverage: number,
  freeMargin: number
): number {
  const notional = entryPrice * volume;
  const maintenanceMargin = notional * MAINTENANCE_MARGIN_RATE;
  let liqPrice = 0;

  if (marginMode === 'ISOLATED') {
    const isolatedMargin = notional / leverage;
    liqPrice = type === 'BUY' 
      ? entryPrice - (isolatedMargin - maintenanceMargin) / volume
      : entryPrice + (isolatedMargin - maintenanceMargin) / volume;
  } else {
    liqPrice = type === 'BUY' 
      ? entryPrice - (freeMargin / volume)
      : entryPrice + (freeMargin / volume);
  }

  return Math.max(0, liqPrice);
}

export function validateOrderRisk(
  type: 'BUY' | 'SELL',
  entryPrice: number,
  tp: number,
  sl: number,
  liqPrice: number
): { isValid: boolean; error: string | null; errorTitle: string | null } {
  if (type === 'BUY') {
    if (tp > 0 && tp <= entryPrice) return { isValid: false, error: "Take Profit must be strictly ABOVE your Entry Price for Long positions.", errorTitle: "Invalid Take Profit" };
    if (sl > 0 && sl >= entryPrice) return { isValid: false, error: "Stop Loss must be strictly BELOW your Entry Price for Long positions.", errorTitle: "Invalid Stop Loss" };
    if (sl > 0 && sl <= liqPrice) return { isValid: false, error: `Stop Loss ($${sl}) cannot be placed beyond the Liquidation Price ($${liqPrice.toFixed(2)}). You will be liquidated first.`, errorTitle: "Risk Engine Rejection" };
  } else {
    if (tp > 0 && tp >= entryPrice) return { isValid: false, error: "Take Profit must be strictly BELOW your Entry Price for Short positions.", errorTitle: "Invalid Take Profit" };
    if (sl > 0 && sl <= entryPrice) return { isValid: false, error: "Stop Loss must be strictly ABOVE your Entry Price for Short positions.", errorTitle: "Invalid Stop Loss" };
    if (sl > 0 && sl >= liqPrice) return { isValid: false, error: `Stop Loss ($${sl}) cannot be placed beyond the Liquidation Price ($${liqPrice.toFixed(2)}). You will be liquidated first.`, errorTitle: "Risk Engine Rejection" };
  }

  return { isValid: true, error: null, errorTitle: null };
}

export function evaluateTradeClosure(
  type: 'BUY' | 'SELL',
  tickPrice: number,
  entryPrice: number,
  tp: number,
  sl: number,
  liqPrice: number
): { shouldClose: boolean; reason: string } {
  // Flash-crash anomaly protection
  if (Math.abs(tickPrice - entryPrice) / entryPrice > MAX_TICK_ANOMALY) {
    return { shouldClose: false, reason: '' };
  }

  if (type === 'BUY') {
    if (tickPrice <= liqPrice) return { shouldClose: true, reason: `Margin Call: Liquidated at $${tickPrice.toFixed(2)}` };
    if (tp > entryPrice && tickPrice >= tp) return { shouldClose: true, reason: `Take Profit Triggered at $${tp.toFixed(2)}` };
    if (sl > 0 && sl < entryPrice && tickPrice <= sl) return { shouldClose: true, reason: `Stop Loss Triggered at $${sl.toFixed(2)}` };
  } else {
    if (tickPrice >= liqPrice) return { shouldClose: true, reason: `Margin Call: Liquidated at $${tickPrice.toFixed(2)}` };
    if (tp > 0 && tp < entryPrice && tickPrice <= tp) return { shouldClose: true, reason: `Take Profit Triggered at $${tp.toFixed(2)}` };
    if (sl > entryPrice && tickPrice >= sl) return { shouldClose: true, reason: `Stop Loss Triggered at $${sl.toFixed(2)}` };
  }

  return { shouldClose: false, reason: '' };
}
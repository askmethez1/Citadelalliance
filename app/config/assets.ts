export interface TradingAsset {
  symbol: string;
  name: string;
  type: 'crypto' | 'stock';
}

export const TRADING_ASSETS: TradingAsset[] = [
  // Crypto
  { symbol: 'BTCUSD', name: 'Bitcoin', type: 'crypto' },
  { symbol: 'ETHUSD', name: 'Ethereum', type: 'crypto' },
  { symbol: 'SOLUSD', name: 'Solana', type: 'crypto' },
  { symbol: 'BNBUSD', name: 'Binance Coin', type: 'crypto' },
  { symbol: 'XRPUSD', name: 'Ripple', type: 'crypto' },
  { symbol: 'DOGEUSD', name: 'Dogecoin', type: 'crypto' },
  { symbol: 'AVAXUSD', name: 'Avalanche', type: 'crypto' },
  // Stocks
  { symbol: 'SPY', name: 'S&P 500 ETF', type: 'stock' },
  { symbol: 'QQQ', name: 'Invesco QQQ', type: 'stock' },
  { symbol: 'VOO', name: 'Vanguard 500', type: 'stock' },
  { symbol: 'AAPL', name: 'Apple Inc.', type: 'stock' },
  { symbol: 'NVDA', name: 'NVIDIA Corp.', type: 'stock' },
  { symbol: 'MSFT', name: 'Microsoft', type: 'stock' },
  { symbol: 'AMZN', name: 'Amazon', type: 'stock' },
  { symbol: 'TSLA', name: 'Tesla Inc.', type: 'stock' },
  { symbol: 'META', name: 'Meta Platforms', type: 'stock' },
  { symbol: 'IBIT', name: 'iShares Bitcoin Trust', type: 'stock' },
  { symbol: 'ETHA', name: 'iShares Ethereum Trust', type: 'stock' },
];
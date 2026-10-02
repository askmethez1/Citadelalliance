import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

const CRYPTO_SYMBOLS = ['BTC', 'ETH', 'SOL', 'BNB', 'XRP', 'DOGE', 'AVAX'];
const STOCK_SYMBOLS = ['SPY', 'QQQ', 'VOO', 'AAPL', 'NVDA', 'MSFT', 'AMZN', 'TSLA', 'META', 'IBIT', 'ETHA'];

// Map internal symbols to CoinGecko IDs
const CG_MAP: Record<string, string> = {
  'BTC': 'bitcoin',
  'ETH': 'ethereum',
  'SOL': 'solana',
  'BNB': 'binancecoin',
  'XRP': 'ripple',
  'DOGE': 'dogecoin',
  'AVAX': 'avalanche-2',
};

export async function GET() {
  const prices: Record<string, number> = {};
  
  const cgKey = process.env.NEXT_PUBLIC_COINGECKO_API_KEY;
  const cryptoKey = process.env.NEXT_PUBLIC_CRYPTO_API_KEY;
  const finnhubKey = process.env.NEXT_PUBLIC_FINNHUB_API_KEY;

  let cryptoFetched = false;

  // 1. SERVER-SIDE FETCH: CRYPTO (Primary: CoinGecko)
  try {
    const cgIds = Object.values(CG_MAP).join(',');
    const cgUrl = `https://api.coingecko.com/api/v3/simple/price?ids=${cgIds}&vs_currencies=usd`;
    
    const headers: Record<string, string> = {};
    if (cgKey) headers['x-cg-demo-api-key'] = cgKey;

    const res = await fetch(cgUrl, { headers, cache: 'no-store' });
    
    if (res.ok) {
      const data = await res.json();
      
      // Reverse map the IDs back to Symbols
      Object.keys(CG_MAP).forEach(sym => {
        const id = CG_MAP[sym];
        if (data[id] && data[id].usd) {
          const val = data[id].usd;
          prices[sym] = val;
          prices[`${sym}USD`] = val;
          prices[`${sym}USDT`] = val;
          prices[`${sym}/USDT`] = val;
          cryptoFetched = true;
        }
      });
    }
  } catch (err) {
    console.error("[Server Price Proxy] CoinGecko fetch failed:", err);
  }

  // 2. SERVER-SIDE FALLBACK: CRYPTO (Fallback: CryptoCompare)
  if (!cryptoFetched) {
    try {
      const cryptoCsv = CRYPTO_SYMBOLS.join(',');
      const url = cryptoKey
        ? `https://min-api.cryptocompare.com/data/pricemulti?fsyms=${cryptoCsv}&tsyms=USD&api_key=${cryptoKey}`
        : `https://min-api.cryptocompare.com/data/pricemulti?fsyms=${cryptoCsv}&tsyms=USD`;

      const res = await fetch(url, { cache: 'no-store' });
      if (res.ok) {
        const data = await res.json();
        if (data && !data.Response) {
          Object.keys(data).forEach(sym => {
            const val = data[sym]?.USD;
            if (val && val > 0) {
              prices[sym] = val;
              prices[`${sym}USD`] = val;
              prices[`${sym}USDT`] = val;
              prices[`${sym}/USDT`] = val;
            }
          });
        }
      }
    } catch (err) {
      console.error("[Server Price Proxy] CryptoCompare fallback failed:", err);
    }
  }

  // 3. SERVER-SIDE FETCH: STOCKS (Finnhub)
  if (finnhubKey) {
    try {
      const stockPromises = STOCK_SYMBOLS.map(sym =>
        fetch(`https://finnhub.io/api/v1/quote?symbol=${sym}&token=${finnhubKey}`, { cache: 'no-store'})
          .then(res => res.ok ? res.json() : null)
          .then(data => ({ symbol: sym, price: data?.c }))
          .catch(() => null)
      );

      const stockResults = await Promise.all(stockPromises);
      stockResults.forEach(item => {
        if (item && item.price && item.price > 0) {
          prices[item.symbol] = item.price;
        }
      });
    } catch (err) {
      console.error("[Server Price Proxy] Finnhub fetch failed:", err);
    }
  }

  return NextResponse.json({ success: true, prices, timestamp: Date.now() });
}
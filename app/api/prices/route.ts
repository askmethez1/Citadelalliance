import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

const CRYPTO_SYMBOLS = ['BTC', 'ETH', 'SOL', 'BNB', 'XRP', 'DOGE', 'AVAX'];
const STOCK_SYMBOLS = ['SPY', 'QQQ', 'VOO', 'AAPL', 'NVDA', 'MSFT', 'AMZN', 'TSLA', 'META', 'IBIT', 'ETHA'];

export async function GET() {
  const prices: Record<string, number> = {};
  const cryptoKey = process.env.NEXT_PUBLIC_CRYPTO_API_KEY;
  const finnhubKey = process.env.NEXT_PUBLIC_FINNHUB_API_KEY;

  // 1. SERVER-SIDE FETCH: CRYPTO (CryptoCompare)
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
    console.error("[Server Price Proxy] CryptoCompare fetch failed:", err);
  }

  // 2. SERVER-SIDE FALLBACK: COINBASE (If CryptoCompare was empty)
  if (!prices['BTC']) {
    try {
      const cbRes = await fetch('https://api.coinbase.com/v2/exchange-rates?currency=USD', { cache: 'no-store' });
      if (cbRes.ok) {
        const cbData = await cbRes.json();
        const rates = cbData?.data?.rates;
        if (rates) {
          CRYPTO_SYMBOLS.forEach(sym => {
            if (rates[sym]) {
              const val = 1 / parseFloat(rates[sym]);
              if (val > 0) {
                prices[sym] = val;
                prices[`${sym}USD`] = val;
                prices[`${sym}USDT`] = val;
                prices[`${sym}/USDT`] = val;
              }
            }
          });
        }
      }
    } catch (err) {
      console.error("[Server Price Proxy] Coinbase fallback failed:", err);
    }
  }

  // 3. SERVER-SIDE FETCH: STOCKS (Finnhub)
  if (finnhubKey) {
    try {
      const stockPromises = STOCK_SYMBOLS.map(sym =>
        fetch(`https://finnhub.io/api/v1/quote?symbol=${sym}&token=${finnhubKey}`, { cache: 'no-store' })
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
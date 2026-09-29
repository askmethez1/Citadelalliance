export default function LiveTicker() {
  const tickerItems = [
    { symbol: 'BTC/USD', change: '+$1,240.50', isUp: true },
    { symbol: 'ETH/USD', change: '-$45.20', isUp: false },
    { symbol: 'SPY (ETF)', change: '+1.2%', isUp: true },
    { symbol: 'AAPL', change: '+0.8%', isUp: true },
    { symbol: 'TSLA', change: '-2.1%', isUp: false },
    { symbol: 'QQQ (ETF)', change: '+1.5%', isUp: true },
    { symbol: 'NVDA', change: '+3.4%', isUp: true },
    { symbol: 'AMZN', change: '-0.3%', isUp: false },
  ];

  return (
    <div className="w-full bg-[#151924] border-y border-white/5 py-3 overflow-hidden text-sm font-medium text-gray-400">
      <div className="animate-marquee flex items-center">
        {/* Duplicated array creates a seamless 100% -> 50% infinite loop */}
        {[...tickerItems, ...tickerItems].map((item, index) => (
          <div key={index} className="flex items-center gap-2 px-8 whitespace-nowrap">
            <span className="text-gray-300 font-semibold">{item.symbol}</span>
            <span className={item.isUp ? 'text-green-400' : 'text-red-400'}>
              {item.change}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
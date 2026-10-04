export const STARTER_CATALOG = {
  signals: [
    { id: 'starter-btc-breakout', asset: 'Bitcoin', pair: 'BTC/USDT', direction: 'Long', timeframe: '4H', confidence: 78, status: 'Active', technicalSummary: 'Momentum remains constructive above the weekly support band.' },
    { id: 'starter-eth-retest', asset: 'Ethereum', pair: 'ETH/USDT', direction: 'Watch', timeframe: '1D', confidence: 71, status: 'Review', technicalSummary: 'Watching for a confirmed retest before continuation.' },
    { id: 'starter-gold-range', asset: 'Gold', pair: 'XAU/USD', direction: 'Long', timeframe: '1H', confidence: 69, status: 'Active', technicalSummary: 'Range support is holding while volatility compresses.' },
    { id: 'starter-nasdaq-pullback', asset: 'Nasdaq 100', pair: 'NAS100', direction: 'Watch', timeframe: '4H', confidence: 64, status: 'Review', technicalSummary: 'Pullback setup is developing near the moving-average cluster.' }
  ],
  marketAssets: [
    { id: 'BTCUSDT', assetType: 'crypto', symbol: 'BTCUSDT', displayName: 'Bitcoin', tradingViewSymbol: 'BINANCE:BTCUSDT', active: true },
    { id: 'ETHUSDT', assetType: 'crypto', symbol: 'ETHUSDT', displayName: 'Ethereum', tradingViewSymbol: 'BINANCE:ETHUSDT', active: true },
    { id: 'SOLUSDT', assetType: 'crypto', symbol: 'SOLUSDT', displayName: 'Solana', tradingViewSymbol: 'BINANCE:SOLUSDT', active: true },
    { id: 'AAPL', assetType: 'stocks', symbol: 'AAPL', displayName: 'Apple', tradingViewSymbol: 'NASDAQ:AAPL', active: true },
    { id: 'NVDA', assetType: 'stocks', symbol: 'NVDA', displayName: 'NVIDIA', tradingViewSymbol: 'NASDAQ:NVDA', active: true },
    { id: 'TSLA', assetType: 'stocks', symbol: 'TSLA', displayName: 'Tesla', tradingViewSymbol: 'NASDAQ:TSLA', active: true },
    { id: 'XAUUSD', assetType: 'commodities', symbol: 'XAUUSD', displayName: 'Gold', tradingViewSymbol: 'OANDA:XAUUSD', active: true }
  ],
  copyStrategies: [
    { id: 'starter-alpha', name: 'Alpha Momentum', provider: 'Vertix Research', riskLevel: 'Moderate', status: 'Available', description: 'Trend-following strategy focused on liquid crypto and index markets with disciplined position sizing.' },
    { id: 'starter-income', name: 'Balanced Income', provider: 'Vertix Research', riskLevel: 'Conservative', status: 'Available', description: 'Diversified allocation designed to prioritize steady participation and controlled drawdowns.' },
    { id: 'starter-global', name: 'Global Macro Select', provider: 'Vertix Research', riskLevel: 'Growth', status: 'Available', description: 'Multi-asset approach combining equities, commodities and major currency themes.' }
  ],
  plans: [
    { id: 'starter-essential', name: 'Essential', price: 0, currency: 'USD', billingPeriod: ' / month', status: 'Available', description: 'Core dashboard access, market watchlists and weekly research notes.' },
    { id: 'starter-pro', name: 'Pro Signals', price: 29, currency: 'USD', billingPeriod: ' / month', status: 'Available', description: 'Expanded signal coverage, technical commentary and priority market updates.' },
    { id: 'starter-elite', name: 'Elite Desk', price: 79, currency: 'USD', billingPeriod: ' / month', status: 'Available', description: 'Full research access, advanced watchlists and copy strategy insights.' }
  ],
  digitalAssets: [
    { id: 'starter-vault-01', name: 'Vault Series 01', edition: '01 / 100', category: 'Research collectible', status: 'Available', description: 'A digital membership collectible representing the first Vertix Trade research edition.' },
    { id: 'starter-vault-02', name: 'Market Signal Grid', edition: '02 / 100', category: 'Research collectible', status: 'Available', description: 'A limited digital artwork inspired by market structure and signal discipline.' },
    { id: 'starter-vault-03', name: 'Global Macro Atlas', edition: '03 / 100', category: 'Research collectible', status: 'Available', description: 'A collectible visual atlas of the macro themes followed by the Vertix desk.' }
  ],
  news: [
    { id: 'starter-news-risk', category: 'Market brief', title: 'Risk assets begin the week with selective momentum', summary: 'Crypto and technology leaders are holding key support while traders wait for fresh macro catalysts. Keep position sizes measured around high-impact releases.', publishedAt: '2026-10-04' },
    { id: 'starter-news-gold', category: 'Commodities', title: 'Gold remains a useful portfolio diversifier', summary: 'Gold is consolidating after a strong move. The current range keeps the metal on the active watchlist for confirmation around support and resistance.', publishedAt: '2026-10-03' },
    { id: 'starter-news-discipline', category: 'Vertix Research', title: 'Why disciplined execution matters more than prediction', summary: 'A repeatable plan, defined risk and consistent record keeping are the foundation of sustainable market participation.', publishedAt: '2026-10-01' }
  ],
  marketCalendar: [
    { id: 'starter-calendar-nfp', date: '2026-10-09', time: '13:30 UTC', title: 'US employment report', market: 'USD · Indices · Gold', status: 'Upcoming' },
    { id: 'starter-calendar-cpi', date: '2026-10-13', time: '13:30 UTC', title: 'US consumer price index', market: 'USD · Rates · Equities', status: 'Upcoming' },
    { id: 'starter-calendar-ecb', date: '2026-10-15', time: '12:15 UTC', title: 'European Central Bank decision', market: 'EUR · FX · Indices', status: 'Upcoming' }
  ]
};

export const starterRecords = (collection) => (STARTER_CATALOG[collection] || []).map((item) => ({ ...item }));

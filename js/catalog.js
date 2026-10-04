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
    { id: 'BNBUSDT', assetType: 'crypto', symbol: 'BNBUSDT', displayName: 'BNB', tradingViewSymbol: 'BINANCE:BNBUSDT', active: true },
    { id: 'XRPUSDT', assetType: 'crypto', symbol: 'XRPUSDT', displayName: 'XRP', tradingViewSymbol: 'BINANCE:XRPUSDT', active: true },
    { id: 'ADAUSDT', assetType: 'crypto', symbol: 'ADAUSDT', displayName: 'Cardano', tradingViewSymbol: 'BINANCE:ADAUSDT', active: true },
    { id: 'DOGEUSDT', assetType: 'crypto', symbol: 'DOGEUSDT', displayName: 'Dogecoin', tradingViewSymbol: 'BINANCE:DOGEUSDT', active: true },
    { id: 'AVAXUSDT', assetType: 'crypto', symbol: 'AVAXUSDT', displayName: 'Avalanche', tradingViewSymbol: 'BINANCE:AVAXUSDT', active: true },
    { id: 'LINKUSDT', assetType: 'crypto', symbol: 'LINKUSDT', displayName: 'Chainlink', tradingViewSymbol: 'BINANCE:LINKUSDT', active: true },
    { id: 'LTCUSDT', assetType: 'crypto', symbol: 'LTCUSDT', displayName: 'Litecoin', tradingViewSymbol: 'BINANCE:LTCUSDT', active: true },
    { id: 'AAPL', assetType: 'stocks', symbol: 'AAPL', displayName: 'Apple', tradingViewSymbol: 'NASDAQ:AAPL', active: true },
    { id: 'NVDA', assetType: 'stocks', symbol: 'NVDA', displayName: 'NVIDIA', tradingViewSymbol: 'NASDAQ:NVDA', active: true },
    { id: 'TSLA', assetType: 'stocks', symbol: 'TSLA', displayName: 'Tesla', tradingViewSymbol: 'NASDAQ:TSLA', active: true },
    { id: 'MSFT', assetType: 'stocks', symbol: 'MSFT', displayName: 'Microsoft', tradingViewSymbol: 'NASDAQ:MSFT', active: true },
    { id: 'AMZN', assetType: 'stocks', symbol: 'AMZN', displayName: 'Amazon', tradingViewSymbol: 'NASDAQ:AMZN', active: true },
    { id: 'GOOGL', assetType: 'stocks', symbol: 'GOOGL', displayName: 'Alphabet', tradingViewSymbol: 'NASDAQ:GOOGL', active: true },
    { id: 'META', assetType: 'stocks', symbol: 'META', displayName: 'Meta Platforms', tradingViewSymbol: 'NASDAQ:META', active: true },
    { id: 'AMD', assetType: 'stocks', symbol: 'AMD', displayName: 'AMD', tradingViewSymbol: 'NASDAQ:AMD', active: true },
    { id: 'NFLX', assetType: 'stocks', symbol: 'NFLX', displayName: 'Netflix', tradingViewSymbol: 'NASDAQ:NFLX', active: true },
    { id: 'JPM', assetType: 'stocks', symbol: 'JPM', displayName: 'JPMorgan Chase', tradingViewSymbol: 'NYSE:JPM', active: true },
    { id: 'V', assetType: 'stocks', symbol: 'V', displayName: 'Visa', tradingViewSymbol: 'NYSE:V', active: true },
    { id: 'EURUSD', assetType: 'forex', symbol: 'EURUSD', displayName: 'Euro / US Dollar', tradingViewSymbol: 'OANDA:EURUSD', active: true },
    { id: 'GBPUSD', assetType: 'forex', symbol: 'GBPUSD', displayName: 'British Pound / US Dollar', tradingViewSymbol: 'OANDA:GBPUSD', active: true },
    { id: 'USDJPY', assetType: 'forex', symbol: 'USDJPY', displayName: 'US Dollar / Japanese Yen', tradingViewSymbol: 'OANDA:USDJPY', active: true },
    { id: 'USDCHF', assetType: 'forex', symbol: 'USDCHF', displayName: 'US Dollar / Swiss Franc', tradingViewSymbol: 'OANDA:USDCHF', active: true },
    { id: 'AUDUSD', assetType: 'forex', symbol: 'AUDUSD', displayName: 'Australian Dollar / US Dollar', tradingViewSymbol: 'OANDA:AUDUSD', active: true },
    { id: 'USDCAD', assetType: 'forex', symbol: 'USDCAD', displayName: 'US Dollar / Canadian Dollar', tradingViewSymbol: 'OANDA:USDCAD', active: true },
    { id: 'NZDUSD', assetType: 'forex', symbol: 'NZDUSD', displayName: 'New Zealand Dollar / US Dollar', tradingViewSymbol: 'OANDA:NZDUSD', active: true },
    { id: 'EURGBP', assetType: 'forex', symbol: 'EURGBP', displayName: 'Euro / British Pound', tradingViewSymbol: 'OANDA:EURGBP', active: true },
    { id: 'EURJPY', assetType: 'forex', symbol: 'EURJPY', displayName: 'Euro / Japanese Yen', tradingViewSymbol: 'OANDA:EURJPY', active: true },
    { id: 'GBPJPY', assetType: 'forex', symbol: 'GBPJPY', displayName: 'British Pound / Japanese Yen', tradingViewSymbol: 'OANDA:GBPJPY', active: true },
    { id: 'SPX500USD', assetType: 'indices', symbol: 'SPX500USD', displayName: 'S&P 500', tradingViewSymbol: 'OANDA:SPX500USD', active: true },
    { id: 'NAS100USD', assetType: 'indices', symbol: 'NAS100USD', displayName: 'Nasdaq 100', tradingViewSymbol: 'OANDA:NAS100USD', active: true },
    { id: 'US30USD', assetType: 'indices', symbol: 'US30USD', displayName: 'Dow Jones 30', tradingViewSymbol: 'OANDA:US30USD', active: true },
    { id: 'GER40EUR', assetType: 'indices', symbol: 'GER40EUR', displayName: 'DAX 40', tradingViewSymbol: 'OANDA:GER40EUR', active: true },
    { id: 'UK100GBP', assetType: 'indices', symbol: 'UK100GBP', displayName: 'FTSE 100', tradingViewSymbol: 'OANDA:UK100GBP', active: true },
    { id: 'XAUUSD', assetType: 'commodities', symbol: 'XAUUSD', displayName: 'Gold', tradingViewSymbol: 'OANDA:XAUUSD', active: true },
    { id: 'XAGUSD', assetType: 'commodities', symbol: 'XAGUSD', displayName: 'Silver', tradingViewSymbol: 'OANDA:XAGUSD', active: true },
    { id: 'WTIUSD', assetType: 'commodities', symbol: 'WTIUSD', displayName: 'US Crude Oil', tradingViewSymbol: 'TVC:USOIL', active: true },
    { id: 'NATGASUSD', assetType: 'commodities', symbol: 'NATGASUSD', displayName: 'Natural Gas', tradingViewSymbol: 'TVC:NATURALGAS', active: true }
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

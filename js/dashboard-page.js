import {
  initializeFirebase,
  requireMember,
  listPublicRecords,
  listUserRecords,
  createUserRequest,
  openTrade
} from './firebase.js';
import { renderLegacyNavigation } from './dashboard-nav.js';

const esc = (value = '') => String(value).replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
const money = (value, currency) => {
  if (value == null || value === '') return '—';
  const number = Number(value);
  if (!Number.isFinite(number) || !currency) return '—';
  try { return new Intl.NumberFormat(undefined, { style: 'currency', currency }).format(number); }
  catch { return `${number.toLocaleString()} ${currency || ''}`.trim(); }
};
const timeText = (value) => value?.toDate ? value.toDate().toLocaleString() : '—';
const timeValue = (value) => value?.toMillis ? value.toMillis() : (value?.seconds || 0) * 1000;
const validTradingViewSymbol = (value) => typeof value === 'string' && /^[A-Z0-9][A-Z0-9._:-]*$/i.test(value.trim());
const DEFAULT_MARKETS = [
  { id: 'BTCUSDT', assetType: 'crypto', symbol: 'BTCUSDT', displayName: 'Bitcoin', tradingViewSymbol: 'BINANCE:BTCUSDT', active: true },
  { id: 'ETHUSDT', assetType: 'crypto', symbol: 'ETHUSDT', displayName: 'Ethereum', tradingViewSymbol: 'BINANCE:ETHUSDT', active: true },
  { id: 'SOLUSDT', assetType: 'crypto', symbol: 'SOLUSDT', displayName: 'Solana', tradingViewSymbol: 'BINANCE:SOLUSDT', active: true },
  { id: 'AAPL', assetType: 'stocks', symbol: 'AAPL', displayName: 'Apple', tradingViewSymbol: 'NASDAQ:AAPL', active: true },
  { id: 'NVDA', assetType: 'stocks', symbol: 'NVDA', displayName: 'NVIDIA', tradingViewSymbol: 'NASDAQ:NVDA', active: true },
  { id: 'TSLA', assetType: 'stocks', symbol: 'TSLA', displayName: 'Tesla', tradingViewSymbol: 'NASDAQ:TSLA', active: true },
  { id: 'XAUUSD', assetType: 'commodities', symbol: 'XAUUSD', displayName: 'Gold', tradingViewSymbol: 'OANDA:XAUUSD', active: true }
];

let tradingViewPromise;
let chartCounter = 0;

function setStatus(message, tone = 'error') {
  let node = document.getElementById('dashboard-status');
  if (!node) {
    const container = document.querySelector('.wrapper-content .container');
    if (container) {
      node = document.createElement('p');
      node.id = 'dashboard-status';
      node.className = 'dashboard-live-status';
      node.setAttribute('aria-live', 'polite');
      container.prepend(node);
    }
  }
  if (node) {
    node.textContent = message;
    node.dataset.tone = tone;
  }
}

function renderRows(container, rows, emptyText) {
  if (!container) return;
  container.innerHTML = rows.length ? rows.join('') : `<tr><td colspan="5">${esc(emptyText)}</td></tr>`;
}

function loadTradingView() {
  if (window.TradingView?.widget) return Promise.resolve();
  if (!tradingViewPromise) {
    tradingViewPromise = new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = 'https://s3.tradingview.com/tv.js';
      script.async = true;
      script.onload = () => window.TradingView?.widget ? resolve() : reject(new Error('The chart service did not initialize.'));
      script.onerror = () => reject(new Error('The chart service could not be reached.'));
      document.head.append(script);
    });
  }
  return tradingViewPromise;
}

async function mountTradingViewChart(symbol, containerId) {
  const target = document.getElementById(containerId);
  if (!target) return;
  if (!validTradingViewSymbol(symbol)) {
    target.textContent = 'This listing has an invalid chart symbol. Contact support.';
    return;
  }
  const selectedSymbol = symbol.trim();
  target.dataset.chartSymbol = selectedSymbol;
  target.replaceChildren();
  target.setAttribute('aria-busy', 'true');
  try {
    await loadTradingView();
    if (target.dataset.chartSymbol !== selectedSymbol) return;
    const mount = document.createElement('div');
    mount.id = `vt-tv-chart-${++chartCounter}`;
    mount.className = 'market-chart-embed-inner';
    target.append(mount);
    new window.TradingView.widget({
      autosize: true,
      symbol: selectedSymbol,
      interval: 'D',
      timezone: 'Etc/UTC',
      theme: 'dark',
      style: '1',
      locale: 'en',
      withdateranges: true,
      allow_symbol_change: false,
      save_image: false,
      details: false,
      hotlist: false,
      calendar: false,
      container_id: mount.id
    });
  } catch {
    target.textContent = 'The chart service is temporarily unavailable. Refresh to try again.';
  } finally {
    target.removeAttribute('aria-busy');
  }
}

function renderChartGroup(targetId, listings, label, emptyMessage, sizeClass = '') {
  const target = document.getElementById(targetId);
  if (!target) return;
  if (!listings.length) {
    target.classList.add('market-chart-empty');
    target.textContent = emptyMessage;
    return;
  }
  target.classList.remove('market-chart-empty');
  const picker = document.createElement('label');
  picker.className = 'market-chart-picker';
  picker.textContent = label;
  const select = document.createElement('select');
  select.setAttribute('aria-label', label);
  for (const item of listings) {
    const option = document.createElement('option');
    option.value = item.tradingViewSymbol;
    option.textContent = `${item.displayName || item.symbol || item.tradingViewSymbol} · ${item.symbol || item.tradingViewSymbol}`;
    select.append(option);
  }
  picker.append(select);
  const chart = document.createElement('div');
  chart.id = `vt-chart-${targetId}`;
  chart.className = `market-chart-embed ${sizeClass}`.trim();
  target.replaceChildren(picker, chart);
  select.addEventListener('change', () => mountTradingViewChart(select.value, chart.id));
  mountTradingViewChart(select.value, chart.id);
}

function addTicker(markets) {
  const container = document.getElementById('market-ticker');
  if (!container) return;
  const items = markets.filter((item) => validTradingViewSymbol(item.tradingViewSymbol)).slice(0, 12);
  if (!items.length) {
    container.textContent = 'No market listings are available.';
    return;
  }
  const widget = document.createElement('div');
  widget.className = 'tradingview-widget-container__widget';
  const script = document.createElement('script');
  script.src = 'https://s3.tradingview.com/external-embedding/embed-widget-ticker-tape.js';
  script.async = true;
  script.textContent = JSON.stringify({
    symbols: items.map((item) => ({ proName: item.tradingViewSymbol, title: item.displayName || item.symbol })),
    showSymbolLogo: true,
    colorTheme: 'dark',
    isTransparent: true,
    displayMode: 'regular',
    locale: 'en'
  });
  container.replaceChildren(widget, script);
}

function renderActivityTabs(container, requests, trades, transactions, currency) {
  const openTrades = trades.filter((item) => item.status === 'open').slice().sort((a, b) => timeValue(b.createdAt) - timeValue(a.createdAt)).slice(0, 8);
  const tradeRows = openTrades.map((item) => `<tr><td><b>${esc(item.symbol || '—')}</b></td><td>${esc(item.side || '—')}</td><td>${esc(money(item.amount, item.currency || currency))}</td><td>${item.entryPrice == null ? '—' : esc(Number(item.entryPrice).toLocaleString(undefined, { maximumSignificantDigits: 10 }))}</td><td>${esc(timeText(item.openedAt || item.createdAt))}</td></tr>`);
  const transactionRows = transactions.slice().sort((a, b) => timeValue(b.createdAt) - timeValue(a.createdAt)).slice(0, 8).map((item) => `<tr><td><b>${esc(item.type || 'Transaction')}</b></td><td>${esc(item.method || item.destination || item.reference || '—')}</td><td>${esc(money(item.amount, item.currency || currency))}</td><td>${esc(item.status || '—')}</td><td>${esc(timeText(item.completedAt || item.createdAt))}</td></tr>`);
  const requestRows = requests.filter((item) => !item.resultId).slice().sort((a, b) => timeValue(b.createdAt) - timeValue(a.createdAt)).slice(0, 8).map((item) => `<tr><td><b>${esc(item.type || 'Request')}</b></td><td>${esc(item.symbol || item.method || item.destination || item.purpose || item.subject || '—')}</td><td>${esc(money(item.amount, item.currency || currency))}</td><td>${esc(item.status || 'submitted')}</td><td>${esc(timeText(item.createdAt))}</td></tr>`);
  container.innerHTML = `
    <section class="dashboard-activity-panel" aria-label="Account activity">
      <div class="dashboard-activity-tabs" role="tablist" aria-label="Account activity">
        <button type="button" role="tab" id="tab-open-trades" aria-controls="panel-open-trades" aria-selected="true" data-activity-tab="open-trades">Recent open trades</button>
        <button type="button" role="tab" id="tab-transactions" aria-controls="panel-transactions" aria-selected="false" data-activity-tab="transactions">Recent transactions</button>
        <button type="button" role="tab" id="tab-requests" aria-controls="panel-requests" aria-selected="false" data-activity-tab="requests">Account requests</button>
      </div>
      <div id="panel-open-trades" class="dashboard-activity-table" role="tabpanel" aria-labelledby="tab-open-trades">
        <div class="table-responsive"><table class="table table-dark table-sm"><thead><tr><th>Market</th><th>Side</th><th>Size</th><th>Entry price</th><th>Opened</th></tr></thead><tbody>${tradeRows.length ? tradeRows.join('') : '<tr><td colspan="5">No open trades have been recorded.</td></tr>'}</tbody></table></div>
      </div>
      <div id="panel-transactions" class="dashboard-activity-table" role="tabpanel" aria-labelledby="tab-transactions" hidden>
        <div class="table-responsive"><table class="table table-dark table-sm"><thead><tr><th>Type</th><th>Details</th><th>Amount</th><th>Status</th><th>Date</th></tr></thead><tbody>${transactionRows.length ? transactionRows.join('') : '<tr><td colspan="5">No completed transactions have been recorded.</td></tr>'}</tbody></table></div>
      </div>
      <div id="panel-requests" class="dashboard-activity-table" role="tabpanel" aria-labelledby="tab-requests" hidden>
        <div class="table-responsive"><table class="table table-dark table-sm"><thead><tr><th>Type</th><th>Details</th><th>Amount</th><th>Status</th><th>Submitted</th></tr></thead><tbody>${requestRows.length ? requestRows.join('') : '<tr><td colspan="5">No account requests.</td></tr>'}</tbody></table></div>
      </div>
    </section>`;
  if (!container.dataset.tabsBound) {
    container.dataset.tabsBound = 'true';
    container.addEventListener('click', (event) => {
      const button = event.target.closest('[data-activity-tab]');
      if (!button) return;
      for (const tab of container.querySelectorAll('[data-activity-tab]')) {
        const selected = tab === button;
        tab.setAttribute('aria-selected', String(selected));
        document.getElementById(tab.getAttribute('aria-controls')).hidden = !selected;
      }
    });
  }
}

async function start() {
  await initializeFirebase();
  const session = await requireMember();
  if (!session) return;
  const { user, profile } = session;
  const currency = profile.preferredCurrency || '';
  const displayName = profile.legalName || user.displayName || 'Account holder';

  const nav = document.querySelector('[data-dashboard-nav]');
  if (nav) nav.innerHTML = renderLegacyNavigation('account', './');
  document.querySelectorAll('[data-member-name]').forEach((node) => { node.textContent = displayName; });
  document.querySelectorAll('[data-kyc-status]').forEach((node) => { node.textContent = String(profile.kycStatus || 'not_started').replaceAll('_', ' '); });
  document.querySelectorAll('[data-account-status]').forEach((node) => { node.textContent = String(profile.accountStatus || 'pending_verification').replaceAll('_', ' '); });
  document.title = 'Account | Vertix Trade';

  let [trades, transactions, requests, markets] = await Promise.all([
    listUserRecords(user.uid, 'trades'),
    listUserRecords(user.uid, 'transactions'),
    listUserRecords(user.uid, 'requests'),
    listPublicRecords('marketAssets')
  ]);
  const overviewContainer = document.querySelector('.wrapper-content .container');
  if (overviewContainer && !document.getElementById('dashboard-account-activity')) {
    const activity = document.createElement('div');
    activity.id = 'dashboard-account-activity';
    activity.className = 'row mt-3 dashboard-history-row';
    overviewContainer.append(activity);
  }
  const activityHost = document.getElementById('dashboard-account-activity');
  if (!document.getElementById('dashboard-status')) {
    const statusNode = document.createElement('p');
    statusNode.id = 'dashboard-status';
    statusNode.className = 'dashboard-live-status';
    statusNode.setAttribute('aria-live', 'polite');
    overviewContainer?.prepend(statusNode);
  }
  document.querySelectorAll('[data-account-currency]').forEach((node) => { node.textContent = currency || 'Select currency in Account Settings'; });

  const closedTrades = trades.filter((item) => item.status === 'closed');
  const openTrades = trades.filter((item) => item.status === 'open');
  const deposits = transactions.filter((item) => item.type === 'deposit' && ['settled', 'completed'].includes(item.status) && item.currency === currency);
  const profit = closedTrades.reduce((sum, item) => sum + (item.currency === currency ? Number(item.realizedPnl) || 0 : 0), 0);
  const depositTotal = deposits.reduce((sum, item) => sum + (Number(item.amount) || 0), 0);
  const wins = closedTrades.filter((item) => Number(item.realizedPnl) > 0).length;
  const winRatio = closedTrades.length ? `${Math.round((wins / closedTrades.length) * 100)}%` : '—';
  const balanceCurrency = profile.balanceCurrency || currency;
  const totalBalance = profile.balance == null || (balanceCurrency !== currency && profile.balance !== 0) ? '—' : money(profile.balance, currency);
  const values = {
    balance: totalBalance,
    profit: closedTrades.length ? money(profit, currency) : '—',
    bonus: profile.bonusBalance == null ? '—' : money(profile.bonusBalance, currency),
    deposits: money(depositTotal, currency),
    openTrades: String(openTrades.length),
    closedTrades: String(closedTrades.length),
    winLossRatio: winRatio
  };
  for (const [key, value] of Object.entries(values)) {
    document.querySelectorAll(`[data-dashboard-field="${key}"]`).forEach((node) => { node.textContent = value; });
  }
  document.querySelectorAll('[data-account-balance]').forEach((node) => { node.textContent = totalBalance; });
  document.querySelectorAll('.activity-block .progress').forEach((node) => node.remove());
  if (activityHost) renderActivityTabs(activityHost, requests, trades, transactions, currency);

  const tradeForm = document.getElementById('tradeForm');
  if (tradeForm && !document.getElementById('trade-request-disclosure')) {
    const note = document.createElement('p');
    note.id = 'trade-request-disclosure';
    note.className = 'dashboard-operation-note';
    note.textContent = 'Buy and sell open immediately when your available balance covers the order. Deposits and withdrawals still require administrator approval.';
    tradeForm.parentElement.insertBefore(note, tradeForm);
  }

  const marketSource = markets.some((item) => item.active === true) ? markets : DEFAULT_MARKETS;
  const activeMarkets = marketSource.filter((item) => item.active === true).slice().sort((a, b) => String(a.displayName || a.symbol || '').localeCompare(String(b.displayName || b.symbol || '')));
  const chartMarkets = activeMarkets.filter((item) => validTradingViewSymbol(item.tradingViewSymbol));
  const typeSelect = document.getElementById('asset_type');
  const marketSelect = document.getElementById('market-select');
  const types = [...new Set(activeMarkets.map((item) => item.assetType).filter(Boolean))].sort((a, b) => String(a).localeCompare(String(b)));
  if (typeSelect) typeSelect.innerHTML = '<option value="">Select market type</option>' + types.map((type) => `<option value="${esc(type)}">${esc(type)}</option>`).join('');
  if (marketSelect) {
    marketSelect.innerHTML = '<option value="">Select market</option>' + activeMarkets.map((item) => `<option value="${esc(item.id)}" data-type="${esc(item.assetType || '')}">${esc(item.displayName || item.symbol)} · ${esc(item.symbol || '')}</option>`).join('');
    marketSelect.disabled = !activeMarkets.length;
  }
  typeSelect?.addEventListener('change', () => {
    if (!marketSelect) return;
    const selectedType = typeSelect.value;
    for (const option of marketSelect.options) option.hidden = Boolean(selectedType && option.dataset.type && option.dataset.type !== selectedType);
    marketSelect.value = '';
  });
  document.querySelectorAll('.confirm-trade').forEach((button) => {
    button.disabled = !activeMarkets.length;
    button.addEventListener('click', async () => {
      const form = document.getElementById('tradeForm');
      const status = document.getElementById('trade-request-status');
      if (!form || !form.reportValidity()) return;
      const amount = Number(form.elements.namedItem('amount')?.value);
      const marketId = marketSelect?.value;
      const market = activeMarkets.find((item) => item.id === marketId);
      const leverage = Number(form.elements.namedItem('leverage')?.value || 1);
      if (!currency) {
        if (status) status.textContent = 'Set your account currency in Account Settings before placing an order request.';
        return;
      }
      if (!market || !market.symbol || !Number.isFinite(amount) || amount <= 0) {
        if (status) status.textContent = 'Select a listed market and enter an order size greater than zero.';
        return;
      }
      if (!Number.isFinite(leverage) || leverage < 1 || leverage > 10) {
        if (status) status.textContent = 'Leverage must be between 1x and 10x.';
        return;
      }
      const optionalNumber = (name) => {
        const value = form.elements.namedItem(name)?.value;
        if (!value) return undefined;
        const number = Number(value);
        return Number.isFinite(number) && number >= 0 ? number : NaN;
      };
      const takeProfit = optionalNumber('take_profit');
      const stopLoss = optionalNumber('stop_loss');
      if (Number.isNaN(takeProfit) || Number.isNaN(stopLoss)) {
        if (status) status.textContent = 'Take-profit and stop-loss values must be zero or greater.';
        return;
      }
      button.disabled = true;
      try {
        const result = await openTrade(user.uid, {
          marketId: market.id,
          symbol: market.symbol,
          side: button.dataset.action,
          amount,
          currency,
          leverage,
          duration: String(form.elements.namedItem('duration')?.value || ''),
          ...(takeProfit === undefined ? {} : { takeProfit }),
          ...(stopLoss === undefined ? {} : { stopLoss }),
          entryPrice: 1
        });
        if (status) status.textContent = `Trade opened. Reference: ${result.recordId}. Remaining balance: ${result.balanceAfter.toLocaleString()} ${currency}.`;
        profile.balance = result.balanceAfter;
        trades = await listUserRecords(user.uid, 'trades');
        document.querySelectorAll('[data-account-balance]').forEach((node) => { node.textContent = money(result.balanceAfter, currency); });
        if (activityHost) renderActivityTabs(activityHost, requests, trades, transactions, currency);
      } catch (error) {
        if (status) status.textContent = error.message || 'The order request could not be submitted.';
      } finally {
        button.disabled = !activeMarkets.length;
      }
    });
  });

  addTicker(chartMarkets);
  renderChartGroup('market-chart-panel', chartMarkets, 'Market chart', 'No chart-enabled market is listed.');
  renderChartGroup('crypto-market-widget', chartMarkets.filter((item) => /crypto/i.test(item.assetType || '')), 'Cryptocurrency market', 'No chart-enabled crypto market is listed.', 'market-chart-category');
  renderChartGroup('equity-market-widget', chartMarkets.filter((item) => /stock|equity/i.test(item.assetType || '')), 'Stock market data', 'No chart-enabled stock market is listed.', 'market-chart-category');

  document.querySelectorAll('[data-logout]').forEach((link) => link.addEventListener('click', async (event) => {
    event.preventDefault();
    const { signOutUser } = await import('./firebase.js');
    await signOutUser();
    window.location.assign('/login.html');
  }));

  document.getElementById('support-form')?.addEventListener('submit', async (event) => {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    try {
      const id = await createUserRequest(user.uid, 'support', { subject: String(data.get('subject') || '').trim(), message: String(data.get('message') || '').trim() });
      form.querySelector('.form-status').textContent = `Support request submitted. Reference: ${id}`;
      form.reset();
    } catch (error) {
      form.querySelector('.form-status').textContent = error.message || 'Your message could not be sent.';
    }
  });
}

start().catch((error) => setStatus(error.message || 'Account information could not be loaded.'));

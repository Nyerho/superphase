import {
  initializeFirebase,
  requireMember,
  listPublicRecords,
  listUserRecords,
  createUserRequest
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

async function mountTradingViewChart(symbol, containerId) {
  if (!symbol || !/^[A-Z0-9:_-]+$/i.test(symbol)) return;
  const target = document.getElementById(containerId);
  if (!target) return;
  target.replaceChildren();
  const script = document.createElement('script');
  script.src = 'https://s3.tradingview.com/tv.js';
  script.onload = () => {
    if (window.TradingView?.widget) {
      new window.TradingView.widget({ autosize: true, symbol, interval: '60', timezone: 'Etc/UTC', theme: 'dark', style: '1', locale: 'en', container_id: containerId });
    }
  };
  target.append(script);
}

function addTicker(markets) {
  const container = document.getElementById('market-ticker');
  if (!container) return;
  const items = markets.filter((item) => item.tradingViewSymbol).slice(0, 12);
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

  const [trades, transactions, requests, markets] = await Promise.all([
    listUserRecords(user.uid, 'trades'),
    listUserRecords(user.uid, 'transactions'),
    listUserRecords(user.uid, 'requests'),
    listPublicRecords('marketAssets')
  ]);
  const overviewContainer = document.querySelector('.wrapper-content .container');
  if (overviewContainer && !document.getElementById('account-requests')) {
    const activity = document.createElement('div');
    activity.className = 'row mt-3 dashboard-history-row';
    activity.innerHTML = `
      <div class="col-lg-6 mb-3"><div class="card"><div class="card-header"><h5 class="card-title">Recent order requests</h5></div><div class="card-body table-responsive"><table class="table table-dark table-sm" id="account-requests"><thead><tr><th>Type</th><th>Details</th><th>Amount</th><th>Status</th><th>Submitted</th></tr></thead><tbody></tbody></table></div></div></div>
      <div class="col-lg-6 mb-3"><div class="card"><div class="card-header"><h5 class="card-title">Trade history</h5></div><div class="card-body table-responsive"><table class="table table-dark table-sm" id="trade-history"><thead><tr><th>Market</th><th>Side</th><th>Size</th><th>Status</th><th>Date</th></tr></thead><tbody></tbody></table></div></div></div>`;
    overviewContainer.append(activity);
  }
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
  const deposits = transactions.filter((item) => item.type === 'deposit' && item.status === 'settled' && item.currency === currency);
  const profit = closedTrades.reduce((sum, item) => sum + (item.currency === currency ? Number(item.realizedPnl) || 0 : 0), 0);
  const depositTotal = deposits.reduce((sum, item) => sum + (Number(item.amount) || 0), 0);
  const wins = closedTrades.filter((item) => Number(item.realizedPnl) > 0).length;
  const winRatio = closedTrades.length ? `${Math.round((wins / closedTrades.length) * 100)}%` : '—';
  const totalBalance = profile.balance == null ? '—' : money(profile.balance, currency);
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
  const accountRequestRows = requests.slice().sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0)).slice(0, 8).map((item) => `<tr><td><b>${esc(item.type || 'Request')}</b></td><td>${esc(item.method || item.symbol || '—')}</td><td>${esc(money(item.amount, item.currency || currency))}</td><td>${esc(item.status || '—')}</td><td>${esc(timeText(item.createdAt))}</td></tr>`);
  renderRows(document.querySelector('#account-requests tbody'), accountRequestRows, 'No account requests.');
  const tradeRows = trades.slice().sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0)).slice(0, 8).map((item) => `<tr><td><b>${esc(item.symbol || '—')}</b></td><td>${esc(item.side || '—')}</td><td>${esc(money(item.amount, item.currency || currency))}</td><td>${esc(item.status || '—')}</td><td>${esc(timeText(item.createdAt))}</td></tr>`);
  renderRows(document.querySelector('#trade-history tbody'), tradeRows, 'No trade records.');

  const activeMarkets = markets.filter((item) => item.active !== false);
  const types = [...new Set(activeMarkets.map((item) => item.assetType).filter(Boolean))];
  const typeSelect = document.getElementById('asset_type');
  const marketSelect = document.getElementById('market-select');
  if (typeSelect) {
    typeSelect.innerHTML = '<option value="">Select market type</option>' + types.map((type) => `<option value="${esc(type)}">${esc(type)}</option>`).join('');
  }
  if (marketSelect) {
    marketSelect.innerHTML = '<option value="">Select market</option>' + activeMarkets.map((item) => `<option value="${esc(item.symbol || item.id)}" data-type="${esc(item.assetType || '')}">${esc(item.displayName || item.symbol)} · ${esc(item.symbol || '')}</option>`).join('');
    marketSelect.disabled = !activeMarkets.length;
  }
  typeSelect?.addEventListener('change', () => {
    if (!marketSelect) return;
    const selectedType = typeSelect.value;
    for (const option of marketSelect.options) {
      option.hidden = Boolean(selectedType && option.dataset.type && option.dataset.type !== selectedType);
    }
    marketSelect.value = '';
  });
  document.querySelectorAll('.confirm-trade').forEach((button) => {
    button.disabled = !activeMarkets.length;
    button.addEventListener('click', async () => {
      const form = document.getElementById('tradeForm');
      const amount = Number(form.elements.amount.value);
      const status = document.getElementById('trade-request-status');
      if (!form.reportValidity()) return;
      const symbol = marketSelect?.value;
      if (!symbol || !Number.isFinite(amount) || amount <= 0) {
        if (status) status.textContent = 'Select a listed market and enter an order size greater than zero.';
        return;
      }
      for (const fieldName of ['take_profit', 'stop_loss']) {
        const field = form.elements[fieldName];
        if (field?.value && (!Number.isFinite(Number(field.value)) || Number(field.value) < 0)) {
          if (status) status.textContent = 'Take-profit and stop-loss values must be zero or greater.';
          field.focus();
          return;
        }
      }
      button.disabled = true;
      try {
        const id = await createUserRequest(user.uid, 'trade', {
          symbol,
          side: button.dataset.action,
          amount,
          currency,
          leverage: Number(form.elements.leverage.value || 1),
          duration: String(form.elements.duration.value || ''),
          ...(form.elements.take_profit.value ? { takeProfit: Number(form.elements.take_profit.value) } : {}),
          ...(form.elements.stop_loss.value ? { stopLoss: Number(form.elements.stop_loss.value) } : {})
        });
        if (status) status.textContent = `Order request submitted. Reference: ${id}`;
      } catch (error) {
        if (status) status.textContent = error.message || 'The order request could not be submitted.';
      } finally {
        button.disabled = !activeMarkets.length;
      }
    });
  });

  addTicker(activeMarkets);
  const firstChartMarket = activeMarkets.find((item) => item.tradingViewSymbol);
  const chartTarget = document.getElementById('tradingview_e705a');
  if (chartTarget && firstChartMarket) await mountTradingViewChart(firstChartMarket.tradingViewSymbol, 'tradingview_e705a');
  else if (chartTarget) chartTarget.textContent = 'No chart-enabled market is listed.';
  const cryptoMarket = activeMarkets.find((item) => /crypto/i.test(item.assetType || '') && item.tradingViewSymbol);
  const equityMarket = activeMarkets.find((item) => /stock|equity/i.test(item.assetType || '') && item.tradingViewSymbol);
  for (const [id, market, emptyMessage] of [
    ['crypto-market-widget', cryptoMarket, 'No chart-enabled crypto market is listed.'],
    ['equity-market-widget', equityMarket, 'No chart-enabled equity market is listed.']
  ]) {
    const target = document.getElementById(id);
    if (target && market) await mountTradingViewChart(market.tradingViewSymbol, id);
    else if (target) target.textContent = emptyMessage;
  }

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

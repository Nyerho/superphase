import {
  initializeFirebase,
  requireMember,
  listPublicRecords,
  listUserRecords,
  createUserRequest,
  openTrade,
  updateUserProfile,
  saveUserSetting
} from './firebase.js';
import { activeNavKey, pageTitles, renderModernNavigation } from './dashboard-nav.js';

const ROOT = document.body.dataset.root || '../';
const pageKey = document.body.dataset.page || 'overview';
const appRoot = document.getElementById('app');
const esc = (value = '') => String(value).replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
const money = (value, currency) => {
  if (value == null || value === '') return '—';
  const number = Number(value);
  if (!Number.isFinite(number) || !currency) return '—';
  try { return new Intl.NumberFormat(undefined, { style: 'currency', currency }).format(number); }
  catch { return `${number.toLocaleString()} ${currency || ''}`.trim(); }
};
const dateText = (value) => value?.toDate ? value.toDate().toLocaleString() : '—';
const validTradingViewSymbol = (value) => typeof value === 'string' && /^[A-Z0-9][A-Z0-9._:-]*$/i.test(value.trim());
const panel = (title, body, action = '') => `<section class="dash-panel glass-panel rise-in"><header class="panel-heading"><h2>${title}</h2>${action}</header>${body}</section>`;
const empty = (text) => `<div class="empty-state">${esc(text)}</div>`;
const input = (label, name, type = 'text', extra = '') => `<label>${label}<input name="${name}" type="${type}" ${extra}></label>`;
const fieldSelect = (label, name, options, extra = '') => `<label>${label}<select name="${name}" ${extra}>${options.map(([value, text]) => `<option value="${esc(value)}">${esc(text)}</option>`).join('')}</select></label>`;

let session;
let currency = '';
let activeMarkets = [];
let tradingViewPromise;
let chartCounter = 0;

function renderShell() {
  const [title, description] = pageTitles[pageKey] || pageTitles.overview;
  const nav = renderModernNavigation(activeNavKey(pageKey), ROOT);
  document.title = `${title} | Vertix Trade`;
  appRoot.innerHTML = `
    <div class="dashboard-layout">
      <aside class="dashboard-sidebar" id="dashboard-sidebar">
        <a class="brand dashboard-brand" href="${ROOT}index.html"><span class="brand-mark"><img src="${ROOT}assets/vertix-trade-mark.png" alt=""></span><span>VERTIX<span class="brand-light"> TRADE</span></span></a>
        <div class="member-card"><span class="member-avatar" data-member-initials>VT</span><span><b data-member-name>Account holder</b><small>Member account</small></span><i class="online-dot"></i></div>
        <nav class="dashboard-nav" aria-label="Member dashboard">${nav}</nav>
        <div class="sidebar-bottom"><div class="support-glass"><small>SUPPORT</small><p>Contact Vertix Trade support.</p><a href="mailto:hello@vertixtrade.com">Email support ↗</a></div><a class="side-link logout-link" href="${ROOT}login.html" data-logout><span class="side-icon">↩</span>Logout</a></div>
      </aside>
      <main class="dashboard-main">
        <header class="dashboard-topbar"><button class="mobile-nav-toggle" type="button" aria-label="Open navigation" aria-expanded="false">☰</button><div class="breadcrumb">ACCOUNT / ${esc(title.toUpperCase())}</div><div class="topbar-actions"><span class="market-open"><i class="online-dot"></i> <span data-account-status>Account</span></span><a class="topbar-icon" href="${ROOT}dashboard/profile.html" aria-label="Profile" data-member-initials>VT</a></div></header>
        <section class="page-intro rise-in"><div><span class="eyebrow"><span class="pulse-dot"></span> VERTIX TRADE / MEMBER SPACE</span><h1>${esc(title)}</h1><p>${esc(description)}</p></div></section>
        <div class="page-content" id="member-page-content">${empty('Loading account information…')}</div>
        <footer class="dashboard-footer"><span>© 2026 Vertix Trade</span><span>Account services</span></footer>
      </main>
    </div>`;

  const toggle = document.querySelector('.mobile-nav-toggle');
  toggle?.addEventListener('click', () => {
    const sidebar = document.getElementById('dashboard-sidebar');
    const opened = sidebar.classList.toggle('mobile-open');
    toggle.setAttribute('aria-expanded', String(opened));
  });
  document.addEventListener('click', async (event) => {
    if (!event.target.closest('[data-logout]')) return;
    event.preventDefault();
    const { signOutUser } = await import('./firebase.js');
    await signOutUser();
    window.location.assign(`${ROOT}login.html`);
  });
}

function renderTable(title, headings, rows) {
  if (!rows.length) return panel(title, empty('No records are available.'));
  return panel(title, `<div class="table-wrap"><table><thead><tr>${headings.map((item) => `<th>${esc(item)}</th>`).join('')}</tr></thead><tbody>${rows.join('')}</tbody></table></div>`);
}

function requestForm(type) {
  if (!currency) return panel('Account currency', `<p class="muted-copy">Select your account currency in settings before submitting an amount request.</p><a class="button button-outline" href="${ROOT}dashboard/account-settings.html">Open Account Settings</a>`);
  if (type === 'trade') {
    const options = activeMarkets.map((item) => [item.id, `${item.displayName || item.symbol} · ${item.symbol}`]);
    if (!options.length) return panel('Trade order request', empty('No markets are currently listed.'));
    return panel('Trade order request', `<form method="post" class="standard-form" data-request-form="trade">
      ${fieldSelect('Market', 'marketId', options, 'required')}
      ${fieldSelect('Side', 'side', [['buy', 'Buy'], ['sell', 'Sell']], 'required')}
      ${input('Order size', 'amount', 'number', 'min="0.01" step="0.01" required')}
      ${fieldSelect('Leverage', 'leverage', [['1', '1×'], ['2', '2×'], ['5', '5×'], ['10', '10×']], 'required')}
      ${fieldSelect('Duration', 'duration', [['1h', '1 hour'], ['4h', '4 hours'], ['1d', '1 day']], 'required')}
      <button class="button button-primary" type="submit">Open trade ↗</button>
      <p class="form-disclosure">Trades open immediately when your available balance covers the order. Deposits and withdrawals still require administrator approval.</p>
      <p class="form-status" aria-live="polite"></p>
    </form>`);
  }

  const isDeposit = type === 'deposit';
  const labels = isDeposit ? 'Deposit request' : 'Withdrawal request';
  const form = `<form method="post" class="standard-form" data-request-form="${type}">
    ${input(`Amount (${currency})`, 'amount', 'number', 'min="0.01" step="0.01" required')}
    ${isDeposit
      ? fieldSelect('Funding method', 'method', [['bank_transfer', 'Bank transfer'], ['digital_asset', 'Digital asset']], 'required')
      : input('Saved destination reference', 'destination', 'text', 'maxlength="100" required')}
    <button class="button button-primary" type="submit">Submit ${isDeposit ? 'deposit' : 'withdrawal'} request ↗</button>
    <p class="form-disclosure">${isDeposit ? 'This request does not transfer or credit funds. An administrator records it only after the external deposit is received.' : 'This request does not send funds. An administrator records it only after the external withdrawal is sent.'}</p>
    <p class="form-status" aria-live="polite"></p>
  </form>`;
  return panel(labels, form);
}

async function renderPage() {
  const content = document.getElementById('member-page-content');
  const uid = session.user.uid;
  const profile = session.profile;
  currency = profile.preferredCurrency || '';
  activeMarkets = (await listPublicRecords('marketAssets')).filter((item) => item.active === true);
  const [requests, trades, transactions] = await Promise.all([
    listUserRecords(uid, 'requests'),
    listUserRecords(uid, 'trades'),
    listUserRecords(uid, 'transactions')
  ]);
  const byTime = (a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0);
  const userRequests = requests.slice().sort(byTime);

  if (pageKey === 'deposits' || pageKey === 'withdrawals') {
    const type = pageKey === 'deposits' ? 'deposit' : 'withdrawal';
    const filtered = userRequests.filter((item) => item.type === type);
    content.innerHTML = `<div class="content-grid"><div>${requestForm(type)}${panel('Request history', filtered.length ? `<div class="activity-list">${filtered.map((item) => `<div><i class="activity-dot"></i><span><b>${esc(item.status || 'submitted')}</b><small>${esc(item.method || item.destination || '—')} · ${esc(item.currency || currency)} · ${esc(item.amount ?? '—')}</small></span><time>${esc(dateText(item.createdAt))}</time></div>`).join('')}</div>` : empty('No requests have been submitted.'))}</div><aside>${panel('Account currency', `<strong class="large-value">${esc(currency)}</strong><p class="muted-copy">Amounts on this page use your account currency preference.</p>`)}</aside></div>`;
  } else if (pageKey === 'trade') {
    const mine = userRequests.filter((item) => item.type === 'trade');
    const rows = mine.map((item) => `<tr><td><b>${esc(item.symbol || '—')}</b></td><td>${esc(item.side || '—')}</td><td>${esc(money(item.amount, item.currency || currency))}</td><td>${esc(item.status || 'submitted')}</td><td>${esc(dateText(item.createdAt))}</td></tr>`);
    const balanceCurrency = profile.balanceCurrency || currency;
    const accountBalance = profile.balance == null || (balanceCurrency !== currency && profile.balance !== 0) ? '—' : money(profile.balance, currency);
    content.innerHTML = `<div class="content-grid"><div>${requestForm('trade')}${renderTable('Order requests', ['Market', 'Side', 'Size', 'Status', 'Submitted'], rows)}</div><aside>${panel('Account balance', `<strong class="large-value">${esc(accountBalance)}</strong><p class="muted-copy">${esc(currency)}</p>`)}</aside></div>`;
  } else if (pageKey === 'tradinghistory') {
    const rows = trades.slice().sort(byTime).map((item) => `<tr><td><b>${esc(item.symbol || item.market || '—')}</b></td><td>${esc(item.side || '—')}</td><td>${esc(money(item.amount, item.currency || currency))}</td><td>${esc(item.status || '—')}</td><td>${esc(dateText(item.createdAt))}</td></tr>`);
    content.innerHTML = renderTable('Trade history', ['Market', 'Side', 'Size', 'Status', 'Date'], rows);
  } else if (pageKey === 'accounthistory') {
    const outstandingRequests = userRequests.filter((item) => !item.resultId);
    const rows = [...transactions, ...outstandingRequests].sort(byTime).map((item) => `<tr><td><b>${esc(item.type || 'Transaction')}</b></td><td>${esc(item.method || item.symbol || item.destination || '—')}</td><td>${esc(money(item.amount, item.currency || currency))}</td><td>${esc(item.status || '—')}</td><td>${esc(dateText(item.completedAt || item.createdAt))}</td></tr>`);
    content.innerHTML = renderTable('Transactions', ['Type', 'Details', 'Amount', 'Status', 'Date'], rows);
  } else if (pageKey === 'copy-trading') {
    const strategies = await listPublicRecords('copyStrategies');
    content.innerHTML = strategies.length ? `<div class="feature-grid">${strategies.map((item) => `<article class="feature-card glass-panel rise-in"><span class="status-tag">${esc(item.status || 'Available')}</span><h2>${esc(item.name || 'Strategy')}</h2><p>${esc(item.description || '')}</p><div class="feature-metrics"><div><small>Risk level</small><b>${esc(item.riskLevel || '—')}</b></div><div><small>Provider</small><b>${esc(item.provider || '—')}</b></div></div></article>`).join('')}</div>` : empty('No copy strategies are available.');
  } else if (pageKey === 'buy-plan') {
    const plans = await listPublicRecords('plans');
    content.innerHTML = plans.length ? `<div class="feature-grid plans-grid">${plans.map((item) => `<article class="feature-card glass-panel rise-in"><span class="status-tag">${esc(item.status || 'Available')}</span><h2>${esc(item.name || 'Plan')}</h2><strong class="plan-price">${esc(money(item.price, item.currency || currency))}<small>${esc(item.billingPeriod || '')}</small></strong><p>${esc(item.description || '')}</p><button class="button button-outline" data-plan-request="${esc(item.id)}">Request subscription</button></article>`).join('')}</div>` : empty('No subscription plans are available.');
  } else if (pageKey === 'digitals-gallery') {
    const assets = await listPublicRecords('digitalAssets');
    content.innerHTML = assets.length ? `<div class="feature-grid">${assets.map((item) => `<article class="collectible-card glass-panel rise-in"><div class="collectible-art"><span>${esc(item.edition || '')}</span><b>V</b><small>${esc(item.category || 'Vertix Trade')}</small></div><h2>${esc(item.name || 'Digital asset')}</h2><p>${esc(item.description || '')}</p></article>`).join('')}</div>` : empty('No digital assets are available.');
  } else if (pageKey === 'signals') {
    const signals = await listPublicRecords('signals');
    const rows = signals.filter((item) => !/closed/i.test(item.status || '')).map((item) => { const confidence = item.confidence == null ? NaN : Number(item.confidence); return `<tr><td><b>${esc(item.asset || '—')}</b></td><td>${esc(item.pair || '—')}</td><td>${esc(item.direction || '—')}</td><td>${esc(item.timeframe || '—')}</td><td>${Number.isFinite(confidence) ? `${Math.max(0, Math.min(100, confidence))}%` : '—'}</td><td>${esc(item.status || '—')}</td></tr>`; });
    content.innerHTML = renderTable('Published signals', ['Asset', 'Pair', 'Direction', 'Timeframe', 'Confidence', 'Status'], rows);
  } else if (pageKey === 'loans-apply') {
    if (!currency) { content.innerHTML = panel('Account currency', `<p class="muted-copy">Select your account currency in settings before submitting an amount request.</p><a class="button button-outline" href="${ROOT}dashboard/account-settings.html">Open Account Settings</a>`); bindForms(); return; }
    const loanRequests = userRequests.filter((item) => item.type === 'loan');
    const form = `<form method="post" class="standard-form" data-request-form="loan">${input(`Requested amount (${currency})`, 'amount', 'number', 'min="0.01" step="0.01" required')}${fieldSelect('Purpose', 'purpose', [['business', 'Business'], ['personal', 'Personal'], ['other', 'Other']], 'required')}<label>Additional information<textarea name="message" rows="4" maxlength="1000"></textarea></label><button class="button button-primary" type="submit">Submit loan enquiry ↗</button><p class="form-status" aria-live="polite">Your enquiry will be recorded in your account.</p></form>`;
    content.innerHTML = `<div class="content-grid"><div>${panel('Loan enquiry', form)}${renderTable('Enquiry history', ['Type', 'Purpose', 'Amount', 'Status', 'Date'], loanRequests.map((item) => `<tr><td><b>Loan enquiry</b></td><td>${esc(item.purpose || '—')}</td><td>${esc(money(item.amount, item.currency || currency))}</td><td>${esc(item.status || '—')}</td><td>${esc(dateText(item.createdAt))}</td></tr>`))}</div><aside>${panel('Account currency', `<strong class="large-value">${esc(currency)}</strong>`)}</aside></div>`;
  } else if (pageKey === 'news') {
    const items = await listPublicRecords('news');
    content.innerHTML = items.length ? `<div class="news-list">${items.map((item) => `<article class="news-card glass-panel rise-in"><div class="news-index">↗</div><div><span class="content-label">${esc(item.category || 'News')}</span><h2>${esc(item.title || 'Market update')}</h2><p>${esc(item.summary || item.body || '')}</p><small>${esc(dateText(item.publishedAt || item.createdAt))}</small></div></article>`).join('')}</div>` : empty('No market updates are available.');
  } else if (pageKey === 'profile') {
    const form = `<form method="post" class="standard-form" data-profile-form>
      ${input('Mobile phone', 'phoneNumber', 'tel', `required maxlength="30" value="${esc(profile.phoneNumber || '')}"`)}
      ${input('Address line 1', 'addressLine1', 'text', `required maxlength="160" value="${esc(profile.addressLine1 || '')}"`)}
      ${input('Address line 2', 'addressLine2', 'text', `maxlength="160" value="${esc(profile.addressLine2 || '')}"`)}
      ${input('City / town', 'city', 'text', `required maxlength="100" value="${esc(profile.city || '')}"`)}
      ${input('State / region', 'region', 'text', `maxlength="100" value="${esc(profile.region || '')}"`)}
      ${input('Postal code', 'postalCode', 'text', `required maxlength="24" value="${esc(profile.postalCode || '')}"`)}
      <button class="button button-primary" type="submit">Save profile</button><p class="form-status" aria-live="polite"></p>
    </form>`;
    content.innerHTML = `<div class="content-grid"><div>${panel('Profile details', `<div class="profile-block"><span class="profile-large">${esc((profile.legalName || 'VT').split(/\s+/).map((part) => part[0]).join('').slice(0, 2).toUpperCase())}</span><div><h3>${esc(profile.legalName || 'Account holder')}</h3><p>${esc(session.user.email || '')}</p></div></div><div class="detail-list"><div><span>Country of residence</span><b>${esc(profile.countryOfResidence || '—')}</b></div><div><span>Nationality</span><b>${esc(profile.nationality || '—')}</b></div><div><span>Date of birth</span><b>${esc(profile.dateOfBirth || '—')}</b></div><div><span>Preferred currency</span><b>${esc(currency)}</b></div><div><span>Account status</span><b>${esc(profile.accountStatus || '—')}</b></div></div>`)}</div><aside>${panel('Contact and address', form)}</aside></div>`;
  } else if (pageKey === 'account-settings') {
    const settings = await listUserRecords(uid, 'settings');
    const ui = settings.find((item) => item.id === 'ui') || {};
    const currencyOptions = typeof Intl.supportedValuesOf === 'function' ? Intl.supportedValuesOf('currency') : ['AUD', 'CAD', 'CHF', 'CNY', 'EUR', 'GBP', 'INR', 'JPY', 'NGN', 'NZD', 'SGD', 'USD', 'ZAR'];
    const currencySelect = `<label>Preferred account currency<select name="preferredCurrency" required><option value="">Select a currency</option>${currencyOptions.map((code) => `<option value="${esc(code)}" ${code === currency ? 'selected' : ''}>${esc(code)}</option>`).join('')}</select></label>`;
    const form = `<form method="post" class="standard-form" data-settings-form>${currencySelect}<label class="toggle-row"><input name="reduceMotion" type="checkbox" ${ui.reduceMotion ? 'checked' : ''}> Reduce motion</label><button class="button button-primary" type="submit">Save settings</button><p class="form-status" aria-live="polite"></p></form>`;
    content.innerHTML = `<div class="content-grid"><div>${panel('Display preferences', form)}</div><aside>${panel('Account information', `<div class="detail-list"><div><span>Email</span><b>${esc(session.user.email || '—')}</b></div><div><span>Account status</span><b>${esc(profile.accountStatus || '—')}</b></div><div><span>Verification status</span><b>${esc(session.user.emailVerified ? 'Email verified' : 'Email verification required')}</b></div></div>`)}</aside></div>`;
  } else if (pageKey === 'referuser') {
    const referrals = await listUserRecords(uid, 'referrals');
    content.innerHTML = `<div class="content-grid"><div>${panel('Your referral code', `<p class="panel-copy">Share this code with people you invite to Vertix Trade.</p><div class="referral-code"><code>${esc(profile.referralCode || '—')}</code><button class="button button-primary" type="button" data-copy-code>Copy code</button></div><p class="form-status" data-referral-status aria-live="polite"></p>`)}</div><aside>${panel('Referral activity', `<div class="stat-grid compact-stats"><article><small>Recorded referrals</small><b>${referrals.length}</b></article></div>`)}</aside></div>`;
  } else if (pageKey === 'technical') {
    const signals = await listPublicRecords('signals');
    const analysis = signals.filter((item) => item.technicalSummary || item.analysis);
    content.innerHTML = analysis.length ? `<div class="feature-grid">${analysis.map((item) => `<article class="indicator-card glass-panel rise-in"><span class="content-label">${esc(item.pair || item.asset || '')}</span><h2>${esc(item.title || 'Technical analysis')}</h2><strong>${esc(item.direction || '')}</strong><p>${esc(item.technicalSummary || item.analysis)}</p></article>`).join('')}</div>` : empty('No technical analysis has been published.');
  } else if (pageKey === 'chart') {
    const marketOptions = activeMarkets.filter((item) => validTradingViewSymbol(item.tradingViewSymbol));
    const select = `<label>Market<select id="chart-market">${marketOptions.map((item) => `<option value="${esc(item.tradingViewSymbol)}">${esc(item.displayName || item.symbol)}</option>`).join('')}</select></label>`;
    content.innerHTML = marketOptions.length ? `${panel('Live market chart', `${select}<div id="member-tradingview-chart" class="market-chart-frame"></div>`)}<p class="inline-note">Market chart data is provided by TradingView.</p>` : empty('No chart-enabled markets are listed.');
    if (marketOptions.length) mountTradingViewChart(marketOptions[0].tradingViewSymbol, 'member-tradingview-chart');
    document.getElementById('chart-market')?.addEventListener('change', (event) => mountTradingViewChart(event.target.value, 'member-tradingview-chart'));
  } else if (pageKey === 'calendar') {
    const items = await listPublicRecords('marketCalendar');
    const events = items.slice().sort((a, b) => String(a.date || '').localeCompare(String(b.date || '')));
    content.innerHTML = events.length ? panel('Market events', `<div class="calendar-list">${events.map((item) => `<article class="calendar-event rise-in"><div><b>${esc(item.date || '—')}</b><small>${esc(item.time || '')}</small></div><i class="event-line"></i><span><b>${esc(item.title || 'Market event')}</b><small>${esc(item.market || item.currency || '')}</small></span><span class="status-tag">${esc(item.status || '')}</span></article>`).join('')}</div>`) : empty('No market events are scheduled.');
  } else {
    content.innerHTML = empty('No page content is available.');
  }

  bindForms();
}

function mountTradingViewChart(symbol, targetId) {
  const target = document.getElementById(targetId);
  if (!target) return;
  if (!validTradingViewSymbol(symbol)) {
    target.textContent = 'This listing has an invalid chart symbol.';
    return;
  }
  const selectedSymbol = symbol.trim();
  target.dataset.chartSymbol = selectedSymbol;
  target.replaceChildren();
  target.setAttribute('aria-busy', 'true');
  const load = () => {
    if (window.TradingView?.widget) return Promise.resolve();
    if (!tradingViewPromise) {
      tradingViewPromise = new Promise((resolve, reject) => {
        const script = document.createElement('script');
        script.src = 'https://s3.tradingview.com/tv.js';
        script.async = true;
        script.onload = () => window.TradingView?.widget ? resolve() : reject(new Error('Chart service unavailable'));
        script.onerror = () => reject(new Error('Chart service unavailable'));
        document.head.append(script);
      });
    }
    return tradingViewPromise;
  };
  load().then(() => {
    if (target.dataset.chartSymbol !== selectedSymbol) return;
    const mount = document.createElement('div');
    mount.id = `vt-member-chart-${++chartCounter}`;
    mount.className = 'market-chart-embed-inner';
    target.append(mount);
    new window.TradingView.widget({ autosize: true, symbol: selectedSymbol, interval: 'D', timezone: 'Etc/UTC', theme: 'dark', style: '1', locale: 'en', withdateranges: true, allow_symbol_change: false, save_image: false, container_id: mount.id });
  }).catch(() => {
    target.textContent = 'The chart service is temporarily unavailable. Refresh to try again.';
  }).finally(() => target.removeAttribute('aria-busy'));
}

function bindForms() {
  document.querySelectorAll('[data-request-form]').forEach((form) => {
    form.addEventListener('submit', async (event) => {
      event.preventDefault();
      const data = new FormData(form);
      const type = form.dataset.requestForm;
      const fields = { currency };
      for (const key of ['amount', 'leverage', 'marketId', 'symbol', 'side', 'duration', 'method', 'destination', 'purpose', 'message']) {
        if (data.has(key)) fields[key] = ['amount', 'leverage'].includes(key) ? Number(data.get(key)) : String(data.get(key)).trim();
      }
      if (type === 'trade') {
        const market = activeMarkets.find((item) => item.id === fields.marketId && item.active === true);
        if (!market?.symbol) {
          setFormStatus(form, 'Select an active market listing.');
          return;
        }
        fields.symbol = market.symbol;
      }
      if (type !== 'support' && !currency) {
        setFormStatus(form, 'Select an account currency in Account Settings before submitting an amount request.');
        return;
      }
      if (type === 'trade' && (!fields.symbol || !activeMarkets.some((item) => (item.symbol || item.id) === fields.symbol))) {
        setFormStatus(form, 'Select a listed market.');
        return;
      }
      if (fields.amount !== undefined && (!Number.isFinite(fields.amount) || fields.amount <= 0)) {
        setFormStatus(form, 'Enter an amount greater than zero.');
        return;
      }
      if (type === 'trade' && (!Number.isFinite(fields.leverage) || fields.leverage < 1 || fields.leverage > 10)) {
        setFormStatus(form, 'Select leverage between 1× and 10×.');
        return;
      }
      const button = form.querySelector('button[type="submit"]');
      button.disabled = true;
      try {
        if (type === 'trade') {
          const result = await openTrade(session.user.uid, { ...fields, entryPrice: 1 });
          setFormStatus(form, `Trade opened. Reference: ${result.recordId}. Remaining balance: ${result.balanceAfter.toLocaleString()} ${currency}.`, 'success');
        } else {
          const id = await createUserRequest(session.user.uid, type, fields);
          setFormStatus(form, `Request submitted. Reference: ${id}`, 'success');
        }
        form.reset();
        await renderPage();
      } catch (error) {
        setFormStatus(form, error.message || 'Your request could not be submitted.');
      } finally {
        button.disabled = false;
      }
    });
  });

  document.querySelector('[data-profile-form]')?.addEventListener('submit', async (event) => {
    event.preventDefault();
    const form = event.currentTarget;
    const values = Object.fromEntries(new FormData(form).entries());
    try {
      await updateUserProfile(session.user.uid, values);
      session.profile = { ...session.profile, ...values };
      setFormStatus(form, 'Profile saved.', 'success');
    } catch (error) {
      setFormStatus(form, error.message || 'Your profile could not be saved.');
    }
  });

  document.querySelector('[data-settings-form]')?.addEventListener('submit', async (event) => {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    try {
      const newCurrency = String(data.get('preferredCurrency') || currency);
      await updateUserProfile(session.user.uid, { preferredCurrency: newCurrency });
      await saveUserSetting(session.user.uid, 'ui', { reduceMotion: data.has('reduceMotion') });
      session.profile.preferredCurrency = newCurrency;
      setFormStatus(form, 'Settings saved.', 'success');
      await renderPage();
    } catch (error) {
      setFormStatus(form, error.message || 'Your settings could not be saved.');
    }
  });

  document.querySelectorAll('[data-plan-request]').forEach((button) => button.addEventListener('click', async () => {
    button.disabled = true;
    try {
      if (!currency) throw new Error('Select an account currency in Account Settings before submitting a subscription request.');
      const plan = (await listPublicRecords('plans')).find((item) => item.id === button.dataset.planRequest);
      if (!plan) throw new Error('This plan is no longer available.');
      await createUserRequest(session.user.uid, 'plan', { planId: plan.id, amount: Number(plan.price) || 0, currency: plan.currency || currency });
      button.textContent = 'Request submitted';
    } catch (error) {
      button.disabled = false;
      window.alert(error.message || 'The request could not be submitted.');
    }
  }));

  document.querySelector('[data-copy-code]')?.addEventListener('click', async () => {
    const target = document.querySelector('[data-referral-status]');
    try {
      await navigator.clipboard.writeText(session.profile.referralCode || '');
      target.textContent = 'Referral code copied.';
    } catch {
      target.textContent = session.profile.referralCode || '';
    }
  });
}

function setFormStatus(form, message, tone = 'error') {
  const target = form.querySelector('.form-status');
  if (target) {
    target.textContent = message;
    target.dataset.tone = tone;
  }
}

async function start() {
  await initializeFirebase();
  session = await requireMember();
  if (!session) return;
  renderShell();
  const displayName = session.profile.legalName || session.user.displayName || 'Account holder';
  document.querySelectorAll('[data-member-name]').forEach((node) => { node.textContent = displayName; });
  const initials = displayName.split(/\s+/).map((part) => part[0]).join('').slice(0, 2).toUpperCase();
  document.querySelectorAll('[data-member-initials]').forEach((node) => { node.textContent = initials || 'VT'; });
  const status = session.profile.accountStatus || 'Account';
  document.querySelectorAll('[data-account-status]').forEach((node) => { node.textContent = status.replaceAll('_', ' '); });
  await renderPage();
}

start().catch((error) => {
  if (!appRoot) return;
  appRoot.innerHTML = `<main class="page-loading">${esc(error.message || 'Account information could not be loaded.')}</main>`;
});

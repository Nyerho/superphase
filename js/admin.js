import { starterRecords } from './catalog.js';
import {
  requireAdmin,
  listRecords,
  listAllUserRequests,
  createRecord,
  updateRecord,
  deleteRecord,
  getUserProfile,
  updateUserRequest,
  processUserRequest,
  saveFundingMethod,
  getPlatformSettings,
  savePlatformSettings,
  setMemberBalance,
  addManualTrade,
  addManualTransaction,
  updateMemberKyc
} from './firebase.js';

const qs = (selector) => document.querySelector(selector);
const esc = (value = '') => String(value).replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
const label = (value) => esc(value || '—');
const timeText = (value) => value?.toDate ? value.toDate().toLocaleString() : '—';
const MARKET_CATEGORIES = [
  ['crypto', 'Cryptocurrency'], ['stocks', 'Stocks & equities'], ['forex', 'Forex'],
  ['indices', 'Indices'], ['commodities', 'Commodities'], ['other', 'Other']
];
const validTradingViewSymbol = (value) => !value || /^[A-Z0-9][A-Z0-9._:-]*$/i.test(value.trim());
const validMarketSymbol = (value) => /^[A-Z0-9][A-Z0-9._:-]{0,39}$/i.test(value.trim());
const catalogCache = { plans: [], digitalAssets: [] };
const SYSTEM_ADMIN_UID = 'z3KAMbKcGFNYVWH2OKHtz4AT1rs2';

function status(message, tone = 'error') {
  const node = qs('#admin-status');
  if (node) {
    node.textContent = message;
    node.dataset.tone = tone;
  }
}

function empty(text) {
  return `<div class="empty-state">${esc(text)}</div>`;
}

function normalizeCategory(value) {
  const type = String(value || '').toLowerCase();
  if (type.includes('crypto')) return 'crypto';
  if (type.includes('stock') || type.includes('equity')) return 'stocks';
  if (type.includes('forex') || type === 'fx') return 'forex';
  if (type.includes('index') || type.includes('indices')) return 'indices';
  if (type.includes('commod')) return 'commodities';
  return 'other';
}

function categoryOptions(selected) {
  return MARKET_CATEGORIES.map(([value, title]) => `<option value="${value}" ${value === selected ? 'selected' : ''}>${title}</option>`).join('');
}

function marketRow(item) {
  const active = item.active === true;
  const id = esc(item.id);
  return `<article class="admin-market-record" data-id="${id}">
    <div class="admin-market-summary"><div><b>${label(item.displayName)}</b><small>${label(item.symbol)} · ${label(item.assetType)} · ${label(item.tradingViewSymbol || 'No chart symbol')}</small></div><span class="status-pill">${active ? 'Active' : 'Hidden'}</span></div>
    <div class="crud-actions"><button type="button" data-market-edit-toggle>Edit</button><button type="button" data-market-active-toggle data-active="${active}">${active ? 'Hide' : 'Activate'}</button><button type="button" data-action="delete-asset">Remove</button></div>
    <form class="admin-market-edit" data-market-edit="${id}" method="post" hidden>
      <label>Display name<input name="displayName" required maxlength="80" value="${esc(item.displayName || '')}"></label>
      <label>Canonical symbol<input name="symbol" required maxlength="40" value="${esc(item.symbol || '')}" readonly></label>
      <label>Market category<select name="assetType" required>${categoryOptions(normalizeCategory(item.assetType))}</select></label>
      <label>TradingView symbol<input name="tradingViewSymbol" maxlength="80" value="${esc(item.tradingViewSymbol || '')}"></label>
      <label class="admin-checkbox"><input name="active" type="checkbox" ${active ? 'checked' : ''}> Active and visible to members</label>
      <button class="button button-primary button-small" type="submit">Save market</button>
    </form>
  </article>`;
}

function catalogRow(collectionName, item, title) {
  return `<div class="admin-list-row" data-catalog-row="${esc(collectionName)}" data-id="${esc(item.id)}"><div><b>${label(title)}</b><small>${label(item.status || 'Available')}</small></div><div class="crud-actions"><button type="button" data-catalog-edit="${esc(collectionName)}" data-id="${esc(item.id)}">Edit</button><button type="button" data-catalog-delete="${esc(collectionName)}" data-id="${esc(item.id)}">Remove</button></div></div>`;
}

function requestActions(item) {
  const uid = esc(item.uid || '');
  const id = esc(item.id);
  const closed = Boolean(item.resultId) || ['rejected', 'completed'].includes(item.status);
  const statusControls = closed ? '' : `<div class="crud-actions"><button type="button" data-request-status="processing" data-uid="${uid}" data-id="${id}">In review</button><button type="button" data-request-status="rejected" data-uid="${uid}" data-id="${id}">Reject</button><button type="button" data-request-status="reviewed" data-uid="${uid}" data-id="${id}">Mark reviewed</button></div>`;
  if (closed) return statusControls || `<small>${item.resultId ? 'Activity record created' : 'Closed'}</small>`;
  if (item.type === 'trade') {
    return `${statusControls}<form class="admin-process-form" data-process-form="trade" data-uid="${uid}" data-id="${id}" method="post"><label>Actual execution price<input name="executionPrice" type="number" min="0.00000001" step="any" required></label><button class="button button-primary button-small" type="submit">Record trade opened</button></form>`;
  }
  if (item.type === 'deposit') {
    return `${statusControls}<form class="admin-process-form" data-process-form="deposit" data-uid="${uid}" data-id="${id}" method="post"><button class="button button-primary button-small" type="submit">Record deposit received</button></form>`;
  }
  if (item.type === 'withdrawal') {
    return `${statusControls}<form class="admin-process-form" data-process-form="withdrawal" data-uid="${uid}" data-id="${id}" method="post"><button class="button button-primary button-small" type="submit">Record withdrawal sent</button></form>`;
  }
  return statusControls;
}

async function seedStarterContent() {
  for (const collectionName of ['signals', 'marketAssets', 'copyStrategies', 'plans', 'digitalAssets', 'news', 'marketCalendar']) {
    const existing = await listRecords(collectionName);
    for (const record of starterRecords(collectionName)) {
      if (existing.some((item) => item.id === record.id || (collectionName === 'marketAssets' && item.symbol === record.symbol))) continue;
      try {
        const { id, ...data } = record;
        await createRecord(collectionName, data);
      } catch (error) { console.warn(`Starter ${collectionName} record skipped`, error); }
    }
  }
}

async function render() {
  await seedStarterContent();
  const [users, signals, assets, fundingMethods, plans, digitalAssets, requests] = await Promise.all([
    listRecords('users'),
    listRecords('signals'),
    listRecords('marketAssets'),
    listRecords('fundingMethods'),
    listRecords('plans'),
    listRecords('digitalAssets'),
    listAllUserRequests()
  ]);
  const members = users.filter((item) => (item.uid || item.id) !== SYSTEM_ADMIN_UID);
  catalogCache.plans = plans;
  catalogCache.digitalAssets = digitalAssets;

  qs('#member-count').textContent = String(members.length);
  qs('#signal-count').textContent = String(signals.length);
  qs('#asset-count').textContent = String(assets.length);
  qs('#request-count').textContent = String(requests.filter((item) => item.status === 'submitted').length);

  qs('#signals-list').innerHTML = signals.length ? signals.map((item) => `
    <div class="admin-list-row admin-record-row" data-id="${esc(item.id)}">
      <div><b>${label(item.asset)}</b><small>${label(item.pair)} · ${label(item.timeframe)}</small></div>
      <span>${label(item.direction)}</span><span class="status-pill">${label(item.status)}</span>
      <span>${Number.isFinite(Number(item.confidence)) ? `${Number(item.confidence)}%` : '—'}</span>
      <div class="crud-actions"><button type="button" data-action="delete-signal">Remove</button></div>
    </div>`).join('') : empty('No signals have been published.');

  qs('#assets-list').innerHTML = assets.length ? assets.slice().sort((a, b) => String(a.displayName || '').localeCompare(String(b.displayName || ''))).map(marketRow).join('') : empty('No market assets are listed.');
  qs('#funding-list').innerHTML = fundingMethods.length ? fundingMethods.map((item) => `<div class="admin-list-row"><div><b>${label(item.label || item.method)}</b><small>${label(item.currency || 'Any currency')} · ${item.enabled === true ? 'Enabled' : 'Disabled'}</small></div><span class="status-pill">${label(item.method)}</span></div>`).join('') : empty('No deposit methods configured.');
  qs('#plans-list').innerHTML = plans.length ? plans.map((item) => catalogRow('plans', item, `${item.name || 'Plan'} · ${item.price || 0} ${item.currency || ''}`)).join('') : empty('No subscription plans configured.');
  qs('#digital-assets-list').innerHTML = digitalAssets.length ? digitalAssets.map((item) => catalogRow('digitalAssets', item, `${item.name || 'Digital asset'} · ${item.edition || ''}`)).join('') : empty('No digital assets configured.');
  qs('#users-list').innerHTML = members.length ? members.map((item) => `
    <div class="admin-list-row admin-user-row">
      <div><b>${label(item.legalName)}</b><small>${label(item.email)}</small></div>
      <span>${label(item.countryOfResidence)}</span>
      <span>${label(item.preferredCurrency)}</span>
      <span class="status-pill">${label(item.accountStatus)}</span><span class="status-pill">KYC: ${label(item.kycStatus || 'not_started')}</span><div class="crud-actions"><button type="button" data-kyc-status="verified" data-uid="${esc(item.uid || item.id)}">Verify KYC</button><button type="button" data-kyc-status="not_started" data-uid="${esc(item.uid || item.id)}">Reset KYC</button></div>
    </div>`).join('') : empty('No member accounts are available.');
  const memberSelect = qs('#ledger-member');
  memberSelect.innerHTML = `<option value="">Select a member</option>${members.map((item) => `<option value="${esc(item.uid || item.id)}">${label(item.legalName || item.email)} · ${label(item.email)}</option>`).join('')}`;
  qs('#ledger-market').innerHTML = `<option value="">Select a market</option>${assets.filter((item) => item.active === true).map((item) => `<option value="${esc(item.id)}" data-symbol="${esc(item.symbol)}">${label(item.displayName)} · ${label(item.symbol)}</option>`).join('')}`;

  const latestRequests = requests.sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0)).slice(0, 20);
  const requestProfiles = await Promise.all(latestRequests.map((item) => getUserProfile(item.uid).catch(() => null)));
  qs('#requests-list').innerHTML = latestRequests.length ? latestRequests.map((item, index) => {
    const details = [item.symbol && `${item.symbol} ${item.side || ''}`, item.method, item.destination, item.purpose].filter(Boolean).join(' · ');
    return `<article class="admin-request-record">
      <div class="admin-request-summary"><div><b>${label(item.type)}</b><small>${label(requestProfiles[index]?.legalName || item.uid?.slice(0, 10))}${details ? ` · ${esc(details)}` : ''}</small></div>
        <span>${item.amount == null ? '—' : esc(item.amount)} ${label(item.currency || '')}</span><span class="status-pill">${label(item.status)}</span><small>${esc(timeText(item.createdAt))}</small></div>
      ${requestActions(item)}
    </article>`;
  }).join('') : empty('No member requests have been submitted.');
}

async function removeRecord(collectionName, id) {
  if (!window.confirm('Remove this record?')) return;
  await deleteRecord(collectionName, id);
  await render();
  status('Record removed.', 'success');
}

function marketValues(form) {
  const data = new FormData(form);
  const displayName = String(data.get('displayName') || '').trim();
  const symbol = String(data.get('symbol') || '').trim().toUpperCase();
  const tradingViewSymbol = String(data.get('tradingViewSymbol') || '').trim().toUpperCase();
  if (!validMarketSymbol(symbol)) throw new Error('Use a canonical market symbol without slashes, using letters, numbers, dots, colons, underscores or hyphens.');
  if (tradingViewSymbol && !validTradingViewSymbol(tradingViewSymbol)) {
    throw new Error('Use a valid TradingView symbol containing letters, numbers, dots, colons, underscores or hyphens.');
  }
  return { displayName, symbol, assetType: String(data.get('assetType') || 'other'), tradingViewSymbol, active: data.has('active') };
}

const fundingFieldNames = ['label', 'currency', 'bankName', 'accountName', 'accountNumber', 'routingNumber', 'iban', 'swift', 'network', 'walletAddress', 'paymentUrl', 'instructions'];
function fillFundingForm(record = {}) {
  const form = qs('#funding-form');
  if (!form) return;
  form.elements.namedItem('method').value = record.method || form.elements.namedItem('method').value;
  for (const name of fundingFieldNames) form.elements.namedItem(name).value = record[name] || '';
  form.elements.namedItem('enabled').checked = record.enabled === true;
}

async function loadFundingForm(method) {
  const records = await listRecords('fundingMethods');
  fillFundingForm(records.find((item) => item.id === method || item.method === method) || { method });
}

function fillPlatformSettings(settings = {}) {
  const form = qs('#platform-settings-form');
  if (!form) return;
  const defaults = { companyName: 'Vertix Trade', supportEmail: 'support@vertixtrades.com', depositMin: 10, depositMax: 100000, withdrawalMin: 10, withdrawalMax: 100000, depositFeePercent: 0, withdrawalFeePercent: 1 };
  for (const [name, fallback] of Object.entries(defaults)) form.elements.namedItem(name).value = settings[name] ?? fallback;
}

function fillCatalogForm(collectionName, record) {
  const form = qs(`[data-catalog-form="${collectionName}"]`);
  if (!form) return;
  for (const field of ['recordId', 'name', 'price', 'currency', 'billingPeriod', 'status', 'edition', 'category', 'description']) {
    if (form.elements.namedItem(field)) form.elements.namedItem(field).value = record[field] ?? '';
  }
  form.scrollIntoView({ behavior: 'smooth', block: 'center' });
}

function ledgerMemberId() {
  const uid = qs('#ledger-member')?.value;
  if (!uid) throw new Error('Select a member first.');
  return uid;
}

function ledgerDate(value) {
  const date = new Date(String(value || ''));
  if (Number.isNaN(date.getTime()) || date > new Date()) throw new Error('Enter a valid past or current effective date and time.');
  return date;
}

async function start() {
  const admin = await requireAdmin();
  if (!admin) return;
  qs('#admin-email').textContent = admin.email || 'Administrator';
  await loadFundingForm('bank_transfer');
  fillPlatformSettings(await getPlatformSettings());

  qs('#signal-form').addEventListener('submit', async (event) => {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    const confidence = Number(data.get('confidence'));
    if (!Number.isInteger(confidence) || confidence < 0 || confidence > 100) {
      status('Confidence must be a whole number between 0 and 100.');
      return;
    }
    try {
      await createRecord('signals', {
        asset: String(data.get('asset')).trim(), pair: String(data.get('pair')).trim(),
        direction: String(data.get('direction')), timeframe: String(data.get('timeframe')).trim(),
        confidence, status: String(data.get('status'))
      });
      form.reset();
      status('Signal published.', 'success');
      await render();
    } catch (error) {
      status(error.message || 'The signal could not be published.');
    }
  });

  qs('#asset-form').addEventListener('submit', async (event) => {
    event.preventDefault();
    const form = event.currentTarget;
    try {
      const asset = marketValues(form);
      const existing = await listRecords('marketAssets');
      if (existing.some((item) => String(item.symbol || '').toUpperCase() === asset.symbol)) throw new Error('That market symbol is already listed. Edit its existing record instead.');
      await createRecord('marketAssets', asset);
      form.reset();
      form.elements.namedItem('active').checked = true;
      status('Market listing added. Active listings appear in order selection; add a supported TradingView symbol to show charts.', 'success');
      await render();
    } catch (error) {
      status(error.message || 'The market listing could not be added.');
    }
  });

  qs('#funding-method').addEventListener('change', (event) => loadFundingForm(event.target.value).catch((error) => status(error.message || 'Funding method could not be loaded.')));
  qs('#funding-form').addEventListener('submit', async (event) => {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    const method = String(data.get('method') || '');
    try {
      const payload = { method, enabled: data.has('enabled') };
      for (const name of fundingFieldNames) payload[name] = String(data.get(name) || '').trim();
      await saveFundingMethod(method, payload);
      await render();
      status('Deposit method saved. Members will see it immediately.', 'success');
    } catch (error) {
      status(error.message || 'The deposit method could not be saved.');
    }
  });

  qs('#platform-settings-form').addEventListener('submit', async (event) => {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    try {
      await savePlatformSettings({
        companyName: String(data.get('companyName') || '').trim(),
        supportEmail: String(data.get('supportEmail') || '').trim(),
        ...Object.fromEntries(['depositMin', 'depositMax', 'withdrawalMin', 'withdrawalMax', 'depositFeePercent', 'withdrawalFeePercent'].map((name) => [name, Number(data.get(name))]))
      });
      status('Platform settings saved.', 'success');
    } catch (error) {
      status(error.message || 'Platform settings could not be saved.');
    }
  });

  document.querySelectorAll('[data-catalog-form]').forEach((form) => form.addEventListener('submit', async (event) => {
    event.preventDefault();
    const collectionName = form.dataset.catalogForm;
    const data = new FormData(form);
    const recordId = String(data.get('recordId') || '').trim();
    const payload = { name: String(data.get('name') || '').trim(), status: String(data.get('status') || 'Available'), description: String(data.get('description') || '').trim() };
    if (collectionName === 'plans') Object.assign(payload, { price: Number(data.get('price')), currency: String(data.get('currency') || 'USD').trim().toUpperCase(), billingPeriod: String(data.get('billingPeriod') || '').trim() });
    else Object.assign(payload, { edition: String(data.get('edition') || '').trim(), category: String(data.get('category') || '').trim() });
    try {
      if (recordId) await updateRecord(collectionName, recordId, payload);
      else await createRecord(collectionName, payload);
      form.reset();
      form.elements.namedItem('recordId').value = '';
      await render();
      status(`${collectionName === 'plans' ? 'Subscription plan' : 'Digital asset'} saved.`, 'success');
    } catch (error) {
      status(error.message || 'Catalog record could not be saved.');
    }
  }));

  qs('#balance-form').addEventListener('submit', async (event) => {
    event.preventDefault();
    try {
      const uid = ledgerMemberId();
      const data = new FormData(event.currentTarget);
      await setMemberBalance(uid, Number(data.get('balance')), String(data.get('currency') || '').trim().toUpperCase());
      status('Member balance updated.', 'success');
      await render();
    } catch (error) { status(error.message || 'Member balance could not be updated.'); }
  });

  qs('#ledger-transaction-form').addEventListener('submit', async (event) => {
    event.preventDefault();
    try {
      const uid = ledgerMemberId();
      const data = new FormData(event.currentTarget);
      const type = String(data.get('type'));
      const details = String(data.get('details') || '').trim();
      await addManualTransaction(uid, { type, amount: Number(data.get('amount')), currency: String(data.get('currency') || '').trim().toUpperCase(), method: type === 'deposit' ? 'manual' : '', destination: type === 'withdrawal' ? (details || 'admin-manual') : '', at: ledgerDate(data.get('at')) });
      status('Backdated transaction added and balance adjusted atomically.', 'success');
      await render();
    } catch (error) { status(error.message || 'Transaction could not be added.'); }
  });

  qs('#ledger-trade-form').addEventListener('submit', async (event) => {
    event.preventDefault();
    try {
      const uid = ledgerMemberId();
      const data = new FormData(event.currentTarget);
      const market = qs('#ledger-market').selectedOptions[0];
      if (!market?.dataset.symbol) throw new Error('Select a market first.');
      await addManualTrade(uid, { marketId: data.get('marketId'), symbol: market.dataset.symbol, side: data.get('side'), amount: Number(data.get('amount')), entryPrice: Number(data.get('entryPrice')), leverage: Number(data.get('leverage')), currency: String(data.get('currency') || '').trim().toUpperCase(), at: ledgerDate(data.get('at')) });
      status('Backdated trade history added.', 'success');
      await render();
    } catch (error) { status(error.message || 'Trade history could not be added.'); }
  });

  document.addEventListener('submit', async (event) => {
    const editForm = event.target.closest('[data-market-edit]');
    if (editForm) {
      event.preventDefault();
      try {
        const asset = marketValues(editForm);
        const existing = await listRecords('marketAssets');
        if (existing.some((item) => item.id !== editForm.dataset.marketEdit && String(item.symbol || '').toUpperCase() === asset.symbol)) throw new Error('That market symbol is already listed.');
        await updateRecord('marketAssets', editForm.dataset.marketEdit, asset);
        await render();
        status('Market listing updated.', 'success');
      } catch (error) {
        status(error.message || 'The market listing could not be updated.');
      }
      return;
    }
    const processForm = event.target.closest('[data-process-form]');
    if (!processForm) return;
    event.preventDefault();
    const type = processForm.dataset.processForm;
    const instructions = type === 'trade'
      ? 'Confirm that this order was actually executed at the entered price.'
      : type === 'deposit'
        ? 'Confirm that the deposit was actually received before recording it.'
        : 'Confirm that the withdrawal was actually sent before recording it.';
    if (!window.confirm(instructions)) return;
    const button = processForm.querySelector('button[type="submit"]');
    button.disabled = true;
    try {
      const result = await processUserRequest(processForm.dataset.uid, processForm.dataset.id, {
        executionPrice: processForm.elements.namedItem('executionPrice')?.value,
        processedBy: admin.email || ''
      });
      await render();
      const balanceText = result.recordType === 'transaction' && result.balanceAfter != null
        ? ` New balance: ${Number(result.balanceAfter).toLocaleString()} ${result.balanceCurrency}.`
        : '';
      status(result.alreadyProcessed ? 'This request already has an activity record.' : `${type === 'trade' ? 'Open trade' : 'Transaction'} recorded for request ${result.recordId}.${balanceText}`, 'success');
    } catch (error) {
      button.disabled = false;
      status(error.message || 'This request could not be recorded.');
    }
  });

  document.addEventListener('click', async (event) => {
    if (event.target.closest('[data-logout]')) {
      event.preventDefault();
      const { signOutUser } = await import('./firebase.js');
      await signOutUser();
      window.location.assign('/login.html');
      return;
    }
    const catalogEdit = event.target.closest('[data-catalog-edit]');
    if (catalogEdit) {
      const records = catalogCache[catalogEdit.dataset.catalogEdit] || [];
      const record = records.find((item) => item.id === catalogEdit.dataset.id);
      if (record) fillCatalogForm(catalogEdit.dataset.catalogEdit, record);
      return;
    }
    const catalogDelete = event.target.closest('[data-catalog-delete]');
    if (catalogDelete) {
      if (!window.confirm('Remove this catalog record?')) return;
      try {
        await deleteRecord(catalogDelete.dataset.catalogDelete, catalogDelete.dataset.id);
        await render();
        status('Catalog record removed.', 'success');
      } catch (error) {
        status(error.message || 'Catalog record could not be removed.');
      }
      return;
    }
    const kycButton = event.target.closest('[data-kyc-status]');
    if (kycButton) {
      kycButton.disabled = true;
      try {
        await updateMemberKyc(kycButton.dataset.uid, kycButton.dataset.kycStatus);
        await render();
        status(`KYC marked ${kycButton.dataset.kycStatus.replace('_', ' ')}.`, 'success');
      } catch (error) {
        kycButton.disabled = false;
        status(error.message || 'KYC status could not be updated.');
      }
      return;
    }
    const requestButton = event.target.closest('[data-request-status]');
    if (requestButton) {
      requestButton.disabled = true;
      try {
        await updateUserRequest(requestButton.dataset.uid, requestButton.dataset.id, requestButton.dataset.requestStatus);
        await render();
        status('Request status updated.', 'success');
      } catch (error) {
        requestButton.disabled = false;
        status(error.message || 'The request status could not be updated.');
      }
      return;
    }
    const activeButton = event.target.closest('[data-market-active-toggle]');
    if (activeButton) {
      const record = activeButton.closest('[data-id]');
      activeButton.disabled = true;
      try {
        await updateRecord('marketAssets', record.dataset.id, { active: activeButton.dataset.active !== 'true' });
        await render();
        status('Market visibility updated.', 'success');
      } catch (error) {
        activeButton.disabled = false;
        status(error.message || 'Market visibility could not be updated.');
      }
      return;
    }
    const editButton = event.target.closest('[data-market-edit-toggle]');
    if (editButton) {
      const form = editButton.closest('[data-id]')?.querySelector('[data-market-edit]');
      if (form) form.hidden = !form.hidden;
      return;
    }
    const button = event.target.closest('[data-action]');
    if (!button) return;
    const row = button.closest('[data-id]');
    try {
      await removeRecord(button.dataset.action === 'delete-signal' ? 'signals' : 'marketAssets', row.dataset.id);
    } catch (error) {
      status(error.message || 'The record could not be removed.');
    }
  });

  qs('#refresh-data').addEventListener('click', () => render().catch((error) => status(error.message)));
  try {
    await render();
  } catch (error) {
    status(error.message || 'Administrator data could not be loaded.');
  }
}

start().catch((error) => status(error.message || 'Administrator access could not be verified.'));

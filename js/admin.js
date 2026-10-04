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
    if (existing.length) continue;
    for (const record of starterRecords(collectionName)) {
      try {
        const { id, ...data } = record;
        await createRecord(collectionName, data);
      } catch (error) { console.warn(`Starter ${collectionName} record skipped`, error); }
    }
  }
}

async function render() {
  await seedStarterContent();
  const [users, signals, assets, requests] = await Promise.all([
    listRecords('users'),
    listRecords('signals'),
    listRecords('marketAssets'),
    listAllUserRequests()
  ]);

  qs('#member-count').textContent = String(users.length);
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
  qs('#users-list').innerHTML = users.length ? users.map((item) => `
    <div class="admin-list-row admin-user-row">
      <div><b>${label(item.legalName)}</b><small>${label(item.email)}</small></div>
      <span>${label(item.countryOfResidence)}</span>
      <span>${label(item.preferredCurrency)}</span>
      <span class="status-pill">${label(item.accountStatus)}</span><span class="status-pill">KYC: ${label(item.kycStatus || 'not_started')}</span><div class="crud-actions"><button type="button" data-kyc-status="verified" data-uid="${esc(item.uid || item.id)}">Verify KYC</button><button type="button" data-kyc-status="not_started" data-uid="${esc(item.uid || item.id)}">Reset KYC</button></div>
    </div>`).join('') : empty('No member accounts are available.');

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

async function start() {
  const admin = await requireAdmin();
  if (!admin) return;
  qs('#admin-email').textContent = admin.email || 'Administrator';

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

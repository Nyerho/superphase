import {
  requireAdmin,
  listRecords,
  listAllUserRequests,
  createRecord,
  deleteRecord,
  getUserProfile,
  updateUserRequest
} from './firebase.js';

const qs = (selector) => document.querySelector(selector);
const esc = (value = '') => String(value).replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
const label = (value) => esc(value || '—');
const timeText = (value) => value?.toDate ? value.toDate().toLocaleString() : '—';

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

async function render() {
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

  qs('#assets-list').innerHTML = assets.length ? assets.map((item) => `
    <div class="admin-list-row admin-record-row" data-id="${esc(item.id)}">
      <div><b>${label(item.displayName)}</b><small>${label(item.symbol)} · ${label(item.assetType)}</small></div>
      <span>${label(item.tradingViewSymbol)}</span>
      <div class="crud-actions"><button type="button" data-action="delete-asset">Remove</button></div>
    </div>`).join('') : empty('No market assets are listed.');

  qs('#users-list').innerHTML = users.length ? users.map((item) => `
    <div class="admin-list-row admin-user-row">
      <div><b>${label(item.legalName)}</b><small>${label(item.email)}</small></div>
      <span>${label(item.countryOfResidence)}</span>
      <span>${label(item.preferredCurrency)}</span>
      <span class="status-pill">${label(item.accountStatus)}</span>
    </div>`).join('') : empty('No member accounts are available.');

  const latestRequests = requests.sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0)).slice(0, 20);
  const requestProfiles = await Promise.all(latestRequests.map((item) => getUserProfile(item.uid).catch(() => null)));
  qs('#requests-list').innerHTML = latestRequests.length ? latestRequests.map((item, index) => `
    <div class="admin-list-row admin-request-row">
      <div><b>${label(item.type)}</b><small>${label(requestProfiles[index]?.legalName || item.uid?.slice(0, 10))}</small></div>
      <span>${item.amount == null ? '—' : esc(item.amount)} ${label(item.currency || '')}</span>
      <span class="status-pill">${label(item.status)}</span>
      <small>${esc(timeText(item.createdAt))}</small>
      <div class="crud-actions"><button type="button" data-request-status="processing" data-uid="${esc(item.uid)}" data-id="${esc(item.id)}">In review</button><button type="button" data-request-status="rejected" data-uid="${esc(item.uid)}" data-id="${esc(item.id)}">Reject</button><button type="button" data-request-status="reviewed" data-uid="${esc(item.uid)}" data-id="${esc(item.id)}">Mark reviewed</button></div>
    </div>`).join('') : empty('No member requests have been submitted.');
}

async function removeRecord(collectionName, id) {
  if (!window.confirm('Remove this record?')) return;
  await deleteRecord(collectionName, id);
  await render();
  status('Record removed.', 'success');
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
        asset: String(data.get('asset')).trim(),
        pair: String(data.get('pair')).trim(),
        direction: String(data.get('direction')),
        timeframe: String(data.get('timeframe')).trim(),
        confidence,
        status: String(data.get('status'))
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
    const data = new FormData(form);
    try {
      await createRecord('marketAssets', {
        displayName: String(data.get('displayName')).trim(),
        symbol: String(data.get('symbol')).trim(),
        assetType: String(data.get('assetType')).trim(),
        tradingViewSymbol: String(data.get('tradingViewSymbol')).trim(),
        active: true
      });
      form.reset();
      status('Market asset added.', 'success');
      await render();
    } catch (error) {
      status(error.message || 'The market asset could not be added.');
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

import {
  registerUser,
  loginUser,
  hasAdminClaim,
  isSystemAdminAccount,
  signOutUser,
  getAuthUser,
  resendVerificationEmail,
  refreshAuthUser,
  listPublicRecords,
  markEmailVerified
} from './firebase.js';

const qs = (selector, root = document) => root.querySelector(selector);

const LEGAL_COPY = {
  terms: {
    title: 'Terms of Service',
    body: `<p><b>Effective date: 4 October 2026</b></p><p>These Terms govern access to Vertix Trade, a market-information and account-services platform operated by Vertix Trade in Brazil. By creating an account or using the platform, you agree to use it lawfully, provide accurate information and protect your credentials.</p><p>Market information, signals, charts and research are provided for informational purposes and are not financial, investment, tax or legal advice. Trading involves substantial risk, including loss of capital. You remain responsible for your decisions, orders and account activity.</p><p>Deposits, withdrawals, subscriptions and any execution service are subject to the applicable account status, risk controls, administrator review, provider rules and applicable law. We may reject, suspend or reverse activity required by law, fraud controls, sanctions screening or operational safeguards.</p><p>You must not use the platform for fraud, market manipulation, money laundering, sanctions evasion, unauthorized access or any unlawful purpose. You are responsible for keeping your password and account access secure.</p><p>These terms are a general product draft and must be reviewed and adapted by qualified Brazilian counsel before live financial operations. Contact <a href="mailto:support@vertixtrades.com">support@vertixtrades.com</a> with questions.</p>`
  },
  privacy: {
    title: 'Privacy Policy',
    body: `<p><b>Effective date: 4 October 2026</b></p><p>Vertix Trade processes personal data to create and secure accounts, provide platform features, maintain transaction records, prevent fraud, support customers and comply with legal obligations. The platform may process identity, contact, residential, account, device and activity information.</p><p>Data is stored and processed using Firebase and other service providers configured by Vertix Trade. We share data only with providers and authorities where needed to provide the service, protect users, prevent abuse, process transactions or comply with law.</p><p>We retain information for as long as necessary for the stated purposes, security, dispute resolution, accounting and applicable regulatory obligations. We apply access controls and reasonable safeguards, but no internet system is risk-free.</p><p>For Brazil, requests under applicable data-protection law, including access, correction and deletion where legally available, may be sent to <a href="mailto:support@vertixtrades.com">support@vertixtrades.com</a>. Some records may need to be retained for legal or financial-control reasons.</p><p>This is a product draft, not legal advice. It must be reviewed by qualified Brazilian privacy counsel and supplemented with the final controller identity, retention schedule and data-protection officer details before production.</p>`
  }
};

function initializeLegalModals() {
  if (document.getElementById('legal-modal')) return;
  document.body.insertAdjacentHTML('beforeend', `<div class="legal-modal" id="legal-modal" hidden role="dialog" aria-modal="true" aria-labelledby="legal-modal-title"><div class="legal-modal-backdrop" data-legal-close></div><section class="legal-modal-card glass-panel"><button class="legal-modal-close" type="button" aria-label="Close" data-legal-close>×</button><span class="eyebrow">VERTIX TRADE / LEGAL</span><h2 id="legal-modal-title"></h2><div id="legal-modal-body"></div></section></div>`);
  document.addEventListener('click', (event) => {
    const trigger = event.target.closest('[data-legal-modal]');
    const modal = document.getElementById('legal-modal');
    if (trigger && modal) {
      event.preventDefault();
      const copy = LEGAL_COPY[trigger.dataset.legalModal];
      if (!copy) return;
      qs('#legal-modal-title').textContent = copy.title;
      qs('#legal-modal-body').innerHTML = copy.body;
      modal.hidden = false;
      document.body.classList.add('legal-modal-open');
    }
    if (event.target.closest('[data-legal-close]') && modal) {
      modal.hidden = true;
      document.body.classList.remove('legal-modal-open');
    }
  });
}

initializeLegalModals();

function setStatus(form, message, tone = 'error') {
  const target = qs('.form-status', form);
  if (!target) return;
  target.textContent = message;
  target.dataset.tone = tone;
}

function errorMessage(error) {
  const messages = {
    'auth/email-already-in-use': 'An account with this email address already exists.',
    'auth/invalid-email': 'Enter a valid email address.',
    'auth/weak-password': 'Choose a stronger password.',
    'auth/invalid-credential': 'The email address or password is incorrect.',
    'auth/user-disabled': 'This account is disabled. Contact Vertix Trade support.',
    'auth/network-request-failed': 'A network error occurred. Check your connection and try again.',
    'auth/unauthorized-continue-uri': 'Firebase rejected this site as the verification-link return address. Contact Vertix Trade support.',
    'auth/unauthorized-domain': 'This site is not authorized for Firebase verification links. Contact Vertix Trade support.',
    'auth/invalid-continue-uri': 'The verification-link return address is invalid. Contact Vertix Trade support.',
    'auth/too-many-requests': 'Too many verification attempts were made. Wait a few minutes, then try again.',
    'auth/quota-exceeded': 'Email delivery is temporarily limited. Try again later.',
    'auth/operation-not-allowed': 'Email verification is not available right now. Contact Vertix Trade support.',
    'permission-denied': 'Your account could not be saved. Contact Vertix Trade support.',
    'unavailable': 'Account services are temporarily unavailable. Try again shortly.'
  };
  return messages[error?.code] || error?.message || 'The request could not be completed. Try again.';
}

function initializeVerificationNotice() {
  const status = qs('[data-verification-status]');
  if (!status) return;
  const params = new URLSearchParams(window.location.search);
  if (params.get('send') === 'sent') {
    status.textContent = 'A verification email was sent. Check your inbox and spam folder.';
  } else if (params.get('send') === 'failed') {
    const reason = errorMessage({ code: params.get('reason') });
    status.textContent = `Your account was created, but the verification email could not be sent. ${reason} Use the button below to retry.`;
  } else if (params.get('send') === 'pending') {
    status.textContent = 'This account is not verified yet. Open the latest verification email or resend the link below.';
  }
}

function populateCurrencies() {
  const select = qs('#preferred-currency');
  if (!select) return;
  const fallback = ['AUD', 'CAD', 'CHF', 'CNY', 'EUR', 'GBP', 'INR', 'JPY', 'NGN', 'NZD', 'SGD', 'USD', 'ZAR'];
  const codes = typeof Intl.supportedValuesOf === 'function'
    ? Intl.supportedValuesOf('currency')
    : fallback;
  const displayNames = typeof Intl.DisplayNames === 'function'
    ? new Intl.DisplayNames([navigator.language || 'en'], { type: 'currency' })
    : null;
  const options = codes.map((code) => ({ code, label: `${code} — ${displayNames?.of(code) || code}` }))
    .sort((a, b) => a.label.localeCompare(b.label));
  for (const { code, label } of options) {
    const option = document.createElement('option');
    option.value = code;
    option.textContent = label;
    select.append(option);
  }
}

qs('.mobile-menu')?.addEventListener('click', () => {
  const button = qs('.mobile-menu');
  const nav = qs('.desktop-nav');
  const opened = nav?.classList.toggle('mobile-open') || false;
  button?.setAttribute('aria-expanded', String(opened));
  button?.setAttribute('aria-label', opened ? 'Close navigation' : 'Open navigation');
});
populateCurrencies();
initializeVerificationNotice();

globalThis.addEventListener?.('click', async (event) => {
  if (!event.target.closest('[data-logout]')) return;
  event.preventDefault();
  try {
    await signOutUser();
    window.location.assign('/login.html');
  } catch (error) {
    console.error('Sign out failed:', error);
  }
});

document.addEventListener('click', async (event) => {
  if (event.target.closest('[data-resend-verification]')) {
    event.preventDefault();
    const button = event.target.closest('[data-resend-verification]');
    const status = qs('[data-verification-status]');
    button.disabled = true;
    try {
      await resendVerificationEmail();
      if (status) status.textContent = 'A verification email has been sent.';
    } catch (error) {
      if (status) status.textContent = errorMessage(error);
    } finally {
      button.disabled = false;
    }
  }

  if (event.target.closest('[data-check-verification]')) {
    event.preventDefault();
    try {
      const user = await refreshAuthUser();
      if (user?.emailVerified) {
        await markEmailVerified(user);
        window.location.assign(((await hasAdminClaim(user, true)) || isSystemAdminAccount(user)) ? '/admin.html' : '/user-dashboard.html');
      } else if (qs('[data-verification-status]')) {
        qs('[data-verification-status]').textContent = 'Email verification is still pending. Open the latest verification email, then try again.';
      }
    } catch (error) {
      if (qs('[data-verification-status]')) qs('[data-verification-status]').textContent = errorMessage(error);
    }
  }
});

qs('#register-form')?.addEventListener('submit', async (event) => {
  event.preventDefault();
  const form = event.currentTarget;
  if (!form.reportValidity()) return;
  const data = new FormData(form);
  const password = String(data.get('password') || '');
  const confirmation = String(data.get('confirmPassword') || '');
  const dateOfBirth = String(data.get('dateOfBirth') || '');

  if (password.length < 12) {
    setStatus(form, 'Use a password with at least 12 characters.');
    qs('[name="password"]', form).focus();
    return;
  }
  if (password !== confirmation) {
    setStatus(form, 'The passwords do not match.');
    qs('[name="confirmPassword"]', form).focus();
    return;
  }
  if (dateOfBirth && dateOfBirth > new Date().toISOString().slice(0, 10)) {
    setStatus(form, 'Enter a valid date of birth.');
    return;
  }

  const button = qs('button[type="submit"]', form);
  button.disabled = true;
  setStatus(form, 'Creating your account…', 'success');
  const profile = {
    legalName: String(data.get('legalName') || '').trim(),
    dateOfBirth,
    phoneNumber: String(data.get('phoneNumber') || '').trim(),
    countryOfResidence: String(data.get('countryOfResidence') || '').trim(),
    nationality: String(data.get('nationality') || '').trim(),
    addressLine1: String(data.get('addressLine1') || '').trim(),
    addressLine2: String(data.get('addressLine2') || '').trim(),
    city: String(data.get('city') || '').trim(),
    region: String(data.get('region') || '').trim(),
    postalCode: String(data.get('postalCode') || '').trim(),
    preferredCurrency: String(data.get('preferredCurrency') || '').trim(),
    employmentStatus: String(data.get('employmentStatus') || '').trim(),
    sourceOfFunds: String(data.get('sourceOfFunds') || '').trim(),
    tradingExperience: String(data.get('tradingExperience') || '').trim(),
    accountPurpose: String(data.get('accountPurpose') || '').trim()
  };

  try {
    const result = await registerUser(String(data.get('email') || ''), password, profile);
    const verificationUrl = new URL('/verify-email.html', window.location.origin);
    verificationUrl.searchParams.set('send', result.verificationSent ? 'sent' : 'failed');
    if (!result.verificationSent && result.verificationErrorCode) {
      verificationUrl.searchParams.set('reason', result.verificationErrorCode);
    }
    window.location.assign(verificationUrl.href);
  } catch (error) {
    setStatus(form, errorMessage(error));
    button.disabled = false;
  }
});

qs('#login-form')?.addEventListener('submit', async (event) => {
  event.preventDefault();
  const form = event.currentTarget;
  const button = qs('button[type="submit"]', form);
  button.disabled = true;
  setStatus(form, 'Signing in…', 'success');
  try {
    const credential = await loginUser(qs('[name="email"]', form).value, qs('[name="password"]', form).value);
    if (!credential.user.emailVerified && !isSystemAdminAccount(credential.user)) {
      window.location.assign('/verify-email.html?send=pending');
      return;
    }
    await markEmailVerified(credential.user);
    window.location.assign(((await hasAdminClaim(credential.user, true)) || isSystemAdminAccount(credential.user)) ? '/admin.html' : '/user-dashboard.html');
  } catch (error) {
    setStatus(form, errorMessage(error));
    button.disabled = false;
  }
});

qs('#contact-form')?.addEventListener('submit', (event) => {
  event.preventDefault();
  const form = event.currentTarget;
  const data = new FormData(form);
  const subject = encodeURIComponent(String(data.get('subject') || 'Vertix Trade enquiry'));
  const body = encodeURIComponent(`Name: ${String(data.get('name') || '').trim()}\nEmail: ${String(data.get('email') || '').trim()}\n\n${String(data.get('message') || '').trim()}`);
  window.location.href = `mailto:hello@vertixtrade.com?subject=${subject}&body=${body}`;
});

qs('#newsletter-form')?.addEventListener('submit', (event) => {
  event.preventDefault();
  const form = event.currentTarget;
  const email = String(new FormData(form).get('email') || '').trim();
  const subject = encodeURIComponent('Vertix Trade market brief subscription');
  const body = encodeURIComponent(`Please contact me about Vertix Trade market brief updates.\nEmail: ${email}`);
  const status = qs('.form-status', form);
  if (status) status.textContent = 'Your email application will open so you can send the subscription request.';
  window.location.href = `mailto:hello@vertixtrade.com?subject=${subject}&body=${body}`;
});

function escapeHTML(value = '') {
  return String(value).replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
}

async function loadPublicMarkets() {
  const target = qs('#public-market-ticker');
  if (!target) return;
  try {
    const markets = (await listPublicRecords('marketAssets')).filter((item) => item.active === true && item.tradingViewSymbol).slice(0, 12);
    if (!markets.length) {
      target.textContent = 'No market listings are available.';
      return;
    }
    const widget = document.createElement('div');
    widget.className = 'tradingview-widget-container__widget';
    const script = document.createElement('script');
    script.src = 'https://s3.tradingview.com/external-embedding/embed-widget-ticker-tape.js';
    script.async = true;
    script.textContent = JSON.stringify({ symbols: markets.map((item) => ({ proName: item.tradingViewSymbol, title: item.displayName || item.symbol })), showSymbolLogo: true, colorTheme: 'dark', isTransparent: true, displayMode: 'regular', locale: 'en' });
    target.replaceChildren(widget, script);
  } catch {
    target.textContent = 'Market listings are temporarily unavailable.';
  }
}

async function loadPublicSignals() {
  const target = qs('#public-signal-rows');
  if (!target) return;
  try {
    const signals = (await listPublicRecords('signals'))
      .filter((item) => !/closed/i.test(item.status || ''))
      .sort((a, b) => (b.publishedAt?.seconds || b.createdAt?.seconds || 0) - (a.publishedAt?.seconds || a.createdAt?.seconds || 0))
      .slice(0, 6);
    const heroValue = qs('#market-pulse-value');
    const heroLabel = qs('#market-pulse-label');
    const heroPair = qs('#market-pulse-pair');
    const heroConfidence = qs('#market-pulse-confidence');
    const heroTag = qs('#market-pulse-tag');
    const featured = signals[0];
    if (heroValue) heroValue.textContent = featured?.direction || 'Market signals';
    if (heroLabel) heroLabel.textContent = featured ? `Published signal · ${featured.timeframe || 'No time horizon set'}` : 'No active signal has been published.';
    if (heroPair) heroPair.textContent = featured?.pair || featured?.asset || 'Published signal feed';
    const featuredConfidence = featured?.confidence == null ? NaN : Number(featured.confidence);
    if (heroConfidence) heroConfidence.textContent = featured && Number.isFinite(featuredConfidence) ? `${Math.max(0, Math.min(100, featuredConfidence))}% confidence` : '—';
    if (heroTag) heroTag.textContent = featured ? 'Latest signal' : 'No active signal';
    if (!signals.length) {
      target.innerHTML = '<div class="signal-empty">No public signals are available.</div>';
      return;
    }
    target.innerHTML = `<div class="table-head"><span>Asset</span><span>Direction</span><span>Confidence</span><span>Time frame</span><span>Action</span></div>${signals.map((item) => {
      const direction = String(item.direction || 'Watch');
      const directionClass = /^long|buy$/i.test(direction) ? 'signal-up' : (/^short|sell$/i.test(direction) ? 'signal-down' : 'signal-neutral');
      const confidence = item.confidence == null ? NaN : Number(item.confidence);
      const conviction = Number.isFinite(confidence) ? Math.max(0, Math.min(100, confidence)) : null;
      return `<div class="signal-row"><div class="asset"><span class="asset-badge">${escapeHTML(String(item.asset || 'M').slice(0, 2))}</span><span><b>${escapeHTML(item.asset || '—')}</b><small>${escapeHTML(item.pair || '—')}</small></span></div><span class="${directionClass}">${escapeHTML(direction)}</span><div class="confidence"><span>${conviction === null ? '—' : `${conviction}%`}</span>${conviction === null ? '' : `<i><b style="width:${conviction}%"></b></i>`}</div><span class="mono">${escapeHTML(item.timeframe || '—')}</span><a href="login.html" class="row-action">Sign in</a></div>`;
    }).join('')}`;
  } catch (error) {
    target.innerHTML = '<div class="signal-empty">Published market signals are temporarily unavailable.</div>';
    const heroValue = qs('#market-pulse-value');
    const heroLabel = qs('#market-pulse-label');
    const heroTag = qs('#market-pulse-tag');
    if (heroValue) heroValue.textContent = 'Market signals';
    if (heroLabel) heroLabel.textContent = 'Market signal information is unavailable.';
    if (heroTag) heroTag.textContent = 'Unavailable';
  }
}

loadPublicMarkets();
loadPublicSignals();

import { registerUser, loginUser, resendVerificationEmail, isAdminUser } from './firebase.js?v=profit-bonus-20261121';

const qs = (selector, root = document) => root.querySelector(selector);

const ERROR_MESSAGES = {
  'auth/email-already-in-use': 'An account with this email address already exists.',
  'auth/invalid-email': 'Enter a valid email address.',
  'auth/weak-password': 'Choose a stronger password.',
  'auth/operation-not-allowed': 'Account registration is temporarily unavailable. Please try again later.',
  'auth/invalid-api-key': 'Account registration is temporarily unavailable. Please try again later.',
  'auth/unauthorized-domain': 'This account page is not enabled for the current website. Contact support for help.',
  'auth/internal-error': 'Account registration is temporarily unavailable. Please try again later.',
  'auth/too-many-requests': 'Too many attempts were made. Wait a few minutes and try again.',
  'auth/invalid-credential': 'The email address or password is incorrect.',
  'auth/user-disabled': 'This account is disabled. Contact support for help.',
  'auth/network-request-failed': 'A network error occurred. Check your connection and try again.',
  'config-unavailable': 'Account services are not configured on this deployment. Contact the site administrator.',
  'config-request-failed': 'Account services could not be reached on this deployment. Try again shortly.',
  'permission-denied': 'Your account could not be saved. Contact support for help.',
  'failed-precondition': 'Account services are not ready. Please try again shortly.',
  'resource-exhausted': 'Account services are busy. Please try again shortly.',
  unavailable: 'Account services are temporarily unavailable. Try again shortly.'
};

const formMessage = (form, message, tone = 'error') => {
  const target = qs('.form-status', form);
  if (!target) return;
  target.textContent = message;
  target.dataset.tone = tone;
};

const errorMessage = (error, fallback = 'The request could not be completed. Try again.') => ERROR_MESSAGES[error?.code] || error?.userMessage || fallback;

function populateCurrencies() {
  const select = qs('#preferred-currency');
  if (!select) return;
  const fallback = ['AUD', 'CAD', 'CHF', 'CNY', 'EUR', 'GBP', 'INR', 'JPY', 'NGN', 'NZD', 'SGD', 'USD', 'ZAR'];
  const codes = typeof Intl.supportedValuesOf === 'function' ? Intl.supportedValuesOf('currency') : fallback;
  const displayNames = typeof Intl.DisplayNames === 'function'
    ? new Intl.DisplayNames([navigator.language || 'en'], { type: 'currency' })
    : null;
  codes.map((code) => ({ code, label: `${code} — ${displayNames?.of(code) || code}` }))
    .sort((a, b) => a.label.localeCompare(b.label))
    .forEach(({ code, label }) => {
      const option = document.createElement('option');
      option.value = code;
      option.textContent = label;
      select.append(option);
    });
}

populateCurrencies();

document.querySelectorAll('.mobile-menu').forEach((button) => button.addEventListener('click', () => qs('.desktop-nav')?.classList.toggle('mobile-open')));
qs('#contact-form')?.addEventListener('submit', (event) => {
  event.preventDefault();
  const form = event.currentTarget;
  form.reset();
  formMessage(form, 'Thanks — your message is in the queue.', 'success');
});
qs('#newsletter-form')?.addEventListener('submit', (event) => {
  event.preventDefault();
  const form = event.currentTarget;
  form.reset();
  formMessage(form, 'You are on the list. Watch your inbox.', 'success');
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
    formMessage(form, 'Use a password with at least 12 characters.');
    qs('[name="password"]', form).focus();
    return;
  }
  if (password !== confirmation) {
    formMessage(form, 'The passwords do not match.');
    qs('[name="confirmPassword"]', form).focus();
    return;
  }
  if (dateOfBirth > new Date().toISOString().slice(0, 10)) {
    formMessage(form, 'Enter a valid date of birth.');
    return;
  }

  const button = qs('button[type="submit"]', form);
  button.disabled = true;
  formMessage(form, 'Creating your account…', 'success');
  const profile = Object.fromEntries([
    'legalName', 'dateOfBirth', 'phoneNumber', 'countryOfResidence', 'nationality',
    'addressLine1', 'addressLine2', 'city', 'region', 'postalCode', 'preferredCurrency',
    'employmentStatus', 'sourceOfFunds', 'tradingExperience', 'accountPurpose'
  ].map((field) => [field, String(data.get(field) || '').trim()]));

  try {
    const result = await registerUser(String(data.get('email') || ''), password, profile);
    if (result.verificationSent) {
      window.location.assign('/verify-email.html');
      return;
    }
    formMessage(form, 'Your account was created. Sign in to request a verification email.', 'success');
  } catch (error) {
    formMessage(form, errorMessage(error, 'We could not create your account. Check your details and try again.'));
  } finally {
    button.disabled = false;
  }
});

qs('#login-form')?.addEventListener('submit', async (event) => {
  event.preventDefault();
  const form = event.currentTarget;
  const button = qs('button[type="submit"]', form);
  button.disabled = true;
  formMessage(form, 'Signing in…', 'success');
  try {
    const credential = await loginUser(qs('[name="email"]', form).value, qs('[name="password"]', form).value);
    const destination = !credential.preview && await isAdminUser(credential.user) ? 'admin.html' : 'user-dashboard.html';
    window.location.replace(destination);
  } catch (error) {
    formMessage(form, errorMessage(error, 'We could not sign you in. Check your details and try again.'));
    button.disabled = false;
  }
});

document.addEventListener('click', async (event) => {
  const resend = event.target.closest('[data-resend-verification]');
  if (!resend) return;
  event.preventDefault();
  const status = qs('[data-verification-status]');
  resend.disabled = true;
  try {
    await resendVerificationEmail();
    if (status) status.textContent = 'A verification email has been sent. Check your inbox and spam folder.';
  } catch (error) {
    if (status) status.textContent = errorMessage(error);
  } finally {
    resend.disabled = false;
  }
});

qs('[data-check-verification]')?.addEventListener('click', async () => {
  const status = qs('[data-verification-status]');
  try {
    const { refreshAuthUser } = await import('./firebase.js?v=profit-bonus-20261121');
    const user = await refreshAuthUser();
    if (user?.emailVerified) window.location.assign('/user-dashboard.html');
    else if (status) status.textContent = 'Email verification is still pending.';
  } catch (error) {
    if (status) status.textContent = errorMessage(error);
  }
});

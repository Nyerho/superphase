import { getAuthUser, isAdminUser } from './firebase.js?v=profit-bonus-20261121';

const shell = document.querySelector('.admin-shell');
const go = (path) => window.location.replace(path);

function showAuthorizationError(error) {
  const code = error?.code || 'unknown-error';
  const message = error?.message || 'The administrator account could not be verified.';
  shell.replaceChildren();
  const panel = document.createElement('main');
  panel.style.cssText = 'max-width:680px;margin:12vh auto;padding:32px;border:1px solid rgba(255,255,255,.14);border-radius:18px;background:rgba(10,18,32,.92);color:#f5f7fb;font:16px/1.6 system-ui,sans-serif';
  const title = document.createElement('h1');
  title.textContent = 'Administrator access could not be verified';
  const detail = document.createElement('p');
  detail.textContent = `${message} (${code})`;
  const hint = document.createElement('p');
  hint.textContent = 'Open the browser developer console and share the error details with the site administrator. The page was kept open so the failed check is not hidden by another login redirect.';
  panel.append(title, detail, hint);
  shell.append(panel);
  shell.style.visibility = 'visible';
}

async function authorizeAdmin() {
  try {
    // Use the same default Firebase app as login.html and admin.js. A named
    // app has a separate Auth persistence namespace and would look signed out
    // immediately after the login page redirects here.
    const user = await getAuthUser();
    if (!user) {
      go('/login.html');
      return;
    }

    if (!user.emailVerified) {
      go('/verify-email.html');
      return;
    }

    if (!(await isAdminUser(user))) {
      go('/user-dashboard.html');
      return;
    }
    shell.style.visibility = 'visible';
    document.documentElement.dataset.adminAuthorized = 'true';
  } catch (error) {
    console.error('Admin access check failed.', error);
    showAuthorizationError(error);
  }
}

authorizeAdmin();

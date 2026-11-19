import { getAuthUser, isAdminUser } from './firebase.js';

const shell = document.querySelector('.admin-shell');
const go = (path) => window.location.replace(path);

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
    go('/login.html');
  }
}

authorizeAdmin();

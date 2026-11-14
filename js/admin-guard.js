import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.14.1/firebase-app.js';
import { getAuth, onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js';
import { getFirestore, doc, getDoc } from 'https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js';

const shell = document.querySelector('.admin-shell');
const go = (path) => window.location.replace(path);

async function authorizeAdmin() {
  try {
    const response = await fetch('/api/firebase-config', { cache: 'no-store' });
    if (!response.ok) throw new Error('Firebase configuration unavailable.');
    const config = await response.json();
    const app = initializeApp(config, 'admin-route-guard');
    const auth = getAuth(app);
    const db = getFirestore(app);
    const user = await new Promise((resolve, reject) => {
      const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
        unsubscribe();
        resolve(currentUser);
      }, reject);
    });
    if (!user) {
      go('/login.html');
      return;
    }

    const isSystemAdmin = user.uid === 'z3KAMbKcGFNYVWH2OKHtz4AT1rs2'
      && user.email === 'admin@vertixtrades.com';
    let isActiveAdmin = false;
    if (isSystemAdmin) {
      isActiveAdmin = true;
    } else {
      const token = await user.getIdTokenResult(true);
      if (token.claims.admin === true) {
        const snapshot = await getDoc(doc(db, 'admins', user.uid));
        if (snapshot.exists()) {
          const admin = snapshot.data();
          isActiveAdmin = admin.active === true
            && admin.role === 'admin'
            && admin.email === user.email;
        }
      }
    }

    if (!isActiveAdmin) {
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

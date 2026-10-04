import { initializeApp } from 'https://www.gstatic.com/firebasejs/12.19.0/firebase-app.js';
import {
  getAuth,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  sendEmailVerification,
  updateProfile,
  deleteUser,
  reload,
  getIdTokenResult
} from 'https://www.gstatic.com/firebasejs/12.19.0/firebase-auth.js';
import {
  getFirestore,
  collection,
  collectionGroup,
  addDoc,
  getDocs,
  getDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  doc,
  serverTimestamp
} from 'https://www.gstatic.com/firebasejs/12.19.0/firebase-firestore.js';

const PUBLIC_COLLECTIONS = new Set([
  'signals', 'marketAssets', 'copyStrategies', 'plans',
  'digitalAssets', 'news', 'marketCalendar'
]);
const ADMIN_COLLECTIONS = new Set([
  ...PUBLIC_COLLECTIONS, 'users', 'auditLog'
]);
const USER_SUBCOLLECTIONS = new Set([
  'requests', 'trades', 'transactions', 'referrals', 'watchlist', 'settings'
]);

let app;
let auth;
let db;

let firebasePromise;

function firebaseReady() {
  if (!firebasePromise) {
    firebasePromise = (async () => {
      const response = await fetch('/api/firebase-config', { cache: 'no-store' });
      if (!response.ok) {
        throw new Error('Vertix Trade could not connect to its account services. Please try again later.');
      }
      const config = await response.json();
      const required = ['apiKey', 'authDomain', 'projectId', 'appId'];
      if (required.some((key) => typeof config[key] !== 'string' || !config[key])) {
        throw new Error('Vertix Trade account services are temporarily unavailable.');
      }
      app = initializeApp(config);
      auth = getAuth(app);
      db = getFirestore(app);
      return { app, auth, db };
    })();
  }
  return firebasePromise;
}

export async function initializeFirebase() {
  return firebaseReady();
}

function verificationActionSettings() {
  return {
    url: new URL('/verify-email.html', globalThis.location.origin).toString(),
    handleCodeInApp: false
  };
}

export async function registerUser(email, password, profile) {
  const { auth: firebaseAuth, db: firestore } = await firebaseReady();
  const cleanEmail = String(email).trim().toLowerCase();
  const credential = await createUserWithEmailAndPassword(firebaseAuth, cleanEmail, password);
  const user = credential.user;
  try {
    if (profile.legalName) await updateProfile(user, { displayName: profile.legalName });
    const referralCode = `VT-${crypto.randomUUID().replaceAll('-', '').slice(0, 10).toUpperCase()}`;
    await setDoc(doc(firestore, 'users', user.uid), {
      uid: user.uid,
      email: cleanEmail,
      legalName: profile.legalName,
      dateOfBirth: profile.dateOfBirth,
      phoneNumber: profile.phoneNumber,
      countryOfResidence: profile.countryOfResidence,
      nationality: profile.nationality || '',
      addressLine1: profile.addressLine1,
      addressLine2: profile.addressLine2 || '',
      city: profile.city,
      region: profile.region || '',
      postalCode: profile.postalCode,
      preferredCurrency: profile.preferredCurrency,
      employmentStatus: profile.employmentStatus,
      sourceOfFunds: profile.sourceOfFunds,
      tradingExperience: profile.tradingExperience,
      accountPurpose: profile.accountPurpose,
      accountStatus: 'pending_verification',
      kycStatus: 'not_started',
      referralCode,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });
  } catch (error) {
    try { await deleteUser(user); } catch { /* Keep the original account-creation error. */ }
    throw error;
  }
  let verificationSent = true;
  let verificationErrorCode = '';
  try {
    await sendEmailVerification(user, verificationActionSettings());
  } catch (error) {
    verificationSent = false;
    verificationErrorCode = error?.code || 'unknown';
    console.error('Firebase verification-email send failed:', verificationErrorCode);
  }
  return { user, verificationSent, verificationErrorCode };
}

export async function loginUser(email, password) {
  const { auth: firebaseAuth } = await firebaseReady();
  return signInWithEmailAndPassword(firebaseAuth, String(email).trim().toLowerCase(), password);
}

export async function signOutUser() {
  const { auth: firebaseAuth } = await firebaseReady();
  await signOut(firebaseAuth);
}

export async function getAuthUser() {
  const { auth: firebaseAuth } = await firebaseReady();
  if (firebaseAuth.currentUser) return firebaseAuth.currentUser;
  return new Promise((resolve) => {
    let unsubscribe = () => {};
    unsubscribe = onAuthStateChanged(firebaseAuth, (user) => {
      unsubscribe();
      resolve(user);
    }, () => {
      unsubscribe();
      resolve(null);
    });
  });
}

export async function refreshAuthUser() {
  const user = await getAuthUser();
  if (!user) return null;
  await reload(user);
  return user;
}

export async function resendVerificationEmail() {
  const user = await getAuthUser();
  if (!user) throw new Error('Sign in to request a verification email.');
  await sendEmailVerification(user, verificationActionSettings());
}

export async function hasAdminClaim(user, forceRefresh = false) {
  if (!user) return false;
  const token = await getIdTokenResult(user, forceRefresh);
  return token.claims.admin === true;
}

export async function getUserProfile(uid) {
  const { db: firestore } = await firebaseReady();
  const snapshot = await getDoc(doc(firestore, 'users', uid));
  return snapshot.exists() ? { id: snapshot.id, ...snapshot.data() } : null;
}

export async function requireMember() {
  const user = await getAuthUser();
  if (!user) {
    window.location.assign('/login.html');
    return null;
  }
  if (!user.emailVerified) {
    window.location.assign('/verify-email.html');
    return null;
  }
  const profile = await getUserProfile(user.uid);
  if (!profile) throw new Error('Your account profile could not be found. Contact Vertix Trade support.');
  return { user, profile };
}

export async function requireAdmin() {
  const user = await getAuthUser();
  if (!user) {
    window.location.assign('/login.html');
    return null;
  }
  if (!user.emailVerified) {
    window.location.assign('/verify-email.html');
    return null;
  }
  if (!(await hasAdminClaim(user, true))) {
    window.location.assign('/index.html');
    return null;
  }
  const { db: firestore } = await firebaseReady();
  const adminSnapshot = await getDoc(doc(firestore, 'admins', user.uid));
  const adminProfile = adminSnapshot.exists() ? adminSnapshot.data() : null;
  if (!adminProfile || adminProfile.active !== true || adminProfile.role !== 'admin' || adminProfile.email?.toLowerCase() !== user.email?.toLowerCase()) {
    window.location.assign('/index.html');
    return null;
  }
  return user;
}

export async function updateUserProfile(uid, changes) {
  const { db: firestore } = await firebaseReady();
  const allowed = ['preferredCurrency', 'phoneNumber', 'addressLine1', 'addressLine2', 'city', 'region', 'postalCode'];
  const safeChanges = Object.fromEntries(Object.entries(changes).filter(([key]) => allowed.includes(key)));
  safeChanges.updatedAt = serverTimestamp();
  await updateDoc(doc(firestore, 'users', uid), safeChanges);
}

export async function saveUserSetting(uid, settingId, changes) {
  const { db: firestore } = await firebaseReady();
  const safeChanges = { reduceMotion: Boolean(changes.reduceMotion), updatedAt: serverTimestamp() };
  await setDoc(doc(firestore, 'users', uid, 'settings', settingId), safeChanges, { merge: true });
}

export async function listPublicRecords(collectionName) {
  const { db: firestore } = await firebaseReady();
  if (!PUBLIC_COLLECTIONS.has(collectionName)) throw new Error('This collection is not public.');
  const snapshot = await getDocs(collection(firestore, collectionName));
  return snapshot.docs.map((entry) => ({ id: entry.id, ...entry.data() }));
}

export async function listUserRecords(uid, subcollection) {
  const { db: firestore } = await firebaseReady();
  if (!USER_SUBCOLLECTIONS.has(subcollection)) throw new Error('This account collection is not available.');
  const snapshot = await getDocs(collection(firestore, 'users', uid, subcollection));
  return snapshot.docs.map((entry) => ({ id: entry.id, ...entry.data() }));
}

export async function createUserRequest(uid, type, fields = {}) {
  const { db: firestore } = await firebaseReady();
  const allowedTypes = new Set(['trade', 'deposit', 'withdrawal', 'loan', 'plan', 'support']);
  if (!allowedTypes.has(type)) throw new Error('This request type is not available.');
  const ref = await addDoc(collection(firestore, 'users', uid, 'requests'), {
    ...fields,
    uid,
    type,
    status: 'submitted',
    createdAt: serverTimestamp()
  });
  return ref.id;
}

export async function listRecords(collectionName) {
  const { db: firestore } = await firebaseReady();
  if (!ADMIN_COLLECTIONS.has(collectionName)) throw new Error('This collection cannot be managed here.');
  const snapshot = await getDocs(collection(firestore, collectionName));
  return snapshot.docs.map((entry) => ({ id: entry.id, ...entry.data() }));
}

export async function listAllUserRequests() {
  const { db: firestore } = await firebaseReady();
  const snapshot = await getDocs(collectionGroup(firestore, 'requests'));
  return snapshot.docs.map((entry) => ({ id: entry.id, ...entry.data() }));
}

export async function updateUserRequest(uid, requestId, status) {
  const { db: firestore } = await firebaseReady();
  if (!['submitted', 'processing', 'accepted', 'rejected', 'completed', 'reviewed'].includes(status)) {
    throw new Error('This request status is not available.');
  }
  await updateDoc(doc(firestore, 'users', uid, 'requests', requestId), {
    status,
    updatedAt: serverTimestamp()
  });
}

export async function createRecord(collectionName, data) {
  const { db: firestore } = await firebaseReady();
  if (!ADMIN_COLLECTIONS.has(collectionName) || collectionName === 'users' || collectionName === 'auditLog') {
    throw new Error('This collection cannot be edited here.');
  }
  const ref = await addDoc(collection(firestore, collectionName), {
    ...data,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  });
  return ref.id;
}

export async function updateRecord(collectionName, id, data) {
  const { db: firestore } = await firebaseReady();
  if (!ADMIN_COLLECTIONS.has(collectionName) || collectionName === 'users' || collectionName === 'auditLog') {
    throw new Error('This collection cannot be edited here.');
  }
  await updateDoc(doc(firestore, collectionName, id), { ...data, updatedAt: serverTimestamp() });
}

export async function deleteRecord(collectionName, id) {
  const { db: firestore } = await firebaseReady();
  if (!ADMIN_COLLECTIONS.has(collectionName) || collectionName === 'users' || collectionName === 'auditLog') {
    throw new Error('This collection cannot be edited here.');
  }
  await deleteDoc(doc(firestore, collectionName, id));
}

import { starterRecords } from './catalog.js';
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
  serverTimestamp,
  runTransaction
} from 'https://www.gstatic.com/firebasejs/12.19.0/firebase-firestore.js';

const PUBLIC_COLLECTIONS = new Set([
  'signals', 'marketAssets', 'copyStrategies', 'plans',
  'digitalAssets', 'news', 'marketCalendar'
]);
const ADMIN_COLLECTIONS = new Set([
  ...PUBLIC_COLLECTIONS, 'users', 'auditLog', 'fundingMethods', 'platformSettings'
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

async function syncVerifiedProfile(user) {
  if (!user?.emailVerified) return;
  const profile = await getUserProfile(user.uid);
  if (profile?.accountStatus === 'pending_verification') {
    await updateDoc(doc(db, 'users', user.uid), { accountStatus: 'active', emailVerifiedAt: serverTimestamp(), updatedAt: serverTimestamp() });
  }
}

export async function markEmailVerified(user) {
  await syncVerifiedProfile(user);
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

export async function updateMemberKyc(uid, status) {
  const { db: firestore } = await firebaseReady();
  if (!['not_started', 'pending_review', 'verified', 'rejected'].includes(status)) {
    throw new Error('This KYC status is not available.');
  }
  await updateDoc(doc(firestore, 'users', uid), {
    kycStatus: status,
    kycVerifiedAt: status === 'verified' ? serverTimestamp() : null,
    updatedAt: serverTimestamp()
  });
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
  let profile = await getUserProfile(user.uid);
  if (!profile) throw new Error('Your account profile could not be found. Contact Vertix Trade support.');
  if (user.emailVerified && profile.accountStatus === 'pending_verification') {
    await syncVerifiedProfile(user);
    profile = await getUserProfile(user.uid);
  }
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
  const records = snapshot.docs.map((entry) => ({ id: entry.id, ...entry.data() }));
  return records.length ? records : starterRecords(collectionName);
}

export async function listFundingMethods() {
  const { db: firestore } = await firebaseReady();
  const snapshot = await getDocs(collection(firestore, 'fundingMethods'));
  return snapshot.docs.map((entry) => ({ id: entry.id, ...entry.data() })).filter((item) => item.enabled === true);
}

export async function saveFundingMethod(id, data) {
  const { db: firestore } = await firebaseReady();
  const allowed = ['method', 'label', 'enabled', 'currency', 'accountName', 'accountNumber', 'bankName', 'routingNumber', 'iban', 'swift', 'network', 'walletAddress', 'paymentUrl', 'instructions'];
  const safeData = Object.fromEntries(Object.entries(data).filter(([key]) => allowed.includes(key)));
  await setDoc(doc(firestore, 'fundingMethods', id), { ...safeData, updatedAt: serverTimestamp() }, { merge: true });
}

export async function getPlatformSettings() {
  const { db: firestore } = await firebaseReady();
  const snapshot = await getDoc(doc(firestore, 'platformSettings', 'global'));
  return snapshot.exists() ? snapshot.data() : {};
}

export async function savePlatformSettings(data) {
  const { db: firestore } = await firebaseReady();
  const allowed = ['companyName', 'supportEmail', 'depositMin', 'depositMax', 'withdrawalMin', 'withdrawalMax', 'depositFeePercent', 'withdrawalFeePercent'];
  const safeData = Object.fromEntries(Object.entries(data).filter(([key]) => allowed.includes(key)));
  await setDoc(doc(firestore, 'platformSettings', 'global'), { ...safeData, updatedAt: serverTimestamp() }, { merge: true });
}

export async function listUserRecords(uid, subcollection) {
  const { db: firestore } = await firebaseReady();
  if (!USER_SUBCOLLECTIONS.has(subcollection)) throw new Error('This account collection is not available.');
  const snapshot = await getDocs(collection(firestore, 'users', uid, subcollection));
  const records = snapshot.docs.map((entry) => ({ id: entry.id, ...entry.data() }));
  if (!['trades', 'transactions'].includes(subcollection)) return records;
  const unique = new Map();
  for (const record of records) {
    const key = record.requestId || record.id;
    const existing = unique.get(key);
    const currentTime = record.createdAt?.toMillis?.() || 0;
    const existingTime = existing?.createdAt?.toMillis?.() || 0;
    if (!existing || currentTime >= existingTime) unique.set(key, record);
  }
  return [...unique.values()];
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
  if (!['processing', 'rejected', 'reviewed'].includes(status)) {
    throw new Error('This request status is not available.');
  }
  await updateDoc(doc(firestore, 'users', uid, 'requests', requestId), {
    status,
    updatedAt: serverTimestamp()
  });
}

export async function openTrade(uid, fields = {}) {
  const { db: firestore } = await firebaseReady();
  const profileRef = doc(firestore, 'users', uid);
  const marketRef = doc(firestore, 'marketAssets', String(fields.marketId || ''));
  const tradeRef = doc(collection(firestore, 'users', uid, 'trades'));
  return runTransaction(firestore, async (transaction) => {
    const [profileSnapshot, marketSnapshot] = await Promise.all([transaction.get(profileRef), transaction.get(marketRef)]);
    if (!profileSnapshot.exists()) throw new Error('Your account profile could not be found.');
    const profile = profileSnapshot.data();
    const amount = Number(fields.amount);
    if (!Number.isFinite(amount) || amount <= 0) throw new Error('Enter a trade amount greater than zero.');
    const balance = Number(profile.balance || 0);
    if (!Number.isFinite(balance) || balance <= 0) throw new Error('A positive account balance is required before opening a trade.');
    if (amount > balance) throw new Error('The trade amount exceeds your available balance.');
    const market = marketSnapshot.exists() ? marketSnapshot.data() : null;
    const starterMarket = starterRecords('marketAssets').find((item) => item.id === fields.marketId && item.symbol === fields.symbol);
    if ((!market?.active || market.symbol !== fields.symbol) && !starterMarket) throw new Error('This market is not currently available.');
    const now = serverTimestamp();
    transaction.set(tradeRef, {
      uid, requestId: tradeRef.id, marketId: String(fields.marketId), type: 'trade', symbol: String(fields.symbol),
      side: fields.side, amount, currency: String(fields.currency), leverage: Number(fields.leverage),
      duration: String(fields.duration || ''), entryPrice: Number(fields.entryPrice || 0), status: 'open',
      openedAt: now, createdAt: now, processedBy: 'member-balance'
    });
    transaction.update(profileRef, { balance: balance - amount, balanceCurrency: String(fields.currency), balanceUpdatedAt: now, updatedAt: now });
    return { recordId: tradeRef.id, balanceAfter: balance - amount };
  });
}

export async function processUserRequest(uid, requestId, { executionPrice, processedBy } = {}) {
  const { db: firestore } = await firebaseReady();
  const requestRef = doc(firestore, 'users', uid, 'requests', requestId);
  const profileRef = doc(firestore, 'users', uid);

  return runTransaction(firestore, async (transaction) => {
    const snapshot = await transaction.get(requestRef);
    if (!snapshot.exists()) throw new Error('This request could not be found.');
    const request = snapshot.data();
    if (request.resultId) {
      return { recordId: request.resultId, recordType: request.type === 'trade' ? 'trade' : 'transaction', alreadyProcessed: true };
    }
    if (['rejected', 'completed'].includes(request.status)) throw new Error('This request is already closed.');

    const profileSnapshot = await transaction.get(profileRef);
    if (!profileSnapshot.exists()) throw new Error('The member profile could not be found.');
    const profile = profileSnapshot.data();
    const amount = request.amount;
    const currency = String(request.currency || '');
    if (typeof amount !== 'number' || !Number.isFinite(amount) || amount <= 0 || !/^[A-Z]{3}$/.test(currency) || profile.preferredCurrency !== currency) {
      throw new Error('The request must use a valid amount and the member’s current account currency.');
    }

    let collectionName;
    let record;
    let requestStatus;
    let balanceAfter;
    if (request.type === 'trade') {
      const price = Number(executionPrice);
      const leverage = request.leverage;
      if (!request.marketId || !request.symbol || !['buy', 'sell'].includes(request.side)) throw new Error('This trade request is missing its published market or side.');
      const marketRef = doc(firestore, 'marketAssets', request.marketId);
      const marketSnapshot = await transaction.get(marketRef);
      const market = marketSnapshot.exists() ? marketSnapshot.data() : null;
      if (!market || market.active !== true || market.symbol !== request.symbol) throw new Error('This market listing is no longer active. Re-enable the listing before recording a trade.');
      if (!Number.isFinite(price) || price <= 0) throw new Error('Enter the actual execution price to record this opened trade.');
      if (typeof leverage !== 'number' || !Number.isFinite(leverage) || leverage < 1 || leverage > 10) throw new Error('The trade leverage must be between 1x and 10x.');
      for (const key of ['takeProfit', 'stopLoss']) {
        if (request[key] != null && (!Number.isFinite(Number(request[key])) || Number(request[key]) < 0)) {
          throw new Error('The trade request contains an invalid take-profit or stop-loss value.');
        }
      }
      collectionName = 'trades';
      requestStatus = 'accepted';
      record = {
        uid, requestId, marketId: request.marketId, type: 'trade', symbol: String(request.symbol), side: request.side,
        amount, currency, leverage, duration: String(request.duration || ''),
        entryPrice: price, status: 'open', openedAt: null,
        ...(request.takeProfit == null ? {} : { takeProfit: Number(request.takeProfit) }),
        ...(request.stopLoss == null ? {} : { stopLoss: Number(request.stopLoss) })
      };
    } else if (request.type === 'deposit' || request.type === 'withdrawal') {
      if (request.type === 'deposit' && !['bank_transfer', 'digital_asset', 'card_payment'].includes(request.method)) throw new Error('Choose a valid deposit method before recording receipt.');
      if (request.type === 'withdrawal' && (typeof request.destination !== 'string' || !request.destination.trim())) throw new Error('Add a withdrawal destination before recording payment.');
      const storedBalance = profile.balance == null ? 0 : profile.balance;
      const balanceCurrency = profile.balanceCurrency || profile.preferredCurrency;
      if (typeof storedBalance !== 'number' || !Number.isFinite(storedBalance) || storedBalance < 0) throw new Error('The member balance requires administrator review before this transaction can be posted.');
      if (storedBalance > 0 && balanceCurrency !== currency) throw new Error('The member balance is recorded in a different currency and must be reconciled first.');
      if (request.type === 'withdrawal' && amount > storedBalance) throw new Error('The requested withdrawal exceeds the available account balance.');
      balanceAfter = request.type === 'deposit' ? storedBalance + amount : storedBalance - amount;
      collectionName = 'transactions';
      requestStatus = 'completed';
      record = {
        uid, requestId, type: request.type, amount, currency, status: 'completed',
        ...(request.method ? { method: String(request.method) } : {}),
        ...(request.destination ? { destination: String(request.destination.trim()) } : {}),
        balanceBefore: storedBalance, balanceAfter, completedAt: null
      };
    } else {
      throw new Error('Only trade, deposit, and withdrawal requests can create account activity records.');
    }

    const recordRef = doc(firestore, 'users', uid, collectionName, requestId);
    const existingRecord = await transaction.get(recordRef);
    if (existingRecord.exists()) throw new Error('An activity record already exists for this request. Contact support before retrying.');
    const now = serverTimestamp();
    transaction.set(recordRef, {
      ...record,
      ...(request.type === 'trade' ? { openedAt: now } : { completedAt: now }),
      createdAt: now,
      processedBy: String(processedBy || '')
    });
    if (balanceAfter !== undefined) {
      transaction.update(profileRef, { balance: balanceAfter, balanceCurrency: currency, balanceUpdatedAt: now, updatedAt: now });
    }
    transaction.update(requestRef, {
      status: requestStatus,
      resultId: recordRef.id,
      processedAt: now,
      updatedAt: now
    });
    return { recordId: recordRef.id, recordType: collectionName === 'trades' ? 'trade' : 'transaction', alreadyProcessed: false, balanceAfter, balanceCurrency: balanceAfter === undefined ? undefined : currency };
  });
}

export async function createRecord(collectionName, data) {
  const { db: firestore } = await firebaseReady();
  if (!ADMIN_COLLECTIONS.has(collectionName) || collectionName === 'users' || collectionName === 'auditLog') {
    throw new Error('This collection cannot be edited here.');
  }
  if (collectionName === 'marketAssets') return createMarketAsset(data);
  const ref = await addDoc(collection(firestore, collectionName), {
    ...data,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  });
  return ref.id;
}

async function createMarketAsset(data) {
  const { db: firestore } = await firebaseReady();
  const symbol = String(data.symbol || '').trim().toUpperCase();
  if (!/^[A-Z0-9][A-Z0-9._:-]{0,39}$/.test(symbol)) {
    throw new Error('Market symbols must be canonical and may not contain slashes.');
  }
  const ref = doc(firestore, 'marketAssets', symbol);
  await runTransaction(firestore, async (transaction) => {
    const snapshot = await transaction.get(ref);
    if (snapshot.exists()) throw new Error('That canonical market symbol already exists. Edit its existing listing instead.');
    transaction.set(ref, {
      ...data,
      symbol,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });
  });
  return symbol;
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

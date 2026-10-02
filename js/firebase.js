import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.14.1/firebase-app.js';
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut } from 'https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js';
import { getFirestore, collection, addDoc, getDocs, updateDoc, deleteDoc, doc, serverTimestamp } from 'https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js';

// Replace these values with the Firebase project supplied by the owner.
export const firebaseConfig = {
  apiKey: 'YOUR_FIREBASE_API_KEY',
  authDomain: 'YOUR_FIREBASE_AUTH_DOMAIN',
  projectId: 'YOUR_FIREBASE_PROJECT_ID',
  storageBucket: 'YOUR_FIREBASE_STORAGE_BUCKET',
  messagingSenderId: 'YOUR_FIREBASE_MESSAGING_SENDER_ID',
  appId: 'YOUR_FIREBASE_APP_ID'
};

const configured = !Object.values(firebaseConfig).some((value) => value.startsWith('YOUR_'));
let auth = null;
let db = null;
if (configured) {
  const app = initializeApp(firebaseConfig);
  auth = getAuth(app);
  db = getFirestore(app);
}

const previewData = {
  signals: [
    { id: 'btc-001', asset: 'Bitcoin', pair: 'BTC / USD', direction: 'Long', confidence: 92, timeframe: '4H', status: 'Active' },
    { id: 'eth-002', asset: 'Ethereum', pair: 'ETH / USD', direction: 'Long', confidence: 86, timeframe: '1D', status: 'Active' },
    { id: 'gold-003', asset: 'Gold', pair: 'XAU / USD', direction: 'Watch', confidence: 74, timeframe: '1H', status: 'Review' }
  ],
  users: [
    { id: 'user-001', name: 'Avery Morgan', email: 'avery@example.com', role: 'Member', status: 'Active' },
    { id: 'user-002', name: 'Jordan Lee', email: 'jordan@example.com', role: 'Analyst', status: 'Active' },
    { id: 'user-003', name: 'Riley Kim', email: 'riley@example.com', role: 'Member', status: 'Pending' }
  ]
};

export const isFirebaseConfigured = () => configured;
export async function registerUser(email, password, profile = {}) {
  if (!auth) return { user: { email, displayName: profile.name || 'Preview member' }, preview: true };
  const credential = await createUserWithEmailAndPassword(auth, email, password);
  await addDoc(collection(db, 'profiles'), { uid: credential.user.uid, email, ...profile, createdAt: serverTimestamp() });
  return credential;
}
export async function loginUser(email, password) {
  if (!auth) return { user: { email, displayName: 'Preview member' }, preview: true };
  return signInWithEmailAndPassword(auth, email, password);
}
export async function logoutUser() { if (auth) await signOut(auth); }
export async function listRecords(collectionName) {
  if (!db) return structuredClone(previewData[collectionName] || []);
  const snapshot = await getDocs(collection(db, collectionName));
  return snapshot.docs.map((item) => ({ id: item.id, ...item.data() }));
}
export async function createRecord(collectionName, data) {
  if (!db) { const record = { id: `${collectionName}-${Date.now()}`, ...data }; (previewData[collectionName] ||= []).push(record); return record; }
  const ref = await addDoc(collection(db, collectionName), { ...data, createdAt: serverTimestamp() });
  return { id: ref.id, ...data };
}
export async function updateRecord(collectionName, id, data) {
  if (!db) { const list = previewData[collectionName] || []; const index = list.findIndex((item) => item.id === id); if (index >= 0) list[index] = { ...list[index], ...data }; return list[index]; }
  await updateDoc(doc(db, collectionName, id), data); return { id, ...data };
}
export async function deleteRecord(collectionName, id) {
  if (!db) { previewData[collectionName] = (previewData[collectionName] || []).filter((item) => item.id !== id); return; }
  await deleteDoc(doc(db, collectionName, id));
}

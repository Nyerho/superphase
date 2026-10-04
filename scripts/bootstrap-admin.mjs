import admin from 'firebase-admin';

const uid = 'z3KAMbKcGFNYVWH2OKHtz4AT1rs2';
const email = 'admin@vertixtrades.com';
const serviceAccountJson = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
if (!serviceAccountJson) throw new Error('Set FIREBASE_SERVICE_ACCOUNT_JSON in the local shell; never commit it.');

const serviceAccount = JSON.parse(serviceAccountJson);
admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
const auth = admin.auth();
const db = admin.firestore();
const user = await auth.getUser(uid);
if (user.email?.toLowerCase() !== email) throw new Error(`UID ${uid} belongs to ${user.email || 'an account without email'}, not ${email}.`);

const password = process.env.VERTIX_ADMIN_PASSWORD;
if (password) {
  if (password.length < 12) throw new Error('VERTIX_ADMIN_PASSWORD must be at least 12 characters.');
  await auth.updateUser(uid, { password, emailVerified: true, disabled: false });
} else {
  await auth.updateUser(uid, { emailVerified: true, disabled: false });
}

const currentClaims = user.customClaims || {};
await auth.setCustomUserClaims(uid, { ...currentClaims, admin: true });
await db.doc(`admins/${uid}`).set({
  uid,
  email,
  role: 'admin',
  active: true,
  bootstrapSource: 'secure-admin-script',
  updatedAt: admin.firestore.FieldValue.serverTimestamp()
}, { merge: true });
await db.doc(`users/${uid}`).delete();
console.log(`Admin bootstrap complete for ${email} (${uid}). User profile removed; Auth account retained.`);

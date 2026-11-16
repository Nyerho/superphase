# Cloudflare Pages setup

This project uses a Cloudflare Pages Function at `functions/api/firebase-config.js` to serve the Firebase web configuration at `/api/firebase-config`.

In Cloudflare Dashboard → Workers & Pages → the Pages project → Settings → Environment variables, add these variables for both Preview and Production as needed:

- `FIREBASE_API_KEY`
- `FIREBASE_AUTH_DOMAIN`
- `FIREBASE_PROJECT_ID`
- `FIREBASE_STORAGE_BUCKET`
- `FIREBASE_MESSAGING_SENDER_ID`
- `FIREBASE_APP_ID`
- `FIREBASE_MEASUREMENT_ID` (optional)

Use the values in `.env.example`. These Firebase web values are public client configuration and are safe to deliver to the browser. Never add a Firebase Admin SDK service-account key to Pages variables exposed to the browser.

After saving the variables, redeploy the Pages project. Verify `https://YOUR-DOMAIN/api/firebase-config` returns JSON containing `apiKey`, `authDomain`, `projectId`, and `appId`.

In Firebase Console → Authentication → Settings → Authorized domains, add the exact Cloudflare Pages production domain and any custom domain used by the app. Also ensure Authentication → Sign-in method → Email/Password is enabled and the Firestore rules in `firestore.rules` are published.

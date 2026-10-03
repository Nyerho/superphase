# Firebase environment variables for Vercel

Add these variables in **Vercel → Project → Settings → Environment Variables** for each Vercel deployment environment you use. The live application reads them through `/api/firebase-config`; do not rename the keys.

| Key | Value |
|---|---|
| `FIREBASE_API_KEY` | `AIzaSyCmtMP5rHJqaiiRkPpLiVtFmAH42z90ECQ` |
| `FIREBASE_AUTH_DOMAIN` | `vertix-36eee.firebaseapp.com` |
| `FIREBASE_PROJECT_ID` | `vertix-36eee` |
| `FIREBASE_STORAGE_BUCKET` | `vertix-36eee.firebasestorage.app` |
| `FIREBASE_MESSAGING_SENDER_ID` | `689138703062` |
| `FIREBASE_APP_ID` | `1:689138703062:web:50a76c831613c2e4f9c777` |
| `FIREBASE_MEASUREMENT_ID` | `G-DQCW2JGFZ3` (optional; retained for the Firebase web-app configuration) |

The same public configuration is recorded in `.env.example`. Firebase web configuration is delivered to browsers by design; access control is enforced by Firebase Authentication and Firestore Security Rules, not by hiding the web API key.

## Firebase Console setup

1. Enable **Authentication → Email/Password** and set the production Vercel domain as an authorized domain.
2. Configure the email verification template and sender in Firebase Authentication.
3. Enable the Cloud Firestore API and create/confirm the Firestore database in `vertix-36eee`.
4. Review `firestore.rules` and publish those rules in Firebase before enabling registrations or member data access. Member documents live at `users/{uid}`; administrator documents live separately at `admins/{uid}`. An admin custom claim is required for administrator operations.
5. After changing Vercel variables, redeploy so the function receives the new environment.

## Admin credentials

The uploaded Firebase Admin SDK JSON is a **private service-account key**. It is used only for the one-time administrator provisioning operation and must never be committed, exposed through `/api/firebase-config`, or put in a browser-accessible variable. This application currently needs only the public variables above at runtime. If a future trusted server function needs the Admin SDK, provision a dedicated least-privilege service account and store its credentials as server-only Vercel secrets.

Administrator provisioning is pending because the Cloud Firestore API is disabled in the project. Once Firestore is enabled, create the Auth user and the separate `admins/{uid}` record; do not create a matching member document. Rotate the uploaded service-account key before production and change the admin's initial password after first sign-in.

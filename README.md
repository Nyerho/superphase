# Superphase Broker

A self-contained glassmorphism trading platform front end rebuilt from the supplied static snapshot.

## Pages

- `index.html` — cinematic landing page with market metrics, public signals, contact form, and footer
- `login.html` — Firebase-ready sign-in page
- `register.html` — Firebase-ready registration page
- `admin.html` — command center with in-memory preview CRUD and Firestore-ready persistence
- `dashboard.html` — compatibility alias that redirects to `admin.html`

## Firebase / Firestore handoff

1. Open `js/firebase.js`.
2. Replace the `YOUR_FIREBASE_*` values with the owner's Firebase web app configuration.
3. Enable Email/Password under Firebase Authentication.
4. Add Firestore collections named `profiles`, `signals`, and `users` with rules appropriate for your deployment.
5. In Firebase Console → Authentication → Settings → Authorized domains, add the exact production domain that serves this app (for example `superphase.web.app` and your custom domain). Do not use an unlisted preview hostname as a verification return address.
6. In Authentication → Templates, confirm the verification email template is enabled and uses the Firebase project action-link domain.
7. Deploy the static folder using the hosting provider of choice.

No browser `localStorage` or `sessionStorage` is used. Until real credentials are added, the auth and admin screens use clearly labeled in-memory preview behavior so the UI remains testable without persisting anything.

The Jivo widget and all visible original project branding have been removed. The legacy vendor folders are retained only to avoid breaking the supplied archive's original directory structure; the new pages do not load them.

Registration now calls Firebase `sendEmailVerification` without a custom continue URL. This uses the project's authorized Firebase action handler and avoids the common “Firebase rejected this website as a return address” error. If the deployment domain is used in a custom Firebase email template, it must still be added under Authorized domains before sending verification emails.

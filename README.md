# Vertix Trade

Vertix Trade is a responsive member and administrator workspace using the established black-and-yellow glassmorphism design.

## Pages

- `index.html` — public site
- `login.html`, `register.html`, `verify-email.html` — Firebase Authentication flows
- `user-dashboard.html` and `dashboard/*.html` — authenticated member workspace
- `admin.html` — custom-claim-protected administration
- `dashboard.html` — compatibility redirect to the member overview

## Data model

- `users/{uid}` stores a member's registration profile and preferred currency.
- `admins/{uid}` is a distinct administrator collection; administrator access additionally requires the Firebase Auth `admin` custom claim.
- `users/{uid}/requests`, `users/{uid}/trades`, and `users/{uid}/transactions` hold account-specific requests and records.
- `signals`, `marketAssets`, `copyStrategies`, `plans`, `digitalAssets`, `news`, and `marketCalendar` hold published platform data.
- Firestore is the application's account-data source. The client has no mock or local-storage fallback.

## Firebase and Vercel

Set the web-app environment variables listed in `.env.example` in Vercel. `/api/firebase-config` serves only Firebase's public web configuration. Configure Firebase Email/Password, email verification, authorized domains, Firestore, and publish `firestore.rules` before enabling account access. Cloud Firestore must be enabled for the project before the requested admin identity can be provisioned. Follow [VERCEL_ENV.md](VERCEL_ENV.md).

The uploaded Admin SDK service-account key is not part of the repository or required by the browser application. Never expose it to client code.

## Operational boundary

Member request forms persist authenticated submissions in Firestore with a submitted status. Funds movement and order execution require an authorized payment or brokerage execution service and are not represented as settled transactions by this client. Regulatory onboarding fields, disclosures, and consent language must be finalized for the jurisdictions Vertix Trade serves.

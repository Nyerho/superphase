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
- Administrators maintain `marketAssets` in the Admin page. Each canonical path-safe symbol is the unique document ID; a separate `tradingViewSymbol` maps it to chart data. Active records with a supported chart mapping drive the ticker, selectable market, crypto, stock/equity, and chart-page widgets. Firestore rules bind orders to the exact active listing; no instruments or chart values are seeded in client code.
- Firestore is the application's account-data source. The client has no mock or local-storage fallback.

## Firebase and Vercel

Set the web-app environment variables listed in `.env.example` in Vercel. `/api/firebase-config` serves only Firebase's public web configuration. Configure Firebase Email/Password, email verification, authorized domains, Firestore, and publish `firestore.rules` before enabling account access. Vercel does not publish Firestore rules; copy the complete `firestore.rules` file into Firebase Console → Firestore Database → Rules and publish it. Follow [VERCEL_ENV.md](VERCEL_ENV.md).

The uploaded Admin SDK service-account key is not part of the repository or required by the browser application. Never expose it to client code.

## Operational boundary

Member request forms persist authenticated submissions in Firestore with a submitted status. An administrator can record a deposit or withdrawal only after the corresponding external transfer has occurred; the same Firestore transaction then writes an immutable account transaction and adjusts the member's balance in their selected currency. Withdrawals above the recorded balance are rejected, and currency changes are blocked while a non-zero balance remains. An open trade is recorded only after an administrator confirms external execution and enters its actual fill price. The application does not itself move funds or execute orders; connect and validate authorized payment/brokerage services before automating either. Regulatory onboarding fields, disclosures, and consent language must be finalized for the jurisdictions Vertix Trade serves.

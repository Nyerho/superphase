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
- Administrators maintain `marketAssets` and the Admin page seeds starter records for signals, markets, copy strategies, plans, digital assets, news, and the market calendar when a collection is empty. The member workspace also has a safe read-only starter fallback so empty content collections do not render as dead ends.
- Active records with a supported `tradingViewSymbol` drive the ticker, selectable market, crypto, stock/equity, and chart-page widgets. Firestore rules bind orders to the exact active listing (including the documented starter markets).
- Member trades open immediately in an atomic Firestore transaction when the member has sufficient balance; the order amount is reserved from the balance. Deposits and withdrawals remain administrator-approved transactions. Administrators can manually mark KYC verified without a document upload.
- Administrators configure enabled deposit methods in `fundingMethods/{method}` for bank transfers, crypto wallets, and card payments. Verified members see the selected account, network, wallet or hosted payment URL on the Deposit page. Card payment is an instruction/hosted-checkout link until a real payment processor is connected; raw card data is never stored in Firestore.

## Firebase and Vercel

Set the web-app environment variables listed in `.env.example` in Vercel. `/api/firebase-config` serves only Firebase's public web configuration. Configure Firebase Email/Password, email verification, authorized domains, Firestore, and publish `firestore.rules` before enabling account access. Vercel does not publish Firestore rules; copy the complete `firestore.rules` file into Firebase Console → Firestore Database → Rules and publish it. Follow [VERCEL_ENV.md](VERCEL_ENV.md).

The uploaded Admin SDK service-account key is not part of the repository or required by the browser application. Never expose it to client code.

## Operational boundary

Member request forms persist authenticated submissions in Firestore with a submitted status. An administrator can record a deposit or withdrawal only after the corresponding external transfer has occurred; the same Firestore transaction then writes an immutable account transaction and adjusts the member's balance in their selected currency. Withdrawals above the recorded balance are rejected, and currency changes are blocked while a non-zero balance remains. The application does not itself move funds, settle withdrawals, or route orders to a broker; connect and validate authorized payment/brokerage services before automating those operations. Regulatory onboarding fields, disclosures, and consent language must be finalized for the jurisdictions Vertix Trade serves.

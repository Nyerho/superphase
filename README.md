# Vertix Trade

A static, responsive trading-workspace front end using a consistent yellow-and-black glassmorphism system.

## Pages
- `index.html` — public landing page
- `login.html` / `register.html` — Firebase-ready authentication previews
- `admin.html` — admin command center with in-memory CRUD preview
- `user-dashboard.html` — member overview
- `dashboard/*.html` — distinct member pages for deposits, withdrawals, trading, copy strategies, plans, digital gallery, signals, financing enquiry, histories, market notes, profile, settings, referrals, technical analysis, charts, and calendar
- `dashboard.html` — compatibility redirect to the member overview

## Preview behavior
The member pages share `js/member-dashboard.js` and `css/member-dashboard.css`. Sidebar destinations are actual static HTML documents. Trade controls validate locally and show an order preview only; no trade, payment, credit application, purchase, or account change is transmitted. Sample balances, market readings, histories, and strategies are illustrative.

## Firebase / Firestore handoff
1. Open `js/firebase.js`.
2. Replace the `YOUR_FIREBASE_*` values with the owner's Firebase web app configuration.
3. Enable Email/Password under Firebase Authentication.
4. Add Firestore collections named `profiles`, `signals`, and `users` with deployment-appropriate rules.
5. Deploy the static folder with the hosting provider of choice.

The site is a static front-end prototype; connect approved server-side services before enabling live financial actions. The generated Vertix Trade mark is in `assets/vertix-trade-mark.png`; the original assets remain for backward compatibility.

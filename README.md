# SWK Properties OS — Mobile

Installable PWA client for the **SWK OS** server (`swkpropertiesuae/SWKOS`). It holds **no business data of its own**: everything comes from the SWK OS API after sign-in, and a fresh workspace shows empty states.

## How it works
- **Auth:** `POST /api/auth/login` (client header `x-swk-client: android`, as SWKOS expects for mobile) returns a session token sent as `x-swk-session`. Supports 2FA codes, forced password change, lockout messages, idle auto-sign-out (`IDLE_MINUTES`), session expiry handling.
- **Permissions:** navigation and buttons follow `/api/meta` (role permissions); the server remains the authority.
- **Generic screens for every SWKOS entity (70 of the 105 launcher features, 141 entity types)** (`/api/meta`): search, status filters, paging, detail with child lines, create/edit with validation, reference pickers, line-item editors, delete with mandatory reason (non-owner deletes go to the Delete Bin), CSV export, approval decisions.
- **Native pages:** Overview, Deal Pipeline, Market Pulse (+ area detail, mortgage rates), Calendar, Delete Bin, Withdrawals (read), Notifications, Calculators, Account (password, sessions).
- **28 features open the SWK OS web app** (marked ↗): features that need a desktop surface or device-bound security — Reception QR check-in (office Wi-Fi + device key), WhatsApp/Email/Chat, Letter Studio, Reports, Admin settings, Handover files, AI, Inspection app, etc.

## Configure & deploy
1. Edit `config.js` (`API_BASE`). Host the folder on any static host (headers in `_headers` / `vercel.json`).
2. **CORS:** the SWK OS server only allows origins `localhost`, `*.swkpropertiesuae.com`, `*.swk.properties`, `*.swk.property`. Serve this app from one of those (e.g. `app.swk.properties`) or extend the allowlist in SWKOS `src/server/app.ts`.
3. Keep the CSP `connect-src` in `index.html` and the headers files in sync with `API_BASE`.
4. Local run: `npm start` → http://localhost:5173.

## Security notes
All API data is HTML-escaped (`lib/html.js`); strict CSP, no inline scripts/handlers (enforced by `npm run check`); service worker caches the app shell only, never API responses; the session token lives in `localStorage` (cleared on sign-out/expiry/idle) — acceptable under the strict CSP, but use a device PIN/MDM on shared phones. No analytics or third-party requests.

## Tests
`npm test` (unit), `npm run check` (static gate), `npm run test:e2e` (Playwright against a running SWK OS; needs `SWK_PASSWORD`, optional `SWK_API`, `SWK_EMAIL`). CI runs the first two.

## Known limits
Online only (writes are not queued offline). Withdrawals creation, Reception check-in and 2FA enrolment happen in the web app. Not load- or penetration-tested; native store packaging (Capacitor/Android: see `SWKAI`) is not included.

## Android release (hardened)
`SWK_KEYSTORE_FILE SWK_KEYSTORE_PASSWORD SWK_KEY_ALIAS SWK_KEY_PASSWORD` (env, never committed) then `npm run android:release`. Optional TLS pinning: `SWK_SPKI_PINS="<pin1>,<pin2>" SWK_PIN_DOMAIN=os.swk.properties` (get pins with `scripts/spki-pin.sh <host>` from a trusted network; at least two).
Native hardening: v2+v3 APK signing (SHA-256), R8 shrink/obfuscation, minSdk 24, HTTPS-only + system CA trust only, backups disabled, FLAG_SECURE (no screenshots/recents), session token in Android Keystore (AES-256-GCM) via `SwkSecure`, biometric/device-credential re-lock after 45 s in background, 10 min idle sign-out, rooted/debuggable/emulator refusal (best effort), mandatory written reasons for edits/deletes/lost leads, Lead Command (SLA breaches, follow-ups, conversion rate), Field Duty (30 s GPS batches, SOS; server rejects mock/stale fixes).
**Policy enforcement lives in the SWK OS server** (roles, approvals, audit log, workflow rules). The app cannot make fraud impossible; it removes client-side shortcuts and records identity + reason for every change.

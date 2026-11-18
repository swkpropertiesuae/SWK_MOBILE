# SWK Properties OS — Mobile

Installable PWA rebuilt on the SWKOS brand: gold/UAE-colour logos, Plus Jakarta Sans + Instrument Sans (+ Noto Sans Arabic for RTL), emerald/fold/graphite palette, community and property photos, all copied from `swkpropertiesuae/SWKOS`. No backend, no build step.

Run: `npx serve .` (offline caching needs http, not file://).

- Launcher: 12 app tiles, search, recents, quick create — full SWKOS nav tree (`data.js`, from `src/web/swk/nav.ts`).
- Built screens: Overview, Pipeline (3 departments), Market Pulse (DLD data from `swkpropertiesuae/data`), Properties/Units/Listings/Off-plan, Calendar, Reception check-in (Dubai time, 10:05 grace), Toolkit calculators, Leaderboard, Compliance, Handover docs, plus sample record lists for ~25 features.
- Other features show their workflow position only.

Operational records (deals, leads, staff beyond the 3 managers, KPIs, bank rates) are illustrative placeholders.

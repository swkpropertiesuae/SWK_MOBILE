import { base } from './api.js'
// Pages with a native screen; everything else under /e/<entity> uses the generic entity screens; the rest opens the SWK OS web app.
export const NATIVE = { '/': 'dashboard', '/dashboard': 'dashboard', '/pipeline': 'pipeline', '/market': 'market', '/toolkit': 'toolkit', '/calendar': 'calendar', '/recycle-bin': 'bin', '/withdrawals': 'withdrawals', '/lead-command': 'leadcmd', '/attendance': 'attendance', '/field-duty': 'attendance', '/daily-close': 'dailyclose', '/team-live': 'teamlive', '/utilities': 'utilities' }
export function routeFor(to) {
  const p = to.split('?')[0]
  if (NATIVE[p]) return { href: '#/p/' + NATIVE[p] }
  const m = p.match(/^\/e\/([a-z0-9_]+)$/)
  if (m) return { href: '#/e/' + m[1] }
  return { href: base() + p, external: true }
}
export const ICO = {
command: '<rect x="3" y="3" width="7" height="9"/><rect x="14" y="3" width="7" height="5"/><rect x="14" y="12" width="7" height="9"/><rect x="3" y="16" width="7" height="5"/>',
inventory: '<path d="M4 21V5l8-3v19M12 21h8V9l-8-3M8 8h1M8 12h1M8 16h1M16 12h1M16 16h1"/>',
clients: '<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20c0-3.5 3-6 6.5-6s6.5 2.5 6.5 6M16 4.5a3.5 3.5 0 010 7M18 14c2.5.6 3.5 2.6 3.5 6"/>',
sales: '<path d="M14 3H6a1 1 0 00-1 1v16a1 1 0 001 1h12a1 1 0 001-1V8zM14 3v5h5M8 14h8M8 17h5"/>',
leasing: '<circle cx="8" cy="15" r="4"/><path d="M11 12l9-9M16 7l3 3M14 9l2 2"/>',
owners: '<circle cx="10" cy="8" r="3.5"/><path d="M3 20c0-3.5 3-6 7-6M16 15h5M16 18h5M16 21h3"/>',
finance: '<path d="M19 5L5 19"/><circle cx="7" cy="7" r="2.5"/><circle cx="17" cy="17" r="2.5"/>',
compliance: '<path d="M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z"/><path d="M8.5 12l2.5 2.5 4.5-5"/>',
team: '<rect x="3" y="5" width="18" height="14" rx="2"/><circle cx="9" cy="11" r="2"/><path d="M6 16c.5-1.5 1.7-2 3-2s2.5.5 3 2M14 10h4M14 13h3"/>',
field: '<path d="M12 21s7-6.2 7-11.5A7 7 0 005 9.5C5 14.8 12 21 12 21z"/><circle cx="12" cy="9.5" r="2.5"/>',
tools: '<rect x="5" y="3" width="14" height="18" rx="2"/><path d="M8 7h8M8 12h1M12 12h1M8 16h1M12 16h1"/>',
admin: '<circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3M4.9 4.9l2.1 2.1M17 17l2.1 2.1M4.9 19.1L7 17M17 7l2.1-2.1"/>',
apps: '<rect x="3" y="3" width="7" height="7" rx="2"/><rect x="14" y="3" width="7" height="7" rx="2"/><rect x="3" y="14" width="7" height="7" rx="2"/><rect x="14" y="14" width="7" height="7" rx="2"/>',
mkt: '<path d="M3 17l6-6 4 4 8-8M15 7h6v6"/>', cal: '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4"/>',
bell: '<path d="M6 9a6 6 0 1112 0c0 6 2 7 2 7H4s2-1 2-7M10 20a2 2 0 004 0"/>', user: '<circle cx="12" cy="8" r="4"/><path d="M4 21c0-4 4-6 8-6s8 2 8 6"/>', calc: '<rect x="5" y="3" width="14" height="18" rx="2"/><path d="M8 7h8M8 12h1M12 12h1M8 16h1M12 16h1"/>' }

import { h, raw } from '../lib/html.js'
import { NAV } from '../lib/nav.js'
import { can, X } from '../lib/state.js'
import { greeting, dubaiParts } from '../lib/format.js'
import { routeFor, ICO } from '../lib/routes.js'

const visible = i => !i[3] || can(i[3], 'view')
export const sections = () => NAV.map(s => ({ ...s, items: s.items.filter(visible) })).filter(s => s.items.length)
const recents = () => { try { return JSON.parse(localStorage.getItem('swk.recent') || '[]') } catch { return [] } }
export const remember = href => { try { localStorage.setItem('swk.recent', JSON.stringify([href, ...recents().filter(x => x !== href)].slice(0, 6))) } catch {} }
export const svg = k => h`<svg viewBox="0 0 24 24" aria-hidden="true">${raw(ICO[k] || ICO.command)}</svg>`
export function launcher(q = '') {
  const n = q.trim().toLowerCase(), S = sections(), p = dubaiParts()
  const apps = S.filter(s => !n || s.label.toLowerCase().includes(n) || (s.b || '').toLowerCase().includes(n))
  const feats = n ? S.flatMap(s => s.items.map(i => ({ s, i }))).filter(x => x.i[0].toLowerCase().includes(n) || x.i[2].toLowerCase().includes(n)).slice(0, 14) : []
  const all = S.flatMap(s => s.items.map(i => ({ s, i })))
  const rc = n ? [] : recents().map(href => all.find(x => routeFor(x.i[1]).href === href)).filter(Boolean).slice(0, 4)
  const first = (X.me?.name || '').split(' ')[0]
  return h`<header class="hero"><div class="top"><img class="logo" src="assets/brand/logo-horizontal.png" alt="SWK Properties OS"><a class="circ" href="#/account" aria-label="Account">${(X.me?.name || '?').slice(0, 1)}</a></div>
  <div class="eyebrow">SWK Properties LLC · ${p.weekday}, ${p.day} ${p.month}</div>
  <h1>${greeting()}${first ? ', ' + first : ''}.</h1>
  <form class="search" role="search" data-search><span aria-hidden="true">⌕</span><input id="q" type="search" placeholder="Search apps or pages…" aria-label="Search apps and pages" value="${q}" autocomplete="off"></form></header>
  <div class="wrap">
  ${rc.length ? h`<div><div class="lbl">Recent</div><div class="chips">${rc.map(x => h`<a class="chip" href="${routeFor(x.i[1]).href}">${x.i[0]}</a>`)}</div></div>` : ''}
  ${!n && can('crm', 'create') ? h`<div><div class="lbl">Quick create</div><div class="chips">${[['New Lead', '/e/leads/new', 'crm'], ['Submit Property', '/e/inventory_submissions/new', 'properties'], ['Book Viewing', '/e/viewings/new', 'mandates'], ['New Sale File', '/e/transactions/new', 'transactions'], ['New Lease', '/e/leases/new', 'leases'], ['Request NOC', '/e/developer_requests/new', 'transactions'], ['Daily Report', '/e/daily_reports/new', 'hr']].filter(x => can(x[2], 'create')).map(([l, to]) => h`<a class="chip on" href="#${to}">+ ${l}</a>`)}</div></div>` : ''}
  ${feats.length ? h`<div class="list">${feats.map(x => h`<a class="li" href="${routeFor(x.i[1]).href}"><span class="ic t-${x.s.tone}">${svg(x.s.key)}</span><span class="tx"><b>${x.i[0]}</b><small>${x.i[2] || x.s.label}</small></span><span class="arr">›</span></a>`)}</div>` : ''}
  ${apps.length ? h`<div class="tiles">${apps.map(s => h`<a class="tile" href="#/app/${s.key}"><span class="ic t-${s.tone}">${svg(s.key)}</span><b>${s.label}</b><small>${s.items.length} apps</small></a>`)}</div>` : !feats.length ? h`<div class="card"><b>No app or page matches “${q}”</b><span class="m">Try a simpler word.</span></div>` : ''}
  <div class="note">RERA ORN 51517 · ${X.meta?.settings?.company_name || 'SWK Properties L.L.C.'}</div></div>`
}
export function appView(key) {
  const s = sections().find(x => x.key === key); if (!s) return null
  return { title: s.label, body: h`<div class="wrap"><div class="card tint"><span class="m">${s.b}</span></div><div class="list">${s.items.map((i, n) => { const r = routeFor(i[1]); return h`<a class="li" href="${r.href}" ${r.external ? raw('target="_blank" rel="noopener noreferrer"') : ''}><span class="ic t-${s.tone} hd">${n + 1}</span><span class="tx"><b>${i[0]}</b><small>${i[2].replace(/^Step \d+ · /, '')}${r.external ? ' · opens SWK OS web' : ''}</small></span><span class="arr">${r.external ? '↗' : '›'}</span></a>` })}</div></div>` }
}

import { h, raw } from './lib/html.js'
import { isAuthed, getSession, logout, get, initSession } from './lib/api.js'
import { isNative, integrity, biometricAvailable, biometricAuth } from './lib/native.js'
import { X, loadMeta, entity, resetState } from './lib/state.js'
import { $, $$, toast, spinner, errorCard, confirmSheet } from './lib/ui.js'
import { loginView, changePasswordView } from './views/auth.js'
import { launcher, appView, remember, svg } from './views/launcher.js'
import { entityList, entityDetail, entityForm, listActions, detailActions, formActions, listSearch, submitForm, pickRef, notFound } from './views/entity.js'
import * as P from './views/pages.js'
import { leadCommand, myAssignedDeals, opsActions } from './views/ops.js'
import { attendance, dailyClose, teamLive, utilities, teamActions } from './views/team.js'
import { startSync, stopSync, kickSync, syncState } from './lib/sync.js'
import { refreshList } from './views/entity.js'

const root = $('#v'), dock = $('#dock')
const IDLE_MS = (globalThis.SWK_CONFIG?.IDLE_MINUTES ?? 10) * 60000
let view = null, token = 0, unread = 0, sessionQ = ''
const DOCK = [['', 'Apps', 'apps'], ['p/dashboard', 'Overview', 'command'], ['p/market', 'Market', 'mkt'], ['p/calendar', 'Calendar', 'cal'], ['account', 'Account', 'user']]
const ACTIONS = {
  ...listActions, ...detailActions, ...formActions, ...P.marketActions, ...P.calActions, ...P.binActions, ...P.notifActions, ...P.tkActions, ...opsActions, ...teamActions,
  retry: () => 'reload',
  rtl: () => { document.documentElement.dir = document.documentElement.dir === 'rtl' ? 'ltr' : 'rtl'; try { localStorage.setItem('swk.dir', document.documentElement.dir) } catch {} },
  logout: async () => { if (await confirmSheet('Sign out', 'You will need to sign in again.', 'Sign out')) await signOut() },
  pick: el => pickRef(el)
}
const PAGES = { dashboard: P.dashboard, pipeline: P.pipeline, market: P.market, calendar: P.calendar, bin: P.bin, withdrawals: P.withdrawals, toolkit: P.toolkit, leadcmd: leadCommand, mydeals: myAssignedDeals, attendance, dailyclose: dailyClose, teamlive: teamLive, utilities }

async function resolve(parts) {
  const [a, b, c, d] = parts
  if (!a) return { launcher: true }
  if (a === 'app') return appView(b) || notFound(b)
  if (a === 'p') { const f = PAGES[b]; return f ? f(b, c) : notFound(b) }
  if (a === 'notifications') return P.notifications()
  if (a === 'account') return P.account()
  if (a === 'e') {
    if (!b || !entity(b) || entity(b).child) return notFound(b)
    if (!c) return entityList(b)
    if (c === 'new') return entityForm(b)
    if (d === 'edit') return entityForm(b, +c)
    return entityDetail(b, +c)
  }
  return notFound(a)
}
const barHtml = title => h`<div class="bar"><button class="circ back" data-act-back aria-label="Back">←</button><h2>${title}</h2><span class="live" data-live="${syncState()}" role="status" aria-label="Live updates"></span><a class="circ bell" href="#/notifications" aria-label="Notifications${unread ? ', ' + unread + ' unread' : ''}"><svg viewBox="0 0 24 24" aria-hidden="true">${raw('<path d="M6 9a6 6 0 1112 0c0 6 2 7 2 7H4s2-1 2-7M10 20a2 2 0 004 0"/>')}</svg>${unread ? h`<i class="badge">${unread > 9 ? '9+' : unread}</i>` : ''}</a></div>`

async function render() {
  const my = ++token, hash = location.hash.replace(/^#\/?/, '').split('?')[0]
  if (!isAuthed()) { dock.hidden = true; return loginView(root, { onDone: boot }) }
  if (!X.meta) {
    try { root.innerHTML = spinner().s; await loadMeta() } catch (e) { if (e.status === 401) return; root.innerHTML = errorCard(e).s; return }
  }
  if (getSession()?.mustChangePassword) { dock.hidden = true; return changePasswordView(root, { onDone: boot }) }
  if (hash === 'changepw') { dock.hidden = true; return changePasswordView(root, { forced: false, onDone: () => { location.hash = '#/account' } }) }
  dock.hidden = false
  const parts = hash.split('/').filter(Boolean).map(decodeURIComponent)
  root.innerHTML = barHtml('Loading…').s + `<div class="wrap">${spinner().s}</div>`
  let v
  try { v = await resolve(parts) } catch (e) { if (my !== token) return; v = { title: 'Error', body: h`<div class="wrap">${errorCard(e)}</div>` } }
  if (my !== token) return
  view = { ...v, parts, reload: () => render() }
  if (v.launcher) root.innerHTML = launcher(sessionQ).s
  else root.innerHTML = barHtml(v.title).s + v.body.s
  root.classList.remove('enter'); void root.offsetWidth; root.classList.add('enter')
  paint(); view.after?.(view); if (v.launcher) dailyBanner()
  if (parts[0] === 'e' && parts[1] && !parts[2]) remember('#/e/' + parts[1])
  document.title = (v.title ? v.title + ' · ' : '') + 'SWK OS'
  window.scrollTo(0, 0)
}
function paint() {
  $$('[data-w]').forEach(e => { e.style.width = Math.min(100, +e.dataset.w || 0) + '%' })
  $$('.dot[data-c]').forEach(e => { if (/^#[0-9a-f]{3,8}$/i.test(e.dataset.c)) e.style.background = e.dataset.c })
  const cur = location.hash.replace(/^#\/?/, '')
  dock.innerHTML = DOCK.map(([p, l, i]) => h`<a href="#/${p}" class="${cur === p ? 'on' : ''}" ${cur === p ? raw('aria-current="page"') : ''}>${svg(i)}${l}</a>`.s).join('')
}
async function dailyBanner() {
  try {
    const p = new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Dubai', weekday: 'short', hour: '2-digit', hour12: false }).formatToParts(new Date()), wd = p.find(x => x.type === 'weekday').value, hr = +p.find(x => x.type === 'hour').value
    if (wd === 'Sun' || hr < 16) return
    const st = await get('/api/daily/status'); if (st.submitted || !$('.wrap')) return
    $('.wrap').insertAdjacentHTML('afterbegin', '<a class="card err link" href="#/p/dailyclose"><b>Daily report + next-day plan due</b><span class="m">Submit before you leave. Owner and Haseeb are alerted automatically.</span></a>')
  } catch { /* server without the daily API, or no employee profile: no banner */ }
}
async function boot() { resetState(); await render(); refreshUnread(); startLive() }
async function refreshUnread() {
  if (!isAuthed()) return
  try { const r = await get('/api/notifications'); unread = Number(r.unread) || 0; const b = $('.bell'); if (b && unread && !$('.badge', b)) b.insertAdjacentHTML('beforeend', `<i class="badge">${unread > 9 ? '9+' : unread}</i>`) } catch {}
}
async function signOut() { stopSync(); await logout(); resetState(); sessionQ = ''; location.hash = ''; await render() }

document.addEventListener('click', async e => {
  if (e.target.closest('[data-act-back]')) { history.length > 1 ? history.back() : (location.hash = ''); return }
  const el = e.target.closest('[data-act]'); if (!el) return
  const fn = ACTIONS[el.dataset.act]; if (!fn) return
  e.preventDefault(); navigator.vibrate?.(6)
  try { const r = await fn(el, view); if (r === 'reload') await render() } catch (x) { toast(x.message || 'Action failed', 'bad') }
})
document.addEventListener('submit', e => {
  const f = e.target
  if (f.matches('[data-search],[data-search-list],[data-nosubmit]')) e.preventDefault()
  else if (f.id === 'ef') { e.preventDefault(); submitForm(f, view) }
})
document.addEventListener('input', e => {
  const t = e.target
  if (t.id === 'q') { sessionQ = t.value; const p = t.selectionStart; root.innerHTML = launcher(sessionQ).s; const n = $('#q'); n.focus(); n.setSelectionRange(p, p) }
  else if (t.id === 'lq') listSearch(t.value)
  else if (t.id === 'mq') { P.setMarketQuery(t.value); const p = t.selectionStart; render().then(() => { const n = $('#mq'); n?.focus(); n?.setSelectionRange(p, p) }) }
  else if (t.closest('[data-calc]')) P.calc(e)
})
document.addEventListener('change', e => { if (e.target.closest('[data-calc]')) P.calc(e) })
addEventListener('hashchange', render)
addEventListener('swk:unauth', () => { const was = !!X.meta; resetState(); if (was) toast('Session expired — sign in again', 'bad'); render() })

let idle
const bump = () => { clearTimeout(idle); if (isAuthed()) idle = setTimeout(() => { toast('Signed out after inactivity', 'bad'); signOut() }, IDLE_MS) }
for (const ev of ['pointerdown', 'keydown', 'touchstart']) addEventListener(ev, bump, { passive: true })
bump()
const net = $('#net'), upd = () => { net.hidden = navigator.onLine }
addEventListener('online', upd); addEventListener('offline', upd); upd()
try { const d = localStorage.getItem('swk.dir'); if (d) document.documentElement.dir = d } catch {}
addEventListener('error', e => console.error(e.error || e.message))
addEventListener('unhandledrejection', e => console.error(e.reason))
if ('serviceWorker' in navigator && location.protocol !== 'file:') navigator.serviceWorker.register('sw.js').catch(() => {})

// ---- device integrity gate + background lock (native app)
const CFG = globalThis.SWK_CONFIG || {}
async function integrityGate() {
  if (!isNative() || CFG.BLOCK_COMPROMISED_DEVICES === false) return true
  try { const i = await integrity(); if (i.rooted || i.debuggable || i.emulator) { dock.hidden = true; root.innerHTML = h`<div class="wrap"><div class="card err"><b class="hd t">Device not permitted</b><span class="m">${i.rooted ? 'This device appears to be rooted.' : i.debuggable ? 'This build is debuggable.' : 'Emulators are not permitted.'} Company data cannot be opened here.</span></div></div>`.s; return false } } catch {}
  return true
}
let hiddenAt = 0, locked = false
async function lock() {
  if (locked || !isAuthed() || !isNative()) return
  locked = true
  const bio = await biometricAvailable().catch(() => false)
  const ov = document.createElement('div'); ov.className = 'lockscreen'; ov.setAttribute('role', 'dialog'); ov.setAttribute('aria-label', 'App locked')
  ov.innerHTML = h`<img class="logo" src="assets/brand/logo-horizontal.png" alt="SWK OS"><b class="hd">Locked</b><span class="m">${bio ? 'Verify to continue.' : 'No screen lock is set up. Sign in again.'}</span>${bio ? h`<button class="btn" data-lk="unlock">Unlock</button>` : ''}<button class="btn out" data-lk="out">Sign out</button>`.s
  document.body.append(ov)
  const done = () => { ov.remove(); locked = false; bump() }
  const tryUnlock = async () => { try { if (await biometricAuth('Unlock SWK OS')) done() } catch { toast('Verification failed', 'bad') } }
  ov.addEventListener('click', async e => { const b = e.target.closest('[data-lk]'); if (!b) return; if (b.dataset.lk === 'out') { ov.remove(); locked = false; await signOut() } else tryUnlock() })
  if (bio) tryUnlock(); else { ov.remove(); locked = false; await signOut() }
}
document.addEventListener('visibilitychange', () => {
  if (document.hidden) hiddenAt = Date.now()
  else if (hiddenAt && Date.now() - hiddenAt > (CFG.LOCK_SECONDS ?? 45) * 1000) lock()
})
// ---- real-time: refresh the visible screen the moment the server reports a change
const typing = () => { const a = document.activeElement; return !!a && a !== document.body && root.contains(a) && /^(INPUT|TEXTAREA|SELECT)$/.test(a.tagName) }
const overlay = () => !!document.querySelector('dialog[open], .lockscreen')
let refreshT = 0, dirty = false
async function softRefresh() {
  if (!isAuthed() || !X.meta || !view?.parts) return
  const [a, b, c, d] = view.parts
  if (view.launcher || a === 'app' || a === 'account' || a === 'changepw' || (a === 'p' && (b === 'toolkit' || b === 'utilities')) || (a === 'e' && (c === 'new' || d === 'edit'))) return
  if (overlay()) { dirty = true; return }
  if (a === 'e' && b && !c) return refreshList()   // only the rows are replaced, so typing in the search box is never disturbed
  if (typing()) { dirty = true; return }
  dirty = false
  const my = token, y = scrollY
  try {
    const v = await resolve(view.parts); if (my !== token || typing() || overlay()) return
    view = { ...v, parts: view.parts, reload: () => render() }
    root.innerHTML = barHtml(v.title).s + v.body.s; paint(); view.after?.(view); scrollTo(0, y)
  } catch { /* transient: the next event retries */ }
}
const kick = () => { clearTimeout(refreshT); refreshT = setTimeout(softRefresh, 150) }
function relevant(ev) {
  const [a, b] = view?.parts || []
  if (ev.reset || ev.poll) return true
  if (ev.entity === 'notifications') return false
  if (a === 'e' && b) return ev.entity === b || (entity(b)?.children || []).some(k => k.entity === ev.entity)
  if (a === 'p' && b === 'leadcmd') return ev.entity === 'leads' || ev.entity === 'activities'
  return !!a
}
let lastTitle = ''
async function onEvents(evs) {
  if (evs.some(e => e.entity === 'notifications' || e.reset || e.poll)) {
    try {
      const r = await get('/api/notifications'), prev = unread; unread = Number(r.unread) || 0
      const bell = $('.bell'); if (bell) { const old = $('.badge', bell); if (old) old.parentNode.removeChild(old); if (unread) bell.insertAdjacentHTML('beforeend', `<i class="badge">${unread > 9 ? '9+' : unread}</i>`) }
      const top = (r.rows || []).find(n => !n.read_at)
      if (unread > prev && top && top.title !== lastTitle) { lastTitle = top.title; toast('🔔 ' + top.title); navigator.vibrate?.([30, 40, 30]) }
    } catch { /* ignore */ }
  }
  if (evs.some(relevant)) kick()
}
const onState = st => { $$('.live').forEach(e => { e.dataset.live = st }) }
function startLive() { if (isAuthed()) startSync(onEvents, onState) }
document.addEventListener('visibilitychange', () => { if (!document.hidden) { kickSync(); kick() } })
addEventListener('online', () => { kickSync(); kick() })
document.addEventListener('focusout', () => { if (dirty) setTimeout(() => { if (!typing()) kick() }, 300) })
addEventListener('swk:unauth', stopSync)
setInterval(() => { if (view?.parts?.[1] === 'teamlive' && !document.hidden) kick() }, 30000)

await initSession()
if (await integrityGate()) render().then(() => { refreshUnread(); startLive() })


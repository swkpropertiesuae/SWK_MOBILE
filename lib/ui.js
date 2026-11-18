import { h, raw, esc } from './html.js'
export const $ = (s, r = document) => r.querySelector(s)
export const $$ = (s, r = document) => [...r.querySelectorAll(s)]
let tt
export function toast(msg, kind = 'ok') {
  const el = $('#toast'); if (!el) return
  el.textContent = msg; el.className = 'toast show ' + kind
  clearTimeout(tt); tt = setTimeout(() => el.classList.remove('show'), kind === 'bad' ? 5000 : 2400)
}
export const spinner = () => h`<div class="skel-wrap" role="status" aria-live="polite" aria-label="Loading"><div class="skel"></div><div class="skel s2"></div><div class="skel s3"></div></div>`
export const empty = (t, sub = '') => h`<div class="state"><b class="hd">${t}</b><span class="m">${sub}</span></div>`
export const errorCard = (e, retry = true) => h`<div class="card err" role="alert"><b>${e?.status === 403 ? 'Not permitted' : e?.status === 0 ? 'You are offline' : 'Something went wrong'}</b><span class="m">${e?.message || String(e)}</span>${retry ? h`<button class="btn out" data-act="retry">Try again</button>` : ''}</div>`
const CLR = { green: 'ok', emerald: 'ok', blue: 'info', teal: 'info', amber: 'warn', orange: 'warn', yellow: 'warn', red: 'bad', rose: 'bad', grey: '', gray: '', violet: 'info', purple: 'info' }
export function statusClass(s, opt) {
  if (opt && typeof opt === 'object' && opt.color) return CLR[String(opt.color).toLowerCase()] ?? ''
  return /reject|overdue|fail|cancel|absent|expired|lost|hot|critical|urgent|blocked|declin|void/i.test(s) ? 'bad' : /pending|warn|due|review|late|draft|open|new|warm|await|hold/i.test(s) ? 'warn' : /cold/i.test(s) ? 'info' : /active|approved|paid|done|complete|closed|won|signed|confirm|posted|ok|verified|received/i.test(s) ? 'ok' : ''
}
export const chip = (label, cls = '') => h`<span class="st ${cls}">${label}</span>`
// <dialog>-based bottom sheet. build(root, close) fills the body; resolves with the value passed to close().
export function sheet(title, build) {
  return new Promise(resolve => {
    const d = document.createElement('dialog'); d.className = 'sheet'; d.setAttribute('aria-label', title)
    d.innerHTML = `<div class="sh-h"><b class="hd">${esc(title)}</b><button class="circ" type="button" data-sh-close aria-label="Close">✕</button></div><div class="sh-b"></div>`
    document.body.append(d)
    const close = v => { try { d.close() } catch {} d.remove(); resolve(v) }
    d.addEventListener('cancel', e => { e.preventDefault(); close(undefined) })
    d.addEventListener('click', e => { if (e.target.closest('[data-sh-close]') || e.target === d) close(undefined) })
    build($('.sh-b', d), close, d); d.showModal(); ($('input,textarea,select,button.btn', d) || d).focus?.()
  })
}
export const confirmSheet = (title, text, okLabel = 'Confirm', danger = false) => sheet(title, (root, close) => {
  root.innerHTML = h`<p>${text}</p><div class="row gap"><button class="btn out" type="button" data-x="no">Cancel</button><button class="btn ${danger ? 'danger' : ''}" type="button" data-x="yes">${okLabel}</button></div>`.s
  root.addEventListener('click', e => { const b = e.target.closest('[data-x]'); if (b) close(b.dataset.x === 'yes') })
})
export const reasonSheet = (title, text, okLabel = 'Submit', danger = false) => sheet(title, (root, close) => {
  root.innerHTML = h`<p class="m">${text}</p><label>Reason (required)<textarea id="rs" rows="3" maxlength="500"></textarea></label><p class="m bad-t" id="rse" role="alert"></p><div class="row gap"><button class="btn out" type="button" data-x="no">Cancel</button><button class="btn ${danger ? 'danger' : ''}" type="button" data-x="yes">${okLabel}</button></div>`.s
  root.addEventListener('click', e => { const b = e.target.closest('[data-x]'); if (!b) return; if (b.dataset.x === 'no') return close(undefined); const v = $('#rs', root).value.trim(); if (v.length < 3) { $('#rse', root).textContent = 'Enter a reason of at least 3 characters.'; return } close(v) })
})
export const humanize = k => String(k).replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()).replace(/\bId\b/, 'ID').replace(/\bAed\b/, 'AED')

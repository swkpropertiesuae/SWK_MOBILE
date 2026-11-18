// Generic, metadata-driven screens for every SWKOS entity (/api/meta -> entities).
import { h, raw, safeUrl, esc } from '../lib/html.js'
import { get, post, put, del, reasonHeader, request } from '../lib/api.js'
import { X, entity, can } from '../lib/state.js'
import { fmtField, aed, optValue, optLabel, optLabelOf } from '../lib/format.js'
import { $, $$, toast, spinner, empty, errorCard, chip, statusClass, sheet, confirmSheet, reasonSheet } from '../lib/ui.js'

const PAGE = 20
const cols = def => def.fields.filter(f => f.list && !f.hidden && !f.secret && f.type !== 'json')
const isStatus = (def, f) => def.statusField === f.name
const statusOpt = (f, v) => (f?.options || []).find(o => optValue(o) === v)
const canDo = (def, a) => can(def.module, a) && !(a !== 'view' && def.readonlyApi)

// ------------------------------------------------------------------ list
const L = { key: '', q: '', status: '', page: 1, total: 0, rows: [], busy: false }
export const entityList = key => {
  const def = entity(key); if (!def) return notFound(key)
  if (L.key !== key) Object.assign(L, { key, q: '', status: '', page: 1, total: 0, rows: [] })
  const sf = def.statusField && def.fields.find(f => f.name === def.statusField && f.type === 'select')
  return {
    title: def.plural,
    body: h`<div class="wrap">
      ${def.description ? h`<div class="m">${def.description}</div>` : ''}
      <form class="search bd" role="search" data-search-list><span aria-hidden="true">⌕</span><input id="lq" type="search" placeholder="Search ${def.plural.toLowerCase()}" aria-label="Search" value="${L.q}" autocomplete="off"></form>
      ${sf ? h`<div class="chips"><button class="chip ${L.status ? '' : 'on'}" data-act="lstatus" data-v="">All</button>${sf.options.map(o => h`<button class="chip ${L.status === optValue(o) ? 'on' : ''}" data-act="lstatus" data-v="${optValue(o)}">${optLabel(o)}</button>`)}</div>` : ''}
      <div id="lrows" class="list"></div><div id="lfoot" class="row center"></div>
      <div class="row gap">${canDo(def, 'create') ? h`<a class="btn" href="#/e/${key}/new">+ New ${def.label}</a>` : ''}${can(def.module, 'export') ? h`<button class="btn out" data-act="lexport">Export CSV</button>` : ''}</div>
    </div>`,
    after: () => loadList(true)
  }
}
async function loadList(reset) {
  const def = entity(L.key), rows = $('#lrows'), foot = $('#lfoot'); if (!rows) return
  if (L.busy) return; L.busy = true
  if (reset) { L.page = 1; L.rows = []; rows.innerHTML = spinner().s; foot.innerHTML = '' }
  try {
    const r = await get('/api/e/' + L.key, { page: L.page, pageSize: PAGE, q: L.q || undefined, sort: def.defaultSort?.field || 'id', dir: def.defaultSort?.dir || 'desc', filters: L.status && def.statusField ? [{ field: def.statusField, op: 'eq', value: L.status }] : undefined })
    L.total = r.total; L.rows = reset ? r.rows : [...L.rows, ...r.rows]
    rows.innerHTML = L.rows.length ? L.rows.map(x => rowCard(def, x).s).join('') : empty(L.q || L.status ? 'No matches' : `No ${def.plural.toLowerCase()} yet`, canDo(def, 'create') ? `Tap “New ${def.label}” to add the first one.` : '').s
    foot.innerHTML = L.rows.length < L.total ? h`<button class="btn out" data-act="lmore">Load more (${L.rows.length} of ${L.total})</button>`.s : L.total ? h`<span class="m">${L.total} record${L.total === 1 ? '' : 's'}</span>`.s : ''
  } catch (e) { rows.innerHTML = errorCard(e).s } finally { L.busy = false }
}
function rowCard(def, r) {
  const sf = def.fields.find(f => f.name === def.statusField)
  const c = cols(def).filter(f => !def.title.includes(f.name) && !isStatus(def, f))
  const money = c.find(f => f.type === 'money'), sub = c.filter(f => f !== money).slice(0, 3).map(f => fmtField(f, r)).filter(v => v !== '—')
  const st = sf && r[sf.name]
  return h`<a class="li" href="#/e/${def.key}/${r.id}"><span class="tx"><b>${r._title || '#' + r.id}</b><small>${sub.join(' · ')}</small></span><span class="rt">${st ? chip(optLabelOf(sf, st), statusClass(st, statusOpt(sf, st))) : ''}${money && r[money.name] != null ? h`<small class="m">${aed(r[money.name])}</small>` : ''}</span></a>`
}
export const listActions = {
  async lmore() { L.page++; await loadList(false) },
  async lstatus(el) { L.status = el.dataset.v; $$('[data-act=lstatus]').forEach(b => b.classList.toggle('on', b === el)); await loadList(true) },
  async lexport() {
    try {
      const blob = await request('GET', `/api/e/${L.key}/export.csv`, { params: { q: L.q || undefined }, blob: true })
      const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = `${L.key}-${new Date().toISOString().slice(0, 10)}.csv`; document.body.append(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 4000)
    } catch (e) { toast(e.message, 'bad') }
  }
}
let qt
export const listSearch = v => { clearTimeout(qt); qt = setTimeout(() => { L.q = v.trim(); loadList(true) }, 300) }

// ------------------------------------------------------------------ detail
export async function entityDetail(key, id) {
  const def = entity(key); if (!def) return notFound(key)
  const rec = await get(`/api/e/${key}/${id}`)
  const fields = def.fields.filter(f => !f.secret && !f.hidden && f.type !== 'json' || f.key)
  const sections = [], by = {}
  for (const f of fields) { const s = f.section || 'Details'; if (!by[s]) sections.push(by[s] = { name: s, fields: [] }); by[s].fields.push(f) }
  const sf = def.fields.find(f => f.name === def.statusField), st = sf && rec[sf.name]
  const keyF = def.fields.filter(f => f.key && rec[f.name] != null && rec[f.name] !== '')
  const approval = key === 'universal_approvals' && /pending|await/i.test(st || '') && can('admin', 'approve')
  const kids = (def.children || []).map(c => ({ c, rows: rec.children?.[c.key] || [] }))
  return {
    title: rec._title || def.label, meta: { key, id, rec },
    body: h`<div class="wrap">
      <div class="card"><div class="row"><b class="hd t">${rec._title}</b>${st ? chip(optLabelOf(sf, st), statusClass(st, statusOpt(sf, st))) : ''}</div>
      ${keyF.length ? h`<div class="kv2">${keyF.map(f => h`<div><span class="m">${f.label}</span><b>${fmtField(f, rec)}</b></div>`)}</div>` : ''}</div>
      ${approval ? h`<div class="card"><b>Decision</b><label>Comments<textarea id="ac" rows="2"></textarea></label><div class="row gap"><button class="btn" data-act="adecide" data-d="approve">Approve</button><button class="btn out" data-act="adecide" data-d="return">Return</button><button class="btn danger" data-act="adecide" data-d="reject">Reject</button></div></div>` : ''}
      ${sections.map(s => h`<div class="card"><div class="lbl">${s.name}</div><dl class="dl">${s.fields.map(f => h`<dt>${f.label}</dt><dd>${valueCell(f, rec)}</dd>`)}</dl></div>`)}
      ${kids.map(k => h`<div class="card"><div class="lbl">${k.c.label}</div>${k.rows.length ? k.rows.map(r => h`<div class="child">${(k.c.columns || []).map(n => { const f = entity(k.c.entity)?.fields.find(x => x.name === n); return f ? h`<span><span class="m">${f.label}</span> ${fmtField(f, r)}</span>` : '' })}</div>`) : h`<span class="m">None</span>`}</div>`)}
      <div class="m">Created ${rec.created_at ? new Date(rec.created_at).toLocaleString('en-GB') : '—'} · v${rec.version ?? 1}</div>
      <div class="row gap">${canDo(def, 'edit') ? h`<a class="btn" href="#/e/${key}/${id}/edit">Edit</a>` : ''}${canDo(def, 'delete') && !def.noDelete ? h`<button class="btn danger" data-act="edel">Delete</button>` : ''}</div>
    </div>`
  }
}
function valueCell(f, rec) {
  const v = fmtField(f, rec)
  if (v === '—') return h`<span class="m">—</span>`
  if (f.type === 'email') return h`<a href="${safeUrl('mailto:' + rec[f.name])}">${v}</a>`
  if (f.type === 'phone') return h`<a href="${safeUrl('tel:' + String(rec[f.name]).replace(/[^\d+]/g, ''))}">${v}</a>`
  if (f.type === 'url') return h`<a href="${safeUrl(rec[f.name])}" target="_blank" rel="noopener noreferrer">${v}</a>`
  if (f.type === 'ref' && f.ref && entity(f.ref) && rec[f.name]) return h`<a href="#/e/${f.ref}/${rec[f.name]}">${v}</a>`
  return v
}
export const detailActions = {
  async edel(_, v) {
    const { key, id, rec } = v.meta
    const reason = await reasonSheet('Delete record', `“${rec._title}” will be deleted. Non-owner deletions wait in the Delete Bin for Owner approval. The reason is written to the audit log.`, 'Delete', true)
    if (!reason) return
    try {
      const r = await del(`/api/e/${key}/${id}`, { params: { reason }, headers: reasonHeader(reason) })
      toast(r?.pending || r?.status === 'pending' || /pending|bin/i.test(JSON.stringify(r || {})) ? 'Sent to the Delete Bin for Owner approval' : 'Deleted'); location.hash = `#/e/${key}`
    } catch (e) { toast(e.message, 'bad') }
  },
  async adecide(el, v) {
    const d = el.dataset.d, comments = $('#ac')?.value.trim() || ''
    if (d !== 'approve' && comments.length < 3) { toast('Add a comment to reject or return.', 'bad'); return }
    try { await post(`/api/universal-approvals/${v.meta.id}/decide`, { decision: d, comments }); toast('Decision recorded'); v.reload() } catch (e) { toast(e.message, 'bad') }
  }
}

// ------------------------------------------------------------------ form (create / edit)
const editable = f => !f.hidden && !f.readonly && !f.computed && !f.virtual && !f.secret
export async function entityForm(key, id) {
  const def = entity(key); if (!def) return notFound(key)
  if (!canDo(def, id ? 'edit' : 'create')) return { title: def.label, body: h`<div class="wrap">${errorCard({ status: 403, message: 'You do not have permission to do this.' }, false)}</div>` }
  const rec = id ? await get(`/api/e/${key}/${id}`) : { _labels: {} }
  const fs = def.fields.filter(editable), sections = [], by = {}
  for (const f of fs) { const s = f.section || 'Details'; if (!by[s]) sections.push(by[s] = { name: s, fields: [] }); by[s].fields.push(f) }
  return {
    title: id ? 'Edit ' + (rec._title || def.label) : 'New ' + def.label, meta: { key, id, rec },
    body: h`<form class="wrap" id="ef" novalidate data-entity="${key}">
      ${sections.map(s => h`<div class="card"><div class="lbl">${s.name}</div>${s.fields.map(f => input(f, rec, !id))}</div>`)}
      ${(def.children || []).filter(c => !c.fixed).map(c => childEditor(c, rec.children?.[c.key] || []))}
      ${id ? h`<div class="card"><label>Reason for change (audit log)<input id="reason" maxlength="300" placeholder="Why are you editing this record?"></label></div>` : ''}
      <p class="bad-t" id="fe" role="alert"></p>
      <div class="row gap"><a class="btn out" href="#/e/${key}${id ? '/' + id : ''}">Cancel</a><button class="btn" type="submit">${id ? 'Save changes' : 'Create'}</button></div>
    </form>`
  }
}
function input(f, rec, creating, pre = '') {
  const v = rec[f.name] ?? (creating ? f.default : null), id = 'f_' + pre + f.name, req = f.required ? 'required' : '', lab = h`${f.label}${f.required ? h`<span class="req" aria-hidden="true"> *</span>` : ''}`
  const help = f.help ? h`<small class="m">${f.help}</small>` : ''
  let c
  switch (f.type) {
    case 'textarea': c = h`<textarea id="${id}" name="${f.name}" rows="3" maxlength="${f.maxLength || 20000}" ${req}>${v ?? ''}</textarea>`; break
    case 'select': c = h`<select id="${id}" name="${f.name}" ${req}>${f.required && v ? '' : h`<option value="">—</option>`}${(f.options || []).map(o => h`<option value="${optValue(o)}" ${String(v) === optValue(o) ? 'selected' : ''}>${optLabel(o)}</option>`)}</select>`; break
    case 'bool': return h`<label class="ck"><input id="${id}" name="${f.name}" type="checkbox" ${v ? 'checked' : ''}>${f.label}</label>${help}`
    case 'date': c = h`<input id="${id}" name="${f.name}" type="date" value="${v ? String(v).slice(0, 10) : ''}" ${req}>`; break
    case 'datetime': c = h`<input id="${id}" name="${f.name}" type="datetime-local" value="${v ? String(v).slice(0, 16) : ''}" ${req}>`; break
    case 'int': c = h`<input id="${id}" name="${f.name}" inputmode="numeric" pattern="-?\d*" value="${v ?? ''}" ${f.min != null ? h`min="${f.min}"` : ''} ${req}>`; break
    case 'number': case 'money': case 'percent': c = h`<input id="${id}" name="${f.name}" inputmode="decimal" value="${v ?? ''}" ${req}>`; break
    case 'email': c = h`<input id="${id}" name="${f.name}" type="email" autocapitalize="none" value="${v ?? ''}" ${req}>`; break
    case 'phone': c = h`<input id="${id}" name="${f.name}" type="tel" value="${v ?? ''}" ${req}>`; break
    case 'url': c = h`<input id="${id}" name="${f.name}" type="url" value="${v ?? ''}" ${req}>`; break
    case 'ref': c = h`<input type="hidden" id="${id}" name="${f.name}" value="${v ?? ''}"><button type="button" class="pick" data-act="pick" data-field="${f.name}" data-ref="${f.ref}" data-filter="${JSON.stringify(f.refFilter || {})}">${rec._labels?.[f.name] || (v ? '#' + v : 'Select…')}</button>`; break
    default: c = h`<input id="${id}" name="${f.name}" maxlength="${f.maxLength || 1000}" value="${v ?? ''}" ${req}>`
  }
  return h`<label for="${id}">${lab}${c}${help}</label>`
}
const scopeEl = (scope, n) => scope.querySelector(`[name="${n}"]`)
function readScope(fields, scope) {
  const out = {}, errs = []
  for (const f of fields) {
    const el = scopeEl(scope, f.name); if (!el) continue
    if (f.type === 'bool') { out[f.name] = el.checked; continue }
    let v = el.value.trim()
    if (v === '') { if (f.required) errs.push(f); out[f.name] = null; continue }
    if (['int', 'number', 'money', 'percent'].includes(f.type)) { v = Number(v.replace(/,/g, '')); if (!Number.isFinite(v)) { errs.push(f); continue } if (f.type === 'int') v = Math.trunc(v) }
    if (f.type === 'ref') v = Number(v)
    if (f.type === 'json') { try { v = JSON.parse(v) } catch { errs.push(f); continue } }
    out[f.name] = v
  }
  return { out, errs }
}
export function readForm(def, form) {
  const main = readScope(def.fields.filter(editable), form), errs = [...main.errs], out = main.out
  const kids = {}
  for (const g of form.querySelectorAll('.cgroup')) {
    const c = def.children.find(x => x.key === g.dataset.key); kids[c.key] = []
    for (const r of g.querySelectorAll('.crow')) { const x = readScope(cfields(c), r); errs.push(...x.errs.map(f => ({ ...f, label: c.label + ': ' + f.label }))); if (r.dataset.id) x.out.id = +r.dataset.id; kids[c.key].push(x.out) }
  }
  if (Object.keys(kids).length) out.children = kids
  return { out, errs }
}
const cfields = c => { const cd = entity(c.entity); return (c.columns || cd.fields.map(f => f.name)).map(n => cd.fields.find(f => f.name === n)).filter(f => f && editable(f) && f.name !== c.fk) }
let CN = 0
const childRow = (c, row = {}) => h`<div class="crow" data-id="${row.id || ''}">${cfields(c).map(f => input(f, row, !row.id, 'c' + (++CN) + '_'))}<button type="button" class="btn out" data-act="cdel">Remove line</button></div>`
const childEditor = (c, rows) => h`<div class="card cgroup" data-key="${c.key}"><div class="lbl">${c.label}</div><div class="crows">${rows.map(r => childRow(c, r))}</div><button type="button" class="btn out" data-act="cadd" data-key="${c.key}">+ Add line</button></div>`
export const formActions = {
  cadd(el, v) { const c = entity(v.meta.key).children.find(x => x.key === el.dataset.key); el.closest('.cgroup').querySelector('.crows').insertAdjacentHTML('beforeend', childRow(c, { _labels: {} }).s) },
  cdel(el) { el.closest('.crow').remove() }
}
export async function submitForm(form, v) {
  const { key, id, rec } = v.meta, def = entity(key), err = $('#fe')
  err.textContent = ''; $$('.bad-in').forEach(x => x.classList.remove('bad-in'))
  const { out, errs } = readForm(def, form)
  if (errs.length) { err.textContent = 'Check: ' + errs.map(f => f.label).join(', '); errs.forEach(f => form.elements[f.name]?.classList.add('bad-in')); return }
  const btn = $('button[type=submit]', form); btn.disabled = true
  try {
    const r = id ? await put(`/api/e/${key}/${id}`, { ...out, version: rec.version }, { headers: reasonHeader($('#reason')?.value.trim()) }) : await post(`/api/e/${key}`, out)
    toast(id ? 'Saved' : 'Created'); location.hash = `#/e/${key}/${r.id ?? id}`
  } catch (e) {
    err.textContent = e.status === 409 ? 'This record was changed by someone else. Reopen it and try again.' : e.message
    if (e.details?.field) form.elements[e.details.field]?.classList.add('bad-in')
  } finally { btn.disabled = false }
}
export async function pickRef(btn) {
  const hid = btn.previousElementSibling, ref = btn.dataset.ref, filter = JSON.parse(btn.dataset.filter || '{}')
  const def = entity(ref)
  const picked = await sheet('Select ' + (def?.label || ref), (root, close) => {
    root.innerHTML = h`<form class="search bd" data-nosubmit><span aria-hidden="true">⌕</span><input id="pq" type="search" placeholder="Search" aria-label="Search" autocomplete="off"></form><div id="pl" class="list"></div>`.s
    let t, n = 0
    const run = async () => {
      const my = ++n, pl = $('#pl', root); pl.innerHTML = spinner().s
      try { const r = await get(`/api/e/${ref}/lookup`, { q: $('#pq', root).value.trim() || undefined, limit: 20, filter: Object.keys(filter).length ? filter : undefined }); if (my !== n) return; pl.innerHTML = r.length ? r.map(x => h`<button type="button" class="li" data-id="${x.id}" data-l="${x.label}"><span class="tx"><b>${x.label}</b><small>${x.sub || ''}</small></span></button>`.s).join('') : empty('No results').s } catch (e) { pl.innerHTML = errorCard(e, false).s }
    }
    $('#pq', root).addEventListener('input', () => { clearTimeout(t); t = setTimeout(run, 250) })
    root.addEventListener('click', e => { const b = e.target.closest('button[data-id]'); if (b) close({ id: b.dataset.id, label: b.dataset.l }) })
    root.addEventListener('submit', e => e.preventDefault()); run()
  })
  if (picked) { hid.value = picked.id; btn.textContent = picked.label }
}
export const notFound = key => ({ title: 'Not found', body: h`<div class="wrap">${empty('Unknown record type', `“${key}” is not available to your account.`)}</div>` })

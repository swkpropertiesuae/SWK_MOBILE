import { h, raw } from '../lib/html.js'
import { get, post, getSession, base, setServer, request, ApiError } from '../lib/api.js'
import { X, can } from '../lib/state.js'
import { aed, num, short, date, datetime, dubaiParts, TZ } from '../lib/format.js'
import { $, $$, toast, empty, errorCard, chip, statusClass, humanize, confirmSheet, reasonSheet } from '../lib/ui.js'
import { closing, pmt, split, rera, grossYield, roi, vat, paymentPlan, chequeSchedule, reraNoticeDeadline, sqftToSqm, sqmToSqft, aedToUsd, usdToAed, goldenVisa } from '../lib/calc.js'
import { routeFor } from '../lib/routes.js'
import { kpiTile, countUp } from '../lib/viz.js'

// ---------------------------------------------------------------- generic object card (server shapes vary per feature)
const TITLE_KEYS = ['title', '_title', 'name', 'deal_name', 'company', 'job_no', 'record_label', 'record_title', 'bin_no', 'withdrawal_no', 'client_name', 'label', 'subject', 'description']
const SKIP = /(^|_)(id|version|deleted_at|created_by|updated_by|custom|raw|payload|snapshot|json)(_|$)/i
export function objCard(o, actions = '') {
  const tk = TITLE_KEYS.find(k => o[k] != null && o[k] !== '' && typeof o[k] !== 'object')
  const st = o.status ?? o.job_status ?? o.stage
  const rows = Object.entries(o).filter(([k, v]) => k !== tk && k !== 'status' && !SKIP.test(k) && v != null && v !== '' && typeof v !== 'object').slice(0, 8)
  return h`<div class="card"><div class="row"><b class="hd t">${tk ? o[tk] : '#' + (o.id ?? '')}</b>${st ? chip(st, statusClass(st)) : ''}</div>
  <dl class="dl">${rows.map(([k, v]) => h`<dt>${humanize(k)}</dt><dd>${typeof v === 'number' && /aed|amount|value|price|worth|refund|fee/i.test(k) ? aed(v) : /_at$|date/i.test(k) && /^\d{4}-/.test(v) ? datetime(v) : String(v)}</dd>`)}</dl>${actions}</div>`
}
const listOf = r => Array.isArray(r) ? r : r?.items || r?.rows || []

// ---------------------------------------------------------------- dashboard
const KPI = [['pipeline_value', 'Pipeline value', 'aed'], ['open_jobs', 'Open deal files'], ['leads_new', 'New leads'], ['leads_today', 'Leads today'], ['viewings_week', 'Viewings this week'], ['offers_pending', 'Pending offers'], ['mandates_active', 'Active mandates'], ['mandates_expiring', 'Mandates expiring'], ['properties_available', 'Available properties'], ['vacant_units', 'Vacant units'], ['renewals_due', 'Renewals due'], ['arrears_aed', 'Rent arrears', 'aed'], ['maintenance_open', 'Open maintenance'], ['received_month', 'Received this month', 'aed'], ['commission_expected', 'Commission expected', 'aed'], ['revenue_month', 'Revenue this month', 'aed'], ['profit_month', 'Profit this month', 'aed'], ['ar_outstanding', 'Receivables', 'aed'], ['ap_outstanding', 'Payables', 'aed'], ['cash', 'Cash', 'aed'], ['tickets_open', 'Open tickets'], ['my_tasks', 'My tasks'], ['compliance_issues', 'Compliance issues']]
export async function dashboard() {
  const [d, pulse] = await Promise.all([get('/api/dashboard'), get('/api/dashboard/pulse').catch(() => null)])
  const k = d.kpis || {}, shown = KPI.filter(x => k[x[0]] != null)
  const f = d.charts?.pipeline_funnel || [], max = Math.max(1, ...f.map(x => x.count))
  const lists = Object.entries(d.lists || {}).filter(([, v]) => Array.isArray(v) && v.length)
  const alerts = (d.alerts || []).map(a => typeof a === 'string' ? { text: a } : a)
  return {
    title: 'Overview', after: () => countUp(), body: h`<div class="wrap">
    ${k.pipeline_value != null ? h`<div class="card cash"><small>Pipeline value</small><span class="n">${aed(k.pipeline_value)}</span><small>${k.open_jobs ?? 0} open deal files</small></div>` : ''}
    ${pulse ? h`<div class="lbl">Last 7 days</div><div class="kts">${[['leads', 'New leads'], ['viewings', 'Viewings'], ['calls', 'Calls']].filter(([key]) => Array.isArray(pulse[key])).map(([key, label]) => kpiTile({ label, value: pulse[key].reduce((a, x) => a + x.n, 0), series: pulse[key].map(x => x.n), sub: 'vs previous 3 days' }))}</div>` : ''}
    <div class="lbl">Utilities</div><div class="tiles2">${[['p/utilities', 'All tools'], ['p/toolkit/mort', 'Mortgage'], ['p/toolkit/cost', 'Buyer costs'], ['p/toolkit/roi', 'Net ROI'], ['p/toolkit/comm', 'Commission'], ['p/toolkit/cheque', 'Rent cheques'], ['p/toolkit/plan', 'Payment plan'], ['p/utilities', 'AI assistant']].map(([to, l]) => h`<a class="tile s" href="#/${to}"><b>${l}</b></a>`)}</div>
    <div class="grid2">${shown.filter(x => x[0] !== 'pipeline_value').map(([key, l, t]) => h`<div class="k"><b>${t === 'aed' ? aed(k[key]) : num(k[key])}</b><span>${l}</span></div>`)}</div>
    ${alerts.length ? h`<div class="lbl">Needs attention</div><div class="list">${alerts.map(a => h`<div class="li warnbar"><span class="tx"><b>${a.title || a.text || a.message || a.label || 'Alert'}</b><small>${a.detail || a.body || ''}</small></span></div>`)}</div>` : ''}
    ${f.length ? h`<div class="lbl">Sales funnel</div><div class="card">${f.map(s => h`<div class="fn"><span>${s.stage}</span><div class="progress"><i data-w="${Math.round(s.count / max * 100)}"></i></div><b>${s.count}</b></div>`)}</div>` : ''}
    ${lists.map(([name, arr]) => h`<div class="lbl">${humanize(name)}</div><div class="list">${arr.slice(0, 6).map(o => typeof o !== 'object' ? h`<div class="li"><span class="tx"><b>${o}</b></span></div>` : objCard(o))}</div>`)}
    ${!shown.length && !alerts.length ? empty('Nothing to show yet', 'Figures appear here as soon as records are created in SWK OS.') : ''}
    </div>`
  }
}
export async function pipeline() {
  const d = await get('/api/dashboard'), f = d.charts?.pipeline_funnel || [], max = Math.max(1, ...f.map(x => x.value || x.count))
  return { title: 'Deal Pipeline', body: h`<div class="wrap"><div class="card">${f.map(s => h`<div class="fn2"><div class="row"><b>${s.stage}</b><span class="m">${s.count} deals · ${aed(s.value)}</span></div><div class="progress"><i data-w="${Math.round((s.value || s.count) / max * 100)}"></i></div></div>`)}</div>
  <div class="row gap"><a class="btn" href="#/e/jobs">Open deal folders</a>${can('transactions', 'view') ? h`<a class="btn out" href="#/e/transactions">Sales tracker</a>` : ''}</div></div>` }
}

// ---------------------------------------------------------------- market pulse
const spark = (t = []) => { if (t.length < 2) return ''; const mn = Math.min(...t), mx = Math.max(...t), pts = t.map((v, i) => `${(i / (t.length - 1) * 100).toFixed(1)},${(30 - (v - mn) / ((mx - mn) || 1) * 28 - 1).toFixed(1)}`).join(' '); return raw(`<svg viewBox="0 0 100 30" class="spark" preserveAspectRatio="none" aria-hidden="true"><polyline points="${pts}" fill="none" stroke="currentColor" stroke-width="1.6"/></svg>`) }
let MK = { q: '', sort: 'ppsf', tab: 'areas', data: null }
export async function market(_, sub) {
  if (sub) return area(sub)
  MK.data ||= await get('/api/swk-ops/market-pulse')
  const d = MK.data, q = MK.q.toLowerCase()
  const A = (d.areas || []).filter(a => !q || a.name.toLowerCase().includes(q)).sort((a, b) => MK.sort === 'name' ? a.name.localeCompare(b.name) : (b[MK.sort] ?? 0) - (a[MK.sort] ?? 0))
  const rates = d.mortgageRates || []
  return { title: 'Market Pulse', body: h`<div class="wrap"><div class="chips">${[['areas', 'Areas'], ['rates', 'Mortgage rates'], ['news', 'News']].map(([k, l]) => h`<button class="chip ${MK.tab === k ? 'on' : ''}" data-act="mktab" data-v="${k}">${l}</button>`)}</div>
  ${MK.tab === 'areas' ? h`<form class="search bd" data-nosubmit><span aria-hidden="true">⌕</span><input id="mq" type="search" placeholder="Search community" aria-label="Search community" value="${MK.q}"></form>
    <div class="chips">${[['ppsf', 'Price/sqft'], ['yoyPct', 'Growth'], ['yieldPct', 'Yield'], ['name', 'A–Z']].map(([k, l]) => h`<button class="chip ${MK.sort === k ? 'on' : ''}" data-act="mksort" data-v="${k}">${l}</button>`)}</div>
    <div class="list">${A.map(a => h`<a class="card link" href="#/p/market/${a.code}"><div class="row"><b class="hd t">${a.name}</b><span class="st ${a.yoyPct < 0 ? 'bad' : ''}">${a.yoyPct < 0 ? '▼' : '▲'} ${Math.abs(a.yoyPct)}%</span></div><div class="row"><span class="big">AED ${num(a.ppsf)}<small class="m">/sqft</small></span><span class="sp">${spark(a.trend)}</span></div><span class="m">${a.segment} · Yield ${a.yieldPct}% · ${num(a.transactionsQ)} sales/qtr</span></a>`)}${A.length ? '' : empty('No match')}</div>` : ''}
  ${MK.tab === 'rates' ? h`<div class="list">${rates.length ? rates.map(r => h`<div class="card"><b class="hd t">${r.bank}</b><dl class="dl"><dt>3-yr fixed</dt><dd>${r.fixedRate3Y}%</dd><dt>5-yr fixed</dt><dd>${r.fixedRate5Y}%</dd><dt>Variable</dt><dd>EIBOR + ${r.variableMarginEibor}%</dd><dt>Max LTV</dt><dd>${r.maxLtvExpat}% expat · ${r.maxLtvNational}% national</dd><dt>Processing fee</dt><dd>${r.processingFeePct}%</dd></dl><span class="m">${r.highlight || ''}</span></div>`) : empty('No rates published')}</div>` : ''}
  ${MK.tab === 'news' ? h`<div class="list">${(d.news || []).length ? d.news.map(n => objCard(n)) : empty('No news yet')}</div>` : ''}
  <div class="note">Indicative market data maintained in SWK OS. Verify with DLD before quoting clients.</div></div>` }
}
async function area(code) {
  const r = await get('/api/swk-ops/area-companion/' + encodeURIComponent(code)), a = r.area, c = r.companion || {}
  const list = (t, arr) => arr?.length ? h`<div class="card"><div class="lbl">${t}</div><ul class="bul">${arr.map(x => h`<li>${typeof x === 'string' ? x : x.name || x.title || JSON.stringify(x)}</li>`)}</ul></div>` : ''
  return { title: a.name, body: h`<div class="wrap"><div class="card"><div class="row"><b class="hd t">${a.ticker}</b><span class="st">${a.segment}</span></div><div class="row"><span class="big">AED ${num(a.ppsf)}<small class="m">/sqft</small></span><span class="sp">${spark(a.trend)}</span></div>
  <div class="kv2"><div><span class="m">YoY</span><b>${a.yoyPct}%</b></div><div><span class="m">Gross yield</span><b>${a.yieldPct}%</b></div><div><span class="m">Service charge</span><b>AED ${a.serviceCharge}/sqft</b></div><div><span class="m">Sales / qtr</span><b>${num(a.transactionsQ)}</b></div><div><span class="m">Off-plan share</span><b>${a.offPlanShare}%</b></div></div></div>
  <div class="card"><div class="lbl">Annual rent (AED)</div><dl class="dl"><dt>Studio</dt><dd>${num(a.rentStudio)}</dd><dt>1 BR</dt><dd>${num(a.rent1)}</dd><dt>2 BR</dt><dd>${num(a.rent2)}</dd><dt>3 BR</dt><dd>${num(a.rent3)}</dd></dl></div>
  ${a.forecast15Y?.length ? h`<div class="card"><div class="lbl">Outlook</div>${a.forecast15Y.map(f => h`<div class="child"><b>${f.year}</b> AED ${num(f.projectedPpsf)}/sqft <span class="m">${f.catalyst}</span></div>`)}</div>` : ''}
  ${list('Nearby', c.nearby)}${list('Ongoing projects', c.ongoing_projects)}${list('Closing keywords', c.closing_keywords)}${list('Pitch phrases', c.pitch_phrases)}
  ${a.fieldVisitPitchScript ? h`<div class="card"><div class="lbl">Field-visit pitch</div><p>${a.fieldVisitPitchScript}</p></div>` : ''}</div>` }
}
export const marketActions = {
  mktab(el) { MK.tab = el.dataset.v; return 'reload' }, mksort(el) { MK.sort = el.dataset.v; return 'reload' }
}
export const setMarketQuery = v => { MK.q = v }

// ---------------------------------------------------------------- calendar
let CAL = { m: null, cat: '' }
export async function calendar() {
  const t = dubaiParts(), now = new Date()
  CAL.m ||= new Date(now.getFullYear(), now.getMonth(), 1)
  const from = new Date(CAL.m.getFullYear(), CAL.m.getMonth(), 1), to = new Date(CAL.m.getFullYear(), CAL.m.getMonth() + 1, 0)
  const iso = d => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
  const ev = await get('/api/calendar', { from: iso(from), to: iso(to) })
  const cats = [...new Set(ev.map(e => e.category).filter(Boolean))], shown = ev.filter(e => !CAL.cat || e.category === CAL.cat).sort((a, b) => String(a.start).localeCompare(String(b.start)))
  const by = {}; for (const e of shown) (by[String(e.start || e.date).slice(0, 10)] ||= []).push(e)
  return { title: 'Calendar', body: h`<div class="wrap"><div class="row"><button class="circ" data-act="calprev" aria-label="Previous month">‹</button><b class="hd">${from.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })}</b><button class="circ" data-act="calnext" aria-label="Next month">›</button></div>
  ${cats.length ? h`<div class="chips"><button class="chip ${CAL.cat ? '' : 'on'}" data-act="calcat" data-v="">All</button>${cats.map(c => h`<button class="chip ${CAL.cat === c ? 'on' : ''}" data-act="calcat" data-v="${c}">${humanize(c)}</button>`)}</div>` : ''}
  ${Object.keys(by).length ? Object.entries(by).map(([d, a]) => h`<div class="lbl">${date(d)}</div><div class="list">${a.map(e => { const l = e.link && routeFor(e.link); return h`<a class="li" ${l ? h`href="${l.href}"` : ''}><span class="dot" data-c="${e.color || ''}"></span><span class="tx"><b>${e.title}</b><small>${e.type || ''}${e.allDay ? '' : ' · ' + String(e.start).slice(11, 16)}${e.owner ? ' · ' + e.owner : ''}</small></span>${e.status ? chip(e.status, statusClass(e.status)) : ''}</a>` })}</div>`) : empty('Nothing scheduled', 'No events this month.')}</div>` }
}
export const calActions = { calprev() { CAL.m = new Date(CAL.m.getFullYear(), CAL.m.getMonth() - 1, 1); return 'reload' }, calnext() { CAL.m = new Date(CAL.m.getFullYear(), CAL.m.getMonth() + 1, 1); return 'reload' }, calcat(el) { CAL.cat = el.dataset.v; return 'reload' } }

// ---------------------------------------------------------------- delete bin, withdrawals, notifications
export async function bin() {
  const r = await get('/api/swk-ops/recycle-bin'), items = listOf(r), owner = X.me?.permissions === '*'
  return { title: 'Delete Bin', body: h`<div class="wrap"><div class="m">Deletions by non-owners wait here until the Owner approves or rejects.</div>${r.counts ? h`<div class="grid2"><div class="k"><b>${r.counts.pending}</b><span>Pending</span></div><div class="k"><b>${r.counts.approved}</b><span>Approved</span></div></div>` : ''}
  <div class="list">${items.length ? items.map(i => objCard(i, /pending/i.test(i.status || '') && owner ? h`<div class="row gap"><button class="btn" data-act="bindecide" data-id="${i.id}" data-d="approve">Approve deletion</button><button class="btn out" data-act="bindecide" data-id="${i.id}" data-d="reject">Reject</button></div>` : '')) : empty('The bin is empty', 'No deletions are waiting for approval.')}</div></div>` }
}
export const binActions = {
  async bindecide(el) {
    const d = el.dataset.d, ok = await confirmSheet(d === 'approve' ? 'Approve deletion' : 'Reject deletion', d === 'approve' ? 'The record will be permanently deleted.' : 'The record will be kept.', 'Confirm', d === 'approve')
    if (!ok) return
    try { await post(`/api/swk-ops/recycle-bin/${el.dataset.id}/decide`, { decision: d }); toast('Decision recorded'); return 'reload' } catch (e) { toast(e.message, 'bad') }
  }
}
export async function withdrawals() {
  const r = await get('/api/swk-ops/withdrawals'), items = listOf(r)
  return { title: 'Withdrawals', body: h`<div class="wrap"><div class="m">Deal cancellations and refunds. Refunds are released only after Manager review and Owner approval.</div><div class="list">${items.length ? items.map(i => objCard(i)) : empty('No withdrawals', 'Nothing has been withdrawn or refunded.')}</div>${can('sales', 'create') ? h`<a class="btn out" href="${base()}/swk/withdrawals" target="_blank" rel="noopener noreferrer">Record a withdrawal in SWK OS ↗</a>` : ''}</div>` }
}
export async function notifications() {
  const r = await get('/api/notifications'), items = r.rows || []
  return { title: 'Notifications', body: h`<div class="wrap">${r.unread ? h`<button class="btn out" data-act="readall">Mark all read (${r.unread})</button>` : ''}<div class="list">${items.length ? items.map(n => h`<div class="card ${n.read_at ? '' : 'unread'}"><div class="row"><b>${n.title}</b>${chip(n.kind || 'info', statusClass(n.kind))}</div><p class="pre">${n.body || ''}</p><span class="m">${datetime(n.created_at)}</span></div>`) : empty('You are all caught up')}</div></div>` }
}
export const notifActions = { async readall() { try { await post('/api/notifications/read', {}); toast('Marked read'); return 'reload' } catch (e) { toast(e.message, 'bad') } } }

// ---------------------------------------------------------------- calculators
const TABS = [['mort', 'Mortgage'], ['cost', 'Buyer costs'], ['yield', 'Yield'], ['roi', 'Net ROI'], ['comm', 'Commission'], ['rera', 'RERA rent'], ['notice', 'RERA notice'], ['cheque', 'Rent cheques'], ['plan', 'Payment plan'], ['vat', 'VAT'], ['units', 'sqft ⇄ sqm'], ['fx', 'AED ⇄ USD'], ['visa', 'Golden Visa']]
let TK = 'mort'
const inp = (id, label, v = '', extra = '') => h`<label>${label}<input id="${id}" inputmode="decimal" value="${v}" ${extra}></label>`
export async function toolkit(_, sub) {
  if (sub && TABS.some(t => t[0] === sub)) TK = sub
  const rates = TK === 'mort' ? await get('/api/swk-ops/market-pulse').then(d => d.mortgageRates || []).catch(() => []) : []
  const F = {
    mort: h`<label>Buyer<select id="ty"><option value="80">Expat · 80% LTV</option><option value="85">UAE National · 85% LTV</option><option value="50">Off-plan · 50% LTV</option></select></label>${inp('p', 'Price (AED)')}<label>Rate % ${rates[0] ? h`<small class="m">(${rates[0].bank}: ${rates[0].fixedRate5Y}% 5-yr fixed)</small>` : ''}<input id="r" inputmode="decimal" value="${rates[0]?.fixedRate5Y ?? ''}"></label>${inp('y', 'Years', 25)}`,
    cost: h`${inp('p', 'Price (AED)')}<label class="ck"><input id="mg" type="checkbox">Mortgage</label>${inp('l', 'Loan (AED)')}`,
    yield: h`${inp('p', 'Price (AED)')}${inp('a', 'Annual rent (AED)')}`,
    roi: h`${inp('p', 'Price (AED)')}${inp('a', 'Annual rent (AED)')}${inp('sc', 'Service charge / year (AED)', 0)}${inp('oc', 'Other costs / year (AED)', 0)}`,
    comm: h`${inp('p', 'Sale price (AED)')}${inp('c', 'Commission %', 2)}${inp('a', '3rd-party A2A share (AED)', 0)}`,
    rera: h`${inp('rt', 'Current annual rent (AED)')}${inp('ix', 'RERA index average (AED)')}`,
    notice: h`<label>Tenancy expiry date<input id="dt" type="date"></label>`,
    cheque: h`${inp('a', 'Annual rent (AED)')}<label>Cheques<select id="n"><option>1</option><option>2</option><option>3</option><option selected>4</option><option>6</option><option>12</option></select></label><label>First cheque date<input id="dt" type="date"></label>`,
    plan: h`${inp('p', 'Price (AED)')}${inp('d', 'Down payment %', 20)}${inp('n', 'Instalments', 4)}${inp('i', 'Each instalment %', 10)}${inp('hp', 'On handover %', 40)}`,
    vat: h`${inp('a', 'Amount (AED)')}${inp('r', 'VAT %', 5)}<label class="ck"><input id="inc" type="checkbox">Amount includes VAT</label>`,
    units: h`${inp('sf', 'Square feet')}${inp('sm', 'Square metres')}`,
    fx: h`${inp('aed', 'AED')}${inp('usd', 'USD')}<span class="m">AED is pegged at 3.6725 per USD.</span>`,
    visa: h`${inp('p', 'Property value (AED)')}`
  }[TK]
  return { title: 'Calculators', after: calc, body: h`<div class="wrap"><div class="chips">${TABS.map(([k, l]) => h`<button class="chip ${TK === k ? 'on' : ''}" data-act="tk" data-v="${k}">${l}</button>`)}</div><form class="card" data-nosubmit data-calc>${F}<div id="o" class="out" aria-live="polite"></div></form><div class="note">Indicative — verify with RERA / DLD. DLD 4% + AED 580, agency 2% + VAT, registration 0.25% + AED 290.</div></div>` }
}
export const tkActions = { tk(el) { TK = el.dataset.v; return 'reload' } }
const g = id => { const v = parseFloat(String($('#' + id)?.value || '').replace(/,/g, '')); return Number.isFinite(v) ? v : 0 }
const rows = a => a.map(([k, v, b]) => h`<div class="row"><span class="m">${k}</span>${b ? h`<span class="big">${v}</span>` : h`<b>${v}</b>`}</div>`)
export function calc(ev) {
  const o = $('#o'); if (!o) return
  const R = a => { o.innerHTML = rows(a).map(x => x.s).join('') }, none = () => { o.innerHTML = '<span class="m">Enter the figures above.</span>' }
  const t = ev?.target?.id
  switch (TK) {
    case 'mort': { const p = g('p'), l = p * g('ty') / 100, m = pmt(l, g('r'), g('y')); return p ? R([['Down payment', aed(p - l)], ['Loan', aed(l)], ['Monthly payment', aed(m), 1], ['Total interest', aed(Math.max(0, m * g('y') * 12 - l))]]) : none() }
    case 'cost': { const c = closing(g('p'), { mortgage: $('#mg').checked, loan: g('l') }); return g('p') ? R([['DLD 4%', aed(c.dld)], ['Admin', aed(c.admin)], ['Agency 2%', aed(c.agency)], ['VAT 5% on agency', aed(c.vat)], ['Mortgage registration', aed(c.mReg)], ['Total fees', aed(c.total), 1], ['Cash needed', aed(c.cash)]]) : none() }
    case 'yield': return g('p') ? R([['Gross yield', grossYield(g('p'), g('a')).toFixed(2) + '%', 1]]) : none()
    case 'roi': { if (!g('p')) return none(); const r = roi(g('p'), g('a'), g('sc'), g('oc')); return R([['Gross yield', r.grossYield + '%'], ['Net yield (after costs, incl. closing fees)', r.netYield + '%', 1], ['Net income / year', aed(r.net)], ['Total invested', aed(r.invested)], ['Payback', r.payback ? r.payback + ' years' : '—']]) }
    case 'comm': { const gr = g('p') * g('c') / 100, s = split(gr, g('a')); return g('p') ? R([['Gross commission', aed(gr)], ['VAT 5%', aed(s.vat)], ['Company net pool', aed(s.pool)], ['SWK 50%', aed(s.swk), 1], ['Advisor 50%', aed(s.agent), 1]]) : none() }
    case 'rera': { const r = rera(g('rt'), g('ix')); return g('rt') ? R([['Below index', r.below + '%'], ['Max increase', r.pct + '%', 1], ['Max new rent', aed(r.max)]]) : none() }
    case 'notice': { const d = $('#dt').value; return d ? R([['Landlord notice deadline (90 days before expiry)', reraNoticeDeadline(d), 1]]) : none() }
    case 'cheque': { const d = $('#dt').value, a = g('a'); if (!d || !a) return none(); const s = chequeSchedule(a, +$('#n').value, d); return R(s.map(c => [`Cheque ${c.n} · ${c.date}`, aed(c.amount)])) }
    case 'plan': { if (!g('p')) return none(); const pl = paymentPlan(g('p'), g('d'), Math.max(0, Math.min(40, Math.trunc(g('n')))), g('i'), g('hp')); return R([...pl.rows.map(r => [`${r.label} · ${r.pct}%`, aed(r.amount)]), ['Total', pl.total + '%' + (pl.balanced ? '' : ' — must equal 100%'), 1]]) }
    case 'vat': { if (!g('a')) return none(); const v = vat(g('a'), g('r'), $('#inc').checked); return R([['Net', aed(v.net)], ['VAT', aed(v.vat)], ['Gross', aed(v.gross), 1]]) }
    case 'units': { if (t === 'sm') { $('#sf').value = g('sm') ? sqmToSqft(g('sm')) : '' } else { $('#sm').value = g('sf') ? sqftToSqm(g('sf')) : '' } return (o.innerHTML = '') }
    case 'fx': { if (t === 'usd') { $('#aed').value = g('usd') ? usdToAed(g('usd')) : '' } else { $('#usd').value = g('aed') ? aedToUsd(g('aed')) : '' } return (o.innerHTML = '') }
    case 'visa': { if (!g('p')) return none(); const v = goldenVisa(g('p')); return R([['10-year Golden Visa by property', v.eligible ? 'Eligible (≥ AED 2,000,000)' : 'Not eligible', 1], ...(v.eligible ? [] : [['Shortfall', aed(v.shortfall)]]), ['Note', 'Mortgaged property needs bank / DLD confirmation']]) }
  }
}

// ---------------------------------------------------------------- account
export async function account() {
  const [me, sessions] = await Promise.all([get('/api/auth/me'), get('/api/auth/sessions').catch(() => [])])
  X.me = me
  return { title: 'Account', body: h`<div class="wrap"><div class="card"><b class="hd t">${me.name}</b><span class="m">${me.email}</span><div class="row"><span>${me.role}</span>${me.totp ? chip('2FA on', 'ok') : chip('2FA off', 'warn')}</div><span class="m">Last sign-in ${me.lastLogin ? datetime(me.lastLogin) : '—'}</span></div>
  ${me.defaultPassword ? h`<div class="card err"><b>Default password in use</b><span class="m">Change it now.</span></div>` : ''}
  <a class="btn out" href="#/changepw">Change password</a>
  ${!me.totp ? h`<a class="btn out" href="${base()}/profile" target="_blank" rel="noopener noreferrer">Set up two-factor authentication ↗</a>` : ''}
  <div class="card"><div class="lbl">Active sessions</div>${(sessions || []).map(s => h`<div class="child"><b>${s.current ? 'This device' : 'Other device'}</b> <span class="m">${datetime(s.last_seen)} · ${s.ip || ''}</span></div>`)}</div>
  <div class="card"><div class="lbl">Display</div><button class="btn out" data-act="rtl">Toggle Arabic (RTL) layout</button></div>
  ${globalThis.SWK_CONFIG?.ALLOW_SERVER_OVERRIDE ? h`<div class="card"><div class="lbl">Server</div><span class="m">${base()}</span></div>` : ''}
  <button class="btn danger" data-act="logout">Sign out</button>
  <div class="note">SWK OS Mobile 1.0.0 · ${base()}</div></div>` }
}

// ---------------------------------------------------------------- web-only features
export function webOnly(to, label) {
  return { title: label, body: h`<div class="wrap"><div class="card"><b class="hd t">${label}</b><span class="m">This feature runs in the full SWK OS web app.</span><a class="btn" href="${base() + to}" target="_blank" rel="noopener noreferrer">Open in SWK OS ↗</a></div></div>` }
}

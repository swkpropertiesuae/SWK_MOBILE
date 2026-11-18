// Strict operational screens: Lead Command (SLA / follow-up / conversion) and Field Duty (live GPS).
import { h } from '../lib/html.js'
import { get, post, put, base, getSession, reasonHeader, ApiError } from '../lib/api.js'
import { entity, can, X } from '../lib/state.js'
import { optValue, datetime, num } from '../lib/format.js'
import { $, toast, empty, errorCard, chip, statusClass, sheet, reasonSheet, confirmSheet } from '../lib/ui.js'
import { isNative, startDuty, stopDuty, deviceInfo, telemetry } from '../lib/native.js'

const DONE = /convert|lost|disqual|closed|unqualif|junk/i
const mins = ms => Math.round(ms / 60000)
const rel = ms => { const m = mins(Math.abs(ms)); return (m >= 1440 ? Math.floor(m / 1440) + 'd ' : '') + (m >= 60 ? Math.floor(m % 1440 / 60) + 'h ' : '') + (m % 60) + 'm' }
export function bucketLeads(leads, now = Date.now()) {
  const B = { overdue: [], today: [], unassigned: [], stale: [], other: [] }
  for (const l of leads) {
    const due = l.sla_due_at ? Date.parse(l.sla_due_at) : NaN, open = !l.first_response_at
    if (open && due < now) B.overdue.push(l)
    else if (open && due - now < 864e5) B.today.push(l)
    else if (!l.owner_id || l.in_pool) B.unassigned.push(l)
    else if (now - Date.parse(l.updated_at) > 3 * 864e5) B.stale.push(l)
    else B.other.push(l)
  }
  return B
}
let LC = { leads: [], counts: {} }
export async function leadCommand() {
  const def = entity('leads'); if (!def) return { title: 'Lead Command', body: h`<div class="wrap">${errorCard({ status: 403, message: 'Leads are not available to your account.' }, false)}</div>` }
  const sf = def.fields.find(f => f.name === 'status'), statuses = (sf?.options || []).map(optValue), open = statuses.filter(s => !DONE.test(s))
  const [list, ...totals] = await Promise.all([get('/api/e/leads', { pageSize: 100, sort: 'sla_due_at', dir: 'asc', filters: [{ field: 'status', op: 'in', value: open }] }).catch(() => get('/api/e/leads', { pageSize: 100 })),
    ...statuses.map(s => get('/api/e/leads', { pageSize: 1, filters: [{ field: 'status', op: 'eq', value: s }] }).then(r => [s, r.total]).catch(() => [s, 0]))])
  LC = { leads: list.rows.filter(l => !DONE.test(l.status || '')), counts: Object.fromEntries(totals) }
  const B = bucketLeads(LC.leads), all = Object.values(LC.counts).reduce((a, b) => a + b, 0), conv = Object.entries(LC.counts).filter(([s]) => /convert/i.test(s)).reduce((a, [, n]) => a + n, 0)
  const card = (l, tone) => { const due = Date.parse(l.sla_due_at); return h`<div class="card ${tone === 'bad' ? 'err' : ''}"><div class="row"><b class="hd t">${l._title}</b>${chip(l.score_band || l.status, statusClass(l.score_band || l.status))}</div>
    <span class="m">${l.contact_name || ''} ${l.phone ? h`· <a href="tel:${String(l.phone).replace(/[^\d+]/g, '')}">${l.phone}</a>` : ''}</span>
    <span class="m">${l.first_response_at ? 'First response ' + datetime(l.first_response_at) : Number.isFinite(due) ? (due < Date.now() ? 'SLA breached ' + rel(Date.now() - due) + ' ago' : 'Respond within ' + rel(due - Date.now())) : 'No SLA set'} · ${l.status}</span>
    <div class="row gap"><button class="btn" data-act="lclog" data-id="${l.id}">Log contact</button>${can('crm', 'create') ? h`<button class="btn out" data-act="lcconv" data-id="${l.id}">Convert</button>` : ''}<button class="btn out" data-act="lclost" data-id="${l.id}">Mark lost</button></div></div>` }
  const sec = (t, arr, tone) => arr.length ? h`<div class="lbl">${t} (${arr.length})</div><div class="list">${arr.map(l => card(l, tone))}</div>` : ''
  return { title: 'Lead Command', body: h`<div class="wrap"><div class="grid2"><div class="k"><b>${B.overdue.length}</b><span>SLA breached</span></div><div class="k"><b>${B.today.length}</b><span>Respond today</span></div><div class="k"><b>${LC.leads.length}</b><span>Open leads</span></div><div class="k"><b>${all ? num(conv / all * 100, 1) : 0}%</b><span>Conversion (${conv}/${all})</span></div></div>
    ${sec('SLA breached — act now', B.overdue, 'bad')}${sec('Respond within 24h', B.today)}${sec('Unassigned / pool', B.unassigned)}${sec('Stale (no update 3+ days)', B.stale)}${sec('Other open', B.other)}
    ${LC.leads.length ? '' : empty('No open leads', 'New enquiries appear here the moment they are captured.')}
    <div class="note">Every contact, conversion and loss is written to the audit log with your identity.</div></div>` }
}
const OUTCOMES = ['Connected', 'Callback requested', 'No answer', 'Quote requested', 'Follow-up needed', 'Not interested']
export const opsActions = {
  async lclog(el) {
    const id = +el.dataset.id
    const r = await sheet('Log contact', (root, close) => {
      root.innerHTML = h`<label>Channel<select id="ch"><option>Call</option><option>WhatsApp</option><option>Meeting</option></select></label><label>Outcome<select id="oc">${OUTCOMES.map(o => h`<option>${o}</option>`)}</select></label><label>Notes (required)<textarea id="nt" rows="3" maxlength="500"></textarea></label><p class="bad-t" id="le" role="alert"></p><button class="btn" id="go" type="button">Save</button>`.s
      $('#go', root).addEventListener('click', () => { const notes = $('#nt', root).value.trim(); if (notes.length < 5) { $('#le', root).textContent = 'Describe what was discussed (min 5 characters).'; return } close({ channel: $('#ch', root).value, outcome: $('#oc', root).value, notes }) })
    })
    if (!r) return
    try {
      try { await post(`/api/swk-one/leads/${id}/quick-log`, r) }
      catch (e) { if (e.status !== 404) throw e; const l = LC.leads.find(x => x.id === id); const d = new Date(Date.now() + 864e5).toISOString().slice(0, 10)
        await post('/api/e/activities', { type: r.channel, subject: `${r.channel} — ${r.outcome} (${l?.lead_no || id})`, status: 'Done', outcome: r.outcome, notes: r.notes, followup_date: d, link_entity: 'leads', link_id: id }) }
      toast('Contact logged'); return 'reload'
    } catch (e) { toast(e.message, 'bad') }
  },
  async lcconv(el) {
    if (!await confirmSheet('Convert lead', 'Creates the client record and moves this lead to Converted. This cannot be undone from the app.', 'Convert')) return
    try { await post(`/api/leads/${el.dataset.id}/convert`); toast('Lead converted'); return 'reload' } catch (e) { toast(e.message, 'bad') }
  },
  async lclost(el) {
    const reason = await reasonSheet('Mark lead lost', 'A written reason is mandatory and is audited.', 'Mark lost', true); if (!reason) return
    const def = entity('leads'), opt = def.fields.find(f => f.name === 'non_conversion_reason')?.options?.map(optValue).find(o => /not interested|lost|other/i.test(o) && !/none/i.test(o))
    const st = def.fields.find(f => f.name === 'status').options.map(optValue).find(s => /lost|unqualif|disqual/i.test(s))
    if (!st) { toast('This workspace has no “lost” status.', 'bad'); return }
    try { const l = LC.leads.find(x => x.id === +el.dataset.id); await put(`/api/e/leads/${el.dataset.id}`, { status: st, ...(opt ? { non_conversion_reason: opt } : {}), non_conversion_notes: reason, version: l?.version }, { headers: reasonHeader(reason) }); toast('Lead closed'); return 'reload' } catch (e) { toast(e.message, 'bad') }
  },
  // ---- field duty
  async fdstart(el) {
    const loc = $('#fdl')?.value.trim(); if (!loc || loc.length < 3) { toast('Enter the assigned location.', 'bad'); return }
    el.disabled = true
    try {
      const pos = await new Promise((ok, no) => navigator.geolocation.getCurrentPosition(ok, no, { enableHighAccuracy: true, timeout: 20000, maximumAge: 0 }))
      if (pos.coords.accuracy > 100) throw new Error('GPS accuracy is too low (' + Math.round(pos.coords.accuracy) + ' m). Move to open sky and retry.')
      const r = await post('/api/swk-one/field-duty/start', { assigned_location: loc, scheduled_minutes: +($('#fdm')?.value || 120), lat: pos.coords.latitude, lng: pos.coords.longitude, accuracy_m: pos.coords.accuracy })
      const id = r.session?.id; if (!id) throw new Error('Server did not return a duty session.')
      if (isNative()) {
        const info = await deviceInfo(), s = await startDuty({ sessionId: id, assignedLocation: loc, serverUrl: base(), sessionToken: getSession().token, deviceId: info.device_id })
        if (!s.started) { toast(s.reason === 'location_permission_required' ? 'Allow location access, then tap Start again.' : 'Could not start tracking: ' + s.reason, 'bad'); return 'reload' }
      }
      toast('Field duty started'); return 'reload'
    } catch (e) { toast(e.code === 1 ? 'Location permission denied.' : e.message, 'bad') } finally { el.disabled = false }
  },
  async fdend(el) {
    if (!await confirmSheet('End field duty', 'Location tracking stops and the session is closed.', 'End duty')) return
    try {
      const pos = await new Promise(ok => navigator.geolocation.getCurrentPosition(ok, () => ok(null), { enableHighAccuracy: true, timeout: 10000 }))
      await post(`/api/swk-one/field-duty/${el.dataset.id}/end`, pos ? { lat: pos.coords.latitude, lng: pos.coords.longitude } : {})
      if (isNative()) await stopDuty(); toast('Field duty ended'); return 'reload'
    } catch (e) { toast(e.message, 'bad') }
  },
  async fdsos(el) {
    const reason = await reasonSheet('Emergency SOS', 'Alerts the Owner and Manager immediately with your location.', 'Send SOS', true); if (!reason) return
    try {
      const pos = await new Promise(ok => navigator.geolocation.getCurrentPosition(ok, () => ok(null), { enableHighAccuracy: true, timeout: 8000 }))
      await post('/api/swk-one/field-duty/sos', { session_id: +el.dataset.id, reason, ...(pos ? { lat: pos.coords.latitude, lng: pos.coords.longitude } : {}) }); toast('SOS sent'); return 'reload'
    } catch (e) { toast(e.message, 'bad') }
  }
}
export async function fieldDuty() {
  let w
  try { w = await get('/api/mobile/workday') } catch (e) {
    if (e.status === 404) return { title: 'Field Duty', body: h`<div class="wrap">${errorCard({ status: 404, message: 'This SWK OS server does not provide field duty yet (needs the SWK ONE mobile API).' }, false)}</div>` }
    throw e
  }
  const active = (w.field || []).find(s => /Active|SOS/.test(s.status || '')), tel = isNative() ? await telemetry().catch(() => null) : null
  return { title: 'Field Duty', body: h`<div class="wrap">
    ${active ? h`<div class="card cash"><small>On duty · ${active.status}</small><span class="n">${active.assigned_location || 'Field duty'}</span><small>Until ${datetime(active.scheduled_end)}${tel ? ` · battery ${tel.battery_pct}% · ${tel.network_type} · GPS ${tel.duty_service_running ? 'sharing' : 'NOT sharing'}` : ''}</small></div>
      <div class="row gap"><button class="btn danger" data-act="fdsos" data-id="${active.id}">SOS emergency</button><button class="btn out" data-act="fdend" data-id="${active.id}">End duty</button></div>`
    : h`<div class="card"><b class="hd t">Start field duty</b><span class="m">Live GPS is shared with SWK OS every 30 s while on duty. Mock locations are rejected by the server.</span><label>Assigned location<input id="fdl" maxlength="120" placeholder="Building / community"></label><label>Duration (minutes)<input id="fdm" inputmode="numeric" value="120"></label><button class="btn" data-act="fdstart">Start duty</button></div>`}
    <div class="lbl">Today</div><div class="list">${(w.field || []).length ? w.field.map(s => h`<div class="li"><span class="tx"><b>${s.assigned_location || 'Field duty'}</b><small>${datetime(s.scheduled_start)} → ${datetime(s.scheduled_end)}</small></span>${chip(s.status, statusClass(s.status))}</div>`) : empty('No duty sessions today')}</div></div>` }
}

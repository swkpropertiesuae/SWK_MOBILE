// Strict operational screens: Lead Command (SLA / follow-up / conversion) and Field Duty (live GPS).
import { h } from '../lib/html.js'
import { get, post, put, request, base, getSession, reasonHeader, ApiError } from '../lib/api.js'
import { entity, can, X } from '../lib/state.js'
import { optValue, datetime, num } from '../lib/format.js'
import { $, toast, empty, errorCard, chip, statusClass, sheet, reasonSheet, confirmSheet } from '../lib/ui.js'

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
  async mdcall(el) {
    const id = +el.dataset.id
    try {
      const r = await post(`/api/crm-vault/my-assignments/${id}/masked-call`, {})
      toast(r.message || 'SWK Masked Bridge calling your phone now')
      return 'reload'
    } catch (e) { toast(e.message || 'Masked call unavailable', 'bad') }
  },
  async mdwa(el) {
    const id = +el.dataset.id
    const msg = await sheet('Masked WhatsApp Relay', (root, close) => {
      root.innerHTML = h`<p class="m">Sent via SWK Official WhatsApp Business. Owner number remains strictly hidden.</p><label>Message<textarea id="mw" rows="3" maxlength="1000" placeholder="Hello, calling from SWK Properties regarding your unit..."></textarea></label><p class="bad-t" id="me" role="alert"></p><button class="btn" id="go" type="button">Send Masked WhatsApp</button>`.s
      $('#go', root).addEventListener('click', () => { const v = $('#mw', root).value.trim(); if (v.length < 3) { $('#me', root).textContent = 'Enter at least 3 characters.'; return } close(v) })
    })
    if (!msg) return
    try { await post(`/api/crm-vault/my-assignments/${id}/masked-whatsapp`, { message: msg }); toast('Masked WhatsApp sent'); return 'reload' } catch (e) { toast(e.message, 'bad') }
  },
  async mdupd(el) {
    const id = +el.dataset.id
    const cur = MD.find(x => x.id === id)
    const r = await sheet('Update Assigned Deal', (root, close) => {
      const sts = ['Assigned', 'In Progress', 'Viewing Scheduled', 'Offer / MOU', 'Closed Won', 'Closed Lost', 'On Hold']
      root.innerHTML = h`<label>Status<select id="ms">${sts.map(s => h`<option ${s === cur?.vault_status ? 'selected' : ''}>${s}</option>`)}</select></label><label>Notes / Outcome<textarea id="mn" rows="3" maxlength="2000">${cur?.agent_notes || ''}</textarea></label><button class="btn" id="go" type="button">Save Update</button>`.s
      $('#go', root).addEventListener('click', () => close({ vault_status: $('#ms', root).value, agent_notes: $('#mn', root).value.trim() }))
    })
    if (!r) return
    try { await request('PATCH', `/api/crm-vault/my-assignments/${id}`, { body: r }); toast('Deal updated'); return 'reload' } catch (e) { toast(e.message, 'bad') }
  }
}

let MD = []
export async function myAssignedDeals() {
  const res = await get('/api/crm-vault/my-assignments', { pageSize: 100 })
  MD = res.rows || []
  const aed = v => (Number.isFinite(Number(v)) && Number(v) > 0 ? 'AED ' + Math.round(Number(v)).toLocaleString('en-AE') : '')
  const card = r => h`<div class="card">
    <div class="row"><b class="hd t">${r.building_or_project || 'Property'}</b>${chip(r.vault_status || 'Assigned', statusClass(r.vault_status || 'Assigned'))}</div>
    <span class="m">${r.dubai_area_community || ''} · ${r.external_deal_id}</span>
    <span class="m">Unit: ${r.exact_unit_door_no || '—'}${r.property_layout_type ? ' · ' + r.property_layout_type : ''}${r.size_sqft ? ' · ' + Math.round(r.size_sqft) + ' sqft' : ''}</span>
    <span class="m">Owner: ${r.owner_name || 'Protected Owner'}${aed(r.target_deal_value_aed) ? ' · ' + aed(r.target_deal_value_aed) : ''}</span>
    <span class="m">🔒 ${r.phone_masked || 'MASKED'} (Hard-Masked · Never in Call Log)</span>
    ${r.closing_strategy_playbook ? h`<span class="m">Playbook: ${r.closing_strategy_playbook}</span>` : ''}
    <div class="row gap">
      ${r.can_call_masked ? h`<button class="btn" data-act="mdcall" data-id="${r.id}">Call (Masked)</button>` : ''}
      ${r.can_whatsapp_masked ? h`<button class="btn out" data-act="mdwa" data-id="${r.id}">Masked WA</button>` : ''}
      <button class="btn out" data-act="mdupd" data-id="${r.id}">Update</button>
    </div>
  </div>`
  return {
    title: 'My Assigned Deals',
    body: h`<div class="wrap">
      <div class="note">Owner phone numbers are permanently hard-masked. Masked calls ring you from SWK Office so owner numbers never appear in your phone history.</div>
      ${MD.length ? h`<div class="list">${MD.map(card)}</div>` : empty('No assigned deals yet', 'Deals dispatched to you by Admin, Shabib, or Haseeb will appear here.')}
    </div>`,
  }
}

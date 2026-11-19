// Attendance (office + field), Daily Close (report + next-day plan), Team Live roster, Utilities (calculators + AI tools).
import { h } from '../lib/html.js'
import { get, post, base, getSession } from '../lib/api.js'
import { X, can } from '../lib/state.js'
import { datetime, dubaiParts, num, aed } from '../lib/format.js'
import { $, toast, empty, errorCard, chip, statusClass, sheet, reasonSheet, confirmSheet } from '../lib/ui.js'
import { isNative, startDuty, stopDuty, deviceInfo, getFix, telemetry } from '../lib/native.js'
import { closingHHMM } from '../lib/rules.js'

const ago = iso => { if (!iso) return '—'; const m = Math.max(0, Math.round((Date.now() - Date.parse(/Z|[+-]\d\d:?\d\d$/.test(iso) ? iso : iso + 'Z')) / 60000)); return m < 1 ? 'just now' : m < 60 ? m + ' min ago' : Math.floor(m / 60) + ' h ' + (m % 60) + ' m ago' }
const hhmm = iso => iso ? String(iso).slice(11, 16) : '—'

// ------------------------------------------------------------------ Attendance
export async function attendance() {
  let w
  try { w = await get('/api/mobile/workday') } catch (e) {
    if (e.status === 404) return { title: 'Attendance', body: h`<div class="wrap">${errorCard({ status: 404, message: 'This SWK OS server does not have the mobile attendance API yet. Deploy the latest SWKOS.' }, false)}</div>` }
    throw e
  }
  const a = (w.attendance || [])[0], inOffice = a?.check_in_at && !a.check_out_at, done = a?.check_out_at
  const field = w.field || [], active = field.find(s => /Active|SOS/.test(s.status || '')), tel = isNative() ? await telemetry().catch(() => null) : null
  const daily = await get('/api/daily/status').catch(() => null)
  return { title: 'Attendance', body: h`<div class="wrap">
    <div class="card ${inOffice || active ? 'cash' : ''}"><small>${active ? 'In the field' : inOffice ? 'In the office' : done ? 'Checked out' : 'Not checked in'}</small>
      <span class="n">${active ? (active.assigned_location || 'Field duty') : inOffice ? 'Since ' + hhmm(a.check_in_at) : done ? hhmm(a.check_out_at) : '—'}</span>
      <small>${a?.late_minutes ? 'Late by ' + a.late_minutes + ' min · ' : ''}${active ? 'Live GPS ' + (tel ? (tel.duty_service_running ? 'sharing' : 'NOT sharing') + ' · battery ' + tel.battery_pct + '%' : 'sharing') : 'Working hours Mon–Fri 10:00–19:00, Sat 10:00–16:00'}</small></div>
    ${!daily?.submitted && (inOffice || active) ? h`<a class="card err link" href="#/p/dailyclose"><b>Daily report + next-day plan not submitted</b><span class="m">You cannot check out until both are filed. Tap to submit.</span></a>` : ''}
    <div class="lbl">Office</div>
    ${!a ? h`<button class="btn" data-act="att-in">Check in at the office (GPS)</button><span class="m">${w.office_checkin_configured ? 'You must be inside the office check-in area with a good GPS fix. Mock locations are refused.' : 'Office GPS area is not configured on the server. Use the reception QR in SWK OS web.'}</span>` : inOffice ? h`<button class="btn out" data-act="att-out">Check out</button>` : h`<span class="m">Office attendance closed for today.</span>`}
    <div class="lbl">Field duty</div>
    ${active ? h`<div class="row gap"><button class="btn danger" data-act="fd-sos" data-id="${active.id}">SOS emergency</button><button class="btn out" data-act="fd-end" data-id="${active.id}">End duty</button></div>` : ''}
    <div class="list">${field.length ? field.map(s => h`<div class="li"><span class="tx"><b>${s.assigned_location || 'Field duty'}</b><small>${hhmm(s.scheduled_start)}–${hhmm(s.scheduled_end)}${s.last_location_at ? ' · last fix ' + ago(s.last_location_at) : ''}</small></span>${s.status === 'Scheduled' ? h`<button class="btn" data-act="fd-start" data-id="${s.id}">Start</button>` : chip(s.status, statusClass(s.status))}</div>`) : empty('No field assignments today', 'Your manager assigns field duty. It appears here at the scheduled time.')}</div>
    ${can('hr', 'create') ? h`<a class="btn out" href="#/e/field_sessions/new">Schedule a field assignment</a>` : ''}
    ${can('hr', 'approve') ? h`<a class="btn out" href="#/p/teamlive">Open Team Live</a>` : ''}
    <div class="note">Every check-in, fix and check-out is stored with time, accuracy and device. Owner and Manager see changes live.</div></div>` }
}
const fixOrToast = async () => { try { const f = await getFix(); if (f.mock) { toast('Mock location detected — refused.', 'bad'); return null } if (f.accuracy > 100) { toast('GPS accuracy too low (' + Math.round(f.accuracy) + ' m). Move to open sky.', 'bad'); return null } return f } catch (e) { toast(/permission/i.test(e.message || e) ? 'Allow location access, then try again.' : (e.message || 'No GPS fix'), 'bad'); return null } }
export const teamActions = {
  async 'att-in'(el) { el.disabled = true; try { const f = await fixOrToast(); if (!f) return; await post('/api/mobile/attendance', { action: 'in', ...f }); toast('Checked in'); return 'reload' } catch (e) { toast(e.message, 'bad') } finally { el.disabled = false } },
  async 'att-out'(el) { el.disabled = true; try { const f = await fixOrToast(); if (!f) return; await post('/api/mobile/attendance', { action: 'out', ...f }); toast('Checked out'); return 'reload' } catch (e) { toast(e.message, 'bad'); if (/report/i.test(e.message)) location.hash = '#/p/dailyclose' } finally { el.disabled = false } },
  async 'fd-start'(el) {
    el.disabled = true
    try {
      const f = await fixOrToast(); if (!f) return
      await post(`/api/mobile/field/${el.dataset.id}/start`)
      if (isNative()) { const info = await deviceInfo(), s = await startDuty({ sessionId: +el.dataset.id, assignedLocation: '', serverUrl: base(), sessionToken: getSession().token, deviceId: info.device_id }); if (!s.started) { toast(s.reason === 'location_permission_required' ? 'Allow location access, then tap Start again.' : 'Could not start tracking: ' + s.reason, 'bad'); return 'reload' } }
      await post(`/api/mobile/field/${el.dataset.id}/point`, f).catch(() => {})
      toast('Field duty started — live location is shared'); return 'reload'
    } catch (e) { toast(e.message, 'bad') } finally { el.disabled = false }
  },
  async 'fd-end'(el) { if (!await confirmSheet('End field duty', 'Location sharing stops and the session closes.', 'End duty')) return; try { await post(`/api/mobile/field/${el.dataset.id}/end`); if (isNative()) await stopDuty(); toast('Field duty ended'); return 'reload' } catch (e) { toast(e.message, 'bad') } },
  async 'fd-sos'(el) { const reason = await reasonSheet('Emergency SOS', 'Alerts the Owner and Manager immediately with your last location.', 'Send SOS', true); if (!reason) return; try { await post(`/api/mobile/field/${el.dataset.id}/sos`, { reason }); toast('SOS sent'); return 'reload' } catch (e) { toast(e.message, 'bad') } },
  // ---- daily close
  async 'dc-submit'(el) {
    const o = $('#dco').value.trim(), b = $('#dcb').value.trim(), n = $('#dcn').value.trim(), err = $('#dce'); err.textContent = ''
    if (o.length < 30) { err.textContent = 'Today’s results need at least 30 characters.'; $('#dco').focus(); return }
    if (n.length < 30) { err.textContent = 'Tomorrow’s plan needs at least 30 characters.'; $('#dcn').focus(); return }
    if (!await confirmSheet('Submit and freeze', 'Your report and tomorrow’s plan are frozen and sent to the Owner and Operations Manager now.', 'Submit')) return
    el.disabled = true
    try { await post('/api/mobile/daily-report', { outcomes_narrative: o, blockers_narrative: b, next_day_priorities: n }); toast('Submitted — Owner and Manager alerted'); return 'reload' } catch (e) { err.textContent = e.message } finally { el.disabled = false }
  },
  async 'dc-ai'(el) {
    const raw = $('#dco').value.trim(); if (raw.length < 5) { toast('Write rough notes first.', 'bad'); return }
    el.disabled = true
    try { const r = await post('/api/ai/tool', { tool: 'daily_report', input: raw }); await sheet('AI draft — review before use', (root, close) => { root.innerHTML = h`<p class="pre">${r.text}</p><button class="btn" type="button">Close</button>`.s; root.querySelector('button').onclick = () => close() }) } catch (e) { toast(e.message, 'bad') } finally { el.disabled = false }
  },
  // ---- AI tools
  async 'ai-pick'(el) { AI.tool = el.dataset.v; return 'reload' },
  async 'ai-run'(el) {
    const input = $('#ai-in').value.trim(); if (input.length < 5) { toast('Add a few details first.', 'bad'); return }
    el.disabled = true; el.textContent = 'Working…'
    try { const r = await post('/api/ai/tool', { tool: AI.tool, input }); AI.out = r.text; AI.in = input; return 'reload' } catch (e) { toast(e.message, 'bad') } finally { el.disabled = false; el.textContent = 'Generate' }
  },
  async 'ai-copy'() { try { await navigator.clipboard.writeText(AI.out); toast('Copied') } catch { toast('Copy failed', 'bad') } },
  async 'ai-share'() { try { await navigator.share({ text: AI.out }) } catch { /* cancelled */ } }
}

// ------------------------------------------------------------------ Daily Close
export async function dailyClose() {
  const [st, list] = await Promise.all([get('/api/daily/status').catch(e => ({ error: e })), get('/api/e/daily_reports', { pageSize: 3, sort: 'report_date', dir: 'desc' }).catch(() => ({ rows: [] }))])
  if (st.error) return { title: 'Daily Close', body: h`<div class="wrap">${errorCard(st.error.status === 404 ? { status: 404, message: 'This SWK OS server does not have the daily-close API yet. Deploy the latest SWKOS.' } : st.error, false)}</div>` }
  const today = dubaiParts(), close = closingHHMM(new Date().toISOString().slice(0, 10))
  const prev = (list.rows || []).find(r => r.report_date < st.date && r.next_day_priorities)
  const r = st.report
  return { title: 'Daily Close', body: h`<div class="wrap">
    <div class="card ${st.submitted ? 'cash' : 'err'}"><small>${today.weekday}, ${today.day} ${today.month}</small><span class="n">${st.submitted ? 'Submitted ✓' : 'Not submitted'}</span><small>${st.submitted ? 'Frozen and sent to the Owner and Operations Manager.' : close ? 'Due before closing at ' + close + '. Owner and Haseeb are alerted automatically if it is missing.' : 'Holiday — no report required.'}</small></div>
    ${prev ? h`<div class="card tint"><div class="lbl">Today’s plan (set yesterday)</div><p class="pre">${prev.next_day_priorities}</p></div>` : ''}
    ${st.submitted ? h`<div class="card"><div class="lbl">Results</div><p class="pre">${r.outcomes_narrative}</p><div class="lbl">Tomorrow’s plan</div><p class="pre">${r.next_day_priorities}</p><span class="m">Submitted ${datetime(r.submitted_at)}</span></div>`
    : h`<div class="card"><label>Results achieved today * <small class="m">(min 30 characters)</small><textarea id="dco" rows="5" maxlength="4000">${r?.outcomes_narrative || ''}</textarea></label>
      <label>Blockers / help needed<textarea id="dcb" rows="3" maxlength="2000"></textarea></label>
      <label>Tomorrow’s plan — top priorities * <small class="m">(min 30 characters)</small><textarea id="dcn" rows="4" maxlength="4000">${r?.next_day_priorities || ''}</textarea></label>
      <p class="bad-t" id="dce" role="alert"></p>
      <button class="btn out" data-act="dc-ai" type="button">Polish my notes with AI</button>
      <button class="btn" data-act="dc-submit" type="button">Submit & freeze</button></div>`}
    <div class="note">Check-out is blocked until this is submitted.</div></div>` }
}

// ------------------------------------------------------------------ Team Live (Owner / Manager)
const ORDER = { SOS: 0, 'In field': 1, 'In office': 2, 'Not checked in': 3, 'Checked out': 4, 'On leave': 5 }
export async function teamLive() {
  const d = await get('/api/attendance/live'), R = [...d.roster].sort((a, b) => (ORDER[a.state] ?? 9) - (ORDER[b.state] ?? 9) || (b.late_minutes - a.late_minutes) || a.name.localeCompare(b.name))
  const n = s => R.filter(r => r.state === s).length, missingRep = R.filter(r => !/Submitted|Approved|Exemption/.test(r.report_status) && r.state !== 'On leave').length
  const close = closingHHMM(d.date)
  return { title: 'Team Live', body: h`<div class="wrap"><div class="grid2"><div class="k"><b>${n('In office')}</b><span>In office</span></div><div class="k"><b>${n('In field') + n('SOS')}</b><span>In field</span></div><div class="k"><b>${n('Not checked in')}</b><span>Not checked in</span></div><div class="k"><b>${missingRep}</b><span>Reports missing${close ? ' (due ' + close + ')' : ''}</span></div></div>
    <div class="note" id="tl-at">Updated live · ${datetime(d.at)}</div>
    <div class="list">${R.length ? R.map(r => h`<div class="card ${r.state === 'SOS' ? 'err' : ''}"><div class="row"><b class="hd t">${r.name}</b>${chip(r.state, r.state === 'SOS' ? 'bad' : r.state === 'In office' || r.state === 'In field' ? 'ok' : r.state === 'Not checked in' ? 'warn' : '')}</div>
      <span class="m">${r.check_in_at ? 'In ' + hhmm(r.check_in_at) : ''}${r.check_out_at ? ' · out ' + hhmm(r.check_out_at) : ''}${r.late_minutes ? ' · late ' + r.late_minutes + ' min' : ''}${r.method ? ' · ' + r.method : ''}</span>
      ${r.field ? h`<span class="m">${r.field.location || 'Field'} · last fix ${ago(r.field.last_location_at)}${r.field.last_lat ? h` · <a href="https://maps.google.com/?q=${r.field.last_lat},${r.field.last_lng}" target="_blank" rel="noopener noreferrer">map ↗</a>` : ''}</span>` : ''}
      <div class="row"><span class="m">Daily report</span>${chip(r.report_status, /Submitted|Approved|Exemption/.test(r.report_status) ? 'ok' : 'bad')}</div></div>`) : empty('No active employees')}</div></div>` }
}

// ------------------------------------------------------------------ Utilities (calculators + AI)
const AI = { tool: 'whatsapp_followup', in: '', out: '', status: null }
const AI_LABEL = { whatsapp_followup: 'WhatsApp follow-up', listing_copy: 'Listing copy', email_reply: 'E-mail reply', translate_ar: 'English → Arabic', translate_en: 'Arabic → English', summarize: 'Summarise notes', objection: 'Handle objection', viewing_plan: 'Viewing plan', daily_report: 'Daily report' }
export async function utilities() {
  AI.status ??= await get('/api/ai/tools-status').catch(() => ({ configured: false, tools: Object.keys(AI_LABEL) }))
  const calcs = [['mort', 'Mortgage'], ['cost', 'Buyer costs'], ['yield', 'Yield'], ['roi', 'Net ROI'], ['comm', 'Commission'], ['rera', 'RERA rent'], ['notice', 'RERA notice'], ['cheque', 'Rent cheques'], ['plan', 'Payment plan'], ['vat', 'VAT'], ['units', 'sqft ⇄ sqm'], ['fx', 'AED ⇄ USD'], ['visa', 'Golden Visa']]
  return { title: 'Utilities', body: h`<div class="wrap">
    <div class="lbl">Calculators</div><div class="tiles2">${calcs.map(([k, l]) => h`<a class="tile s" href="#/p/toolkit/${k}"><b>${l}</b></a>`)}</div>
    <div class="lbl">AI assistant ${AI.status.configured ? '' : '(not connected)'}</div>
    <div class="chips">${(AI.status.tools || []).filter(t => AI_LABEL[t]).map(t => h`<button class="chip ${AI.tool === t ? 'on' : ''}" data-act="ai-pick" data-v="${t}">${AI_LABEL[t]}</button>`)}</div>
    <div class="card"><label>Your notes<textarea id="ai-in" rows="4" maxlength="6000" placeholder="Paste the client message, property facts or rough notes">${AI.in}</textarea></label>
      <button class="btn" data-act="ai-run">Generate</button>
      ${AI.status.configured ? '' : h`<span class="m">The Owner connects a free AI provider (Cloudflare Workers AI, Groq or Gemini) in SWK OS → Admin → Integrations → AI.</span>`}</div>
    ${AI.out ? h`<div class="card"><div class="lbl">Draft — review before sending</div><p class="pre">${AI.out}</p><div class="row gap"><button class="btn out" data-act="ai-copy">Copy</button><button class="btn out" data-act="ai-share">Share</button>${/whatsapp/.test(AI.tool) ? h`<a class="btn" href="https://wa.me/?text=${encodeURIComponent(AI.out)}" target="_blank" rel="noopener noreferrer">WhatsApp</a>` : ''}</div></div>` : ''}
    <div class="note">AI drafts can be wrong. Check facts, figures and permit numbers.</div></div>` }
}

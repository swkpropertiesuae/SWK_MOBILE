// Real-time sync: long-polls the SWK OS change feed. The server answers the moment any record changes, so every screen refreshes within ~a second.
import { get, isAuthed } from './api.js'
let seq = null, running = false, gen = 0, ctl = null, state = 'offline', onEvents = () => {}, onState = () => {}
const sleep = ms => new Promise(r => setTimeout(r, ms))
const set = s => { if (s !== state) { state = s; onState(s) } }
export const syncState = () => state
export function startSync(events, stateFn) {
  onEvents = events; onState = stateFn; if (running) return
  running = true; const my = ++gen; seq = null; loop(my)
}
export function stopSync() { running = false; gen++; ctl?.abort(); set('offline') }
/** Called on app resume / network back: drop the in-flight poll so a fresh one starts immediately. */
export function kickSync() { if (running) ctl?.abort() }
async function loop(my) {
  let backoff = 1000, legacy = false
  while (running && my === gen && isAuthed()) {
    ctl = new AbortController()
    try {
      if (legacy) { await sleep(15000); set('poll'); onEvents([{ poll: true }]); continue }
      if (seq == null) { seq = (await get('/api/sync/changes', undefined, { signal: ctl.signal })).seq; set('live'); continue }
      const r = await get('/api/sync/changes', { since: seq, wait: 20 }, { signal: ctl.signal })
      seq = r.seq; set('live'); backoff = 1000
      if (r.reset) onEvents([{ reset: true }]); else if (r.events.length) onEvents(r.events)
    } catch (e) {
      if (!running || my !== gen) return
      if (e.status === 401) { running = false; return }
      if (e.status === 404) { legacy = true; continue }   // older server without the change feed: fall back to 15 s polling
      set('offline'); await sleep(backoff); backoff = Math.min(backoff * 2, 15000); if (e.status === 0 && seq != null) onEvents([{ reset: true }])
    }
  }
}

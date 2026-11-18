// SWKOS API client. Auth: POST /api/auth/login with x-swk-client: android returns a sessionToken that is sent as x-swk-session.
const KEY = 'swk.session', TIMEOUT = 25000
const cfg = () => (globalThis.SWK_CONFIG || {})
const ls = { get: k => { try { return localStorage.getItem(k) } catch { return null } }, set: (k, v) => { try { localStorage.setItem(k, v) } catch {} }, del: k => { try { localStorage.removeItem(k) } catch {} } }
export class ApiError extends Error { constructor(status, message, details) { super(message); this.status = status; this.details = details } }
export const base = () => String(ls.get('swk.server') && cfg().ALLOW_SERVER_OVERRIDE ? ls.get('swk.server') : (cfg().API_BASE || '')).replace(/\/+$/, '')
export const setServer = u => u ? ls.set('swk.server', u) : ls.del('swk.server')

let session = null
try { session = JSON.parse(ls.get(KEY) || 'null') } catch {}
if (session && session.expiresAt && Date.parse(session.expiresAt) < Date.now()) { session = null; ls.del(KEY) }
export const getSession = () => session
export const isAuthed = () => !!session?.token
const save = s => { session = s; s ? ls.set(KEY, JSON.stringify(s)) : ls.del(KEY) }
export const clearSession = () => save(null)

export async function request(method, path, { body, params, headers, signal, blob } = {}) {
  let url = base() + path
  if (params) { const u = new URLSearchParams(); for (const [k, v] of Object.entries(params)) if (v !== undefined && v !== null && v !== '') u.set(k, typeof v === 'object' ? JSON.stringify(v) : String(v)); const s = u.toString(); if (s) url += (url.includes('?') ? '&' : '?') + s }
  const ctl = new AbortController(), t = setTimeout(() => ctl.abort(), TIMEOUT)
  signal?.addEventListener('abort', () => ctl.abort())
  let res
  try {
    res = await fetch(url, { method, signal: ctl.signal, headers: { 'x-swk-client': 'android', ...(body !== undefined ? { 'content-type': 'application/json' } : {}), ...(session?.token ? { 'x-swk-session': session.token } : {}), ...headers }, body: body === undefined ? undefined : JSON.stringify(body), cache: 'no-store' })
  } catch (e) {
    throw new ApiError(0, ctl.signal.aborted ? 'The server took too long to respond.' : 'Cannot reach the server. Check your connection.')
  } finally { clearTimeout(t) }
  if (blob && res.ok) return res.blob()
  const text = await res.text(); let data = null
  if (text) { try { data = JSON.parse(text) } catch { data = text } }
  if (!res.ok) {
    if (res.status === 401 && !path.startsWith('/api/auth/login')) { clearSession(); globalThis.dispatchEvent?.(new Event('swk:unauth')) }
    throw new ApiError(res.status, (data && data.error) || res.statusText || 'Request failed', data && data.details)
  }
  return data
}
export const get = (p, params, o) => request('GET', p, { params, ...o })
export const post = (p, body, o) => request('POST', p, { body: body ?? {}, ...o })
export const put = (p, body, o) => request('PUT', p, { body: body ?? {}, ...o })
export const del = (p, o) => request('DELETE', p, o)
export const reasonHeader = r => r ? { 'x-swk-audit-reason': encodeURIComponent(r) } : {}

export async function login(email, password, totp) {
  const r = await post('/api/auth/login', { email: email.trim(), password, ...(totp ? { totp } : {}) })
  if (r.needsTotp) return { needsTotp: true }
  if (!r.sessionToken) throw new ApiError(500, 'Server did not return a session. Update SWK OS to the latest version.')
  save({ token: r.sessionToken, expiresAt: r.expiresAt, user: r.user, mustChangePassword: !!r.mustChangePassword })
  return { ok: true, mustChangePassword: !!r.mustChangePassword }
}
export async function logout() { try { await post('/api/auth/logout') } catch {} clearSession() }
export const markPasswordChanged = () => session && save({ ...session, mustChangePassword: false })

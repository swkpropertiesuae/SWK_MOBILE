// Shared runtime state: metadata from /api/meta and permission helpers.
import { get } from './api.js'
export const X = { meta: null, me: null }
export async function loadMeta() {
  const [meta, me] = await Promise.all([get('/api/meta'), get('/api/auth/me')])
  X.meta = meta; X.me = me
  X.entities = Object.fromEntries((meta.entities || []).map(e => [e.key, e]))
}
export const entity = k => X.entities?.[k]
export const can = (module, action = 'view') => !module || X.me?.permissions === '*' || !!X.meta?.perms?.[module]?.includes(action)
export const resetState = () => { X.meta = null; X.me = null; X.entities = null }

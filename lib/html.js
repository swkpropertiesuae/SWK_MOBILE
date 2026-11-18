// Auto-escaping template tag. Every interpolated value is HTML-escaped unless wrapped with raw() or produced by h``.
const ESC = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;', '`': '&#96;' }
export const esc = v => String(v ?? '').replace(/[&<>"'`]/g, c => ESC[c])
class Raw { constructor(s) { this.s = s } toString() { return this.s } }
export const raw = s => new Raw(String(s ?? ''))
const val = v => v instanceof Raw ? v.s : Array.isArray(v) ? v.map(val).join('') : v === false || v == null ? '' : esc(v)
export const h = (strs, ...vals) => new Raw(strs.reduce((a, s, i) => a + s + (i < vals.length ? val(vals[i]) : ''), ''))
export const safeUrl = u => { try { const x = new URL(String(u), 'https://x.invalid'); return /^(https?:|mailto:|tel:)$/.test(x.protocol) ? String(u) : '#' } catch { return '#' } }

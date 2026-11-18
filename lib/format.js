export const TZ = 'Asia/Dubai'
export const num = (n, d = 0) => Number(n).toLocaleString('en-US', { minimumFractionDigits: d, maximumFractionDigits: d })
export const aed = n => n == null || n === '' || Number.isNaN(+n) ? '—' : 'AED ' + num(n, Math.abs(+n) < 1000 && +n % 1 ? 2 : 0)
export const short = n => { n = +n; return Math.abs(n) >= 1e9 ? (n / 1e9).toFixed(2) + 'B' : Math.abs(n) >= 1e6 ? (n / 1e6).toFixed(2).replace(/\.?0+$/, '') + 'M' : Math.abs(n) >= 1e4 ? (n / 1e3).toFixed(0) + 'K' : num(n) }
export const date = v => { if (!v) return '—'; const d = new Date(/^\d{4}-\d{2}-\d{2}$/.test(v) ? v + 'T00:00:00' : v); return isNaN(d) ? String(v) : d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) }
export const datetime = v => { if (!v) return '—'; const d = new Date(v); return isNaN(d) ? String(v) : d.toLocaleString('en-GB', { timeZone: TZ, day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit', hour12: false }) }
export const optValue = o => typeof o === 'string' ? o : o.value
export const optLabel = o => typeof o === 'string' ? o : (o.label ?? o.value)
export const optLabelOf = (f, v) => { const o = (f.options || []).find(x => optValue(x) === v); return o ? optLabel(o) : v }
export function fmtField(f, rec) {
  const v = rec[f.name]
  if (f.type === 'ref') return rec._labels?.[f.name] ?? (v ? '#' + v : '—')
  if (v == null || v === '') return '—'
  switch (f.type) {
    case 'money': return aed(v)
    case 'percent': return num(v, 2) + '%'
    case 'number': return num(v, 2)
    case 'int': return num(v)
    case 'bool': return v ? 'Yes' : 'No'
    case 'date': return date(v)
    case 'datetime': return datetime(v)
    case 'select': return optLabelOf(f, v)
    case 'json': return typeof v === 'string' ? v : JSON.stringify(v)
    default: return String(v)
  }
}
export const dubaiParts = (d = new Date()) => Object.fromEntries(new Intl.DateTimeFormat('en-GB', { timeZone: TZ, weekday: 'long', hour: '2-digit', minute: '2-digit', day: 'numeric', month: 'long', year: 'numeric', hour12: false }).formatToParts(d).map(x => [x.type, x.value]))
export const greeting = (d = new Date()) => { const h = +dubaiParts(d).hour; return h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening' }

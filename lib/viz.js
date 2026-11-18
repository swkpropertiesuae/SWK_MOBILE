// Small data-viz helpers (inspired by 21st.dev "KPI Tile"): sparkline with area fill, delta pill, count-up.
import { h, raw } from './html.js'
export function sparkline(series, { w = 120, h: ht = 36 } = {}) {
  const v = series.map(Number); if (v.length < 2) return raw('')
  const mn = Math.min(...v), mx = Math.max(...v), rng = mx - mn || 1, pad = 3
  const pts = v.map((y, i) => [i / (v.length - 1) * w, ht - pad - (y - mn) / rng * (ht - pad * 2)])
  const line = pts.map((p, i) => (i ? 'L' : 'M') + p[0].toFixed(1) + ' ' + p[1].toFixed(1)).join(' ')
  return raw(`<svg class="spk" viewBox="0 0 ${w} ${ht}" preserveAspectRatio="none" aria-hidden="true"><defs><linearGradient id="g" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stop-color="currentColor" stop-opacity=".28"/><stop offset="1" stop-color="currentColor" stop-opacity="0"/></linearGradient></defs><path d="${line} L${w} ${ht} L0 ${ht}Z" fill="url(#g)"/><path class="spk-l" d="${line}" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" pathLength="1"/></svg>`)
}
export function delta(cur, prev) {
  if (!prev && !cur) return { pct: 0, up: true, text: '0%' }
  if (!prev) return { pct: 100, up: true, text: 'new' }
  const pct = Math.round((cur - prev) / prev * 100); return { pct, up: pct >= 0, text: Math.abs(pct) + '%' }
}
export const deltaPill = d => h`<span class="dpill ${d.up ? 'up' : 'dn'}"><span aria-hidden="true">${d.up ? '↗' : '↘'}</span> ${d.text}<span class="sr"> ${d.up ? 'up' : 'down'}</span></span>`
export function kpiTile({ label, value, series, sub }) {
  const n = series.map(Number), last = n.slice(-3).reduce((a, b) => a + b, 0), prev = n.slice(-6, -3).reduce((a, b) => a + b, 0), d = delta(last, prev)
  return h`<div class="kt"><span class="m">${label}</span><div class="row"><b class="cnt" data-to="${value}">${value}</b>${deltaPill(d)}</div><span class="m">${sub}</span>${sparkline(n)}</div>`
}
export function countUp(root = document) {
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return
  root.querySelectorAll('.cnt[data-to]').forEach(el => {
    const to = +el.dataset.to; if (!Number.isFinite(to) || to === 0) return
    const t0 = performance.now(), dur = 700
    const tick = t => { const k = Math.min(1, (t - t0) / dur), e = 1 - Math.pow(1 - k, 3); el.textContent = Math.round(to * e).toLocaleString('en-US'); if (k < 1) requestAnimationFrame(tick) }
    requestAnimationFrame(tick)
  })
}

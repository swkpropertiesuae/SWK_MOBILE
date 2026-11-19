// Layout audit: every route at phone/tablet widths. Fails on horizontal overflow, elements outside the viewport, clipped controls, tiny tap targets.
// Env: SWK_API, SWK_EMAIL, SWK_PASSWORD, SWK_SHOTS
import { createRequire } from 'node:module'
const { chromium } = createRequire(import.meta.url)('playwright')
import { spawn } from 'node:child_process'
const API = process.env.SWK_API || 'http://localhost:8090', EMAIL = process.env.SWK_EMAIL || 'shabib@swk.properties', PW = process.env.SWK_PASSWORD
if (!PW) { console.error('Set SWK_PASSWORD'); process.exit(2) }
const srv = spawn(process.execPath, ['scripts/serve.mjs'], { env: { ...process.env, PORT: '5175' }, stdio: 'ignore' }); await new Promise(r => setTimeout(r, 600))
const VIEWPORTS = [[320, 568], [360, 640], [390, 844], [412, 915], [768, 1024]]
const b = await chromium.launch(); const problems = []; let checked = 0
for (const [w, hgt] of VIEWPORTS) {
  const c = await b.newContext({ viewport: { width: w, height: hgt }, deviceScaleFactor: 2, isMobile: true, hasTouch: true, geolocation: { latitude: 25.2, longitude: 55.27, accuracy: 10 }, permissions: ['geolocation'] })
  const p = await c.newPage()
  await p.route('**/config.js', r => r.fulfill({ contentType: 'text/javascript', body: `globalThis.SWK_CONFIG={API_BASE:${JSON.stringify(API)},IDLE_MINUTES:60}` }))
  p.on('pageerror', e => problems.push(`[${w}] pageerror ${e.message}`))
  await p.goto('http://localhost:5175/'); await p.fill('#em', EMAIL); await p.fill('#pw', PW); await p.click('#lb'); await p.waitForSelector('.tiles')
  const keys = await p.evaluate(async () => { const m = await import('/lib/state.js'); const n = await import('/lib/nav.js'); return { ent: Object.values(m.X.entities).filter(e => !e.child).map(e => e.key), apps: n.NAV.map(s => s.key) } })
  const routes = ['', ...keys.apps.map(k => 'app/' + k), 'p/dashboard', 'p/pipeline', 'p/market', 'p/calendar', 'p/bin', 'p/withdrawals', 'p/leadcmd', 'p/attendance', 'p/dailyclose', 'p/teamlive', 'p/utilities', 'notifications', 'account', 'changepw',
    ...['mort', 'cost', 'yield', 'roi', 'comm', 'rera', 'notice', 'cheque', 'plan', 'vat', 'units', 'fx', 'visa'].map(k => 'p/toolkit/' + k), ...keys.ent.map(k => 'e/' + k), ...keys.ent.slice(0, 40).map(k => `e/${k}/new`)]
  await p.evaluate(() => { location.hash = '#/p/dashboard' }); await p.waitForTimeout(600)
  const ctl = await p.evaluate(W => { const d = document.createElement('div'); d.id = 'ctl'; d.style.cssText = 'width:' + (W + 200) + 'px;height:20px'; d.textContent = 'control'; document.querySelector('#v .wrap').appendChild(d); const r = d.getBoundingClientRect(); const bad = document.documentElement.scrollWidth > W + 1 || r.right > W + 1; d.parentNode.removeChild(d); return bad }, w)
  if (!ctl) problems.push(`[${w}] audit self-check failed: deliberate overflow was not detected`)
  const detail = await p.evaluate(async () => { const { get } = await import('/lib/api.js'); const m = await import('/lib/state.js'); const out = []
    for (const k of Object.values(m.X.entities).filter(e => !e.child).map(e => e.key)) { try { const r = await get('/api/e/' + k, { pageSize: 2 }); for (const x of r.rows) out.push(`e/${k}/${x.id}`, `e/${k}/${x.id}/edit`) } catch {} } return out })
  routes.push(...detail)
  for (const r of routes) {
    await p.evaluate(h => { location.hash = h }, '#/' + r); await p.waitForFunction(() => !document.querySelector('.skel-wrap, .spin'), null, { timeout: 8000 }).catch(() => {}); await p.waitForTimeout(120)
    const res = await p.evaluate(W => {
      const out = [], inScroller = e => { for (let x = e; x && x !== document.body; x = x.parentElement) { const o = getComputedStyle(x).overflowX; if ((o === 'auto' || o === 'scroll') && x.scrollWidth > x.clientWidth) return true } return false }
      if (document.documentElement.scrollWidth > W + 1) out.push(`page scrolls horizontally (${document.documentElement.scrollWidth} > ${W})`)
      for (const e of document.querySelectorAll('#v *, #dock *')) {
        const cs = getComputedStyle(e); if (cs.display === 'none' || cs.visibility === 'hidden' || e.closest('[hidden]') || e.closest('svg')) continue
        const r = e.getBoundingClientRect(); if (!r.width || !r.height) continue
        if ((r.left < -1 || r.right > W + 1) && !inScroller(e)) out.push(`outside viewport: ${e.tagName}.${String(e.className).slice(0, 30)} [${Math.round(r.left)}..${Math.round(r.right)}] "${(e.textContent || '').trim().slice(0, 24)}"`)
        if (/^(BUTTON|A)$/.test(e.tagName) && e.matches('.btn,.chip,.st,.tile') && e.scrollWidth > e.clientWidth + 1 && cs.overflow !== 'visible') out.push(`clipped control: ${e.className} "${(e.textContent || '').trim().slice(0, 24)}"`)
        if (/^(BUTTON|A|INPUT|SELECT|TEXTAREA)$/.test(e.tagName) && !e.closest('.dl, .note, p, .m, .pre') && e.type !== 'hidden' && e.type !== 'checkbox' && (r.height < 36 && !e.matches('.dock a svg'))) out.push(`small tap target ${Math.round(r.height)}px: ${e.tagName}.${String(e.className).slice(0, 24)} "${(e.textContent || e.value || '').trim().slice(0, 20)}"`)
      }
      return [...new Set(out)].slice(0, 6)
    }, w)
    checked++
    for (const m of res) problems.push(`[${w}] #/${r}: ${m}`)
  }
  await c.close()
}
await b.close(); srv.kill()
console.log(`checked ${checked} screens`); if (problems.length) { console.log(problems.length + ' problems:\n' + problems.slice(0, 60).join('\n')); process.exit(1) } console.log('layout audit clean')

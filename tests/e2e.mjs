// E2E against a running SWKOS (default http://localhost:8080) + this app on :5173. Env: SWK_API, SWK_EMAIL, SWK_PASSWORD, SWK_SHOTS (dir)
import { createRequire } from 'node:module'
const { chromium, devices } = createRequire(import.meta.url)('playwright')
import assert from 'node:assert/strict'
import { spawn } from 'node:child_process'
const API = process.env.SWK_API || 'http://localhost:8080', EMAIL = process.env.SWK_EMAIL || 'shabib@swk.properties', PW = process.env.SWK_PASSWORD, SH = process.env.SWK_SHOTS
if (!PW) { console.error('Set SWK_PASSWORD'); process.exit(2) }
const srv = spawn(process.execPath, ['scripts/serve.mjs'], { env: { ...process.env, PORT: '5173' }, stdio: 'ignore' }); await new Promise(r => setTimeout(r, 600))
const b = await chromium.launch(), c = await b.newContext({ ...devices['iPhone 13'] }), p = await c.newPage(), errs = []
await p.route('**/config.js', r => r.fulfill({ contentType: 'text/javascript', body: `globalThis.SWK_CONFIG={API_BASE:${JSON.stringify(API)},IDLE_MINUTES:30}` }))
p.on('pageerror', e => errs.push(e.message)); p.on('console', m => { if (m.type() === 'error' && !/401|Failed to load resource/.test(m.text())) errs.push(m.text()) })
const shot = n => SH && p.screenshot({ path: `${SH}/${n}.png` })
const step = async (n, f) => { try { await f(); console.log('ok  ', n) } catch (e) { console.log('FAIL', n, e.message.split('\n')[0]); errs.push(n) } }
await p.goto('http://localhost:5173/')
await step('login rejects bad password', async () => { await p.fill('#em', EMAIL); await p.fill('#pw', 'wrong-password-1A'); await p.click('#lb'); await p.waitForFunction(() => document.querySelector('#le')?.textContent.length > 0); assert.match(await p.innerText('#le'), /Incorrect/) })
await step('login ok', async () => { await p.fill('#pw', PW); await p.click('#lb'); await p.waitForSelector('.tiles'); assert.ok(await p.locator('.tile').count() >= 8); assert.ok(await p.locator('.tile svg path, .tile svg rect, .tile svg circle').count() > 8, 'icons render'); assert.ok(await p.locator('#dock svg *').count() > 5); assert.equal(await p.locator('.toast.show').count(), 0); await shot('home') })
await step('app section lists features', async () => { await p.goto('http://localhost:5173/#/app/clients'); await p.waitForSelector('.li'); assert.ok(await p.locator('.li').count() > 5) })
await step('leads empty state', async () => { await p.goto('http://localhost:5173/#/e/leads'); await p.waitForSelector('.state, .li'); await shot('leads') })
let leadUrl
await step('create lead', async () => {
  await p.goto('http://localhost:5173/#/e/leads/new'); await p.waitForSelector('#ef'); await p.click('#ef button[type=submit]'); assert.match(await p.innerText('#fe'), /Check:/)
  await p.fill('[name=company]', 'E2E Client <b>LLC</b>'); await p.fill('[name=contact_name]', 'Ali'); await p.fill('[name=phone]', '+971500000001'); await p.click('#ef button[type=submit]')
  await p.waitForURL(/#\/e\/leads\/\d+$/); leadUrl = p.url(); await p.waitForSelector('.dl'); assert.match(await p.innerText('.t'), /E2E Client <b>LLC<\/b>/); assert.equal(await p.locator('.t b').count(), 0); await shot('lead-detail')
})
await step('search + list shows lead', async () => { await p.goto('http://localhost:5173/#/e/leads'); await p.waitForSelector('.li'); await p.fill('#lq', 'E2E'); await p.waitForTimeout(700); assert.ok(await p.locator('#lrows .li').count() >= 1); await p.fill('#lq', 'zzzzzz'); await p.waitForTimeout(700); assert.match(await p.innerText('#lrows'), /No matches/) })
await step('edit lead', async () => { await p.goto(leadUrl + '/edit'); await p.waitForSelector('#ef'); await p.fill('[name=contact_name]', 'Omar'); await p.fill('#reason', 'e2e test'); await p.click('#ef button[type=submit]'); await p.waitForURL(/#\/e\/leads\/\d+$/); await p.waitForSelector('.dl'); assert.match(await p.innerText('.wrap'), /Omar/) })
await step('ref picker', async () => { await p.goto('http://localhost:5173/#/e/opportunities/new'); await p.waitForSelector('#ef'); const pick = p.locator('button.pick').first(); if (await pick.count()) { await pick.click(); await p.waitForSelector('dialog.sheet'); await p.waitForSelector('#pl .state, #pl .li'); await p.keyboard.press('Escape') } })
await step('delete with reason', async () => { await p.goto(leadUrl); await p.waitForSelector('[data-act=edel]'); await p.click('[data-act=edel]'); await p.fill('#rs', 'e2e cleanup'); await p.click('[data-x=yes]'); await p.waitForURL(/#\/e\/leads$/); await p.waitForSelector('.state, .li') })
await step('quotation with child lines', async () => {
  await p.evaluate(async () => { const { post } = await import('/lib/api.js'); await post('/api/e/parties', { name: 'E2E Customer ' + Date.now(), is_customer: true }) })
  await p.goto('http://localhost:5173/#/e/quotations/new'); await p.waitForSelector('#ef')
  await p.fill('[name=quote_date]', '2026-11-18'); await p.selectOption('[name=mode]', { index: 1 })
  await p.click('button.pick[data-field=customer_id]'); await p.waitForSelector('#pl .li'); await p.click('#pl .li'); await p.waitForSelector('dialog.sheet', { state: 'detached' })
  await p.click('[data-act=cadd]'); await p.waitForSelector('.crow'); const row = p.locator('.crow').first()
  await row.locator('[name=description]').fill('Consultancy'); const q = row.locator('[name=qty]'); if (await q.count()) await q.fill('2'); const r = row.locator('[name=rate]'); if (await r.count()) await r.fill('500')
  await p.click('#ef button[type=submit]'); await p.waitForURL(/#\/e\/quotations\/\d+$/, { timeout: 8000 }); await p.waitForSelector('.dl'); assert.match(await p.innerText('.wrap'), /Consultancy/); await shot('quote')
})
await step('lead command: log + lost', async () => {
  await p.evaluate(async () => { const { post } = await import('/lib/api.js'); await post('/api/e/leads', { company: 'LC Test ' + Date.now(), contact_name: 'Sam', phone: '+971500000002' }) })
  await p.goto('http://localhost:5173/#/p/leadcmd'); await p.waitForSelector('[data-act=lclog]'); await shot('leadcmd')
  await p.click('[data-act=lclog]'); await p.waitForSelector('dialog.sheet'); await p.click('#go'); assert.match(await p.innerText('#le'), /min 5/)
  await p.fill('#nt', 'Spoke to client about budget'); await p.click('#go'); await p.waitForSelector('dialog.sheet', { state: 'detached' }); await p.waitForTimeout(800)
  await p.click('[data-act=lclost]'); await p.fill('#rs', 'client went elsewhere'); await p.click('[data-x=yes]'); await p.waitForTimeout(800)
})
await step('field duty degrades cleanly without mobile API', async () => { await p.goto('http://localhost:5173/#/p/fieldduty'); await p.waitForSelector('.wrap .card, .wrap .state'); })
await step('dashboard', async () => { await p.goto('http://localhost:5173/#/p/dashboard'); await p.waitForSelector('.grid2, .state'); await shot('dashboard') })
await step('market + area', async () => { await p.goto('http://localhost:5173/#/p/market'); await p.waitForSelector('a.card.link'); await shot('market'); await p.click('a.card.link'); await p.waitForSelector('.kv2') })
await step('calendar', async () => { await p.goto('http://localhost:5173/#/p/calendar'); await p.waitForSelector('.lbl, .state'); await shot('calendar') })
await step('bin / withdrawals / notifications', async () => { for (const u of ['p/bin', 'p/withdrawals', 'notifications']) { await p.goto('http://localhost:5173/#/' + u); await p.waitForSelector('.wrap .state, .wrap .card, .wrap .list'); assert.equal(await p.locator('.card.err').count(), 0, u) } })
await step('calculator', async () => { await p.goto('http://localhost:5173/#/p/toolkit'); await p.waitForSelector('[data-calc]'); await p.click('[data-act=tk][data-v=cost]'); await p.waitForSelector('#p'); await p.fill('#p', '2000000'); assert.match(await p.innerText('#o'), /80,000/); await shot('toolkit') })
await step('web-only feature opens externally', async () => { await p.goto('http://localhost:5173/#/app/tools'); const a = p.locator('a[target=_blank]').first(); assert.equal(await a.getAttribute('rel'), 'noopener noreferrer') })
await step('every entity route renders', async () => {
  const keys = await p.evaluate(async () => { const m = await import('/lib/state.js'); return Object.values(m.X.entities).filter(e => !e.child).map(e => e.key) }), bad = []
  for (const k of keys.slice(0, 141)) { await p.goto('http://localhost:5173/#/e/' + k); await p.waitForFunction(() => !document.querySelector('.spin'), null, { timeout: 8000 }).catch(() => {}); if (await p.locator('.card.err').count()) bad.push(k + ': ' + (await p.locator('.card.err .m').first().innerText())) }
  assert.equal(bad.length, 0, bad.slice(0, 5).join(' | '))
})
await step('account + logout', async () => { await p.goto('http://localhost:5173/#/account'); await p.waitForSelector('[data-act=logout]'); await shot('account'); await p.click('[data-act=logout]'); await p.click('[data-x=yes]'); await p.waitForSelector('#lf') })
await b.close(); srv.kill()
if (errs.length) { console.log('ERRORS:', errs.slice(0, 10)); process.exit(1) } console.log('E2E passed')

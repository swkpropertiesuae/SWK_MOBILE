import test from 'node:test'
import assert from 'node:assert/strict'
import { h, esc, raw, safeUrl } from '../lib/html.js'
import { closing, pmt, split, rera, grossYield } from '../lib/calc.js'
import { aed, fmtField, optLabelOf, short } from '../lib/format.js'
import { NAV } from '../lib/nav.js'

test('html escapes by default', () => {
  assert.equal(h`<p>${'<img src=x onerror=1>'}</p>`.s, '<p>&lt;img src=x onerror=1&gt;</p>')
  assert.equal(h`<p>${raw('<b>x</b>')}${[h`<i>${'&'}</i>`]}</p>`.s, '<p><b>x</b><i>&amp;</i></p>')
  assert.equal(esc(null), '')
})
test('safeUrl blocks javascript:', () => { assert.equal(safeUrl('javascript:alert(1)'), '#'); assert.equal(safeUrl('https://a.b/c'), 'https://a.b/c'); assert.equal(safeUrl('mailto:a@b.c'), 'mailto:a@b.c') })
test('closing costs', () => { const c = closing(2e6, { mortgage: true, loan: 1.6e6 }); assert.equal(c.dld, 80000); assert.equal(c.agency, 40000); assert.equal(c.vat, 2000); assert.equal(c.mReg, 4290); assert.equal(c.total, 126870) })
test('mortgage payment', () => { assert.equal(pmt(0, 4, 25), 0); assert.equal(pmt(1200, 0, 1), 100); const m = pmt(1.6e6, 4.25, 25); assert.ok(m > 8600 && m < 8700) })
test('split never negative', () => { assert.equal(split(100, 10).agent, 45); assert.equal(split(100, 500).pool, 0) })
test('rera bands', () => { assert.equal(rera(80, 100).pct, 5); assert.equal(rera(100, 100).pct, 0); assert.equal(rera(65, 100).pct, 15); assert.equal(grossYield(0, 5), 0) })
test('format', () => {
  assert.equal(aed(null), '—'); assert.equal(aed(1500000), 'AED 1,500,000'); assert.equal(short(2500000), '2.5M')
  const f = { name: 's', type: 'select', options: ['A', { value: 'b', label: 'Bee' }] }
  assert.equal(optLabelOf(f, 'b'), 'Bee'); assert.equal(fmtField({ name: 'r', type: 'ref' }, { r: 3, _labels: { r: 'Acme' } }), 'Acme'); assert.equal(fmtField({ name: 'x', type: 'bool' }, { x: 1 }), 'Yes')
})
test('no handover / manual entries remain', () => { const all = JSON.stringify(NAV).toLowerCase().replace('/e/handovers', ''); assert.ok(!/handover &|handover\/|\/handover|company manual|manual articles|\/competency/.test(all)) })
test('nav is structural only', () => { assert.equal(NAV.length, 12); for (const s of NAV) for (const i of s.items) assert.ok(i[1].startsWith('/')) })
import { buildNsc } from '../scripts/gen-nsc.mjs'
import { readFileSync } from 'node:fs'
test('pin config is valid, pinned to the API host, cleartext off', () => {
  const f = JSON.parse(readFileSync(new URL('../android/pins.json', import.meta.url))), x = buildNsc({ domain: f.domain, expiration: f.expiration, pins: f.pins.map(p => p.pin) })
  assert.match(x, /<domain includeSubdomains="false">os\.swk\.properties<\/domain>/); assert.equal((x.match(/<pin digest="SHA-256">/g) || []).length, f.pins.length); assert.match(x, /cleartextTrafficPermitted="false"/); assert.ok(!/src="user"/.test(x))
  assert.throws(() => buildNsc({ domain: 'a', expiration: '2099-01-01', pins: ['x'] })); assert.throws(() => buildNsc({ domain: 'a', expiration: '2099-01-01', pins: ['hxqRlPTu1bMS/0DITB1SSu0vd4u/8l8TjPgfaAp63Gc='] })); assert.throws(() => buildNsc({ domain: 'a', expiration: '2000-01-01', pins: f.pins.map(p => p.pin) }))
})

import { sqftToSqm, sqmToSqft, vat, roi, paymentPlan, chequeSchedule, reraNoticeDeadline, goldenVisa, aedToUsd, usdToAed } from '../lib/calc.js'
test('utility calculators', () => {
  assert.equal(sqftToSqm(1076.39), 100); assert.equal(sqmToSqft(100), 1076.39)
  assert.deepEqual(vat(105, 5, true), { net: 100, vat: 5, gross: 105 }); assert.deepEqual(vat(100), { net: 100, vat: 5, gross: 105 })
  const r = roi(1000000, 80000, 10000, 0); assert.equal(r.net, 70000); assert.equal(r.grossYield, 8); assert.ok(r.netYield < 7 && r.payback > 14)
  const pp = paymentPlan(1000000, 20, 4, 10, 40); assert.equal(pp.total, 100); assert.ok(pp.balanced); assert.equal(pp.rows.length, 6); assert.equal(paymentPlan(1e6, 20, 2, 10, 40).balanced, false)
  const cs = chequeSchedule(100000, 4, '2026-01-31'); assert.equal(cs.length, 4); assert.equal(cs.reduce((a, c) => a + c.amount, 0), 100000); assert.equal(cs[1].date, '2026-05-01'); assert.deepEqual(chequeSchedule(1, 13, '2026-01-01'), [])
  assert.equal(reraNoticeDeadline('2026-12-31'), '2026-10-02'); assert.equal(goldenVisa(1999999).eligible, false); assert.equal(goldenVisa(2000000).eligible, true)
  assert.equal(aedToUsd(367.25), 100); assert.equal(usdToAed(100), 367.25)
})

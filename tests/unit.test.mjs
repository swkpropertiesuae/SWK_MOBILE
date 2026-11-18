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
test('nav is structural only', () => { assert.equal(NAV.length, 12); for (const s of NAV) for (const i of s.items) assert.ok(i[1].startsWith('/')) })

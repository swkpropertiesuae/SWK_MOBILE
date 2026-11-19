// UAE deal calculators. Rules: DLD 4% + AED 580 admin, agency 2% + 5% VAT, mortgage registration 0.25% + AED 290,
// LTV 80% expat / 85% national / 50% off-plan, 50/50 net commission split, Dubai Decree 43/2013 RERA bands. Indicative only.
export const r2 = n => Math.round(n * 100) / 100
export function closing(price, { mortgage = false, loan = 0 } = {}) {
  const dld = price * 0.04, admin = 580, agency = price * 0.02, vat = agency * 0.05
  const mReg = mortgage ? loan * 0.0025 + 290 : 0, total = dld + admin + agency + vat + mReg
  return { dld: r2(dld), admin, agency: r2(agency), vat: r2(vat), mReg: r2(mReg), total: r2(total), cash: r2(price + total) }
}
export function pmt(loan, ratePct, years) {
  const n = years * 12, i = ratePct / 1200
  if (!(n > 0) || !(loan > 0)) return 0
  return r2(i === 0 ? loan / n : loan * i / (1 - Math.pow(1 + i, -n)))
}
export const grossYield = (price, rent) => price > 0 ? r2(rent / price * 100) : 0
export function split(gross, a2a = 0) {
  const pool = Math.max(0, gross - a2a)
  return { pool: r2(pool), swk: r2(pool / 2), agent: r2(pool / 2), vat: r2(gross * 0.05) }
}
export function rera(rent, index) {
  const below = index > 0 ? (index - rent) / index * 100 : 0
  const pct = below <= 10 ? 0 : below <= 20 ? 5 : below <= 30 ? 10 : below <= 40 ? 15 : 20
  return { below: r2(Math.max(0, below)), pct, max: r2(rent * (1 + pct / 100)) }
}

export const SQFT_PER_SQM = 10.7639104167
export const sqftToSqm = v => r2(v / SQFT_PER_SQM)
export const sqmToSqft = v => r2(v * SQFT_PER_SQM)
export const vat = (amount, rate = 5, inclusive = false) => inclusive ? { net: r2(amount / (1 + rate / 100)), vat: r2(amount - amount / (1 + rate / 100)), gross: r2(amount) } : { net: r2(amount), vat: r2(amount * rate / 100), gross: r2(amount * (1 + rate / 100)) }
/** Net rental ROI: annual rent less service charge and other costs, over price + closing costs. */
export function roi(price, annualRent, serviceCharge = 0, otherCosts = 0) {
  const c = closing(price), cost = price + c.total, net = annualRent - serviceCharge - otherCosts
  return { net: r2(net), grossYield: grossYield(price, annualRent), netYield: cost > 0 ? r2(net / cost * 100) : 0, payback: net > 0 ? r2(cost / net) : 0, invested: r2(cost) }
}
/** Off-plan plan: down payment %, N equal instalments, remainder at handover. */
export function paymentPlan(price, downPct, instalments, instalmentPct, handoverPct) {
  const out = [{ label: 'Booking / down payment', pct: downPct, amount: r2(price * downPct / 100) }]
  for (let i = 1; i <= instalments; i++) out.push({ label: 'Instalment ' + i, pct: instalmentPct, amount: r2(price * instalmentPct / 100) })
  out.push({ label: 'On handover', pct: handoverPct, amount: r2(price * handoverPct / 100) })
  const total = out.reduce((a, x) => a + x.pct, 0)
  return { rows: out, total: r2(total), balanced: Math.abs(total - 100) < 0.001 }
}
export function chequeSchedule(annualRent, cheques, startISO) {
  if (!(cheques >= 1 && cheques <= 12)) return []
  const per = r2(annualRent / cheques), step = 12 / cheques, d0 = new Date(startISO + 'T00:00:00Z')
  return Array.from({ length: cheques }, (_, i) => { const d = new Date(Date.UTC(d0.getUTCFullYear(), d0.getUTCMonth() + Math.round(i * step), d0.getUTCDate())); return { n: i + 1, date: d.toISOString().slice(0, 10), amount: i === cheques - 1 ? r2(annualRent - per * (cheques - 1)) : per } })
}
/** RERA: landlord must give 90 days' written notice before expiry for rent increase or non-renewal. */
export function reraNoticeDeadline(expiryISO) { const d = new Date(expiryISO + 'T00:00:00Z'); d.setUTCDate(d.getUTCDate() - 90); return d.toISOString().slice(0, 10) }
export const GOLDEN_VISA_MIN_AED = 2000000
export const goldenVisa = propertyValue => ({ eligible: propertyValue >= GOLDEN_VISA_MIN_AED, shortfall: r2(Math.max(0, GOLDEN_VISA_MIN_AED - propertyValue)) })
export const USD_PEG = 3.6725
export const aedToUsd = v => r2(v / USD_PEG), usdToAed = v => r2(v * USD_PEG)

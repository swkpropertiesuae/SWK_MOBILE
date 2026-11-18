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

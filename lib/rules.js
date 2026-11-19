/** Company working hours: Mon–Fri closes 19:00, Sat 16:00, Sun holiday (matches SWK OS). */
export function closingHHMM(dayISO) { const dow = new Date(dayISO + 'T12:00:00Z').getUTCDay(); return dow === 0 ? null : dow === 6 ? '16:00' : '19:00' }

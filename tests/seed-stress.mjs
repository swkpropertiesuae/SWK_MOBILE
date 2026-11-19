// Creates worst-case records (very long words, Arabic, emoji, big numbers) on a TEST server so the layout audit sees dense, ugly data.
const API = process.env.SWK_API || 'http://localhost:8090', EMAIL = process.env.SWK_EMAIL || 'shabib@swk.properties', PW = process.env.SWK_PASSWORD
const H = { 'content-type': 'application/json', 'x-swk-client': 'android' }
const login = await (await fetch(API + '/api/auth/login', { method: 'POST', headers: H, body: JSON.stringify({ email: EMAIL, password: PW }) })).json()
const hd = { ...H, 'x-swk-session': login.sessionToken }
const post = async (p, b) => { const r = await fetch(API + p, { method: 'POST', headers: hd, body: JSON.stringify(b) }); const t = await r.json().catch(() => ({})); return { ok: r.ok, data: t } }
const LONG = 'Superlongunbrokenwordwithoutanyspacesthatshouldneverbreakthelayoutofanymobilescreenevenat320pixelswide'
const AR = 'شركة العقارات الدولية ذات المسؤولية المحدودة للتطوير والاستثمار العقاري في دبي'
const meta = await (await fetch(API + '/api/meta', { headers: hd })).json(); const ent = Object.fromEntries(meta.entities.map(e => [e.key, e]))
let made = 0
for (let i = 0; i < 4; i++) {
  const tag = [LONG, AR, 'Normal Name ' + i, 'Emoji 🏢🔑 ' + LONG.slice(0, 30)][i]
  const r = [
    await post('/api/e/leads', { company: tag + ' ' + i, contact_name: LONG.slice(0, 40), email: `${LONG.slice(0, 40)}@${LONG.slice(0, 30)}.example.com`, phone: '+971500000' + i, est_value: 123456789012, notes: (AR + ' ').repeat(12) }),
    await post('/api/e/parties', { name: tag + ' ' + Date.now() + i, is_customer: true, email: `${LONG.slice(0, 30)}@x.com`, notes: LONG.repeat(3) }),
    await post('/api/e/tasks', { title: tag + ' ' + LONG, kind: 'Follow-up', priority: 'High', due_date: '2026-12-01', description: (LONG + ' ').repeat(8) }),
    await post('/api/e/employees', { name: tag + ' ' + i, email: `emp${i}${Date.now()}@swk.properties`, designation: LONG.slice(0, 60), status: 'Active' }),
  ]
  made += r.filter(x => x.ok).length
}
console.log('stress records created:', made)

// Re-checks android/pins.json: root pins must equal the SPKI hash of the matching certificate in the system trust store.
import { readFileSync, readdirSync } from 'node:fs'; import { execFileSync } from 'node:child_process'
const f = JSON.parse(readFileSync('android/pins.json', 'utf8')), dir = '/etc/ssl/certs'
const spki = pem => execFileSync('sh', ['-c', `openssl x509 -in "${pem}" -noout -pubkey | openssl pkey -pubin -outform der | openssl dgst -sha256 -binary | openssl enc -base64`]).toString().trim()
const have = new Map(readdirSync(dir).filter(x => x.endsWith('.pem')).map(x => [spki(dir + '/' + x), x]))
let bad = 0
for (const p of f.pins) { const hit = have.get(p.pin); const root = /root/i.test(p.name); console.log((hit ? 'OK   ' : root ? 'MISS ' : 'n/a  ') + p.name + (hit ? ' = ' + hit : root ? ' (not in this system store)' : ' (intermediate: from CT log)')); if (root && !hit) bad++ }
if (!(Date.parse(f.expiration) > Date.now())) { console.log('EXPIRED pin-set'); bad++ }
process.exit(bad ? 1 : 0)

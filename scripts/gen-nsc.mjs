// Writes android network_security_config.xml. HTTPS only, system CAs only (user-installed CAs are NOT trusted).
// Pinning: SWK_SPKI_PINS="base64sha256,base64sha256" SWK_PIN_DOMAIN=os.swk.properties  (include a backup pin!). Without pins no pinning is applied.
import { writeFileSync } from 'node:fs'
const pins = (process.env.SWK_SPKI_PINS || '').split(',').map(s => s.trim()).filter(Boolean), dom = process.env.SWK_PIN_DOMAIN || 'os.swk.properties'
for (const p of pins) if (!/^[A-Za-z0-9+/]{43}=$/.test(p)) { console.error('Bad pin (expect base64 SHA-256 SPKI): ' + p); process.exit(1) }
if (pins.length === 1) { console.error('Provide at least two pins (current + backup) to avoid bricking the app on certificate rotation.'); process.exit(1) }
const exp = new Date(Date.now() + 365 * 864e5).toISOString().slice(0, 10)
const xml = `<?xml version="1.0" encoding="utf-8"?>
<network-security-config>
    <base-config cleartextTrafficPermitted="false"><trust-anchors><certificates src="system" /></trust-anchors></base-config>
${pins.length ? `    <domain-config cleartextTrafficPermitted="false">
        <domain includeSubdomains="false">${dom}</domain>
        <pin-set expiration="${exp}">${pins.map(p => `<pin digest="SHA-256">${p}</pin>`).join('')}</pin-set>
    </domain-config>
` : ''}</network-security-config>
`
writeFileSync('android/app/src/main/res/xml/network_security_config.xml', xml); console.log(pins.length ? `pinned ${dom} with ${pins.length} pins` : 'no pins configured (system CA trust only)')

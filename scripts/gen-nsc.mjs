// Writes android network_security_config.xml: HTTPS only, system CAs only (user-installed CAs are NOT trusted),
// plus SHA-256 SPKI pin-set for the API host from android/pins.json (override: SWK_SPKI_PINS="a=,b=" SWK_PIN_DOMAIN=host SWK_PIN_EXPIRY=YYYY-MM-DD).
import { readFileSync, writeFileSync } from 'node:fs'
export function buildNsc({ domain, expiration, pins }) {
  for (const p of pins) if (!/^[A-Za-z0-9+/]{43}=$/.test(p)) throw new Error('Bad pin (expect base64 SHA-256 SPKI): ' + p)
  if (pins.length && pins.length < 2) throw new Error('Provide at least two pins (primary + backup).')
  if (pins.length && !(Date.parse(expiration) > Date.now())) throw new Error('Pin-set expiration must be in the future: ' + expiration)
  return `<?xml version="1.0" encoding="utf-8"?>
<network-security-config>
    <base-config cleartextTrafficPermitted="false"><trust-anchors><certificates src="system" /></trust-anchors></base-config>
${pins.length ? `    <domain-config cleartextTrafficPermitted="false">
        <domain includeSubdomains="false">${domain}</domain>
        <pin-set expiration="${expiration}">
${pins.map(p => `            <pin digest="SHA-256">${p}</pin>`).join('\n')}
        </pin-set>
    </domain-config>
` : ''}</network-security-config>
`
}
if (process.argv[1].endsWith('gen-nsc.mjs')) {
  const f = JSON.parse(readFileSync('android/pins.json', 'utf8')), env = process.env.SWK_SPKI_PINS
  const cfg = { domain: process.env.SWK_PIN_DOMAIN || f.domain, expiration: process.env.SWK_PIN_EXPIRY || f.expiration, pins: env !== undefined ? env.split(',').map(s => s.trim()).filter(Boolean) : f.pins.map(p => p.pin) }
  writeFileSync('android/app/src/main/res/xml/network_security_config.xml', buildNsc(cfg))
  console.log(cfg.pins.length ? `pinned ${cfg.domain} with ${cfg.pins.length} pins (expires ${cfg.expiration})` : 'no pins (system CA trust only)')
}

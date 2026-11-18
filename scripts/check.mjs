// Static quality gate: syntax, CSP-safe markup, no leftover sample data.
import { readdirSync, readFileSync, statSync } from 'node:fs'; import { join } from 'node:path'; import { execFileSync } from 'node:child_process'
const files = d => readdirSync(d).flatMap(f => { const p = join(d, f); return f === 'node_modules' || f === '.git' ? [] : statSync(p).isDirectory() ? files(p) : [p] })
let bad = 0; const fail = m => { console.error('FAIL', m); bad++ }
for (const f of files('.').filter(f => /\.(js|mjs)$/.test(f))) { try { execFileSync(process.execPath, ['--check', f], { stdio: 'pipe' }) } catch (e) { fail('syntax ' + f) } }
for (const f of files('.').filter(f => /\.(js|html)$/.test(f) && !f.startsWith('tests') && !f.startsWith('scripts'))) {
  const s = readFileSync(f, 'utf8')
  if (/\son(click|submit|input|change|load)\s*=/.test(s)) fail('inline handler in ' + f)
  if (/\beval\(|new Function\(/.test(s)) fail('eval in ' + f)
}
if (files('.').some(f => /(^|\/)data\.js$/.test(f))) fail('data.js (sample data) present')
if (bad) process.exit(1); console.log('check ok')

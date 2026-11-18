// Copies the static app into www/ for Capacitor.
import { cpSync, rmSync, mkdirSync } from 'node:fs'
rmSync('www', { recursive: true, force: true }); mkdirSync('www')
for (const p of ['index.html', 'config.js', 'app.js', 'style.css', 'manifest.webmanifest', 'sw.js', 'lib', 'views', 'assets']) cpSync(p, 'www/' + p, { recursive: true })
console.log('www ready')

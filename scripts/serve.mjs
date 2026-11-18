// Minimal static server with production security headers. Usage: PORT=5173 node scripts/serve.mjs
import http from 'node:http'; import { readFile, stat } from 'node:fs/promises'; import { extname, join, normalize } from 'node:path'; import { fileURLToPath } from 'node:url'
const root = join(fileURLToPath(import.meta.url), '..', '..'), port = +process.env.PORT || 5173
const T = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css', '.json': 'application/json', '.webmanifest': 'application/manifest+json', '.png': 'image/png', '.webp': 'image/webp', '.svg': 'image/svg+xml', '.woff2': 'font/woff2' }
const H = { 'x-content-type-options': 'nosniff', 'x-frame-options': 'DENY', 'referrer-policy': 'no-referrer', 'permissions-policy': 'camera=(), microphone=(), geolocation=(self)', 'cross-origin-opener-policy': 'same-origin', 'strict-transport-security': 'max-age=63072000; includeSubDomains' }
http.createServer(async (q, s) => {
  try {
    let p = normalize(decodeURIComponent(new URL(q.url, 'http://x').pathname)).replace(/^(\.\.[/\\])+/, ''); if (p.endsWith('/')) p += 'index.html'
    let f = join(root, p); if (!f.startsWith(root) || /\/(tests|scripts|\.git|node_modules)\//.test(p) || /package\.json$/.test(p)) throw 0
    try { if ((await stat(f)).isDirectory()) f = join(f, 'index.html') } catch { f = join(root, 'index.html') }
    const b = await readFile(f); s.writeHead(200, { ...H, 'content-type': T[extname(f)] || 'application/octet-stream', 'cache-control': f.endsWith('sw.js') || f.endsWith('index.html') ? 'no-cache' : 'public, max-age=3600' }); s.end(b)
  } catch { s.writeHead(404, H); s.end('Not found') }
}).listen(port, () => console.log('SWK OS Mobile on http://localhost:' + port))

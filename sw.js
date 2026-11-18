// App-shell cache only. API calls (any cross-origin or /api path) are never cached: business data must not persist on the device.
const C = 'swk-shell-v3'
const SHELL = ['./', 'index.html', 'style.css', 'config.js', 'app.js', 'manifest.webmanifest', 'lib/html.js', 'lib/api.js', 'lib/format.js', 'lib/calc.js', 'lib/ui.js', 'lib/state.js', 'lib/nav.js', 'lib/routes.js', 'lib/native.js', 'views/ops.js', 'views/auth.js', 'views/launcher.js', 'views/entity.js', 'views/pages.js', 'views/ops.js', 'assets/brand/logo-horizontal.png', 'assets/brand/hero.webp', 'assets/icons/192.png', 'assets/fonts/plus-jakarta-sans.woff2', 'assets/fonts/instrument-sans.woff2']
addEventListener('install', e => { skipWaiting(); e.waitUntil(caches.open(C).then(c => c.addAll(SHELL))) })
addEventListener('activate', e => e.waitUntil(caches.keys().then(k => Promise.all(k.filter(x => x !== C).map(x => caches.delete(x)))).then(() => clients.claim())))
addEventListener('fetch', e => {
  const u = new URL(e.request.url)
  if (e.request.method !== 'GET' || u.origin !== location.origin || u.pathname.startsWith('/api/')) return
  e.respondWith(fetch(e.request).then(r => { if (r.ok) { const cp = r.clone(); caches.open(C).then(c => c.put(e.request, cp)) } return r }).catch(() => caches.match(e.request).then(r => r || caches.match('index.html'))))
})

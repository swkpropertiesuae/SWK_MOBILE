const C='swk-v2';
addEventListener('install',e=>{skipWaiting();e.waitUntil(fetch('sw-files.json').then(r=>r.json()).then(f=>caches.open(C).then(c=>c.addAll(f))).catch(()=>{}))});
addEventListener('activate',e=>e.waitUntil(caches.keys().then(k=>Promise.all(k.filter(x=>x!==C).map(x=>caches.delete(x))))));
addEventListener('fetch',e=>e.respondWith(caches.match(e.request).then(r=>r||fetch(e.request))));

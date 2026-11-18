const C='swk-v1',F=['./','index.html','style.css','app.js','calc.js','data.js','manifest.webmanifest','icons/192.png'];
addEventListener('install',e=>e.waitUntil(caches.open(C).then(c=>c.addAll(F))));
addEventListener('activate',e=>e.waitUntil(caches.keys().then(k=>Promise.all(k.filter(x=>x!==C).map(x=>caches.delete(x))))));
addEventListener('fetch',e=>e.respondWith(caches.match(e.request).then(r=>r||fetch(e.request))));

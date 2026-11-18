// Cache installation artwork only. Multiplayer requests always use the network.
const CACHE='breakout-beasts-icons-v1';
self.addEventListener('install',e=>{e.waitUntil(caches.open(CACHE).then(c=>c.addAll(['/assets/app-icon-192.png','/assets/app-icon-512.png','/assets/app-icon-180.png'])));self.skipWaiting();});
self.addEventListener('activate',e=>e.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k.startsWith('breakout-beasts-icons-')&&k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim())));
self.addEventListener('fetch',e=>{const u=new URL(e.request.url);if(u.origin===self.location.origin&&u.pathname.startsWith('/assets/app-icon-'))e.respondWith(caches.match(e.request).then(r=>r||fetch(e.request)));});

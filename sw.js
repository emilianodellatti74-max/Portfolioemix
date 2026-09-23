const CACHE = 'portfolioemix-v1';
const CORE = ['./', './index.html', './manifest.json', './icon-192.png', './icon-512.png'];
const CDN = ['https://cdnjs.cloudflare.com/ajax/libs/Chart.js/4.4.1/chart.umd.min.js'];
const API = ['finnhub.io', 'alphavantage.co', 'frankfurter.app', 'frankfurter.dev'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(async c => {
    await c.addAll(CORE);
    for (const u of CDN) { try { await c.add(u); } catch (_) {} }
  }).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(caches.keys()
    .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
    .then(() => self.clients.claim()));
});

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (API.some(h => url.hostname.endsWith(h))) return; // prezzi sempre dalla rete

  if (req.mode === 'navigate' || (url.origin === location.origin && url.pathname.endsWith('.html'))) {
    // pagina: prima la rete (aggiornamenti), poi la copia salvata
    e.respondWith(fetch(req).then(r => {
      const copy = r.clone(); caches.open(CACHE).then(c => c.put('./index.html', copy)); return r;
    }).catch(() => caches.match('./index.html')));
    return;
  }
  // resto (icone, Chart.js, font): prima la copia salvata
  e.respondWith(caches.match(req).then(hit => hit || fetch(req).then(r => {
    if (r.ok || r.type === 'opaque') { const copy = r.clone(); caches.open(CACHE).then(c => c.put(req, copy)); }
    return r;
  })));
});

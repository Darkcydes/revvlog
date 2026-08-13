/* RevvLog — service worker
   The page itself is network-first so a new build always reaches you; the static
   assets around it stay cache-first so the PWA still opens instantly and works
   fully offline. Bump CACHE when an asset in ASSETS changes — index.html no
   longer needs it, because a stale shell was the one thing you couldn't refresh
   your way out of. */
const CACHE = 'revv-v2';
const ASSETS = [
  './', './index.html', './manifest.json', './icon.svg',
  './apple-touch-icon.png', './icon-192-v3.png', './icon-512-v3.png',
  './logo-mark.svg',
  './onboarding/mileage.png', './onboarding/range.png', './onboarding/garage.png'
];

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE)
      .then((c) => c.addAll(ASSETS).catch(() => {})) // don't fail install if an optional asset 404s
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  // The beta backend is never cached: usage events (POST) and the kill-switch
  // (GET) must reach the network so a revoked or extended window is honoured
  // rather than served stale from cache. Let the browser handle these directly.
  if (req.url.indexOf('supabase.co') !== -1) return;
  if (req.method !== 'GET') return;

  // Page loads go to the network first and only fall back to the cached shell when
  // that fails. Costs one round trip on open; buys you never being stranded on an
  // old build with no way to refresh out of it.
  if (req.mode === 'navigate') {
    e.respondWith(
      fetch(req).then((res) => {
        const copy = res.clone();
        caches.open(CACHE).then((c) => c.put('./index.html', copy)).catch(() => {});
        return res;
      }).catch(() => caches.match(req).then((hit) => hit || caches.match('./index.html')))
    );
    return;
  }

  // Icons, the silhouettes, the web fonts — versioned or effectively immutable,
  // so serve them from the cache and backfill on first miss.
  e.respondWith(
    caches.match(req).then((hit) => {
      if (hit) return hit;
      return fetch(req).then((res) => {
        // Cache successful & opaque (cross-origin, e.g. Google Fonts) responses for offline use.
        const copy = res.clone();
        caches.open(CACHE).then((c) => c.put(req, copy)).catch(() => {});
        return res;
      });
    })
  );
});

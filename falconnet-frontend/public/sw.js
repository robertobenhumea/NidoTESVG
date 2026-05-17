/* FalconNet Service Worker — v3 */

const CACHE_VERSION = 'fn-v3';
const STATIC_CACHE  = `${CACHE_VERSION}-static`;
const IMAGE_CACHE   = `${CACHE_VERSION}-images`;
const ALL_CACHES    = [STATIC_CACHE, IMAGE_CACHE];

const PRECACHE_URLS = [
  '/offline.html',
  '/manifest.json',
];

/* ── Install ── */
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE)
      .then((cache) => cache.addAll(PRECACHE_URLS))
      .then(() => self.skipWaiting()),
  );
});

/* ── Activate — purge old caches ── */
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(
        keys
          .filter((k) => !ALL_CACHES.includes(k))
          .map((k) => caches.delete(k)),
      ))
      .then(() => self.clients.claim()),
  );
});

/* ── Fetch ── */
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  /* Skip: non-GET, cross-origin API calls, Next.js internals */
  if (request.method !== 'GET') return;
  if (url.pathname.startsWith('/api/'))      return;
  if (url.pathname.startsWith('/_next/data')) return;
  if (url.hostname !== location.hostname)    return;

  /* Images — cache-first, 7 day max */
  if (request.destination === 'image') {
    event.respondWith(cacheFirst(request, IMAGE_CACHE, 200));
    return;
  }

  /* Next.js static assets (hashed) — cache-first */
  if (url.pathname.startsWith('/_next/static/')) {
    event.respondWith(cacheFirst(request, STATIC_CACHE, 500));
    return;
  }

  /* HTML navigation — network-first, offline fallback */
  if (request.mode === 'navigate') {
    event.respondWith(networkFirst(request));
    return;
  }

  /* Everything else — stale-while-revalidate */
  event.respondWith(staleWhileRevalidate(request, STATIC_CACHE));
});

/* ────── Strategies ────── */

async function cacheFirst(request, cacheName, maxEntries) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);
  if (cached) return cached;

  try {
    const response = await fetch(request);
    if (response.ok) {
      await trimCache(cache, maxEntries);
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    return new Response('Offline', { status: 503 });
  }
}

async function networkFirst(request) {
  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(STATIC_CACHE);
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    const cached = await caches.match(request);
    return cached ?? caches.match('/offline.html');
  }
}

async function staleWhileRevalidate(request, cacheName) {
  const cache  = await caches.open(cacheName);
  const cached = await cache.match(request);

  const fetchPromise = fetch(request).then((response) => {
    if (response.ok) cache.put(request, response.clone());
    return response;
  }).catch(() => null);

  return cached ?? fetchPromise ?? new Response('Offline', { status: 503 });
}

async function trimCache(cache, maxEntries) {
  const keys = await cache.keys();
  if (keys.length >= maxEntries) {
    await cache.delete(keys[0]);
  }
}

/* ── Push notifications ── */
self.addEventListener('push', (event) => {
  let data = { title: 'FalconNet', body: 'Tienes una nueva notificación' };
  try { data = event.data?.json() ?? data; } catch { /* non-JSON */ }

  event.waitUntil(
    self.registration.showNotification(data.title, {
      body:    data.body,
      icon:    '/icons/icon-192.png',
      badge:   '/icons/icon-72.png',
      tag:     data.tag ?? 'falconnet',
      data:    data.url ? { url: data.url } : undefined,
      vibrate: [100, 50, 100],
    }),
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = event.notification.data?.url ?? '/notifications';
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((list) => {
      const existing = list.find((c) => c.url === url && 'focus' in c);
      return existing ? existing.focus() : clients.openWindow(url);
    }),
  );
});

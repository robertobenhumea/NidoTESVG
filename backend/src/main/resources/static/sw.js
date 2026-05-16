const CACHE_VER = 'nido-v3';
const CACHE_STATIC = CACHE_VER + '-static';
const CACHE_PAGES  = CACHE_VER + '-pages';
const CACHE_IMGS   = CACHE_VER + '-imgs';

const PRECACHE = [
  '/offline.html',
  '/nido-tokens.css',
  '/nido-ui.css',
  '/nido-animations.css',
  '/nido-components.css',
  '/nido-layout.css',
  '/nido-nav.css',
  '/nido-ui.js',
  '/nido-layout.js',
  '/nido-notif.js',
  '/nido-pwa.js',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
  '/icons/maskable-icon-192.png',
  '/icons/maskable-icon-512.png',
  '/icons/icon.svg',
  '/icons/maskable-icon.svg',
];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE_STATIC)
      .then(c => c.addAll(PRECACHE))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys
          .filter(k => k.startsWith('nido-') && !k.startsWith(CACHE_VER))
          .map(k => caches.delete(k))
      )
    ).then(() => self.clients.claim())
  );
});

function isAPI(url)    { return url.pathname.startsWith('/api/'); }
function isStatic(url) { return /\.(css|js|svg|woff2?|ttf|otf)$/i.test(url.pathname); }
function isImage(url)  { return /\.(png|jpe?g|webp|gif|ico|avif)$/i.test(url.pathname); }
function isHTML(url)   { return url.pathname.endsWith('.html') || url.pathname === '/' || url.pathname === ''; }

self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;

  const url = new URL(e.request.url);

  if (url.origin !== self.location.origin) return;

  if (isAPI(url)) {
    return;
  }

  if (isStatic(url)) {
    e.respondWith(cacheFirst(e.request, CACHE_STATIC));
    return;
  }

  if (isImage(url)) {
    e.respondWith(staleWhileRevalidate(e.request, CACHE_IMGS));
    return;
  }

  if (isHTML(url)) {
    e.respondWith(networkFirstHTML(e.request));
    return;
  }

  e.respondWith(networkFirst(e.request, CACHE_PAGES));
});

async function cacheFirst(req, cacheName) {
  const cached = await caches.match(req);
  if (cached) return cached;
  try {
    const res = await fetch(req);
    if (res.ok) {
      const c = await caches.open(cacheName);
      c.put(req, res.clone());
    }
    return res;
  } catch {
    return new Response('Not found', { status: 404 });
  }
}

async function staleWhileRevalidate(req, cacheName) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(req);
  const fetchPromise = fetch(req).then(res => {
    if (res.ok) cache.put(req, res.clone());
    return res;
  }).catch(() => null);
  return cached || await fetchPromise || new Response('', { status: 404 });
}

async function networkFirst(req, cacheName) {
  try {
    const res = await fetch(req);
    if (res.ok) {
      const c = await caches.open(cacheName);
      c.put(req, res.clone());
    }
    return res;
  } catch {
    const cached = await caches.match(req);
    return cached || new Response('Not found', { status: 404 });
  }
}

async function networkFirstHTML(req) {
  try {
    const res = await fetch(req);
    if (res.ok) {
      const c = await caches.open(CACHE_PAGES);
      c.put(req, res.clone());
    }
    return res;
  } catch {
    const cached = await caches.match(req);
    if (cached) return cached;
    const offline = await caches.match('/offline.html');
    return offline || new Response('<h1>Sin conexión</h1>', {
      status: 200,
      headers: { 'Content-Type': 'text/html; charset=utf-8' }
    });
  }
}

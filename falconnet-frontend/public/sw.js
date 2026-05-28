const CACHE_NAME = 'falconnet-shell-v5';
const RUNTIME_CACHE = 'falconnet-runtime-v5';
const APP_SHELL = [
  '/manifest.json',
  '/icons/icon.svg',
  '/icons/icon-maskable.svg',
  '/offline.html',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(APP_SHELL).catch(() => undefined))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((key) => ![CACHE_NAME, RUNTIME_CACHE].includes(key)).map((key) => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const request = event.request;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request, { cache: 'no-store' })
        .then((response) => {
          const copy = response.clone();
          caches.open(RUNTIME_CACHE).then((cache) => cache.put(request, copy));
          return response;
        })
        .catch(() => caches.match(request).then((cached) => cached || caches.match('/offline.html')))
    );
    return;
  }

  if (url.pathname.startsWith('/_next/static/') || url.pathname.startsWith('/icons/') || url.pathname.startsWith('/images/')) {
    event.respondWith(
      caches.match(request).then((cached) => cached || fetch(request).then((response) => {
        const copy = response.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
        return response;
      }))
    );
  }
});

self.addEventListener('push', (event) => {
  let data = {};
  try { data = event.data ? event.data.json() : {}; } catch { data = { title: 'FalconNet', body: event.data?.text() }; }
  const type = data.type || 'general';
  const isMail = type === 'mail';
  const title = data.title || 'FalconNet';
  const url = data.url || (isMail ? '/correos?tab=entrada' : '/messages');
  const tag = data.tag || (isMail ? 'falconnet-mail' : 'falconnet-chat');
  const options = {
    body: data.body || (isMail ? 'Nuevo correo institucional' : 'Nuevo mensaje'),
    icon: '/icons/icon.svg',
    badge: '/icons/icon-maskable.svg',
    data: { url, correoId: data.correoId || null, type },
    tag,
    renotify: isMail,
  };
  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const notifData = event.notification.data || {};
  const correoId = notifData.correoId;
  let target = notifData.url || '/messages';
  if (notifData.type === 'mail') {
    target = correoId
      ? `/correos?tab=entrada&correoId=${correoId}`
      : '/correos?tab=entrada';
  }
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clients) => {
      const falconClient = clients.find((c) => new URL(c.url).pathname.startsWith('/'));
      if (falconClient && 'focus' in falconClient) {
        falconClient.navigate(target);
        return falconClient.focus();
      }
      return self.clients.openWindow(target);
    })
  );
});

self.addEventListener('sync', (event) => {
  if (event.tag === 'falconnet-chat-sync') {
    event.waitUntil(self.clients.matchAll({ includeUncontrolled: true }).then((clients) => {
      clients.forEach((client) => client.postMessage({ type: 'FALCONNET_CHAT_SYNC' }));
    }));
  }
});

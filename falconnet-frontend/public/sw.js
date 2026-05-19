/* FalconNet Service Worker — nuclear self-destruct v2 */
self.addEventListener('install', () => self.skipWaiting());

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      // 1. Take control of all open tabs immediately
      await self.clients.claim();

      // 2. Wipe every cache
      const keys = await caches.keys();
      await Promise.all(keys.map((k) => caches.delete(k)));

      // 3. Tell every tab to hard-reload BEFORE unregistering
      const clients = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
      clients.forEach((c) => c.navigate(c.url));

      // 4. Unregister self so no future fetches are intercepted
      await self.registration.unregister();
    })()
  );
});

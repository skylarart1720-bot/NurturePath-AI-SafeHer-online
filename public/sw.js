const CACHE = 'np-safe-shell-v6-safeher-reviewed';
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE).then(async (cache) => {
      await cache.addAll([
        '/offline',
        '/brand/safeher.svg',
        '/manifest.webmanifest',
        '/fonts/inter-latin.woff2',
      ]);
      const shell = await cache.match('/offline');
      const html = shell ? await shell.text() : '';
      // Prefetch only same-origin build assets required to hydrate the public offline shell.
      const paths = [...html.matchAll(/(?:src|href)="(\/_next\/static\/[^"\s]+)"/g)].map((match) =>
        match[1].replaceAll('&amp;', '&'),
      );
      await cache.addAll([...new Set(paths)]);
    }),
  );
  self.skipWaiting();
});
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => key.startsWith('np-safe-shell-') && key !== CACHE)
            .map((key) => caches.delete(key)),
        ),
      )
      .then(() => self.clients.claim()),
  );
});
self.addEventListener('fetch', (event) => {
  const request = event.request,
    url = new URL(request.url);
  if (
    request.method !== 'GET' ||
    url.origin !== self.location.origin ||
    url.pathname.startsWith('/api/')
  )
    return;
  // Never cache personalized dashboard HTML, API responses, or React server-component responses.
  if (request.headers.get('RSC') || url.searchParams.has('_rsc')) return;
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request).catch(async () => (await caches.match('/offline')) || Response.error()),
    );
    return;
  }
  if (
    url.pathname.startsWith('/_next/static/') ||
    url.pathname.startsWith('/brand/') ||
    url.pathname.startsWith('/fonts/') ||
    url.pathname === '/manifest.webmanifest'
  ) {
    event.respondWith(
      caches.match(request).then(
        (hit) =>
          hit ||
          fetch(request).then((response) => {
            if (response.ok) {
              const copy = response.clone();
              event.waitUntil(caches.open(CACHE).then((cache) => cache.put(request, copy)));
            }
            return response;
          }),
      ),
    );
  }
});

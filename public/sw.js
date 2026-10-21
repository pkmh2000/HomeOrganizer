// HomeOrganizer PWA Service Worker (Supports GitHub Pages subpaths & custom domains)
const CACHE_NAME = 'homeorganizer-gh-pages-v4';

const RELATIVE_ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './icon.svg',
  './pwa-192x192.png',
  './pwa-512x512.png',
  './pwa-maskable-512x512.png',
  './apple-touch-icon.png',
  './favicon.ico',
];

// Install: precache relative to scope
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      // Map to full URL under this scope
      const urlsToCache = RELATIVE_ASSETS.map((p) => new URL(p, self.registration.scope).toString());
      return cache.addAll(urlsToCache).catch((err) => {
        console.warn('Precaching assets error:', err);
      });
    })
  );
  self.skipWaiting();
});

// Activate: clean up outdated caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((cacheName) => cacheName !== CACHE_NAME)
          .map((cacheName) => caches.delete(cacheName))
      );
    })
  );
  self.clients.claim();
});

// Fetch: Stale-While-Revalidate and navigation fallback
self.addEventListener('fetch', (event) => {
  const { request } = event;

  // Skip non-GET requests or server API calls
  if (request.method !== 'GET' || request.url.includes('/api/')) {
    return;
  }

  // Navigation requests (HTML)
  if (request.mode === 'navigate') {
    const scopeIndexUrl = new URL('./index.html', self.registration.scope).toString();
    const scopeRootUrl = self.registration.scope;

    event.respondWith(
      fetch(request).catch(() => {
        return (
          caches.match(request) ||
          caches.match(scopeIndexUrl) ||
          caches.match(scopeRootUrl)
        );
      })
    );
    return;
  }

  // Assets: Stale-While-Revalidate
  event.respondWith(
    caches.match(request).then((cachedResponse) => {
      const fetchPromise = fetch(request)
        .then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            const clone = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(request, clone);
            });
          }
          return networkResponse;
        })
        .catch(() => cachedResponse);

      return cachedResponse || fetchPromise;
    })
  );
});

// Message listener for skipWaiting trigger
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

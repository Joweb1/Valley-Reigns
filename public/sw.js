const CACHE_NAME = 'valley-reigns-cache-v1';
const ASSETS_TO_CACHE = [
  '/',
  '/index.html',
  '/manifest.json',
  '/icon.svg',
  '/src/main.tsx',
  '/src/App.tsx',
  '/src/index.css'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS_TO_CACHE);
    }).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cache) => {
          if (cache !== CACHE_NAME) {
            return caches.delete(cache);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  // Only intercept GET requests and non-extension requests
  if (event.request.method !== 'GET' || event.request.url.startsWith('chrome-extension:')) {
    return;
  }

  // Skip intercepting for external identity/database APIs
  if (
    event.request.url.includes('firestore.googleapis.com') ||
    event.request.url.includes('identitytoolkit.googleapis.com') ||
    event.request.url.includes('/api/')
  ) {
    event.respondWith(fetch(event.request));
    return;
  }

  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      if (cachedResponse) {
        // Stale-while-revalidate for static files
        fetch(event.request).then((networkResponse) => {
          if (networkResponse.status === 200) {
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, networkResponse));
          }
        }).catch(() => {/* Ignore network errors during background updates */});
        
        return cachedResponse;
      }

      return fetch(event.request).then((networkResponse) => {
        // Cache static bundles on demand
        if (
          networkResponse.status === 200 &&
          (event.request.url.includes('.js') ||
           event.request.url.includes('.css') ||
           event.request.url.includes('.svg') ||
           event.request.url.includes('.png') ||
           event.request.url.includes('/assets/'))
        ) {
          const responseClone = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, responseClone));
        }
        return networkResponse;
      }).catch(() => {
        // Fallback for document navigations
        if (event.request.mode === 'navigate') {
          return caches.match('/');
        }
      });
    })
  );
});

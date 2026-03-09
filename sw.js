const CACHE_NAME = 'rc-fit-cache-v1';
const URLS_TO_CACHE = [
  './',
  './index.html',
  './manifest.json'
];

// Install Event: Cache core shell
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(URLS_TO_CACHE))
  );
  self.skipWaiting();
});

// Activate Event: Clean up old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// Fetch Event: Cache First, Network Fallback Strategy
self.addEventListener('fetch', (event) => {
  // Only handle GET requests (Firestore POST/WebSockets are handled by Firebase directly)
  if (event.request.method !== 'GET') return;

  event.respondWith(
    caches.match(event.request)
      .then((response) => {
        // Return cached response if found
        if (response) {
          return response;
        }

        // Fetch from network if not in cache
        return fetch(event.request).then((networkResponse) => {
          // Verify response is valid before caching
          if (!networkResponse || networkResponse.status !== 200 || networkResponse.type !== 'basic') {
            return networkResponse;
          }

          // Cache the new resource for future offline use (e.g., CDN scripts, React)
          const responseClone = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseClone);
          });

          return networkResponse;
        }).catch(() => {
          // Optional: Return a fallback UI if both cache and network fail
          // This is useful if the user loses Wi-Fi mid-workout and refreshes
          console.warn('Network request failed and no cache available for:', event.request.url);
        });
      })
  );
});
const CACHE_NAME = 'cricket-closet-erp-cache-v1';
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json'
];

// Perform install state: Pre-cache core shell parts
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[Service Worker] Pre-caching Core ERP Shell');
      return cache.addAll(STATIC_ASSETS);
    }).then(() => self.skipWaiting())
  );
});

// Activate state: Clean old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            console.log('[Service Worker] Purging Stale Cache:', key);
            return caches.delete(key);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Fetch Interception: Robust fallback caching
self.addEventListener('fetch', (event) => {
  const requestUrl = new URL(event.request.url);

  // Bypass Google Firestore stream/rest endpoints so Firebase SDK handles offline syncing natively
  if (
    requestUrl.hostname.includes('firestore.googleapis.com') ||
    requestUrl.hostname.includes('firebaseinstallations.googleapis.com') ||
    requestUrl.hostname.includes('identitytoolkit.googleapis.com') ||
    requestUrl.pathname.startsWith('/api/')
  ) {
    return; // Pass through to raw network sync
  }

  // Handle local assets (Shell/Dynamic Bundles) or images (Unsplash / gloves)
  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      if (cachedResponse) {
        // Fetch fresh copy in the background to keep cached assets fresh (Stale-While-Revalidate)
        fetch(event.request)
          .then((networkResponse) => {
            if (networkResponse.status === 200) {
              caches.open(CACHE_NAME).then((cache) => cache.put(event.request, networkResponse));
            }
          })
          .catch(() => { /* Silent failure - offline fallback */ });

        return cachedResponse;
      }

      // Network First strategy for unmatched resources
      return fetch(event.request)
        .then((networkResponse) => {
          if (!networkResponse || networkResponse.status !== 200 || networkResponse.type !== 'basic') {
            return networkResponse;
          }

          const responseToCache = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            // Cache page assets, styles, fonts, and static files
            if (
              requestUrl.pathname.endsWith('.js') ||
              requestUrl.pathname.endsWith('.css') ||
              requestUrl.pathname.endsWith('.png') ||
              requestUrl.pathname.endsWith('.jpg') ||
              requestUrl.pathname.endsWith('.woff2') ||
              requestUrl.hostname.includes('unsplash.com') ||
              requestUrl.hostname.includes('icons8.com')
            ) {
              cache.put(event.request, responseToCache);
            }
          });

          return networkResponse;
        })
        .catch(() => {
          // If HTML request failed, return index.html cache fallback
          if (event.request.mode === 'navigate') {
            return caches.match('/');
          }
        });
    })
  );
});

// Intercept push events (PWA Notifications)
self.addEventListener('push', (event) => {
  const payload = event.data ? event.data.text() : 'Cricket Closet Alert';
  event.waitUntil(
    self.registration.showNotification('Cricket Closet ERP Hub', {
      body: payload,
      icon: 'https://img.icons8.com/color/192/cricket-glove.png',
      badge: 'https://img.icons8.com/color/96/cricket-glove.png',
      vibrate: [200, 100, 200]
    })
  );
});

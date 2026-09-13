/* ==========================================================================
   FinTrack — sw.js
   Service Worker for offline support and asset caching.
   ========================================================================== */

const CACHE_NAME = 'fintrack-v2.1';

const STATIC_ASSETS = [
  './',
  'index.html',
  'transactions.html',
  'budgets.html',
  'reports.html',
  'settings.html',
  'auth.html',
  'manifest.json',
  'css/style.css',
  'css/dashboard.css',
  'css/transactions.css',
  'css/budgets.css',
  'css/reports.css',
  'css/settings.css',
  'css/responsive.css',
  'js/storage.js',
  'js/app.js',
  'js/dashboard.js',
  'js/transactions.js',
  'js/budgets.js',
  'js/reports.js',
  'js/settings.js',
  'js/auth.js',
  'https://cdn.jsdelivr.net/npm/chart.js@4.4.1/dist/chart.umd.min.js',
  'https://cdn.jsdelivr.net/npm/animejs@3.2.1/lib/anime.min.js',
  'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS).catch((err) => {
        console.warn('[ServiceWorker] Some assets could not be pre-cached:', err);
      });
    }).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
      );
    }).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const request = event.request;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);

  // Bypass external API calls (e.g. Disify email verification)
  if (url.hostname.includes('disify.com')) {
    return;
  }

  event.respondWith(
    caches.match(request).then((cachedResponse) => {
      if (cachedResponse) {
        // Fetch and update cache in background (Stale-While-Revalidate)
        fetch(request).then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            caches.open(CACHE_NAME).then((cache) => cache.put(request, networkResponse));
          }
        }).catch(() => {/* offline */});
        return cachedResponse;
      }

      return fetch(request).then((networkResponse) => {
        if (!networkResponse || networkResponse.status !== 200 || networkResponse.type === 'opaque') {
          return networkResponse;
        }
        const responseClone = networkResponse.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(request, responseClone));
        return networkResponse;
      }).catch(() => {
        // Fallback to index.html for navigation requests when offline
        if (request.mode === 'navigate') {
          return caches.match('index.html');
        }
      });
    })
  );
});

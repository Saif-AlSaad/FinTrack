/* ==========================================================================
   FinTrack — sw.js
   Service Worker for offline support and asset caching.
   Uses Network-First for local HTML/CSS/JS so new releases show instantly.
   ========================================================================== */

const CACHE_NAME = 'fintrack-v2.8';

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
  'js/vendor/html2pdf.bundle.min.js',
  'https://cdn.jsdelivr.net/npm/chart.js@4.4.1/dist/chart.umd.min.js',
  'https://cdn.jsdelivr.net/npm/animejs@3.2.1/lib/anime.min.js',
  'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500;600;700&family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap'
];

self.addEventListener('install', (event) => {
  // Immediately take over to prevent stale caches
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS).catch((err) => {
        console.warn('[ServiceWorker] Pre-cache partial warning:', err);
      });
    })
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.filter((key) => key !== CACHE_NAME).map((key) => {
          console.log('[ServiceWorker] Removing obsolete cache:', key);
          return caches.delete(key);
        })
      );
    }).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const request = event.request;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);

  // Bypass external APIs
  if (url.hostname.includes('disify.com')) {
    return;
  }

  // Network-First for local assets and HTML navigations so code updates show immediately
  const isLocal = url.origin === location.origin || request.mode === 'navigate';

  if (isLocal) {
    event.respondWith(
      fetch(request)
        .then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            const clone = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
          }
          return networkResponse;
        })
        .catch(() => {
          return caches.match(request).then((cached) => {
            if (cached) return cached;
            if (request.mode === 'navigate') return caches.match('index.html');
          });
        })
    );
    return;
  }

  // Cache-First / Stale-While-Revalidate for external fonts and CDN scripts
  event.respondWith(
    caches.match(request).then((cachedResponse) => {
      if (cachedResponse) {
        fetch(request).then((networkResponse) => {
          if (networkResponse && (networkResponse.status === 200 || networkResponse.type === 'opaque')) {
            caches.open(CACHE_NAME).then((cache) => cache.put(request, networkResponse));
          }
        }).catch(() => {});
        return cachedResponse;
      }

      return fetch(request).then((networkResponse) => {
        if (!networkResponse || (networkResponse.status !== 200 && networkResponse.type !== 'opaque')) {
          return networkResponse;
        }
        const responseClone = networkResponse.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(request, responseClone));
        return networkResponse;
      });
    })
  );
});

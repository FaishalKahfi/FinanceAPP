/* ============================================
   FinanceKu - Service Worker
   ============================================ */

const CACHE_NAME = 'financeku-v2';

const STATIC_ASSETS = [
  './',
  './index.html',
  './css/style.css',
  './js/db.js',
  './js/auth.js',
  './js/ui.js',
  './js/dashboard.js',
  './js/income.js',
  './js/expense.js',
  './js/category.js',
  './js/account.js',
  './js/report.js',
  './js/export.js',
  './js/app.js',
  './manifest.json',
  './icons/icon-192.png',
  './icons/icon-512.png'
];

const CDN_ASSETS = [
  'https://unpkg.com/dexie@3.2.4/dist/dexie.js',
  'https://cdn.jsdelivr.net/npm/chart.js@4.4.1/dist/chart.umd.min.js',
  'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css',
  'https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js',
  'https://cdn.sheetjs.com/xlsx-0.20.1/package/dist/xlsx.full.min.js',
  'https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap'
];

// Install: Cache all static & CDN assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(async (cache) => {
      // Cache static assets
      await cache.addAll(STATIC_ASSETS);

      // Cache CDN assets (best effort)
      for (const url of CDN_ASSETS) {
        try {
          await cache.add(url);
        } catch (err) {
          console.warn(`[SW] Failed to cache CDN asset: ${url}`, err);
        }
      }

      console.log('[SW] All assets cached');
    })
  );
  self.skipWaiting();
});

// Activate: Clean up old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key))
      );
    })
  );
  self.clients.claim();
});

// Fetch: Cache-first for static, network-first for others
self.addEventListener('fetch', (event) => {
  const { request } = event;

  // Skip non-GET requests
  if (request.method !== 'GET') return;

  // Skip chrome-extension and non-http(s)
  if (!request.url.startsWith('http')) return;

  event.respondWith(
    caches.match(request).then((cachedResponse) => {
      if (cachedResponse) {
        return cachedResponse;
      }

      return fetch(request).then((networkResponse) => {
        // Cache successful responses
        if (networkResponse && networkResponse.status === 200) {
          const responseClone = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(request, responseClone);
          });
        }
        return networkResponse;
      }).catch(() => {
        // Return offline page for navigation requests
        if (request.mode === 'navigate') {
          return caches.match('./index.html');
        }
      });
    })
  );
});

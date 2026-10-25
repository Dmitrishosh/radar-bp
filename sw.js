const CACHE_NAME = 'smart-radar-bp-v1';
const ASSETS_TO_CACHE = [
  './',
  './index.html',
  './manifest.json',
  'https://cdn.tailwindcss.com'
];

// Установка и кеширование ключевых файлов
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(ASSETS_TO_CACHE))
  );
  self.skipWaiting();
});

// Очистка старого кеша при обновлении версии
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key))
      )
    )
  );
  self.clients.claim();
});

// Стратегия Offline-first для статики и Network-only для запросов к Gemini API
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);

  // Запросы к API Gemini всегда идут напрямую в сеть
  if (url.hostname.includes('googleapis.com')) {
    return;
  }

  event.respondWith(
    caches.match(event.request).then(cachedResponse => {
      if (cachedResponse) {
        return cachedResponse;
      }
      return fetch(event.request).then(networkResponse => {
        if (
          event.request.method === 'GET' &&
          networkResponse &&
          networkResponse.status === 200
        ) {
          const responseClone = networkResponse.clone();
          caches.open(CACHE_NAME).then(cache => {
            cache.put(event.request, responseClone);
          });
        }
        return networkResponse;
      }).catch(() => caches.match('./index.html'));
    })
  );
});

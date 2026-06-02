const CACHE_NAME = 'quizmind-cleanup-v1';

self.addEventListener('install', event => {
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cache => {
          console.log('Clearing old cache:', cache);
          return caches.delete(cache);
        })
      );
    }).then(() => self.clients.claim())
  );
});

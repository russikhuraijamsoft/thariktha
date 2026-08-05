// Self-destructing Service Worker to purge cache-hijackings and ensure fresh preview reloads
self.addEventListener('install', (e) => {
  self.skipWaiting();
});

self.addEventListener('activate', (e) => {
  self.registration.unregister()
    .then(() => self.clients.matchAll())
    .then((clients) => {
      clients.forEach((client) => {
        if (client.navigate) {
          client.navigate(client.url);
        }
      });
    });
});

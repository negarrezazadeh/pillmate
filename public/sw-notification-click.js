// Imported into the generated service worker via workbox.importScripts.
// Without a notificationclick handler, tapping a notification on Android only
// dismisses it and never brings the app forward.
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const target = event.notification.data?.url ?? '/';

  event.waitUntil(
    self.clients
      .matchAll({ type: 'window', includeUncontrolled: true })
      .then((clients) => {
        for (const client of clients) {
          if ('focus' in client) return client.focus();
        }
        return self.clients.openWindow(target);
      }),
  );
});

/* Aperture Messages: shows alerts reliably on Chromebooks and in background tabs. Holds no data. */
self.addEventListener('install', function () { self.skipWaiting(); });
self.addEventListener('activate', function (e) { e.waitUntil(self.clients.claim()); });
self.addEventListener('notificationclick', function (e) {
  var tag = e.notification.tag; e.notification.close();
  e.waitUntil(self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function (list) {
    for (var i = 0; i < list.length; i++) { if ('focus' in list[i]) { list[i].postMessage({ open: tag }); return list[i].focus(); } }
    return self.clients.openWindow('./chat');
  }));
});

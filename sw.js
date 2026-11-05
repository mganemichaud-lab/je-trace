// Keeps the app working without internet: fresh files when online, saved copies when offline.
var VERSION = 'v3';
var FILES = ['./', 'index.html', 'style.css', 'js/glyphs.js', 'js/check.js', 'js/app.js',
             'manifest.webmanifest', 'icons/icon.svg', 'icons/icon-180.png'];

self.addEventListener('install', function (e) {
  e.waitUntil(caches.open(VERSION).then(function (c) { return c.addAll(FILES); }));
  self.skipWaiting();
});

self.addEventListener('activate', function (e) {
  e.waitUntil(caches.keys().then(function (keys) {
    return Promise.all(keys.filter(function (k) { return k !== VERSION; }).map(function (k) { return caches.delete(k); }));
  }));
  self.clients.claim();
});

self.addEventListener('fetch', function (e) {
  if (e.request.method !== 'GET') return;
  // Always ask the server whether the file changed (GitHub otherwise lets browsers reuse it for 10 minutes)
  var fresh = new URL(e.request.url).origin === location.origin
    ? fetch(e.request.url, { cache: 'no-cache', credentials: 'same-origin' })
    : fetch(e.request);
  e.respondWith(fresh.then(function (r) {
    var copy = r.clone();
    caches.open(VERSION).then(function (c) { c.put(e.request, copy); });
    return r;
  }).catch(function () {
    return caches.match(e.request, { ignoreSearch: true });
  }));
});

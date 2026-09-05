/* LitpaxTrack service worker — sirf static shell cache karta hai.
   API (GAS) responses kabhi cache nahi hote — hamesha fresh data. */
var CACHE = 'litpax-track-v1';
var SHELL = [
  './',
  './index.html',
  './style.css',
  './app.js',
  './config.js',
  './manifest.json'
];

self.addEventListener('install', function (e) {
  e.waitUntil(caches.open(CACHE).then(function (c) { return c.addAll(SHELL); }));
  self.skipWaiting();
});

self.addEventListener('activate', function (e) {
  e.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(keys.filter(function (k) { return k !== CACHE; })
        .map(function (k) { return caches.delete(k); }));
    })
  );
  self.clients.claim();
});

self.addEventListener('fetch', function (e) {
  var url = e.request.url;
  // GAS / google calls — hamesha network se, cache mat karo
  if (url.indexOf('script.google.com') > -1 || url.indexOf('googleusercontent') > -1) {
    return; // browser default (network)
  }
  // shell files — cache-first
  e.respondWith(
    caches.match(e.request).then(function (hit) {
      return hit || fetch(e.request);
    })
  );
});

const CACHE="english-maryam-v2";
const FILES=[
  "./",
  "./index.html",
  "./css/style.css",
  "./js/app.js",
  "./data/vocabulary.json?v=2",
  "./manifest.json"
];

self.addEventListener("install", event=>{
  event.waitUntil(
    caches.open(CACHE).then(cache=>cache.addAll(FILES))
  );
  self.skipWaiting();
});

self.addEventListener("activate", event=>{
  event.waitUntil(
    caches.keys().then(keys=>
      Promise.all(
        keys.filter(key=>key!==CACHE).map(key=>caches.delete(key))
      )
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", event=>{
  event.respondWith(
    caches.match(event.request).then(cached=>{
      return cached || fetch(event.request);
    })
  );
});

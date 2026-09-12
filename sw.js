const CACHE = "english-maryam-v7";
const FILES = [
  "./","./index.html","./css/style.css","./js/app.js?v=7",
  "./data/vocabulary.json?v=7","./data/course.json","./manifest.json"
];
self.addEventListener("install",e=>{e.waitUntil(caches.open(CACHE).then(c=>c.addAll(FILES)));self.skipWaiting()});
self.addEventListener("activate",e=>{e.waitUntil(caches.keys().then(k=>Promise.all(k.filter(x=>x!==CACHE).map(x=>caches.delete(x)))));self.clients.claim()});
self.addEventListener("fetch",e=>e.respondWith(caches.match(e.request).then(x=>x||fetch(e.request))));

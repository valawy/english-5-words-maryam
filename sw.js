const CACHE="english-maryam-v4";
const FILES=["./","./index.html","./css/style.css","./js/app.js","./manifest.json"];
self.addEventListener("install",e=>{e.waitUntil(caches.open(CACHE).then(c=>c.addAll(FILES)));self.skipWaiting()});
self.addEventListener("activate",e=>{e.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k)))));self.clients.claim()});
self.addEventListener("fetch",e=>{
  if(e.request.method!=="GET")return;
  const url=new URL(e.request.url);
  if(url.pathname.endsWith("/vocabulary.json")||url.pathname.endsWith("/course.json"))return;
  e.respondWith(caches.match(e.request).then(c=>c||fetch(e.request)));
});

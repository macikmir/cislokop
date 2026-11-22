"use strict";
// Service worker: hra funguje offline. Při změně souborů zvyš verzi cache —
// jinak prohlížeč nepozná, že je co stahovat. Nový soubor přidej i do ASSETS.
const CACHE = "cislokop-v1";
const ASSETS = [
  ".",
  "index.html",
  "manifest.webmanifest",
  "css/style.css",
  "js/util.js",
  "js/store.js",
  "js/audio.js",
  "js/art.js",
  "js/levels.js",
  "js/games/feed.js",
  "js/games/cart.js",
  "js/games/lift.js",
  "js/games/chest.js",
  "js/main.js",
  "icons/icon-180.png",
  "icons/icon-192.png",
  "icons/icon-512.png",
];

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(ASSETS)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

// cache-first; na pozadí se zkusí stáhnout novější verze pro příště
self.addEventListener("fetch", (e) => {
  if (e.request.method !== "GET") return;
  e.respondWith(
    caches.match(e.request, { ignoreSearch: true }).then((hit) => {
      const refresh = fetch(e.request)
        .then((res) => {
          if (res && res.ok) {
            const copy = res.clone();
            caches.open(CACHE).then((c) => c.put(e.request, copy));
          }
          return res;
        })
        .catch(() => hit);
      return hit || refresh;
    })
  );
});

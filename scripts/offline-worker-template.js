const CACHE = "baizefig-web-__BUILD_ID__";
const ASSETS = __ASSET_LIST__;
self.addEventListener("install", (event) =>
  event.waitUntil(
    (async () => {
      const cache = await caches.open(CACHE);
      await cache.addAll(["/", ...ASSETS]);
      await self.skipWaiting();
    })(),
  ),
);
self.addEventListener("activate", (event) =>
  event.waitUntil(
    (async () => {
      const names = (await caches.keys()).filter((name) =>
        name.startsWith("baizefig-web-"),
      );
      const keep = [CACHE, ...names.filter((name) => name !== CACHE).slice(-1)];
      await Promise.all(
        names
          .filter((name) => !keep.includes(name))
          .map((name) => caches.delete(name)),
      );
      await self.clients.claim();
    })(),
  ),
);
self.addEventListener("fetch", (event) => {
  const req = event.request,
    url = new URL(req.url);
  if (
    req.method !== "GET" ||
    url.origin !== self.location.origin ||
    url.pathname.startsWith("/api/")
  )
    return;
  if (req.mode === "navigate") {
    event.respondWith(
      (async () => {
        try {
          const response = await fetch(req, {
            signal: AbortSignal.timeout(4000),
          });
          if (response.ok) return response;
        } catch {}
        return (
          (await (await caches.open(CACHE)).match("/")) || Response.error()
        );
      })(),
    );
    return;
  }
  if (ASSETS.includes(url.pathname)) {
    event.respondWith((async () => (await caches.match(req)) || fetch(req))());
  }
});

const CACHE = "lillys-v3";
const PRECACHE = ["/manifest.json", "/icon-192.png"];

// ── Install ──────────────────────────────────────────────────────────────────
self.addEventListener("install", (e) => {
  e.waitUntil(
    caches.open(CACHE).then((c) => c.addAll(PRECACHE)).then(() => self.skipWaiting())
  );
});

// ── Activate ─────────────────────────────────────────────────────────────────
self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

// ── Fetch (network-first, cache fallback) ────────────────────────────────────
self.addEventListener("fetch", (e) => {
  if (e.request.method !== "GET") return;
  const url = new URL(e.request.url);
  if (url.pathname.startsWith("/api/")) return; // nunca cacheia API
  e.respondWith(
    fetch(e.request).catch(() => caches.match(e.request))
  );
});

// ── Message (forçar ativação imediata) ───────────────────────────────────────
self.addEventListener("message", (e) => {
  if (e.data?.type === "SKIP_WAITING") self.skipWaiting();
});

// ── Push Notification ────────────────────────────────────────────────────────
self.addEventListener("push", (e) => {
  let data = { title: "Lilly's", body: "", url: "/dashboard", tag: "lillys" };
  try { data = { ...data, ...e.data.json() }; } catch {}
  e.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      icon: "/icon-192.png",
      badge: "/icon-192.png",
      tag: data.tag,
      renotify: true,
      data: { url: data.url },
      actions: [{ action: "open", title: "Abrir" }],
    })
  );
});

// ── Notification Click ───────────────────────────────────────────────────────
self.addEventListener("notificationclick", (e) => {
  e.notification.close();
  const url = e.notification.data?.url ?? "/dashboard";
  e.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((list) => {
      const found = list.find((c) => c.url.includes(url) && "focus" in c);
      if (found) return found.focus();
      return self.clients.openWindow(url);
    })
  );
});

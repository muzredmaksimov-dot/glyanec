const CACHE = "glyanets-v3";
const CORE = ["./", "./index.html", "./manifest.webmanifest"];
const ICON = "https://image.qwenlm.ai/generated-images/d6f7b473-8512-424a-996f-2579acb49cb5/_result.png";

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(CORE)).catch(() => {}));
  self.skipWaiting();
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
  );
  self.clients.claim();
});

self.addEventListener("fetch", (e) => {
  const url = new URL(e.request.url);
  if (e.request.method !== "GET" || url.origin !== self.location.origin) return;
  e.respondWith(
    fetch(e.request)
      .then((res) => {
        const copy = res.clone();
        caches.open(CACHE).then((c) => c.put(e.request, copy)).catch(() => {});
        return res;
      })
      .catch(() => caches.match(e.request).then((hit) => hit || caches.match("./index.html")))
  );
});

/* ─── Push-уведомления (Android PWA / desktop) ─── */

// Серверные пуши (Web Push API) — задел на будущее
self.addEventListener("push", (e) => {
  let data = { title: "Глянец", body: "Новое событие на платформе" };
  try { if (e.data) data = { ...data, ...e.data.json() }; } catch { /* текст */ }
  e.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body, icon: ICON, badge: ICON, vibrate: [120, 60, 120], tag: "glyanets-push",
    })
  );
});

// Приложение просит показать уведомление из фоновой вкладки
self.addEventListener("message", (e) => {
  const d = e.data;
  if (d && d.type === "glyanets:notify") {
    e.waitUntil(
      self.registration.showNotification(d.title, {
        body: d.body, icon: ICON, badge: ICON, vibrate: [120, 60, 120],
        tag: d.tag || "glyanets", renotify: false,
      })
    );
  }
});

// Клик по уведомлению — открыть приложение (нужный раздел, если передан hash)
self.addEventListener("notificationclick", (e) => {
  e.notification.close();
  const hash = (e.notification.data && e.notification.data.hash) || "#/app";
  e.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((list) => {
      for (const c of list) {
        if ("focus" in c) { c.navigate(hash); return c.focus(); }
      }
      return self.clients.openWindow("./" + hash);
    })
  );
});

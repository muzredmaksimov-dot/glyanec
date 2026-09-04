const CACHE = "glyanets-v4";
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

/* ─── Push-уведомления (Web Push через Supabase Edge Function) ─── */

self.addEventListener("push", (e) => {
  let data = { title: "Глянец", body: "Новое событие на платформе", url: "#/" };
  try { if (e.data) data = { ...data, ...e.data.json() }; } catch { /* текст без JSON */ }
  e.waitUntil(
    (async () => {
      // Если приложение сейчас открыто — не дублируем: внутри сработают
      // колокольчик и тост, а пуш прилетит только на закрытое приложение.
      try {
        const wins = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
        if (wins.some((w) => w.focused || w.visibilityState === "visible")) return;
      } catch { /* показываем уведомление */ }
      await self.registration.showNotification(data.title, {
        body: data.body, icon: ICON, badge: ICON, vibrate: [120, 60, 120],
        tag: "glyanets-push", data: { url: data.url || "#/" },
      });
    })()
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

// Клик по уведомлению — открыть приложение на нужном разделе
self.addEventListener("notificationclick", (e) => {
  e.notification.close();
  const url = (e.notification.data && e.notification.data.url) || "#/app";
  e.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((list) => {
      for (const c of list) {
        if ("focus" in c) { try { c.navigate(url); } catch { /* ignore */ } return c.focus(); }
      }
      return self.clients.openWindow("./" + url);
    })
  );
});

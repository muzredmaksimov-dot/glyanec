import { getSupabase, cloudReady } from "./cloud";

/**
 * НАСТОЯЩИЕ PUSH-УВЕДОМЛЕНИЯ (Web Push / VAPID)
 * ─────────────────────────────────────────────────────────────
 * Схема: устройство подписывается (PushManager) → подписка хранится
 * в таблице push_subs → при любом событии платформа кладёт строку
 * в push_events → Supabase webhook вызывает Edge Function send-push →
 * та рассылает пуш на все устройства цели (мастер / клиент / админ).
 *
 * Чтобы включить:
 *   1. Сгенерировать VAPID-ключи:  npx web-push generate-vapid-keys
 *   2. Вставить ПУБЛИЧНЫЙ ключ ниже (VAPID_PUBLIC)
 *   3. Приватный — в секрет Edge Function (см. README, «Push-уведомления»)
 */
export const VAPID_PUBLIC = "";

export type PushTarget = { kind: "master" | "client" | "admin"; id: string };

export const pushSupported = () =>
  typeof window !== "undefined" &&
  "serviceWorker" in navigator &&
  "PushManager" in window &&
  "Notification" in window;

function urlBase64ToUint8Array(base64: string) {
  const padding = "=".repeat((4 - (base64.length % 4)) % 4);
  const b = (base64 + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(b);
  const out = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
  return out;
}

export type PushState =
  | { kind: "unsupported" }
  | { kind: "not-configured" }
  | { kind: "no-cloud" }
  | { kind: "denied" }
  | { kind: "off" }
  | { kind: "on" };

/** Текущий статус push для этого браузера */
export async function pushState(): Promise<PushState> {
  if (!pushSupported()) return { kind: "unsupported" };
  if (!VAPID_PUBLIC) return { kind: "not-configured" };
  if (!cloudReady()) return { kind: "no-cloud" };
  if (Notification.permission === "denied") return { kind: "denied" };
  try {
    const reg = await navigator.serviceWorker.ready;
    const sub = await reg.pushManager.getSubscription();
    return sub ? { kind: "on" } : { kind: "off" };
  } catch {
    return { kind: "off" };
  }
}

/** Подписать это устройство на push для цели (мастер/клиент/админ) */
export async function subscribePush(target: PushTarget): Promise<{ ok: boolean; error?: string }> {
  if (!pushSupported()) return { ok: false, error: "Этот браузер не поддерживает push" };
  if (!VAPID_PUBLIC) return { ok: false, error: "Push ещё не настроен администратором платформы (нет VAPID-ключа)" };
  if (!cloudReady()) return { ok: false, error: "Облако не подключено — push недоступны в локальном режиме" };
  try {
    const perm = await Notification.requestPermission();
    if (perm !== "granted") return { ok: false, error: "Браузер запретил уведомления. Разрешите их в настройках сайта и попробуйте снова." };
    const reg = await navigator.serviceWorker.ready;
    let sub = await reg.pushManager.getSubscription();
    if (!sub) {
      sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC),
      });
    }
    const json = sub.toJSON();
    const supa = getSupabase()!;
    const { error } = await supa.from("push_subs").upsert({
      endpoint: json.endpoint!,
      target_kind: target.kind,
      target_id: target.id,
      p256dh: json.keys?.p256dh ?? "",
      auth: json.keys?.auth ?? "",
      ua: navigator.userAgent.slice(0, 140),
    });
    if (error) return { ok: false, error: `Не удалось сохранить подписку: ${error.message}` };
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Не получилось включить push" };
  }
}

/** Отписаться (кнопка «выключить») */
export async function unsubscribePush(): Promise<boolean> {
  try {
    const reg = await navigator.serviceWorker.ready;
    const sub = await reg.pushManager.getSubscription();
    if (!sub) return true;
    const supa = getSupabase();
    if (supa) await supa.from("push_subs").delete().eq("endpoint", sub.endpoint);
    await sub.unsubscribe();
    return true;
  } catch {
    return false;
  }
}

/** Тестовый пуш: кладём событие в очередь — Edge Function доставит его на устройство */
export async function sendTestPush(target: PushTarget): Promise<string | null> {
  const supa = getSupabase();
  if (!supa) return "Облако не подключено";
  const url = target.kind === "master" ? "#/app" : target.kind === "client" ? "#/my" : "#/admin";
  const { error } = await supa.from("push_events").insert({
    target_kind: target.kind,
    target_id: target.id,
    title: "Глянец · проверка связи",
    body: "Push-уведомления работают! Так будут приходить записи, отмены и напоминания.",
    url,
  });
  return error ? `Ошибка очереди: ${error.message}` : null;
}

/* ─── Генерация VAPID-ключей прямо в браузере (Web Crypto) ─── */

function b64urlToBytes(b64: string): Uint8Array {
  const b = b64.replace(/-/g, "+").replace(/_/g, "/");
  const pad = b.length % 4 === 0 ? "" : "=".repeat(4 - (b.length % 4));
  const raw = atob(b + pad);
  const out = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
  return out;
}

function bytesToB64url(bytes: Uint8Array): string {
  let bin = "";
  bytes.forEach((b) => (bin += String.fromCharCode(b)));
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

/** 32-байтовая нормализация (JWK иногда отдаёт координаты без ведущих нулей) */
function pad32(u: Uint8Array): Uint8Array {
  if (u.length === 32) return u;
  const out = new Uint8Array(32);
  out.set(u, 32 - u.length);
  return out;
}

/**
 * Пара VAPID-ключей ECDSA P-256 в формате, который ожидает библиотека web-push.
 * Публичный: base64url(0x04 || X || Y), приватный: base64url(D).
 * Всё происходит локально в браузере — ключи никуда не отправляются.
 */
export async function generateVapidKeys(): Promise<{ publicKey: string; privateKey: string }> {
  const kp = await crypto.subtle.generateKey(
    { name: "ECDSA", namedCurve: "P-256" },
    true,
    ["sign", "verify"]
  );
  const pubJwk = (await crypto.subtle.exportKey("jwk", kp.publicKey)) as JsonWebKey;
  const privJwk = (await crypto.subtle.exportKey("jwk", kp.privateKey)) as JsonWebKey;
  if (!pubJwk.x || !pubJwk.y || !privJwk.d) throw new Error("Браузер не смог сгенерировать ключи");
  const raw = new Uint8Array(65);
  raw[0] = 0x04;
  raw.set(pad32(b64urlToBytes(pubJwk.x)), 1);
  raw.set(pad32(b64urlToBytes(pubJwk.y)), 33);
  return { publicKey: bytesToB64url(raw), privateKey: privJwk.d };
}

/* ─── Диагностика: пошагово показывает, где именно оборвана цепочка ─── */
export interface DiagStep { label: string; ok: boolean; hint?: string }
export async function pushDiagnostics(target: PushTarget): Promise<DiagStep[]> {
  const steps: DiagStep[] = [];
  steps.push({
    label: "Браузер поддерживает push",
    ok: pushSupported(),
    hint: pushSupported() ? undefined : "Нужен современный Chrome/Edge/Safari",
  });
  steps.push({
    label: "Публичный VAPID-ключ вставлен в код",
    ok: Boolean(VAPID_PUBLIC),
    hint: VAPID_PUBLIC ? undefined : "src/lib/push.ts → поле VAPID_PUBLIC (см. README, шаг 2)",
  });
  steps.push({
    label: "Облако Supabase подключено",
    ok: cloudReady(),
    hint: cloudReady() ? undefined : "Заполните url и anonKey в src/lib/cloud.ts",
  });
  if (!pushSupported() || !VAPID_PUBLIC || !cloudReady()) return steps;

  steps.push({
    label: "Разрешение на уведомления",
    ok: Notification.permission === "granted",
    hint: Notification.permission === "denied"
      ? "Запрещено браузером: настройки сайта → уведомления → разрешить"
      : "Нажмите «Включить push» и разрешите",
  });

  let browserSub = false;
  try {
    const reg = await navigator.serviceWorker.ready;
    browserSub = Boolean(await reg.pushManager.getSubscription());
  } catch { browserSub = false; }
  steps.push({
    label: "Service worker активен и подписка создана",
    ok: browserSub,
    hint: browserSub ? undefined : "Нажмите «Включить push»",
  });

  const supa = getSupabase();
  if (supa) {
    const { count, error } = await supa
      .from("push_subs")
      .select("endpoint", { count: "exact", head: true })
      .eq("target_kind", target.kind)
      .eq("target_id", target.id);
    steps.push({
      label: "Подписка этого устройства сохранена в облаке",
      ok: !error && (count ?? 0) > 0,
      hint: error
        ? `Таблица push_subs недоступна: ${error.message}. Выполните SQL из README (шаг 1)`
        : (count ?? 0) > 0 ? undefined : "Включите push заново — подписка не сохранилась",
    });

    const { count: evCount, error: evErr } = await supa
      .from("push_events")
      .select("id", { count: "exact", head: true });
    steps.push({
      label: "Очередь событий push_events доступна",
      ok: !evErr,
      hint: evErr ? `Выполните SQL из README (шаг 1): ${evErr.message}` : `В очереди событий: ${evCount ?? 0}`,
    });
  }
  steps.push({
    label: "Edge Function send-push + webhook (проверяется тестом)",
    ok: false,
    hint: "Сверните приложение и нажмите «Тест». Не пришло за 15 сек — функция или webhook не настроены (README, шаги 3–4)",
  });
  return steps;
}

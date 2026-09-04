import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { DB } from "./types";

/**
 * ОБЩЕЕ ХРАНИЛИЩЕ ДАННЫХ (Supabase)
 * ─────────────────────────────────────────────────────────────
 * Чтобы данные платформы (мастера, записи, клиенты, пароль админа)
 * были общими для всех устройств, вставьте сюда два значения:
 *
 *   1. url      — «Project URL» из Supabase (Settings → API)
 *   2. anonKey  — ключ «anon public» оттуда же
 *
 * Пока поля пустые — платформа работает в локальном режиме
 * (данные хранятся в браузере каждого посетителя).
 *
 * Таблица создаётся один раз SQL-скриптом из README (раздел «Общее хранилище»).
 */
export const CLOUD = {
  url: "",
  anonKey: "",
};

export const cloudReady = () => Boolean(CLOUD.url && CLOUD.anonKey);

let client: SupabaseClient | null = null;
const cli = () => {
  if (!client && cloudReady()) client = createClient(CLOUD.url, CLOUD.anonKey);
  return client;
};

/** Публичный доступ к клиенту Supabase (для push-подписок и очереди событий) */
export const getSupabase = () => cli();

export interface RemoteRow { data: DB; updated_at: string }

/** Скачать общий DB из облака */
export async function loadRemote(): Promise<RemoteRow | null> {
  const c = cli();
  if (!c) return null;
  try {
    const { data, error } = await c.from("glyanets_kv").select("data, updated_at").eq("id", 1).maybeSingle();
    if (error || !data) return null;
    return data as unknown as RemoteRow;
  } catch {
    return null;
  }
}

/** Сохранить DB в облако (last-write-wins) */
export async function saveRemote(db: DB): Promise<boolean> {
  const c = cli();
  if (!c) return false;
  try {
    const { error } = await c.from("glyanets_kv").upsert({
      id: 1,
      data: db as unknown as Record<string, unknown>,
      updated_at: new Date().toISOString(),
    });
    return !error;
  } catch {
    return false;
  }
}

/** Живая подписка: изменения с других устройств прилетают за секунды */
export function subscribeRemote(onChange: (row: RemoteRow) => void): () => void {
  const c = cli();
  if (!c) return () => {};
  const channel = c
    .channel("glyanets-sync")
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: "glyanets_kv" },
      (payload) => {
        const row = payload.new as unknown as RemoteRow;
        if (row?.data) onChange(row);
      }
    )
    .subscribe();
  return () => {
    c.removeChannel(channel);
  };
}

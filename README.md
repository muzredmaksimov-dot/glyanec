# Глянец — PWA-платформа для бьюти-мастеров Беларуси

Онлайн-запись, календарь, CRM, статистика и админ-панель в одном приложении.
Цены в **BYN**, телефоны **+375**, оплата — напрямую мастеру (наличные / ЕРИП / карта).

## Возможности

- **Публичная страница мастера** (`#/m/…`): услуги, цены, длительность, отзывы, программа лояльности и запись только на реально свободные слоты.
- **Кабинет мастера** (`#/app`): недельный календарь с защитой от двойных записей, переносы, CRM без дубликатов клиентов, услуги, график (перерывы, отпуска, блокировки), статистика, push-уведомления.
- **Клиент** (`#/my`): поиск записей по телефону, отмена, напоминания, отзывы о визитах.
- **Маркетплейс**: поиск по услуге/имени, фильтр по городу, сортировка по рейтингу, цене, отзывам.
- **Салоны** (`#/salon/…`): команда мастеров на одной странице.
- **Админ-панель** (`#/admin`): доступ «admin / admin» (сменить в настройках), управление мастерами и тарифами, заявки на повышение, обращения пользователей, сброс демо-данных.
- **Обратная связь**: кнопка «Сообщить об ошибке» на каждом экране → раздел «Обращения» в админке.

## Демо-доступы

| Кто | Логин | Пароль |
| --- | --- | --- |
| Администратор | `admin` | `admin` |
| Алина · маникюр | `alina` | `alina123` |
| Марк · барбер | `mark` | `mark123` |
| Ева · ресницы | `eva` | `eva123` |
| Дана · косметолог | `dana` | `dana123` |
| Надежда · массаж | `nadia` | `nadia123` |
| Вера · волосы | `vera` | `vera123` |

Данные хранятся в localStorage браузера (демо-режим).

## Локальный запуск

```bash
npm install
npm run dev      # разработка, http://localhost:3000
npm run build    # продакшен-сборка в dist/
```

## Деплой на GitHub Pages

Подробная пошаговая инструкция — ниже, в разделе «Развёртывание на GitHub».
Коротко: создайте репозиторий → запушьте код → включите Pages через GitHub Actions → добавьте `base: "./"` в `vite.config.js`.

## Общее хранилище (облако Supabase)

По умолчанию платформа работает в **локальном режиме**: каждый посетитель видит свою копию данных (в браузере). Чтобы записи клиентов, мастера и пароль администратора стали **общими для всех устройств**, подключите бесплатное облако Supabase (10 минут, без программирования):

### 1. Создайте проект
1. Откройте [supabase.com](https://supabase.com) → **Start your project** → войдите через GitHub.
2. Нажмите **New project**: любое название, придумайте пароль (запишите!), регион — ближайший к вам (например, *Central EU (Frankfurt)*).
3. Подождите 1–2 минуты, пока проект создастся.

### 2. Создайте таблицу (один раз)
1. В меню слева выберите **SQL Editor** (иконка `>_`) → **New query**.
2. Вставьте скрипт и нажмите **Run** (скрипт безопасен — его можно запускать сколько угодно раз):

```sql
create table if not exists glyanets_kv (
  id int primary key,
  data jsonb not null,
  updated_at timestamptz not null default now()
);

alter table glyanets_kv enable row level security;

drop policy if exists "anon read"   on glyanets_kv;
drop policy if exists "anon insert" on glyanets_kv;
drop policy if exists "anon update" on glyanets_kv;

create policy "anon read"   on glyanets_kv for select to anon using (true);
create policy "anon insert" on glyanets_kv for insert to anon with check (true);
create policy "anon update" on glyanets_kv for update to anon using (true);

do $$ begin
  alter publication supabase_realtime add table glyanets_kv;
exception when duplicate_object then null;
end $$;
```

> Если видите ошибку вида `already exists` — это значит, что всё уже было создано ранее. Просто запустите обновлённый скрипт выше, он всё «починит» без ошибок.

### 3. Вставьте ключи в сайт
1. В Supabase: **Settings** (шестерёнка внизу слева) → **API**.
2. Скопируйте **Project URL** и ключ **anon public**.
3. В репозитории откройте файл `src/lib/cloud.ts` (кнопка-карандаш ✏️ на GitHub) и вставьте значения:

```ts
export const CLOUD = {
  url: "https://xxxx.supabase.co",       // ← сюда Project URL
  anonKey: "eyJhbGciOi...",              // ← сюда anon public key
};
```

4. Сохраните (Commit). Через 1–2 минуты сайт пересоберётся — в админке (Настройки → «Данные и облако») появится статус **«подключено»**.

С этого момента все устройства работают с одной базой: смена пароля, новые записи и заявки видны всем сразу.

> Ключ `anon` — публичный, его безопасно класть в код сайта. Для продакшена с реальными деньгами и персональными данными позже стоит настроить строгие RLS-правила и серверную часть.

## Push-уведомления (приходят даже при закрытом приложении)

Схема: устройство подписывается → подписка хранится в таблице `push_subs` → каждое событие кладёт строку в `push_events` → webhook Supabase вызывает Edge Function `send-push` → она рассылает пуш на все устройства мастера/клиента/админа. Нужен только ваш проект Supabase, отдельный сервер не требуется.

### Шаг 1. Таблицы (SQL Editor → New query → Run)

```sql
create table if not exists public.push_subs (
  endpoint text primary key,
  target_kind text not null,
  target_id text not null,
  p256dh text not null,
  auth text not null,
  ua text,
  created_at timestamptz default now()
);
alter table public.push_subs enable row level security;
drop policy if exists "anon insert subs" on public.push_subs;
create policy "anon insert subs" on public.push_subs for insert to anon with check (true);
drop policy if exists "anon update subs" on public.push_subs;
create policy "anon update subs" on public.push_subs for update to anon using (true) with check (true);
drop policy if exists "anon delete subs" on public.push_subs;
create policy "anon delete subs" on public.push_subs for delete to anon using (true);

create table if not exists public.push_events (
  id bigint generated always as identity primary key,
  target_kind text not null,
  target_id text not null,
  title text not null,
  body text not null,
  url text,
  created_at timestamptz default now()
);
alter table public.push_events enable row level security;
drop policy if exists "anon insert events" on public.push_events;
create policy "anon insert events" on public.push_events for insert to anon with check (true);
```

### Шаг 2. VAPID-ключи (создаются на самом сайте, без терминала)

1. Откройте **админ-панель** → вкладка **«Настройки»** → блок **«Push · VAPID-ключи»**.
2. Нажмите **«Создать ключи»**. Платформа сгенерирует пару прямо в браузере.
3. **Публичный ключ сохранится автоматически** (ничего делать не нужно).
4. **Приватный ключ** — нажмите «Показать» → «Копировать». Он понадобится на шаге 3.

> Альтернатива для разработчиков: `npx web-push generate-vapid-keys` в терминале, публичный ключ — в `src/lib/push.ts` (поле `VAPID_PUBLIC`).

### Шаг 3. Edge Function

В пустой папке на компьютере:

```bash
npm install -g supabase
supabase login                       # откроется браузер — войдите в аккаунт
supabase link --project-ref ВАШ_REF  # Project Settings → General → Reference ID
mkdir -p supabase/functions/send-push
```

Создайте файл `supabase/functions/send-push/index.ts` с таким содержимым:

```ts
import { createClient } from "npm:@supabase/supabase-js@2";
import webpush from "npm:web-push@3";

webpush.setVapidDetails(
  "mailto:admin@example.com",
  Deno.env.get("VAPID_PUBLIC")!,
  Deno.env.get("VAPID_PRIVATE")!
);

Deno.serve(async (req) => {
  try {
    const incoming = await req.json().catch(() => null);
    const ev = incoming?.record?.new ?? incoming;
    if (!ev?.title) return new Response("no event");

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );
    const { data: subs } = await supabase
      .from("push_subs")
      .select("endpoint, p256dh, auth")
      .eq("target_kind", ev.target_kind)
      .eq("target_id", ev.target_id);

    const payload = JSON.stringify({ title: ev.title, body: ev.body ?? "", url: ev.url ?? "#/" });
    const list = subs ?? [];
    const results = await Promise.allSettled(
      list.map((s) => webpush.sendNotification({ endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } }, payload))
    );
    const dead = list
      .filter((_, i) => {
        const r = results[i];
        return r.status === "rejected" && [404, 410].includes((r.reason as { statusCode?: number })?.statusCode ?? 0);
      })
      .map((s) => s.endpoint);
    if (dead.length) await supabase.from("push_subs").delete().in("endpoint", dead);

    return new Response(
      JSON.stringify({ sent: results.filter((r) => r.status === "fulfilled").length, removed: dead.length }),
      { headers: { "Content-Type": "application/json" } }
    );
  } catch (e) {
    return new Response(String(e), { status: 500 });
  }
});
```

Затем:

```bash
supabase secrets set VAPID_PUBLIC=ПУБЛИЧНЫЙ_КЛЮЧ VAPID_PRIVATE=ПРИВАТНЫЙ_КЛЮЧ
```

> Без терминала: в дашборде Supabase → **Edge Functions** → вкладка **Secrets** → «Add a new secret». Добавьте два секрета: `VAPID_PUBLIC` (публичный ключ из админки) и `VAPID_PRIVATE` (приватный).

```bash
supabase functions deploy send-push --no-verify-jwt
```

### Шаг 4. Webhook (в дашборде Supabase)

**Database → Webhooks → Create a new webhook**:
- Name: `push`
- Table: `push_events`
- Events: только **Insert**
- Type: **Invoke Edge Function** → выбрать `send-push` → Save.

### Шаг 5. Проверка

На сайте: Кабинет → Уведомления → **«Включить push»** → разрешите → **сверните приложение** → «Тест». Пуш придёт в течение нескольких секунд.

### Особенности платформ

- **Android (Chrome):** работает и из вкладки, надёжнее — из установленной PWA. На Xiaomi/Samsung/Honor снимите ограничения батареи для сайта.
- **iPhone (Safari):** пуш возможны только из PWA, установленной на экран «Домой», и только на iOS 16.4+.
- **Десктоп (Chrome/Edge/Firefox):** работает после разрешения уведомлений.
- Если приложение открыто, пуш не дублируется — уведомление показывается внутри (колокольчик + тост).

## Стек

React 18 · TypeScript · Vite · Tailwind CSS v4 · Supabase (общая БД + Web Push через Edge Functions) · PWA (service worker + manifest)

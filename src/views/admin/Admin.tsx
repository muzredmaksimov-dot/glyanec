import { useState } from "react";
import type { PlanId } from "../../lib/types";
import {
  useDB, useSession, loginAdmin, adminSetPlan, adminToggle, adminUpdatePlan, updateAdminCreds,
  approveUpgrade, rejectUpgrade, markAllRead, markRead, unreadFor, resetDemo, logout, setTicketStatus,
  cloudOn, pushLocalToCloud,
} from "../../lib/store";
import { addDays, todayISO, fmtDate, isActive } from "../../lib/schedule";
import { cx, fmtMoney, fmtPhone, plural, timeAgo } from "../../lib/util";
import { Btn, Badge, Avatar, Toggle, Confirm, useToast, inp, Field, Empty, Stars } from "../../components/ui";
import {
  IcShield, IcChart, IcUsers, IcCrown, IcSliders, IcLogout, IcBoost, IcLock, IcCheck, IcX,
  IcBan, IcExternal, IcCoin, IcBell, IcScissors, IcCalendar, IcInbox, IcCloud,
} from "../../components/icons";

const TABS = [
  { id: "overview", label: "Обзор", ic: IcChart },
  { id: "masters", label: "Мастера", ic: IcUsers },
  { id: "tickets", label: "Обращения", ic: IcInbox },
  { id: "promo", label: "Продвижение", ic: IcBoost },
  { id: "plans", label: "Тарифы и лимиты", ic: IcSliders },
  { id: "settings", label: "Настройки", ic: IcLock },
] as const;

export default function Admin() {
  const session = useSession();
  if (session?.kind !== "admin") return <AdminGate />;
  return <Panel />;
}

function AdminGate() {
  const toast = useToast();
  const [login, setLogin] = useState("");
  const [pass, setPass] = useState("");
  const [err, setErr] = useState<string | null>(null);
  return (
    <div className="grid min-h-screen place-items-center bg-ink-950 px-4 text-milk-100">
      <div className="w-full max-w-sm">
        <div className="mb-6 text-center">
          <span className="mx-auto grid h-14 w-14 place-items-center rounded-xl bg-berry-600/20 text-berry-400"><IcShield size={28} /></span>
          <h1 className="mt-3 font-display text-2xl font-bold">Админ-панель</h1>
          <p className="mt-1 text-sm text-milk-100/55">Доступ только для администрации платформы</p>
        </div>
        <div className="rounded-xl border border-milk-100/12 bg-milk-100/5 p-5 space-y-3">
          <input className={cx(inp, "!bg-ink-900 !border-milk-100/15 !text-milk-100 placeholder:!text-milk-100/30")} placeholder="Логин" value={login} onChange={(e) => setLogin(e.target.value)} autoFocus />
          <input className={cx(inp, "!bg-ink-900 !border-milk-100/15 !text-milk-100 placeholder:!text-milk-100/30")} placeholder="Пароль" type="password" value={pass} onChange={(e) => setPass(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") { const er = loginAdmin(login, pass); setErr(er); if (!er) toast("Добро пожаловать, администратор"); } }} />
          {err && <div className="rounded-lg bg-coral-600/25 px-3 py-2 text-sm font-semibold text-coral-500">{err}</div>}
          <Btn className="w-full" onClick={() => { const er = loginAdmin(login, pass); setErr(er); if (!er) toast("Добро пожаловать, администратор"); }}>Войти</Btn>
          <p className="text-center text-[11px] text-milk-100/40">По умолчанию: admin / admin — смените в настройках после входа</p>
        </div>
        <a href="#/" className="mt-4 block text-center text-xs font-bold text-milk-100/45 hover:text-berry-300">← Вернуться на платформу</a>
      </div>
    </div>
  );
}

function Panel() {
  const db = useDB();
  const [tab, setTab] = useState<(typeof TABS)[number]["id"]>("overview");
  const unread = unreadFor(db, { kind: "admin" });
  const openTickets = db.tickets.filter((t) => t.status === "open").length;

  return (
    <div className="flex min-h-screen bg-[#F3F1F5] text-ink-900">
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-60 flex-col bg-ink-950 text-milk-100 lg:flex">
        <div className="flex items-center gap-2 px-5 pt-5">
          <span className="grid h-9 w-9 place-items-center rounded-lg bg-berry-600 text-white"><IcShield size={19} /></span>
          <div>
            <div className="font-display text-[15px] font-bold leading-tight">Глянец</div>
            <div className="text-[10px] font-bold uppercase tracking-widest text-berry-400">admin</div>
          </div>
        </div>
        <nav className="mt-6 flex-1 space-y-1 px-3">
          {TABS.map((t) => (
            <button key={t.id} onClick={() => setTab(t.id)}
              className={cx("flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-bold transition-all cursor-pointer",
                tab === t.id ? "bg-berry-600 text-white shadow-lg shadow-berry-600/25" : "text-milk-100/60 hover:bg-milk-100/8 hover:text-milk-100")}>
              <t.ic size={17} />{t.label}
              {t.id === "tickets" && openTickets > 0 && <span className="ml-auto rounded-full bg-coral-500 px-1.5 py-0.5 text-[10px] font-bold text-white tabular-nums">{openTickets}</span>}
            </button>
          ))}
        </nav>
        <div className="space-y-2 p-4">
          <a href="#/" className="flex items-center justify-center gap-2 rounded-lg border border-milk-100/15 px-3 py-2.5 text-[13px] font-bold text-milk-100/80 hover:border-berry-400 hover:text-berry-300"><IcExternal size={15} />На платформу</a>
          <button onClick={() => { logout(); location.hash = "#/"; }} className="flex w-full items-center justify-center gap-2 rounded-lg px-3 py-2.5 text-[13px] font-bold text-milk-100/50 hover:bg-milk-100/8 hover:text-coral-500 cursor-pointer"><IcLogout size={15} />Выйти</button>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col lg:pl-60">
        <header className="sticky top-0 z-30 border-b border-ink-900/8 bg-[#F3F1F5]/85 backdrop-blur-md">
          <div className="flex h-16 items-center justify-between px-4 sm:px-6">
            <div>
              <h1 className="font-display text-[17px] font-bold">{TABS.find((t) => t.id === tab)?.label}</h1>
              <p className="text-[11px] font-semibold text-ink-700/55">Управление платформой «Глянец»</p>
            </div>
            <div className="flex items-center gap-2">
              {unread > 0 && <Badge tone="honey"><IcBell size={11} />{unread} новых</Badge>}
              <span className="grid h-9 w-9 place-items-center rounded-lg bg-ink-900 text-berry-400"><IcShield size={17} /></span>
            </div>
          </div>
          <nav className="flex gap-1 overflow-x-auto px-3 pb-[max(0.5rem,env(safe-area-inset-bottom))] lg:hidden">
            {TABS.map((t) => (
              <button key={t.id} onClick={() => setTab(t.id)} className={cx("flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-1.5 text-[13px] font-bold cursor-pointer", tab === t.id ? "bg-ink-900 text-milk-50" : "bg-white border border-ink-900/10")}>
                <t.ic size={14} />{t.label}
                {t.id === "tickets" && openTickets > 0 && <span className="rounded-full bg-coral-500 px-1 text-[10px] font-bold text-white tabular-nums">{openTickets}</span>}
              </button>
            ))}
          </nav>
        </header>

        <main className="flex-1 px-4 py-6 sm:px-6 pb-[max(1.5rem,env(safe-area-inset-bottom))]">
          {tab === "overview" && <Overview />}
          {tab === "masters" && <MastersTab />}
          {tab === "tickets" && <TicketsTab />}
          {tab === "promo" && <PromoTab />}
          {tab === "plans" && <PlansTab />}
          {tab === "settings" && <SettingsTab />}
        </main>
      </div>
    </div>
  );
}

/* ─── Обзор ─── */
function Overview() {
  const db = useDB();
  const toast = useToast();
  const today = todayISO();
  const done = db.appointments.filter((a) => a.status === "done");
  const gmv = done.reduce((s, a) => s + a.price, 0);
  const week = db.appointments.filter((a) => a.date >= today && a.date <= addDays(today, 6) && isActive(a));
  const requests = db.masters.filter((m) => m.upgradeRequest);
  const recent = [...db.appointments].sort((a, b) => b.createdAt - a.createdAt).slice(0, 8);
  const mname = (id: string) => db.masters.find((m) => m.id === id)?.name ?? "—";
  const cname = (id: string) => db.clients.find((c) => c.id === id)?.name ?? "Клиент";
  const plans = db.settings.plans;

  return (
    <div className="space-y-5">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {[
          { l: "Мастеров на платформе", v: String(db.masters.length), s: `${db.masters.filter((m) => m.blocked).length} заблокировано`, ic: IcScissors },
          { l: "Записей за неделю", v: String(week.length), s: `на ${fmtMoney(week.reduce((s, a) => s + a.price, 0))}`, ic: IcCalendar },
          { l: "Оборот (GMV)", v: fmtMoney(gmv), s: `${done.length} ${plural(done.length, ["визит", "визита", "визитов"])} оплачено`, ic: IcCoin },
          { l: "Клиентов в CRM", v: String(db.clients.length), s: "по всем мастерам", ic: IcUsers },
        ].map((k) => (
          <div key={k.l} className="rounded-xl border border-ink-900/10 bg-white p-4 transition-all hover:-translate-y-0.5 hover:shadow-lg">
            <div className="mb-3 grid h-9 w-9 place-items-center rounded-lg bg-ink-900 text-berry-400"><k.ic size={17} /></div>
            <div className="text-[10px] font-bold uppercase tracking-wider text-ink-700/55">{k.l}</div>
            <div className="font-display text-xl font-bold tabular-nums">{k.v}</div>
            <div className="text-[11px] font-semibold text-ink-700/55">{k.s}</div>
          </div>
        ))}
      </div>

      {requests.length > 0 && (
        <div className="rounded-xl border-[1.5px] border-honey-500/50 bg-honey-100 p-4">
          <div className="text-sm font-bold text-honey-700 flex items-center gap-2"><IcCrown size={16} />Заявки на повышение тарифа · {requests.length}</div>
          <div className="mt-3 space-y-2">
            {requests.map((m) => (
              <div key={m.id} className="flex flex-wrap items-center gap-3 rounded-lg bg-white px-4 py-3">
                <Avatar src={m.photo} name={m.name} color={m.color} size={34} />
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-bold">{m.name}</div>
                  <div className="text-xs text-ink-700/60">«{plans[m.plan].label}» → «{plans[m.upgradeRequest!].label}» · {plans[m.upgradeRequest!].price} BYN/мес</div>
                </div>
                <div className="flex gap-2">
                  <Btn sm v="dark" onClick={() => { approveUpgrade(m.id); toast(`Тариф «${plans[m.upgradeRequest!].label}» подключён`); }}><IcCheck size={14} />Одобрить</Btn>
                  <Btn sm v="dangerGhost" onClick={() => { rejectUpgrade(m.id); toast("Заявка отклонена", "info"); }}><IcX size={14} /></Btn>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="grid gap-5 lg:grid-cols-[1.2fr_.8fr]">
        <section className="rounded-xl border border-ink-900/10 bg-white p-5">
          <h3 className="font-display text-[15px] font-bold mb-3">Последние записи платформы</h3>
          <div className="space-y-1.5">
            {recent.map((a) => (
              <div key={a.id} className="rounded-lg border border-ink-900/6 px-3 py-2.5 text-sm">
                <div className="flex items-center gap-2.5">
                  <span className="h-7 w-1 shrink-0 rounded-full" style={{ background: a.serviceColor }} />
                  <span className="min-w-0 flex-1 truncate">
                    <span className="font-semibold">{cname(a.clientId)}</span>
                    <span className="text-ink-700/60"> → {mname(a.masterId)} · {a.serviceName}</span>
                  </span>
                  <span className="shrink-0 font-bold tabular-nums">{fmtMoney(a.price)}</span>
                </div>
                <div className="mt-1 pl-3.5 text-[11px] font-semibold text-ink-700/55">{fmtDate(a.date)} в {a.start}</div>
              </div>
            ))}
          </div>
        </section>
        <section className="rounded-xl border border-ink-900/10 bg-white p-5">
          <h3 className="font-display text-[15px] font-bold mb-3">Распределение по тарифам</h3>
          {(Object.keys(plans) as PlanId[]).map((p) => {
            const cnt = db.masters.filter((m) => m.plan === p).length;
            const pct = db.masters.length ? (cnt / db.masters.length) * 100 : 0;
            return (
              <div key={p} className="mb-3">
                <div className="flex justify-between text-sm font-bold"><span>«{plans[p].label}» · {plans[p].price} BYN</span><span className="tabular-nums">{cnt}</span></div>
                <div className="mt-1 h-2 rounded-full bg-ink-900/8"><div className="h-full rounded-full bg-berry-500" style={{ width: `${pct}%` }} /></div>
              </div>
            );
          })}
          <div className="mt-4 rounded-lg bg-ink-900 p-4 text-milk-100">
            <div className="text-xs font-bold uppercase tracking-wider text-berry-400">Потенциал монетизации</div>
            <div className="mt-1 font-display text-lg font-bold tabular-nums">{fmtMoney(db.masters.reduce((s, m) => s + plans[m.plan].price, 0))}/мес</div>
            <p className="mt-1 text-[11px] text-milk-100/60">MRR при оплате всеми мастерами текущих тарифов</p>
          </div>
        </section>
      </div>
    </div>
  );
}

/* ─── Обращения ─── */
function TicketsTab() {
  const db = useDB();
  const toast = useToast();
  const [f, setF] = useState<"all" | "open" | "resolved">("all");
  const list = db.tickets.filter((t) => (f === "all" ? true : t.status === f));
  const openN = db.tickets.filter((t) => t.status === "open").length;
  const resN = db.tickets.length - openN;
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        {([["all", `Все · ${db.tickets.length}`], ["open", `Открытые · ${openN}`], ["resolved", `Решённые · ${resN}`]] as const).map(([k, l]) => (
          <button key={k} onClick={() => setF(k)}
            className={cx("rounded-full border px-3.5 py-1.5 text-[13px] font-bold transition-all cursor-pointer",
              f === k ? "border-ink-900 bg-ink-900 text-milk-50" : "border-ink-900/12 bg-white hover:border-ink-900/35")}>{l}</button>
        ))}
        <span className="basis-full text-xs font-semibold text-ink-700/55 sm:ml-auto sm:basis-auto">
          Кнопка «Сообщить об ошибке» видна каждому пользователю платформы — внизу слева на любом экране.
        </span>
      </div>
      {list.length === 0 && <Empty text="Обращений с таким статусом нет" />}
      {list.map((t) => (
        <div key={t.id} className={cx("rounded-xl border bg-white p-4 transition-all", t.status === "open" ? "border-honey-500/50 shadow-sm" : "border-ink-900/10 opacity-80")}>
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1.5">
            <Badge tone={t.status === "open" ? "honey" : "jade"}>{t.status === "open" ? "открыто" : "решено"}</Badge>
            <Badge tone="ink">{t.topic}</Badge>
            <span className="text-sm font-bold">{t.author}</span>
            {t.contact && <span className="text-xs font-semibold text-ink-700/60">{t.contact}</span>}
            <span className="ml-auto text-[11px] font-semibold text-ink-700/45">{timeAgo(t.createdAt)}</span>
          </div>
          <p className="mt-2.5 text-sm leading-relaxed text-ink-800/85">{t.message}</p>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <a href={t.page} className="flex items-center gap-1 text-xs font-bold text-berry-600 hover:underline">
              <IcExternal size={12} />Страница: {t.page}
            </a>
            <span className="ml-auto" />
            {t.status === "open" ? (
              <Btn v="dark" sm onClick={() => { setTicketStatus(t.id, "resolved"); toast("Обращение отмечено решённым"); }}>
                <IcCheck size={14} />Решено
              </Btn>
            ) : (
              <Btn v="outline" sm onClick={() => { setTicketStatus(t.id, "open"); toast("Обращение возвращено в работу", "info"); }}>
                Вернуть в работу
              </Btn>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

/* ─── Мастера ─── */
function MastersTab() {
  const db = useDB();
  const toast = useToast();
  const plans = db.settings.plans;
  const revenue = (id: string) => db.appointments.filter((a) => a.masterId === id && a.status === "done").reduce((s, a) => s + a.price, 0);
  return (
    <div className="space-y-3">
      <p className="text-xs font-semibold text-ink-700/55">Данные каждого мастера изолированы. Здесь — управление аккаунтами, тарифами и статусами.</p>
      {db.masters.map((m) => (
        <div key={m.id} className={cx("rounded-xl border bg-white p-4 transition-all", m.blocked ? "border-coral-500/40 opacity-75" : "border-ink-900/10 hover:shadow-md")}>
          <div className="flex flex-wrap items-center gap-3">
            <Avatar src={m.photo} name={m.name} color={m.color} size={44} />
            <div className="min-w-0 flex-1 basis-52">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-display font-semibold">{m.name}</span>
                {m.promoted && <Badge tone="berry"><IcCrown size={11} />Топ</Badge>}
                {m.verified && <Badge tone="jade">Проверен</Badge>}
                {m.blocked && <Badge tone="coral">Заблокирован</Badge>}
                {m.upgradeRequest && <Badge tone="honey">заявка: «{plans[m.upgradeRequest].label}»</Badge>}
              </div>
              <div className="mt-0.5 text-xs font-semibold text-ink-700/60">
                {m.profession} · <a className="text-berry-600 hover:underline" href={`#/m/${m.slug}`}>#/m/{m.slug}</a> · {m.login} · {fmtPhone(m.phone)}
              </div>
              <div className="mt-1 text-xs text-ink-700/55">Выручка {fmtMoney(revenue(m.id))} · {db.appointments.filter((a) => a.masterId === m.id).length} записей · {db.clients.filter((c) => c.masterId === m.id).length} клиентов{m.reviews > 0 && <> · <Stars v={m.rating} size={10} /> {m.rating}</>}</div>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <select className={cx(inp, "!w-32 !py-1.5 text-[13px]")} value={m.plan} onChange={(e) => { adminSetPlan(m.id, e.target.value as PlanId); toast(`Тариф ${m.name}: «${plans[e.target.value as PlanId].label}»`); }}>
                {(Object.keys(plans) as PlanId[]).map((p) => <option key={p} value={p}>{plans[p].label}</option>)}
              </select>
              <Btn v="outline" sm onClick={() => adminToggle(m.id, "promoted")} className={cx(m.promoted && "!border-berry-500 !text-berry-600")}><IcCrown size={14} />Топ</Btn>
              <Btn v="outline" sm onClick={() => adminToggle(m.id, "verified")} className={cx(m.verified && "!border-jade-500 !text-jade-600")}><IcShield size={14} /></Btn>
              <Btn v="dangerGhost" sm onClick={() => adminToggle(m.id, "blocked")}><IcBan size={14} />{m.blocked ? "Разблок." : "Блок"}</Btn>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

/* ─── Продвижение ─── */
function PromoTab() {
  const db = useDB();
  const toast = useToast();
  const plans = db.settings.plans;
  return (
    <div className="grid gap-5 lg:grid-cols-[1.1fr_.9fr]">
      <section className="rounded-xl border border-ink-900/10 bg-white p-5">
        <h3 className="font-display text-[15px] font-bold flex items-center gap-2"><IcBoost size={17} className="text-berry-600" />Инструменты продвижения</h3>
        <p className="mt-1 text-sm text-ink-700/65">Мастера с флагом «Топ» поднимаются наверх каталога, получают бейдж и первыми попадают в витрину на главной.</p>
        <div className="mt-4 space-y-2.5">
          {[...db.masters].sort((a, b) => Number(b.promoted) - Number(a.promoted)).map((m) => (
            <div key={m.id} className={cx("flex items-center gap-3 rounded-xl border-[1.5px] px-4 py-3 transition-all", m.promoted ? "border-berry-500/50 bg-berry-50" : "border-ink-900/10")}>
              <Avatar src={m.photo} name={m.name} color={m.color} size={38} />
              <div className="min-w-0 flex-1">
                <div className="text-sm font-bold flex items-center gap-2">{m.name}{m.promoted && <IcCrown size={14} className="text-berry-500" />}</div>
                <div className="text-xs text-ink-700/55">тариф «{plans[m.plan].label}» · {m.profession}</div>
              </div>
              <div className="flex items-center gap-2">
                <span className="hidden text-xs font-bold text-ink-700/55 sm:inline">Топ каталога</span>
                <Toggle on={m.promoted} onChange={() => { adminToggle(m.id, "promoted"); toast(m.promoted ? `${m.name} убран(а) из топа` : `${m.name} теперь в топе каталога`, "info"); }} />
              </div>
            </div>
          ))}
        </div>
      </section>
      <div className="space-y-5">
        <section className="rounded-xl border border-ink-900/10 bg-ink-900 p-5 text-milk-100">
          <h3 className="font-display text-[15px] font-bold text-berry-400">Как монетизировать продвижение</h3>
          <ul className="mt-3 space-y-2.5 text-sm text-milk-100/80">
            <li className="flex gap-2"><IcCrown size={15} className="mt-0.5 shrink-0 text-honey-400" />«Топ» доступен мастерам на тарифах Профи и Люкс — переключайте флаг после оплаты.</li>
            <li className="flex gap-2"><IcShield size={15} className="mt-0.5 shrink-0 text-jade-400" />Значок «Проверен» выдаётся после верификации документов — повышает конверсию записи.</li>
            <li className="flex gap-2"><IcBan size={15} className="mt-0.5 shrink-0 text-coral-500" />Блокировка скрывает страницу из каталога и запрещает вход в кабинет.</li>
          </ul>
        </section>
        <section className="rounded-xl border border-ink-900/10 bg-white p-5">
          <h3 className="font-display text-[15px] font-bold">Roadmap платформы</h3>
          <div className="mt-3 space-y-2">
            {([
              ["Салоны и команды", "несколько мастеров в одном аккаунте", "#/salon/pudra"],
              ["Маркетплейс мастеров", "поиск по городу, услуге и рейтингу", "#masters"],
              ["Рейтинги и отзывы", "клиенты оценивают визиты", "#/my"],
              ["Программы лояльности", "бонусы, абонементы, возвраты", "#/m/dana-skin"],
            ] as const).map(([t, d, href], i) => (
              <a key={t} href={href} className="flex items-center gap-3 rounded-lg bg-milk-100 px-3.5 py-2.5 transition-colors hover:bg-berry-50">
                <span className="font-display text-sm font-bold text-ink-900/30 tabular-nums">0{i + 1}</span>
                <div><div className="text-sm font-bold">{t}</div><div className="text-xs text-ink-700/55">{d}</div></div>
                <Badge className="ml-auto" tone="jade"><IcCheck size={10} />работает</Badge>
              </a>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}

/* ─── Тарифы и лимиты ─── */
function PlansTab() {
  const db = useDB();
  const toast = useToast();
  const plans = db.settings.plans;
  const num = (v: string, fb: number) => { const n = parseInt(v, 10); return Number.isFinite(n) && n >= 0 ? n : fb; };
  return (
    <div>
      <p className="mb-4 max-w-2xl text-xs font-semibold text-ink-700/55">
        Лимиты применяются мгновенно ко всем мастерам тарифа: количество услуг, глубина статистики, напоминания и место в каталоге. Это и есть рычаг будущей монетизации.
      </p>
      <div className="grid gap-4 lg:grid-cols-3">
        {(Object.keys(plans) as PlanId[]).map((p) => {
          const pl = plans[p];
          const cnt = db.masters.filter((m) => m.plan === p).length;
          return (
            <div key={p} className={cx("rounded-xl border-[1.5px] bg-white p-5", p === "pro" ? "border-berry-500" : "border-ink-900/10")}>
              <div className="flex items-center justify-between">
                <h3 className="font-display text-lg font-bold">«{pl.label}»</h3>
                <Badge>{cnt} {plural(cnt, ["мастер", "мастера", "мастеров"])}</Badge>
              </div>
              <div className="mt-4 space-y-3">
                <Field label="Цена, BYN/мес"><input type="number" min={0} className={inp} defaultValue={pl.price} onBlur={(e) => { adminUpdatePlan(p, { price: num(e.target.value, pl.price) }); toast("Цена обновлена", "info"); }} /></Field>
                <Field label="Лимит услуг"><input type="number" min={1} className={inp} defaultValue={pl.maxServices} onBlur={(e) => { adminUpdatePlan(p, { maxServices: num(e.target.value, pl.maxServices) }); toast("Лимит услуг обновлён", "info"); }} /></Field>
                <Field label="Статистика, дней">
                  <select className={inp} value={pl.statDays} onChange={(e) => { adminUpdatePlan(p, { statDays: +e.target.value }); toast("Глубина статистики обновлена", "info"); }}>
                    {[7, 30, 90, 180, 365].map((d) => <option key={d} value={d}>{d} дней</option>)}
                  </select>
                </Field>
                <div className="flex items-center justify-between rounded-lg bg-milk-100 px-3.5 py-2.5">
                  <span className="text-sm font-bold">Push-напоминания</span>
                  <Toggle on={pl.reminders} onChange={(v) => { adminUpdatePlan(p, { reminders: v }); toast(v ? "Напоминания включены для тарифа" : "Напоминания выключены для тарифа", "info"); }} />
                </div>
                <div className="flex items-center justify-between rounded-lg bg-milk-100 px-3.5 py-2.5">
                  <span className="text-sm font-bold">Приоритет в каталоге</span>
                  <span className="font-display font-bold text-berry-600">×{pl.priority}</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ─── Настройки ─── */
function SettingsTab() {
  const db = useDB();
  const toast = useToast();
  const [cur, setCur] = useState("");
  const [login, setLogin] = useState(db.settings.adminLogin);
  const [pass, setPass] = useState("");
  const [reset, setReset] = useState(false);

  const save = () => {
    if (!pass) return toast("Введите новый пароль", "err");
    const err = updateAdminCreds(cur, login, pass);
    if (err) return toast(err, "err");
    setCur(""); setPass("");
    toast("Данные входа администратора обновлены");
  };

  return (
    <div className="grid gap-5 lg:grid-cols-2">
      <section className="rounded-xl border border-ink-900/10 bg-white p-5">
        <h3 className="font-display text-[15px] font-bold flex items-center gap-2"><IcLock size={17} className="text-berry-600" />Доступ к админ-панели</h3>
        <p className="mt-1 text-xs text-ink-700/55">Смена логина и пароля администратора. Для подтверждения нужен текущий пароль.</p>
        <div className="mt-4 space-y-3">
          <Field label="Текущий пароль"><input type="password" className={inp} value={cur} onChange={(e) => setCur(e.target.value)} placeholder="••••••" /></Field>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Новый логин"><input className={inp} value={login} onChange={(e) => setLogin(e.target.value)} /></Field>
            <Field label="Новый пароль"><input type="password" className={inp} value={pass} onChange={(e) => setPass(e.target.value)} placeholder="минимум 4 символа" /></Field>
          </div>
          <Btn v="dark" onClick={save}><IcCheck size={16} />Сохранить доступ</Btn>
        </div>
      </section>
      <div className="space-y-5">
        <section className="rounded-xl border border-ink-900/10 bg-white p-5">
          <h3 className="font-display text-[15px] font-bold flex items-center gap-2"><IcBell size={17} className="text-honey-600" />Служебные уведомления</h3>
          <AdminNotifs />
        </section>
        <section className="rounded-xl border border-ink-900/10 bg-white p-5">
          <h3 className="font-display text-[15px] font-bold flex items-center gap-2">
            <IcCloud size={17} className="text-jade-600" />Данные и облако
            {cloudOn() ? <Badge tone="jade">подключено</Badge> : <Badge tone="honey">локальный режим</Badge>}
          </h3>
          {cloudOn() ? (
            <>
              <p className="mt-1.5 text-xs leading-relaxed text-ink-700/65">
                Данные общие для всех устройств: записи клиентов, мастера, тарифы и пароль администратора синхронизируются за несколько секунд. Смена пароля на телефоне сразу действует везде.
              </p>
              <Btn v="dark" sm className="mt-3" onClick={async () => { const e = await pushLocalToCloud(); e ? toast(e, "err") : toast("Локальные данные загружены в облако"); }}>
                <IcCloud size={14} />Загрузить локальные данные в облако
              </Btn>
            </>
          ) : (
            <p className="mt-1.5 text-xs leading-relaxed text-ink-700/65">
              Пока данные хранятся в браузере каждого посетителя отдельно — поэтому на другом телефоне действует старый пароль, а записи клиентов не видны мастеру. Чтобы включить общее хранилище: создайте бесплатный проект на <b>supabase.com</b>, выполните SQL-скрипт из README (раздел «Общее хранилище») и вставьте два ключа в файл <b>src/lib/cloud.ts</b> в репозитории. Сайт обновится автоматически.
            </p>
          )}
        </section>
        <section className="rounded-xl border-[1.5px] border-coral-500/40 bg-white p-5">
          <h3 className="font-display text-[15px] font-bold text-coral-600">Демо-данные</h3>
          <p className="mt-1 text-xs text-ink-700/60">Полный сброс платформы к исходному состоянию: мастера, записи, клиенты и настройки вернутся к демо-версии.</p>
          <Btn v="dangerGhost" sm className="mt-3" onClick={() => setReset(true)}>Сбросить демо-данные</Btn>
        </section>
      </div>
      <Confirm open={reset} onClose={() => setReset(false)} onYes={resetDemo} danger title="Сбросить все данные?" text="Все изменения — записи, клиенты, настройки тарифов и доступы — будут заменены демо-данными. Действие необратимо." />
    </div>
  );
}

function AdminNotifs() {
  const db = useDB();
  const list = db.notifications.filter((n) => n.target.kind === "admin").slice(0, 6);
  const unread = unreadFor(db, { kind: "admin" });
  return (
    <>
      <div className="mt-3 space-y-1.5">
        {list.length === 0 && <p className="text-xs text-ink-700/50">Уведомлений нет</p>}
        {list.map((n) => (
          <button key={n.id} onClick={() => markRead(n.id)} className={cx("block w-full rounded-lg border px-3.5 py-2.5 text-left cursor-pointer hover:bg-milk-100", n.read ? "border-ink-900/6 opacity-65" : "border-honey-500/40 bg-honey-100/60")}>
            <div className="flex items-center gap-2 text-[13px] font-bold"><span className={cx("h-1.5 w-1.5 rounded-full", n.read ? "bg-ink-900/20" : "bg-honey-500")} />{n.title}<span className="ml-auto text-[10px] font-semibold text-ink-700/45">{timeAgo(n.createdAt)}</span></div>
            <div className="mt-0.5 pl-3.5 text-xs text-ink-800/70">{n.body}</div>
          </button>
        ))}
      </div>
      {unread > 0 && <button onClick={() => markAllRead({ kind: "admin" })} className="mt-3 text-xs font-bold text-berry-600 hover:underline cursor-pointer">Прочитать все ({unread})</button>}
    </>
  );
}

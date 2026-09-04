import { useEffect, useMemo, useState } from "react";
import type { Appointment, Master, Notif } from "../../lib/types";
import { PAYMENTS, STATUS_META } from "../../lib/types";
import { useDB, useSession, logout, book, setApptStatus, rescheduleAppt, planOf, markAllRead, markRead, unreadFor, unreadChatFor } from "../../lib/store";
import { freeSlots, nextDays, todayISO, fmtDate, fmtRange, mondayOf, addDays, fromISO, mh, hm, wdIndex, WD, dayInfo, isActive } from "../../lib/schedule";
import { cx, fmtMoney, fmtPhone, timeAgo, telHref, downloadICS, isPhoneLike } from "../../lib/util";
import { Btn, Modal, Confirm, useToast, inp, Field, Avatar, StatusBadge, CalendarMonth, SlotChips } from "../../components/ui";
import {
  IcCalendar, IcUsers, IcChart, IcBell, IcSliders, IcSparkle, IcLogout, IcExternal,
  IcPlus, IcCheck, IcX, IcClock, IcArrowL, IcArrowR, IcUser, IcChat, IcPhone, IcDownload,
} from "../../components/icons";
import { ServicesTab, ScheduleTab, NotifsTab, ProfileTab, ChatTab } from "./Manage";
import { StatsTab, ClientsTab } from "./Insights";

const TABS = [
  { id: "calendar", label: "Календарь", ic: IcCalendar },
  { id: "clients", label: "Клиенты", ic: IcUsers },
  { id: "services", label: "Услуги", ic: IcSparkle },
  { id: "schedule", label: "График", ic: IcSliders },
  { id: "stats", label: "Статистика", ic: IcChart },
  { id: "notifs", label: "Уведомления", ic: IcBell },
  { id: "chat", label: "Чат", ic: IcChat },
  { id: "profile", label: "Кабинет", ic: IcUser },
] as const;
type TabId = (typeof TABS)[number]["id"];

export default function Cabinet() {
  const db = useDB();
  const session = useSession();
  if (session?.kind !== "master") {
    location.hash = "#/login";
    return null;
  }
  const master = db.masters.find((m) => m.id === session.masterId);
  if (!master) {
    logout();
    return null;
  }
  return <Shell master={master} />;
}

function Shell({ master }: { master: Master }) {
  const db = useDB();
  const [tab, setTab] = useState<TabId>("calendar");
  const [sel, setSel] = useState<Appointment | null>(null);
  const [resched, setResched] = useState<Appointment | null>(null);
  const [booking, setBooking] = useState<{ clientId?: string; date?: string; start?: string } | null>(null);
  const [bellOpen, setBellOpen] = useState(false);
  const unread = unreadFor(db, { kind: "master", id: master.id });
  const chatUnread = unreadChatFor(db, master.id, "master");
  const liveSel = sel ? db.appointments.find((a) => a.id === sel.id) ?? null : null;
  const plan = planOf(master);

  /** Клик по уведомлению: открыть связанную запись / чат */
  const openNotif = (n: Notif) => {
    markRead(n.id);
    setBellOpen(false);
    if (n.chat) { setTab("chat"); return; }
    if (n.apptId) {
      const a = db.appointments.find((x) => x.id === n.apptId);
      if (a) { setSel(a); setTab("calendar"); return; }
    }
    if (n.masterId) setTab("calendar");
  };

  return (
    <div className="flex min-h-screen bg-milk-100 text-ink-900">
      {/* Сайдбар (desktop) */}
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-60 flex-col bg-ink-950 text-milk-100 lg:flex">
        <div className="flex items-center gap-3 px-5 pt-5">
          <Avatar src={master.photo} name={master.name} color={master.color} size={40} />
          <div className="min-w-0">
            <div className="truncate font-display text-[14px] font-bold leading-tight">{master.name}</div>
            <div className="truncate text-[11px] font-semibold text-milk-100/55">{master.profession}</div>
          </div>
        </div>
        <a href={`#/m/${master.slug}`} className="mx-4 mt-4 flex items-center justify-center gap-2 rounded-lg border border-milk-100/15 px-3 py-2 text-[12px] font-bold text-milk-100/80 transition-colors hover:border-berry-400 hover:text-berry-300">
          <IcExternal size={14} />Моя страница
        </a>
        <nav className="mt-5 flex-1 space-y-1 px-3">
          {TABS.map((t) => (
            <button key={t.id} onClick={() => setTab(t.id)}
              className={cx("flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-bold transition-all cursor-pointer",
                tab === t.id ? "bg-berry-600 text-white shadow-lg shadow-berry-600/25" : "text-milk-100/60 hover:bg-milk-100/8 hover:text-milk-100")}>
              <t.ic size={17} />{t.label}
              {t.id === "notifs" && unread > 0 && <span className="ml-auto rounded-full bg-honey-500 px-1.5 py-0.5 text-[10px] font-bold text-ink-950 tabular-nums">{unread}</span>}
              {t.id === "chat" && chatUnread > 0 && <span className="ml-auto rounded-full bg-berry-500 px-1.5 py-0.5 text-[10px] font-bold text-white tabular-nums">{chatUnread}</span>}
            </button>
          ))}
        </nav>
        <div className="space-y-2 p-4">
          <div className="rounded-lg bg-milk-100/6 px-3 py-2.5 text-[11px] font-semibold text-milk-100/60">
            Тариф «{plan.label}» · до {plan.maxServices >= 999 ? "∞" : plan.maxServices} услуг
          </div>
          <button onClick={() => { logout(); location.hash = "#/"; }} className="flex w-full items-center justify-center gap-2 rounded-lg px-3 py-2.5 text-[13px] font-bold text-milk-100/50 transition-colors hover:bg-milk-100/8 hover:text-coral-500 cursor-pointer">
            <IcLogout size={15} />Выйти
          </button>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col lg:pl-60">
        {/* Верхняя панель */}
        <header className="sticky top-0 z-30 border-b border-ink-900/8 bg-milk-100/85 backdrop-blur-md">
          <div className="flex h-16 items-center justify-between px-4 sm:px-6">
            <div className="flex items-center gap-3">
              <span className="grid h-9 w-9 place-items-center rounded-lg bg-ink-900 text-berry-400 lg:hidden"><IcSparkle size={19} /></span>
              <div>
                <h1 className="font-display text-[17px] font-bold leading-tight">{TABS.find((t) => t.id === tab)?.label}</h1>
                <p className="text-[11px] font-semibold text-ink-700/55">Кабинет · {master.name}</p>
              </div>
            </div>
            <div className="relative flex items-center gap-2">
              <button onClick={() => setBellOpen(!bellOpen)} className="relative grid h-10 w-10 place-items-center rounded-lg border border-ink-900/10 bg-white text-ink-800 transition-colors hover:border-berry-400 cursor-pointer" aria-label="Уведомления">
                <IcBell size={18} />
                {unread > 0 && <span className="absolute -right-1 -top-1 grid h-5 min-w-5 place-items-center rounded-full bg-coral-500 px-1 text-[10px] font-bold text-white tabular-nums">{unread}</span>}
              </button>
              <a href={`#/m/${master.slug}`} className="hidden sm:inline-flex"><Btn v="outline" sm><IcExternal size={14} />Моя страница</Btn></a>
              {bellOpen && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setBellOpen(false)} />
                  <div className="absolute right-0 top-12 z-50 w-[min(20rem,calc(100vw-2rem))] rounded-xl border border-ink-900/10 bg-white shadow-2xl shadow-ink-950/20 animate-pop">
                    <div className="flex items-center justify-between border-b border-ink-900/8 px-4 py-3">
                      <span className="font-display text-sm font-bold">Уведомления</span>
                      {unread > 0 && <button onClick={() => markAllRead({ kind: "master", id: master.id })} className="text-[11px] font-bold text-berry-600 hover:underline cursor-pointer">Прочитать все</button>}
                    </div>
                    <div className="max-h-80 overflow-y-auto p-2">
                      {db.notifications.filter((n) => n.target.kind === "master" && n.target.id === master.id).slice(0, 8).map((n) => (
                        <button key={n.id} onClick={() => openNotif(n)} title="Открыть" className={cx("block w-full rounded-lg px-3 py-2.5 text-left transition-colors cursor-pointer hover:bg-milk-100 active:bg-berry-50", !n.read && "bg-honey-100/60")}>
                          <div className="flex items-center gap-2 text-[13px] font-bold">
                            <span className={cx("h-1.5 w-1.5 shrink-0 rounded-full", n.read ? "bg-ink-900/20" : "bg-honey-500")} />{n.title}
                            <span className="ml-auto shrink-0 text-[10px] font-semibold text-ink-700/45">{timeAgo(n.createdAt)}</span>
                          </div>
                          <div className="mt-0.5 pl-3.5 text-xs text-ink-800/70">{n.body}</div>
                          {(n.apptId || n.chat) && <div className="mt-1 pl-3.5 text-[10px] font-bold uppercase tracking-wider text-berry-600">{n.chat ? "Открыть чат →" : "Открыть запись →"}</div>}
                        </button>
                      ))}
                      {db.notifications.filter((n) => n.target.kind === "master" && n.target.id === master.id).length === 0 && (
                        <p className="px-3 py-6 text-center text-xs font-semibold text-ink-700/50">Пока тихо</p>
                      )}
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </header>

        <main className="flex-1 px-4 py-5 sm:px-6 pb-[max(5.5rem,env(safe-area-inset-bottom))] lg:pb-8">
          {tab === "calendar" && <CalendarTab master={master} onNew={(p) => setBooking(p)} onOpen={setSel} />}
          {tab === "clients" && <ClientsTab master={master} onBook={(clientId) => setBooking({ clientId })} />}
          {tab === "services" && <ServicesTab master={master} />}
          {tab === "schedule" && <ScheduleTab master={master} />}
          {tab === "stats" && <StatsTab master={master} />}
          {tab === "notifs" && <NotifsTab master={master} onOpenAppt={(apptId) => { const a = db.appointments.find((x) => x.id === apptId); if (a) { setSel(a); setTab("calendar"); } }} />}
          {tab === "chat" && <ChatTab master={master} />}
          {tab === "profile" && <ProfileTab master={master} />}
        </main>
      </div>

      {/* Мобильная навигация */}
      <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-ink-900/10 bg-white/95 backdrop-blur-md lg:hidden">
        <div className="flex items-stretch justify-between px-1 pb-[max(0.35rem,env(safe-area-inset-bottom))]">
          {TABS.map((t) => (
            <button key={t.id} onClick={() => setTab(t.id)}
              className={cx("relative flex flex-1 flex-col items-center gap-0.5 py-2 text-[9px] font-bold transition-colors cursor-pointer", tab === t.id ? "text-berry-600" : "text-ink-700/50")}>
              <t.ic size={19} />
              {t.label}
              {t.id === "notifs" && unread > 0 && <span className="absolute right-1/4 top-1 grid h-4 min-w-4 place-items-center rounded-full bg-coral-500 px-0.5 text-[9px] font-bold text-white tabular-nums">{unread}</span>}
              {t.id === "chat" && chatUnread > 0 && <span className="absolute right-1/4 top-1 grid h-4 min-w-4 place-items-center rounded-full bg-berry-500 px-0.5 text-[9px] font-bold text-white tabular-nums">{chatUnread}</span>}
            </button>
          ))}
        </div>
      </nav>

      {liveSel && <ApptDrawer master={master} appt={liveSel} onClose={() => setSel(null)} onResched={() => { setResched(liveSel); setSel(null); }} />}
      {resched && <RescheduleModal master={master} appt={resched} onClose={() => setResched(null)} />}
      {booking && <NewBookingModal master={master} init={booking} onClose={() => setBooking(null)} />}
    </div>
  );
}

/* ─── Календарь ─── */
const PXH = 52; // px на час

function CalendarTab({ master, onNew, onOpen }: { master: Master; onNew: (p: { date?: string; start?: string }) => void; onOpen: (a: Appointment) => void }) {
  const db = useDB();
  const [monday, setMonday] = useState(mondayOf(todayISO()));
  const days = useMemo(() => nextDays(7).map((_, i) => addDays(monday, i)), [monday]);
  const appts = db.appointments.filter((a) => a.masterId === master.id);
  const today = todayISO();

  const infos = days.map((d) => dayInfo(master, d));
  const workDays = infos.filter(Boolean) as NonNullable<typeof infos[number]>[];
  const minH = Math.min(...(workDays.length ? workDays.map((i) => i.start) : [600]), 600);
  const maxH = Math.max(...(workDays.length ? workDays.map((i) => i.end) : [1200]), 1200);
  const colH = ((maxH - minH) / 60) * PXH;

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-1.5">
          <button onClick={() => setMonday(addDays(monday, -7))} className="grid h-9 w-9 place-items-center rounded-lg border border-ink-900/12 bg-white hover:border-berry-400 cursor-pointer" aria-label="Предыдущая неделя"><IcArrowL size={16} /></button>
          <button onClick={() => setMonday(mondayOf(todayISO()))} className="rounded-lg border border-ink-900/12 bg-white px-3 py-1.5 text-[13px] font-bold hover:border-berry-400 cursor-pointer">Сегодня</button>
          <button onClick={() => setMonday(addDays(monday, 7))} className="grid h-9 w-9 place-items-center rounded-lg border border-ink-900/12 bg-white hover:border-berry-400 cursor-pointer" aria-label="Следующая неделя"><IcArrowR size={16} /></button>
          <span className="ml-2 font-display text-sm font-bold">{fmtRange(days[0], days[6])}</span>
        </div>
        <div className="flex flex-wrap gap-2">
          <SyncCalendarBtn master={master} />
          <Btn sm onClick={() => onNew({})}><IcPlus size={15} />Новая запись</Btn>
        </div>
      </div>
      <p className="text-[11px] font-semibold text-ink-700/50 sm:hidden">Листайте таблицу вправо → · клик по пустому месту создаёт запись</p>
      <p className="hidden text-[11px] font-semibold text-ink-700/50 sm:block">Клик по пустому месту создаёт запись · клик по записи открывает действия</p>

      <div className="overflow-x-auto rounded-xl border border-ink-900/10 bg-white shadow-sm">
        <div className="min-w-[680px]">
          <div className="grid" style={{ gridTemplateColumns: "56px repeat(7, 1fr)" }}>
            <div className="border-b border-ink-900/8" />
            {days.map((d, i) => (
              <div key={d} className={cx("border-b border-l border-ink-900/8 px-2 py-2 text-center", d === today && "bg-berry-50")}>
                <div className="text-[10px] font-bold uppercase tracking-wider text-ink-700/55">{WD[i]}</div>
                <div className={cx("font-display text-base font-bold tabular-nums", d === today ? "text-berry-600" : "")}>{fromISO(d).getDate()}</div>
              </div>
            ))}
          </div>
          <div className="grid" style={{ gridTemplateColumns: "56px repeat(7, 1fr)" }}>
            {/* часы */}
            <div className="relative" style={{ height: colH }}>
              {Array.from({ length: Math.round((maxH - minH) / 60) + 1 }, (_, i) => minH + i * 60).filter((m) => m <= maxH).map((m) => (
                <span key={m} className="absolute right-2 -translate-y-1/2 text-[10px] font-bold tabular-nums text-ink-700/45">{mh(m)}</span>
              ))}
            </div>
            {days.map((d, di) => {
              const info = infos[di];
              const dayAppts = appts.filter((a) => a.date === d && a.status !== "cancelled");
              return (
                <div key={d}
                  className={cx("relative cursor-pointer border-l border-ink-900/8", !info && "bg-ink-900/4")}
                  style={{ height: colH }}
                  onClick={(e) => {
                    if (!info) return;
                    const rect = (e.currentTarget as HTMLDivElement).getBoundingClientRect();
                    const min = minH + Math.floor(((e.clientY - rect.top) / PXH) * 60 / master.schedule.slotStep) * master.schedule.slotStep;
                    onNew({ date: d, start: mh(Math.max(min, info.start)) });
                  }}>
                  {info && Array.from({ length: Math.round((info.end - info.start) / 60) }, (_, i) => info.start + i * 60).map((m) => (
                    <div key={m} className="absolute inset-x-0 border-t border-ink-900/5" style={{ top: ((m - minH) / 60) * PXH }} />
                  ))}
                  {info?.busy.map((b, i) => (
                    <div key={i} title={b.label}
                      className="absolute inset-x-1 z-[1] rounded-md border border-dashed border-ink-900/25 bg-ink-900/6 text-center text-[9px] font-bold text-ink-700/60"
                      style={{ top: ((b.s - minH) / 60) * PXH, height: ((b.e - b.s) / 60) * PXH }}>
                      {b.label}
                    </div>
                  ))}
                  {dayAppts.map((a) => {
                    const as = hm(a.start);
                    const meta = STATUS_META[a.status];
                    return (
                      <button key={a.id}
                        onClick={(e) => { e.stopPropagation(); onOpen(a); }}
                        className="absolute inset-x-1 z-[2] overflow-hidden rounded-md border-l-[3px] bg-white px-1.5 py-1 text-left shadow-sm transition-all hover:shadow-md hover:z-[3] cursor-pointer"
                        style={{ top: ((as - minH) / 60) * PXH + 1, height: (a.durationMin / 60) * PXH - 2, borderLeftColor: a.serviceColor }}>
                        <span className="block text-[10px] font-bold tabular-nums" style={{ color: meta.color }}>{a.start}</span>
                        {a.durationMin * (PXH / 60) > 34 && <span className="block truncate text-[10px] font-semibold leading-tight">{cname(db, a.clientId)} · {a.serviceName}</span>}
                      </button>
                    );
                  })}
                </div>
              );
            })}
          </div>
        </div>
      </div>
      <div className="flex flex-wrap gap-x-4 gap-y-1.5 text-[11px] font-bold text-ink-700/60">
        {(["pending", "confirmed", "done", "no_show"] as const).map((s) => (
          <span key={s} className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm" style={{ background: STATUS_META[s].color }} />{STATUS_META[s].label}</span>
        ))}
      </div>
    </div>
  );
}

function cname(db: ReturnType<typeof useDB>, clientId: string) {
  return db.clients.find((c) => c.id === clientId)?.name ?? "Клиент";
}

/** Синхронизация календаря со штатным календарём смартфона (iOS / Android / десктоп) */
function SyncCalendarBtn({ master }: { master: Master }) {
  const db = useDB();
  const toast = useToast();
  const exportAll = () => {
    const today = todayISO();
    const events = db.appointments
      .filter((a) => a.masterId === master.id && a.date >= today && isActive(a))
      .sort((a, b) => (a.date + a.start).localeCompare(b.date + b.start))
      .map((a) => {
        const c = db.clients.find((x) => x.id === a.clientId);
        return {
          title: `${a.serviceName} — ${c?.name ?? "клиент"}`,
          date: a.date, start: a.start, durationMin: a.durationMin,
          address: master.address || "",
          description: `Клиент: ${c?.name ?? ""}${c ? ", " + fmtPhone(c.phone) : ""} · ${PAYMENTS[a.paymentMethod]} · ${fmtMoney(a.price)}`,
        };
      });
    if (events.length === 0) return toast("Будущих записей пока нет", "info");
    const r = downloadICS(events, "glyanets-kalendar.ics");
    toast(r === "shared"
      ? `Выберите «Календарь» в окне — добавится ${events.length} ${events.length === 1 ? "событие" : events.length < 5 ? "события" : "событий"}`
      : "Файл календаря скачан — откройте его, чтобы импортировать события");
  };
  return (
    <Btn sm v="outline" onClick={exportAll} title="Добавить все будущие записи в календарь телефона">
      <IcDownload size={14} /><span className="hidden sm:inline">Синхронизировать</span><span className="sm:hidden">Календарь</span>
    </Btn>
  );
}

/* ─── Карточка записи ─── */
function ApptDrawer({ master, appt, onClose, onResched }: { master: Master; appt: Appointment; onClose: () => void; onResched: () => void }) {
  const db = useDB();
  const toast = useToast();
  const [cancelAsk, setCancelAsk] = useState(false);
  const client = db.clients.find((c) => c.id === appt.clientId);
  const act = (s: Appointment["status"], msg: string) => {
    const err = setApptStatus(appt.id, s, "master");
    if (err) return toast(err, "err");
    toast(msg);
    if (s === "cancelled") onClose();
  };
  return (
    <Modal open onClose={onClose} title="Запись">
      <div className="flex items-center gap-3">
        <Avatar name={client?.name ?? "Клиент"} color={master.color} size={44} />
        <div className="min-w-0">
          <div className="font-display font-semibold">{client?.name ?? "Клиент"}</div>
          {client && (
            <a href={telHref(client.phone)}
              className="mt-0.5 inline-flex items-center gap-1.5 rounded-md bg-jade-100 px-2 py-0.5 text-[12px] font-bold text-jade-700 transition-all hover:bg-jade-500 hover:text-white active:scale-95 cursor-pointer">
              <IcPhone size={12} />{fmtPhone(client.phone)}
            </a>
          )}
        </div>
        <span className="ml-auto"><StatusBadge s={appt.status} /></span>
      </div>
      <div className="mt-4 grid grid-cols-2 gap-2 text-sm">
        <div className="rounded-lg bg-milk-100 px-3 py-2.5"><div className="text-[10px] font-bold uppercase text-ink-700/50">Услуга</div><div className="font-bold">{appt.serviceName}</div></div>
        <div className="rounded-lg bg-milk-100 px-3 py-2.5"><div className="text-[10px] font-bold uppercase text-ink-700/50">Когда</div><div className="font-bold tabular-nums">{fmtDate(appt.date)}, {appt.start}</div></div>
        <div className="rounded-lg bg-milk-100 px-3 py-2.5"><div className="text-[10px] font-bold uppercase text-ink-700/50">Длительность</div><div className="font-bold">{appt.durationMin} мин</div></div>
        <div className="rounded-lg bg-milk-100 px-3 py-2.5"><div className="text-[10px] font-bold uppercase text-ink-700/50">Оплата</div><div className="font-bold">{PAYMENTS[appt.paymentMethod]} · {fmtMoney(appt.price)}</div></div>
      </div>
      <div className="mt-2 rounded-lg bg-milk-100 px-3 py-2 text-[11px] font-semibold text-ink-700/60">
        Источник: {appt.source === "online" ? "онлайн-запись" : "создана мастером"} · {timeAgo(appt.createdAt)}
      </div>
      <div className="mt-4 flex flex-wrap gap-2">
        {appt.status === "pending" && <Btn sm onClick={() => act("confirmed", "Запись подтверждена, клиент уведомлён")}><IcCheck size={14} />Подтвердить</Btn>}
        {(appt.status === "pending" || appt.status === "confirmed") && (
          <>
            <Btn sm v="dark" onClick={() => act("done", "Визит завершён")}>Завершить</Btn>
            <Btn sm v="outline" onClick={onResched}><IcClock size={14} />Перенести</Btn>
            <Btn sm v="dangerGhost" onClick={() => setCancelAsk(true)}><IcX size={14} />Отменить</Btn>
          </>
        )}
        {appt.status === "done" && <Btn sm v="outline" onClick={() => act("no_show", "Отмечено: клиент не пришёл")}>Клиент не пришёл</Btn>}
        {(appt.status === "pending" || appt.status === "confirmed") && (
          <Btn sm v="ghost" onClick={() => {
            const r = downloadICS({ title: `${appt.serviceName} — ${client?.name ?? "клиент"}`, date: appt.date, start: appt.start, durationMin: appt.durationMin, address: master.address || "", description: `Клиент: ${client?.name ?? ""}, ${client ? fmtPhone(client.phone) : ""}` });
            toast(r === "shared" ? "Выберите «Календарь» в окне — событие добавится" : "Файл скачан — откройте его, чтобы добавить событие");
          }}><IcCalendar size={14} />В календарь</Btn>
        )}
      </div>
      <Confirm open={cancelAsk} onClose={() => setCancelAsk(false)} onYes={() => act("cancelled", "Запись отменена, клиент уведомлён")} danger
        title="Отменить запись?" text="Слот станет свободным, а клиент получит уведомление об отмене." />
    </Modal>
  );
}

/* ─── Новая запись ─── */
function NewBookingModal({ master, init, onClose }: { master: Master; init: { clientId?: string; date?: string; start?: string }; onClose: () => void }) {
  const db = useDB();
  const toast = useToast();
  const myClients = db.clients.filter((c) => c.masterId === master.id);
  const svcs = db.services.filter((s) => s.masterId === master.id && s.active);
  const [mode, setMode] = useState<"client" | "new">(init.clientId ? "client" : "new");
  const [clientId, setClientId] = useState(init.clientId ?? "");
  const [nName, setNName] = useState("");
  const [nPhone, setNPhone] = useState("");
  const [svcId, setSvcId] = useState(svcs[0]?.id ?? "");
  const days = nextDays(14);
  const [date, setDate] = useState(init.date ?? days[0]);
  const [start, setStart] = useState<string | null>(init.start ?? null);
  const svc = svcs.find((s) => s.id === svcId);
  const slots = useMemo(() => (svc ? freeSlots(master, db.appointments, date, svc.durationMin) : []), [master, db.appointments, date, svc]);
  const [payment, setPayment] = useState(master.paymentMethods[0]);

  useEffect(() => {
    if (start && !slots.includes(start)) setStart(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slots.join(",")]);

  const submit = () => {
    if (!svc) return;
    const isClient = mode === "client";
    const res = book({
      masterId: master.id, serviceId: svc.id, date, start: start ?? "",
      name: isClient ? (db.clients.find((c) => c.id === clientId)?.name ?? "") : nName,
      phone: isClient ? (db.clients.find((c) => c.id === clientId)?.phone ?? "") : nPhone,
      paymentMethod: payment, byClient: false, clientId: isClient ? clientId : undefined,
    });
    if (!res.ok) return toast(res.error!, "err");
    toast(res.newClient ? "Запись создана, клиент добавлен в CRM" : "Запись создана");
    onClose();
  };

  return (
    <Modal open onClose={onClose} title="Новая запись" wide>
      <div className="grid gap-5 sm:grid-cols-2">
        <div className="space-y-3.5">
          <div className="flex rounded-lg border border-ink-900/10 bg-milk-100 p-1">
            {([["new", "Новый клиент"], ["client", "Из базы"]] as const).map(([k, l]) => (
              <button key={k} onClick={() => setMode(k)}
                className={cx("flex-1 rounded-md py-1.5 text-[13px] font-bold transition-all cursor-pointer", mode === k ? "bg-white shadow text-ink-900" : "text-ink-700/60")}>{l}</button>
            ))}
          </div>
          {mode === "new" ? (
            <>
              <Field label="Имя клиента"><input className={inp} value={nName} onChange={(e) => setNName(e.target.value)} placeholder="Анна" /></Field>
              <Field label="Телефон"><input className={inp} type="tel" placeholder="+375 29 000-00-00" value={nPhone} onChange={(e) => setNPhone(e.target.value)} /></Field>
            </>
          ) : (
            <div>
              <Field label="Клиент">
                <select className={inp} value={clientId} onChange={(e) => setClientId(e.target.value)}>
                  <option value="">— выберите —</option>
                  {myClients.map((c) => <option key={c.id} value={c.id}>{c.name} · {fmtPhone(c.phone)}</option>)}
                </select>
              </Field>
              {clientId && (() => {
                const c = myClients.find((x) => x.id === clientId);
                return c ? (
                  <a href={telHref(c.phone)} className="mt-2 inline-flex items-center gap-1.5 rounded-md bg-jade-100 px-2.5 py-1 text-[12px] font-bold text-jade-700 transition-all hover:bg-jade-500 hover:text-white active:scale-95">
                    <IcPhone size={12} />Позвонить: {fmtPhone(c.phone)}
                  </a>
                ) : null;
              })()}
            </div>
          )}
          <Field label="Услуга">
            <select className={inp} value={svcId} onChange={(e) => { setSvcId(e.target.value); setStart(null); }}>
              {svcs.map((s) => <option key={s.id} value={s.id}>{s.name} · {s.durationMin} мин · {fmtMoney(s.price)}</option>)}
            </select>
          </Field>
          <Field label="Оплата">
            <div className="flex flex-wrap gap-1.5">
              {master.paymentMethods.map((p) => (
                <button key={p} onClick={() => setPayment(p)}
                  className={cx("rounded-md border-[1.5px] px-3 py-1.5 text-xs font-bold cursor-pointer", payment === p ? "border-jade-500 bg-jade-100 text-jade-700" : "border-ink-900/12 hover:border-jade-400")}>{PAYMENTS[p]}</button>
              ))}
            </div>
          </Field>
        </div>
        <div>
          <Field label="Дата">
            <div className="flex gap-1.5 overflow-x-auto pb-1">
              {days.map((d) => {
                const n = svc ? freeSlots(master, db.appointments, d, svc.durationMin).length : 0;
                return (
                  <button key={d} onClick={() => { setDate(d); setStart(null); }} disabled={n === 0}
                    className={cx("flex min-w-[52px] flex-col items-center rounded-lg border-[1.5px] px-1.5 py-1.5 cursor-pointer disabled:opacity-35 disabled:cursor-not-allowed",
                      date === d ? "border-berry-500 bg-berry-600 text-white" : "border-ink-900/12 hover:border-berry-300")}>
                    <span className="text-[9px] font-bold uppercase opacity-70">{WD[wdIndex(d)]}</span>
                    <span className="font-display text-sm font-bold tabular-nums">{fromISO(d).getDate()}</span>
                    <span className={cx("text-[9px] font-bold", date === d ? "text-honey-300" : "text-jade-600")}>{n}</span>
                  </button>
                );
              })}
            </div>
          </Field>
          <Field label="Время">
            {slots.length === 0 ? (
              <p className="rounded-lg bg-milk-100 px-3 py-4 text-center text-xs font-semibold text-ink-700/60">Нет свободных окон</p>
            ) : (
              <div className="grid max-h-44 grid-cols-3 min-[420px]:grid-cols-4 gap-1.5 overflow-y-auto">
                {slots.map((t) => (
                  <button key={t} onClick={() => setStart(t)}
                    className={cx("rounded-md border-[1.5px] py-1.5 text-[13px] font-bold tabular-nums cursor-pointer", start === t ? "border-berry-500 bg-berry-600 text-white" : "border-ink-900/12 hover:border-berry-300")}>{t}</button>
                ))}
              </div>
            )}
          </Field>
          <Btn className="mt-4 w-full" disabled={!start || (mode === "client" ? !clientId : false)} onClick={submit}><IcCheck size={16} />Создать запись</Btn>
        </div>
      </div>
    </Modal>
  );
}

/* ─── Перенос записи ─── */
function RescheduleModal({ master, appt, onClose }: { master: Master; appt: Appointment; onClose: () => void }) {
  const db = useDB();
  const toast = useToast();
  const [date, setDate] = useState<string>(appt.date >= todayISO() ? appt.date : todayISO());
  const [start, setStart] = useState<string | null>(null);
  const slots = useMemo(() => freeSlots(master, db.appointments, date, appt.durationMin, appt.id), [master, db.appointments, date, appt]);
  const client = db.clients.find((c) => c.id === appt.clientId);

  return (
    <Modal open onClose={onClose} title="Перенести запись">
      <div className="rounded-lg bg-berry-50 border border-berry-200/70 px-3.5 py-2.5 text-sm">
        <span className="font-bold">{client?.name ?? "Клиент"}</span>
        <span className="text-berry-700/80"> · {appt.serviceName}, {appt.durationMin} мин · сейчас: {fmtDate(appt.date)}, {appt.start}</span>
      </div>
      <div className="mt-4 text-[11px] font-bold uppercase tracking-wider text-ink-700/60">Новый день</div>
      <div className="mt-2">
        <CalendarMonth selected={date} onSelect={(d) => { setDate(d); setStart(null); }}
          slotsFor={(iso) => freeSlots(master, db.appointments, iso, appt.durationMin, appt.id)} />
      </div>
      <div className="mt-4 flex items-baseline justify-between gap-2">
        <div className="text-[11px] font-bold uppercase tracking-wider text-ink-700/60">Новое время</div>
        {slots.length > 0 && <span className="text-[11px] font-bold text-jade-600">{slots.length} свободно</span>}
      </div>
      {slots.length === 0 ? (
        <p className="mt-2 rounded-lg bg-milk-100 px-3.5 py-3 text-[12px] font-semibold text-ink-700/70">На этот день свободных окон нет — выберите другую дату.</p>
      ) : (
        <div className="mt-2"><SlotChips slots={slots} selected={start} onSelect={setStart} /></div>
      )}
      <Btn className="mt-4 w-full" disabled={!start}
        onClick={() => {
          const err = rescheduleAppt(appt.id, date, start!);
          if (err) return toast(err, "err");
          toast("Запись перенесена, клиент уведомлён");
          onClose();
        }}>
        <IcCheck size={16} />Подтвердить перенос
      </Btn>
      <p className="mt-2 text-center text-[11px] text-ink-700/55">Клиент получит уведомление о переносе.</p>
    </Modal>
  );
}

import { useMemo, useState } from "react";
import type { Master, Appointment, Client } from "../../lib/types";
import { PAYMENTS } from "../../lib/types";
import { useDB, updateClientNote, planOf } from "../../lib/store";
import { addDays, todayISO, fmtDate, workMinutesInRange, bookedMinutes, fromISO, isActive, hm } from "../../lib/schedule";
import { cx, fmtMoney, fmtPhone, plural } from "../../lib/util";
import { Btn, Modal, StatusBadge, Avatar, Empty, inp, Field, useToast } from "../../components/ui";
import { BarChart, TopBars, Ring } from "../../components/charts";
import { IcSearch, IcLock, IcCrown, IcCoin, IcUsers, IcChart, IcPlus, IcCheck, IcPhone } from "../../components/icons";

/* ─── Статистика ─── */
export function StatsTab({ master }: { master: Master }) {
  const db = useDB();
  const plan = planOf(master);
  const allowed = [7, 30, 90, 365].filter((d) => d <= plan.statDays);
  const [period, setPeriod] = useState(allowed[allowed.length - 1]);
  const today = todayISO();
  const from = addDays(today, -(period - 1));

  const appts = useMemo(() => db.appointments.filter((a) => a.masterId === master.id && a.date >= from && a.date <= today), [db.appointments, master.id, from, today]);
  const done = appts.filter((a) => a.status === "done");
  const cancelled = appts.filter((a) => a.status === "cancelled");
  const revenue = done.reduce((s, a) => s + a.price, 0);
  const avg = done.length ? Math.round(revenue / done.length) : 0;
  const cancelRate = appts.length ? Math.round((cancelled.length / appts.length) * 100) : 0;
  const newClients = db.clients.filter((c) => c.masterId === master.id && c.createdAt >= Date.now() - period * 864e5).length;
  const upcoming = db.appointments.filter((a) => a.masterId === master.id && a.date > today && isActive(a));
  const upcomingSum = upcoming.reduce((s, a) => s + a.price, 0);

  const workMin = workMinutesInRange(master, from, today);
  const busyMin = bookedMinutes(db.appointments.filter((a) => a.masterId === master.id && a.date <= today), from, today, master.id);
  const load = workMin ? Math.min((busyMin / workMin) * 100, 100) : 0;

  const revenueByDay = useMemo(() => {
    const days: { label: string; value: number }[] = [];
    for (let d = from; d <= today; d = addDays(d, 1)) {
      const dd = fromISO(d);
      days.push({ label: `${dd.getDate()}`, value: done.filter((a) => a.date === d).reduce((s, a) => s + a.price, 0) });
    }
    return days;
  }, [done, from, today]);

  const topServices = useMemo(() => {
    const map = new Map<string, { count: number; sum: number; color: string }>();
    for (const a of [...done, ...upcoming]) {
      const cur = map.get(a.serviceName) ?? { count: 0, sum: 0, color: a.serviceColor };
      cur.count++; cur.sum += a.price;
      map.set(a.serviceName, cur);
    }
    return [...map.entries()].sort((a, b) => b[1].count - a[1].count).slice(0, 6)
      .map(([label, v]) => ({ label, value: v.count, color: v.color, sub: fmtMoney(v.sum) }));
  }, [done, upcoming]);

  const peakHours = useMemo(() => {
    const map = new Map<number, number>();
    for (const a of appts) if (a.status !== "cancelled") {
      const h = Math.floor(hm(a.start) / 60);
      map.set(h, (map.get(h) ?? 0) + 1);
    }
    return [...map.entries()].sort((a, b) => a[0] - b[0]);
  }, [appts]);
  const peakMax = Math.max(...peakHours.map(([, v]) => v), 1);

  const periods = [7, 30, 90, 365];

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-2">
        {periods.map((p) => {
          const locked = !allowed.includes(p);
          return (
            <button key={p} onClick={() => !locked && setPeriod(p)} title={locked ? "Доступно с тарифа «Профи»" : ""}
              className={cx("flex items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-[13px] font-bold transition-all cursor-pointer disabled:cursor-not-allowed",
                period === p ? "border-ink-900 bg-ink-900 text-milk-50" : "border-ink-900/12 bg-white hover:border-ink-900/35", locked && "opacity-50")}>
              {locked && <IcLock size={12} />}{p === 7 ? "7 дней" : p === 30 ? "30 дней" : p === 90 ? "90 дней" : "Год"}
            </button>
          );
        })}
        <span className="ml-auto text-xs font-semibold text-ink-700/55">Данные изолированы: видны только вам</span>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Kpi ic={IcCoin} label="Выручка" value={fmtMoney(revenue)} sub={`${done.length} ${plural(done.length, ["визит", "визита", "визитов"])} оплачено`} tone="bg-berry-600 text-white" />
        <Kpi ic={IcChart} label="Средний чек" value={fmtMoney(avg)} sub="по завершённым визитам" tone="bg-jade-100 text-jade-700" />
        <Kpi ic={IcUsers} label="Новые клиенты" value={String(newClients)} sub={`всего в базе: ${db.clients.filter((c) => c.masterId === master.id).length}`} tone="bg-honey-100 text-honey-700" />
        <Kpi ic={IcCrown} label="Ожидается" value={fmtMoney(upcomingSum)} sub={`${upcoming.length} ${plural(upcoming.length, ["запись", "записи", "записей"])} впереди`} tone="bg-ink-900/8 text-ink-900" />
      </div>

      <div className="grid gap-5 lg:grid-cols-[1.25fr_.75fr]">
        <section className="rounded-xl border border-ink-900/10 bg-white p-5">
          <div className="mb-3 flex items-baseline justify-between">
            <h3 className="font-display text-[15px] font-bold">Выручка по дням</h3>
            <span className="text-xs font-bold text-ink-700/55">итого {fmtMoney(revenue)}</span>
          </div>
          <BarChart data={revenueByDay} fmt={fmtMoney} />
        </section>
        <section className="rounded-xl border border-ink-900/10 bg-white p-5 flex flex-col items-center justify-center gap-3">
          <h3 className="font-display text-[15px] font-bold self-start">Загрузка времени</h3>
          <Ring pct={load} color="#2FA396" label="загрузка" sub={`${Math.round(busyMin / 60)} ч из ${Math.round(workMin / 60)} ч`} />
          <div className="grid w-full grid-cols-2 gap-2 text-center text-xs">
            <div className="rounded-lg bg-coral-100 px-2 py-2"><b className="text-coral-700">{cancelled.length}</b><div className="font-semibold text-coral-700/70">отмен · {cancelRate}%</div></div>
            <div className="rounded-lg bg-jade-100 px-2 py-2"><b className="text-jade-700">{done.length}</b><div className="font-semibold text-jade-700/70">выполнено</div></div>
          </div>
        </section>
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <section className="rounded-xl border border-ink-900/10 bg-white p-5">
          <h3 className="font-display text-[15px] font-bold mb-4">Популярность услуг</h3>
          {topServices.length === 0 ? <Empty text="Пока нет данных" /> : <TopBars rows={topServices} fmt={(v) => `${v} ${plural(v, ["запись", "записи", "записей"])}`} />}
        </section>
        <section className="rounded-xl border border-ink-900/10 bg-white p-5">
          <h3 className="font-display text-[15px] font-bold mb-4">Пиковые часы записей</h3>
          {peakHours.length === 0 ? <Empty text="Пока нет данных" /> : (
            <div className="flex h-40 items-end gap-1.5">
              {peakHours.map(([h, v]) => (
                <div key={h} className="group flex flex-1 flex-col items-center gap-1">
                  <span className="text-[10px] font-bold text-ink-700/60 opacity-0 transition-opacity group-hover:opacity-100">{v}</span>
                  <div className="w-full rounded-t-md bg-honey-500 transition-all group-hover:bg-berry-500" style={{ height: `${(v / peakMax) * 100}%`, minHeight: 6 }} />
                  <span className="text-[10px] font-bold tabular-nums text-ink-700/50">{h}:00</span>
                </div>
              ))}
            </div>
          )}
          <p className="mt-3 text-xs text-ink-700/55">Ставьте популярные услуги на «горячие» часы — так выручка растёт без лишних окон.</p>
        </section>
      </div>
    </div>
  );
}

const Kpi = ({ ic: Ic, label, value, sub, tone }: { ic: any; label: string; value: string; sub: string; tone: string }) => (
  <div className="rounded-xl border border-ink-900/10 bg-white p-4 transition-all hover:-translate-y-0.5 hover:shadow-lg">
    <div className={cx("mb-3 grid h-9 w-9 place-items-center rounded-lg", tone)}><Ic size={17} /></div>
    <div className="text-[10px] font-bold uppercase tracking-wider text-ink-700/55">{label}</div>
    <div className="font-display text-xl font-bold tabular-nums">{value}</div>
    <div className="text-[11px] font-semibold text-ink-700/55">{sub}</div>
  </div>
);

/* ─── CRM: клиенты ─── */
export function ClientsTab({ master, onBook }: { master: Master; onBook: (clientId: string) => void }) {
  const db = useDB();
  const [q, setQ] = useState("");
  const [selId, setSelId] = useState<string | null>(null);
  const clients = db.clients.filter((c) => c.masterId === master.id);
  const shown = clients
    .filter((c) => (c.name + c.phone).toLowerCase().includes(q.trim().toLowerCase()))
    .map((c) => {
      const hist = db.appointments.filter((a) => a.clientId === c.id);
      const doneL = hist.filter((a) => a.status === "done");
      const next = hist.filter((a) => a.date >= todayISO() && isActive(a)).sort((a, b) => (a.date + a.start).localeCompare(b.date + b.start))[0];
      return { c, visits: doneL.length, total: doneL.reduce((s, a) => s + a.price, 0), next };
    })
    .sort((a, b) => b.visits - a.visits);
  const sel = shown.find((x) => x.c.id === selId) ?? null;

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <div className="relative">
          <IcSearch size={15} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-ink-700/40" />
          <input className={cx(inp, "!w-full sm:!w-64 pl-8")} placeholder="Имя или телефон" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        <span className="text-sm font-bold text-ink-800">{clients.length} {plural(clients.length, ["клиент", "клиента", "клиентов"])} в базе</span>
        <span className="basis-full text-xs font-semibold text-ink-700/55 sm:ml-auto sm:basis-auto">Повторные записи не создают дубликаты — совпадение по телефону</span>
      </div>

      {shown.length === 0 ? <Empty text="Клиенты появятся после первой записи" /> : (
        <div className="space-y-2">
          {shown.map(({ c, visits, total, next }) => (
            <button key={c.id} onClick={() => setSelId(c.id)}
              className="w-full rounded-xl border border-ink-900/10 bg-white px-4 py-3 text-left transition-all hover:border-berry-300 hover:shadow-md cursor-pointer">
              <div className="flex items-center gap-3">
                <Avatar name={c.name} color={master.color} size={36} />
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-bold">{c.name}</div>
                  <div className="text-[12px] font-semibold tabular-nums text-ink-700/60">{fmtPhone(c.phone)}</div>
                </div>
                <span className="text-berry-600 text-xs font-bold shrink-0">открыть</span>
              </div>
              <div className="mt-2 flex flex-wrap gap-1.5 pl-[48px]">
                <span className="rounded-md bg-milk-100 px-2 py-0.5 text-[11px] font-bold text-ink-800/75">{visits} {plural(visits, ["визит", "визита", "визитов"])}</span>
                <span className="rounded-md bg-milk-100 px-2 py-0.5 text-[11px] font-bold text-ink-800/75">{fmtMoney(total)}</span>
                <span className="rounded-md bg-milk-100 px-2 py-0.5 text-[11px] font-bold text-ink-800/75">
                  {next ? `далее: ${fmtDate(next.date)} ${next.start}` : "будущих записей нет"}
                </span>
              </div>
            </button>
          ))}
        </div>
      )}

      {sel && <ClientDrawer master={master} row={sel} onClose={() => setSelId(null)} onBook={onBook} />}
    </div>
  );
}

function ClientDrawer({ master, row, onClose, onBook }: { master: Master; row: { c: Client; visits: number; total: number; next?: Appointment }; onClose: () => void; onBook: (id: string) => void }) {
  const db = useDB();
  const toast = useToast();
  const [notes, setNotes] = useState(row.c.notes);
  const hist = db.appointments.filter((a) => a.clientId === row.c.id).sort((a, b) => (b.date + b.start).localeCompare(a.date + a.start));
  return (
    <Modal open onClose={onClose} title="Карточка клиента" wide>
      <div className="grid gap-5 sm:grid-cols-[.9fr_1.1fr]">
        <div>
          <div className="flex items-center gap-3">
            <Avatar name={row.c.name} color={master.color} size={48} />
            <div>
              <div className="font-display font-semibold">{row.c.name}</div>
              <div className="flex items-center gap-1 text-[13px] font-semibold text-ink-700/70"><IcPhone size={13} />{fmtPhone(row.c.phone)}</div>
            </div>
          </div>
          <div className="mt-4 grid grid-cols-3 gap-2 text-center">
            <div className="rounded-lg bg-milk-100 py-2.5"><div className="font-display text-lg font-bold tabular-nums">{row.visits}</div><div className="text-[10px] font-bold uppercase text-ink-700/55">визитов</div></div>
            <div className="rounded-lg bg-milk-100 py-2.5"><div className="font-display text-lg font-bold tabular-nums">{fmtMoney(row.total)}</div><div className="text-[10px] font-bold uppercase text-ink-700/55">потрачено</div></div>
            <div className="rounded-lg bg-milk-100 py-2.5"><div className="font-display text-lg font-bold tabular-nums">{row.visits ? fmtMoney(Math.round(row.total / row.visits)) : "—"}</div><div className="text-[10px] font-bold uppercase text-ink-700/55">ср. чек</div></div>
          </div>
          <Field label="Заметки">
            <textarea className={cx(inp, "mt-1 min-h-[90px] resize-y")} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Аллергии, предпочтения, особенности…" />
          </Field>
          <div className="mt-3 flex gap-2">
            <Btn sm v="dark" onClick={() => { updateClientNote(row.c.id, notes); toast("Заметка сохранена"); }}><IcCheck size={14} />Сохранить</Btn>
            <Btn sm onClick={() => { onClose(); onBook(row.c.id); }}><IcPlus size={14} />Записать</Btn>
          </div>
        </div>
        <div>
          <div className="text-[11px] font-bold uppercase tracking-wider text-ink-700/60 mb-2">История и записи · {hist.length}</div>
          <div className="max-h-[380px] space-y-1.5 overflow-y-auto pr-1">
            {hist.length === 0 && <Empty text="Пока пусто" />}
            {hist.map((a) => (
              <div key={a.id} className="flex items-center gap-3 rounded-lg border border-ink-900/8 px-3 py-2.5 text-sm">
                <span className="h-7 w-1 shrink-0 rounded-full" style={{ background: a.serviceColor }} />
                <div className="min-w-0 flex-1">
                  <div className="font-semibold truncate">{a.serviceName}</div>
                  <div className="text-[11px] font-semibold text-ink-700/55">{fmtDate(a.date)} · {a.start} · {PAYMENTS[a.paymentMethod]}</div>
                </div>
                <span className="font-bold tabular-nums text-[13px]">{a.status === "cancelled" ? "—" : fmtMoney(a.price)}</span>
                <StatusBadge s={a.status} />
              </div>
            ))}
          </div>
        </div>
      </div>
    </Modal>
  );
}

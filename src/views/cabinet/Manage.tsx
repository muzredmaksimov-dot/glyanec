import { useEffect, useMemo, useRef, useState } from "react";
import type { Master, Service, PlanId } from "../../lib/types";
import { PAYMENTS } from "../../lib/types";
import { useDB, updateMaster, addService, updateService, deleteService, planOf, requestUpgrade, markAllRead, markRead, unreadFor, sendChat, markChatRead, unreadChatFor, paidPlansVisible } from "../../lib/store";
import PushCard from "../../components/PushCard";
import { WD, nextDays, fmtDate, fmtDateLong } from "../../lib/schedule";
import { cx, fmtMoney, timeAgo } from "../../lib/util";
import { Btn, Badge, Modal, Confirm, Toggle, useToast, inp, Field, Empty } from "../../components/ui";
import { IcPlus, IcPen, IcTrash, IcCheck, IcX, IcLock, IcCrown, IcCopy, IcLink, IcBell, IcClock, IcWallet, IcArrowR, IcCalendar, IcGift, IcChat, IcLifeBuoy } from "../../components/icons";

const PALETTE = ["#D63D80", "#B92C69", "#E3A33D", "#2FA396", "#E05C4A", "#7C5CBF", "#C86FA8", "#5BA85B"];

/* ─── Услуги ─── */
export function ServicesTab({ master }: { master: Master }) {
  const db = useDB();
  const toast = useToast();
  const plan = planOf(master);
  const list = db.services.filter((s) => s.masterId === master.id);
  const [edit, setEdit] = useState<Service | "new" | null>(null);
  const [del, setDel] = useState<Service | null>(null);
  const limitHit = list.length >= plan.maxServices;

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <span className="text-sm font-bold text-ink-800">{list.length} / {plan.maxServices >= 999 ? "∞" : plan.maxServices} услуг · тариф «{plan.label}»</span>
        {limitHit && <Badge tone="coral"><IcLock size={11} />лимит</Badge>}
        <Btn sm className="ml-auto" onClick={() => setEdit("new")}><IcPlus size={15} />Добавить услугу</Btn>
      </div>
      {list.length === 0 ? <Empty text="Добавьте первую услугу — она сразу появится на вашей публичной странице" /> : (
        <div className="grid gap-2.5 md:grid-cols-2">
          {list.map((s) => (
            <div key={s.id} className={cx("flex items-center gap-3 rounded-xl border bg-white p-3.5 transition-all", s.active ? "border-ink-900/10 hover:shadow-md" : "border-ink-900/8 opacity-60")}>
              <span className="h-9 w-1.5 shrink-0 rounded-full" style={{ background: s.color }} />
              <div className="min-w-0 flex-1">
                <div className="truncate font-display text-[14px] font-semibold">{s.name}</div>
                <div className="text-[12px] font-semibold text-ink-700/60">{fmtMoney(s.price)} · {s.durationMin} мин{!s.active && " · скрыта"}</div>
              </div>
              <button onClick={() => updateService(s.id, { active: !s.active })} title={s.active ? "Скрыть из каталога" : "Показать в каталоге"}
                className="cursor-pointer rounded-md p-1.5 text-ink-700/50 hover:bg-milk-100 hover:text-ink-900"><IcEye2 on={s.active} /></button>
              <button onClick={() => setEdit(s)} className="cursor-pointer rounded-md p-1.5 text-ink-700/50 hover:bg-milk-100 hover:text-berry-600"><IcPen size={16} /></button>
              <button onClick={() => setDel(s)} className="cursor-pointer rounded-md p-1.5 text-ink-700/50 hover:bg-coral-100 hover:text-coral-600"><IcTrash size={16} /></button>
            </div>
          ))}
        </div>
      )}
      {edit && <ServiceModal master={master} svc={edit === "new" ? null : edit} onClose={() => setEdit(null)} />}
      <Confirm open={!!del} onClose={() => setDel(null)} onYes={() => { if (del) { deleteService(del.id); toast("Услуга удалена"); } }} danger
        title="Удалить услугу?" text={`«${del?.name}» исчезнет с публичной страницы. История записей сохранится.`} />
    </div>
  );
}

const IcEye2 = ({ on }: { on: boolean }) => (
  <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
    <path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12z" /><circle cx="12" cy="12" r="3" />
    {!on && <path d="M4 4l16 16" />}
  </svg>
);

function ServiceModal({ master, svc, onClose }: { master: Master; svc: Service | null; onClose: () => void }) {
  const toast = useToast();
  const [f, setF] = useState({ name: svc?.name ?? "", price: svc?.price ?? 50, durationMin: svc?.durationMin ?? 60, color: svc?.color ?? PALETTE[0], description: svc?.description ?? "", active: svc?.active ?? true });
  const save = () => {
    if (f.name.trim().length < 2) return toast("Введите название услуги", "err");
    if (f.price <= 0) return toast("Укажите цену", "err");
    if (svc) { updateService(svc.id, { ...f, name: f.name.trim() }); toast("Услуга обновлена"); }
    else {
      const err = addService(master.id, { ...f, name: f.name.trim() });
      if (err) return toast(err, "err");
      toast("Услуга добавлена на страницу");
    }
    onClose();
  };
  return (
    <Modal open onClose={onClose} title={svc ? "Редактировать услугу" : "Новая услуга"}>
      <div className="space-y-3.5">
        <Field label="Название"><input className={inp} value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} placeholder="Маникюр + гель-лак" /></Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Цена, BYN"><input className={inp} type="number" min={0} step={5} value={f.price} onChange={(e) => setF({ ...f, price: +e.target.value })} /></Field>
          <Field label="Длительность, мин">
            <select className={inp} value={f.durationMin} onChange={(e) => setF({ ...f, durationMin: +e.target.value })}>
              {[15, 20, 30, 40, 45, 60, 75, 90, 105, 120, 150, 180, 210, 240].map((d) => <option key={d} value={d}>{d} мин</option>)}
            </select>
          </Field>
        </div>
        <Field label="Цвет в календаре">
          <div className="flex flex-wrap gap-2">
            {PALETTE.map((c) => (
              <button key={c} onClick={() => setF({ ...f, color: c })}
                className={cx("h-8 w-8 rounded-lg cursor-pointer transition-transform hover:scale-110", f.color === c && "ring-2 ring-offset-2 ring-ink-900")} style={{ background: c }} />
            ))}
          </div>
        </Field>
        <Field label="Описание (видно клиенту)"><textarea className={cx(inp, "min-h-[70px] resize-y")} value={f.description} onChange={(e) => setF({ ...f, description: e.target.value })} /></Field>
        <div className="flex items-center justify-between rounded-lg bg-milk-100 px-3.5 py-2.5">
          <span className="text-sm font-bold">Показывать на странице</span>
          <Toggle on={f.active} onChange={(v) => setF({ ...f, active: v })} />
        </div>
        <Btn className="w-full" onClick={save}><IcCheck size={16} />Сохранить</Btn>
      </div>
    </Modal>
  );
}

/* ─── График ─── */
export function ScheduleTab({ master }: { master: Master }) {
  const toast = useToast();
  const [f, setF] = useState({ ...master, schedule: { ...master.schedule, breaks: [...master.schedule.breaks] }, daysOff: [...master.daysOff], vacations: [...master.vacations], blocks: [...master.blocks] });
  const [nb, setNb] = useState({ start: "13:00", end: "13:30" });
  const [nv, setNv] = useState({ start: nextDays(1)[7] ?? nextDays(1)[0], end: nextDays(1)[10] ?? nextDays(1)[3], label: "Отпуск" });
  const [nk, setNk] = useState({ date: nextDays(1)[1], start: "12:00", end: "14:00", reason: "" });
  const days = nextDays(21);

  const save = () => {
    updateMaster(master.id, { schedule: f.schedule, daysOff: f.daysOff, vacations: f.vacations, blocks: f.blocks });
    toast("График сохранён — слоты пересчитаны");
  };

  return (
    <div className="grid gap-5 lg:grid-cols-2">
      <section className="space-y-5 rounded-xl border border-ink-900/10 bg-white p-5">
        <div>
          <h3 className="font-display text-[15px] font-bold">Рабочие дни и часы</h3>
          <div className="mt-3 flex flex-wrap gap-1.5">
            {WD.map((w, i) => {
              const on = f.schedule.workDays.includes(i);
              return (
                <button key={w} onClick={() => setF({ ...f, schedule: { ...f.schedule, workDays: on ? f.schedule.workDays.filter((x) => x !== i) : [...f.schedule.workDays, i].sort() } })}
                  className={cx("rounded-lg border-[1.5px] px-3.5 py-2 text-[13px] font-bold cursor-pointer", on ? "border-ink-900 bg-ink-900 text-milk-50" : "border-ink-900/12 text-ink-700/50 hover:border-ink-900/35")}>{w}</button>
              );
            })}
          </div>
          <div className="mt-4 grid grid-cols-3 gap-3">
            <Field label="Начало"><input type="time" className={inp} value={f.schedule.start} onChange={(e) => setF({ ...f, schedule: { ...f.schedule, start: e.target.value } })} /></Field>
            <Field label="Конец"><input type="time" className={inp} value={f.schedule.end} onChange={(e) => setF({ ...f, schedule: { ...f.schedule, end: e.target.value } })} /></Field>
            <Field label="Шаг слота">
              <select className={inp} value={f.schedule.slotStep} onChange={(e) => setF({ ...f, schedule: { ...f.schedule, slotStep: +e.target.value } })}>
                {[15, 20, 30, 60].map((s) => <option key={s} value={s}>{s} мин</option>)}
              </select>
            </Field>
          </div>
        </div>

        <div>
          <h3 className="font-display text-[15px] font-bold">Перерывы (ежедневно)</h3>
          <div className="mt-2 space-y-1.5">
            {f.schedule.breaks.map((b, i) => (
              <div key={i} className="flex items-center gap-2 rounded-lg bg-milk-100 px-3 py-2 text-sm font-semibold">
                <IcClock size={14} className="text-ink-700/50" />{b.start} – {b.end}
                <button onClick={() => setF({ ...f, schedule: { ...f.schedule, breaks: f.schedule.breaks.filter((_, j) => j !== i) } })} className="ml-auto cursor-pointer text-ink-700/40 hover:text-coral-600"><IcX size={15} /></button>
              </div>
            ))}
            {f.schedule.breaks.length === 0 && <p className="text-xs text-ink-700/50">Без перерывов</p>}
          </div>
          <div className="mt-2 flex items-end gap-2">
            <input type="time" className={cx(inp, "!w-28")} value={nb.start} onChange={(e) => setNb({ ...nb, start: e.target.value })} />
            <input type="time" className={cx(inp, "!w-28")} value={nb.end} onChange={(e) => setNb({ ...nb, end: e.target.value })} />
            <Btn v="outline" sm onClick={() => { if (nb.end > nb.start) setF({ ...f, schedule: { ...f.schedule, breaks: [...f.schedule.breaks, { ...nb }] } }); else toast("Конец позже начала", "err"); }}><IcPlus size={14} />Добавить</Btn>
          </div>
        </div>
        <Btn onClick={save}><IcCheck size={16} />Сохранить график</Btn>
      </section>

      <section className="space-y-5 rounded-xl border border-ink-900/10 bg-white p-5">
        <div>
          <h3 className="font-display text-[15px] font-bold">Разовые выходные</h3>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {days.map((d) => {
              const on = f.daysOff.includes(d);
              return (
                <button key={d} onClick={() => setF({ ...f, daysOff: on ? f.daysOff.filter((x) => x !== d) : [...f.daysOff, d] })}
                  className={cx("rounded-md border px-2 py-1 text-[11px] font-bold tabular-nums cursor-pointer", on ? "border-coral-500 bg-coral-100 text-coral-700" : "border-ink-900/12 hover:border-ink-900/35")}>{fmtDate(d)}</button>
              );
            })}
          </div>
        </div>
        <div>
          <h3 className="font-display text-[15px] font-bold">Отпуска</h3>
          <div className="mt-2 space-y-1.5">
            {f.vacations.map((v, i) => (
              <div key={i} className="flex items-center gap-2 rounded-lg bg-honey-100 px-3 py-2 text-sm font-semibold text-honey-700">
                <IcCalendar size={14} />{fmtDate(v.start)} — {fmtDate(v.end)} · {v.label}
                <button onClick={() => setF({ ...f, vacations: f.vacations.filter((_, j) => j !== i) })} className="ml-auto cursor-pointer hover:text-coral-600"><IcX size={15} /></button>
              </div>
            ))}
          </div>
          <div className="mt-2 flex flex-wrap items-end gap-2">
            <input type="date" className={cx(inp, "!w-36")} value={nv.start} onChange={(e) => setNv({ ...nv, start: e.target.value })} />
            <input type="date" className={cx(inp, "!w-36")} value={nv.end} onChange={(e) => setNv({ ...nv, end: e.target.value })} />
            <Btn v="outline" sm onClick={() => { if (nv.end >= nv.start) setF({ ...f, vacations: [...f.vacations, { ...nv }] }); else toast("Проверьте даты", "err"); }}><IcPlus size={14} />Добавить</Btn>
          </div>
        </div>
        <div>
          <h3 className="font-display text-[15px] font-bold">Блокировки времени</h3>
          <div className="mt-2 space-y-1.5">
            {f.blocks.map((b, i) => (
              <div key={i} className="flex items-center gap-2 rounded-lg bg-milk-100 px-3 py-2 text-sm font-semibold">
                <IcLock size={14} className="text-ink-700/50" />{fmtDate(b.date)} · {b.start}–{b.end}{b.reason && ` · ${b.reason}`}
                <button onClick={() => setF({ ...f, blocks: f.blocks.filter((_, j) => j !== i) })} className="ml-auto cursor-pointer text-ink-700/40 hover:text-coral-600"><IcX size={15} /></button>
              </div>
            ))}
          </div>
          <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-4">
            <input type="date" className={inp} value={nk.date} onChange={(e) => setNk({ ...nk, date: e.target.value })} />
            <input type="time" className={inp} value={nk.start} onChange={(e) => setNk({ ...nk, start: e.target.value })} />
            <input type="time" className={inp} value={nk.end} onChange={(e) => setNk({ ...nk, end: e.target.value })} />
            <Btn v="outline" sm onClick={() => { if (nk.end > nk.start) setF({ ...f, blocks: [...f.blocks, { ...nk, reason: nk.reason || "Занято" }] }); else toast("Конец позже начала", "err"); }}><IcPlus size={14} />Блок</Btn>
          </div>
          <input className={cx(inp, "mt-2")} placeholder="Причина (необязательно)" value={nk.reason} onChange={(e) => setNk({ ...nk, reason: e.target.value })} />
        </div>
        <Btn onClick={save}><IcCheck size={16} />Сохранить график</Btn>
      </section>
    </div>
  );
}

/* ─── Уведомления ─── */
export function NotifsTab({ master, onOpenAppt }: { master: Master; onOpenAppt?: (apptId: string) => void }) {
  const db = useDB();
  const toast = useToast();
  const target = { kind: "master" as const, id: master.id };
  const list = db.notifications.filter((n) => n.target.kind === "master" && n.target.id === master.id);
  const unread = unreadFor(db, target);

  return (
    <div className="mx-auto max-w-2xl">
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <Btn v="ghost" sm onClick={() => { markAllRead(target); toast("Все прочитано"); }}>Прочитать все</Btn>
      </div>
      <div className="mb-4 space-y-3">
        <PushCard target={{ kind: "master", id: master.id }} title="Пуш-уведомления"
          hint="Новая запись, отмена, перенос и напоминание за день — прилетят на это устройство, даже если приложение закрыто." />
        <details className="rounded-xl border border-ink-900/10 bg-white px-4 py-3">
          <summary className="cursor-pointer text-[13px] font-bold text-ink-800">Как включить на телефоне — пошагово</summary>
          <ul className="mt-2 list-disc space-y-1.5 pl-5 text-xs leading-relaxed text-ink-800/75">
            <li><b>Android (Chrome):</b> меню ⋮ → «Установить приложение» → запустите «Глянец» с рабочего стола → нажмите «Включить push» выше.</li>
            <li><b>iPhone (Safari, iOS 16.4+):</b> «Поделиться» → «На экран „Домой"» → откройте с рабочего стола → «Включить push» → разрешите.</li>
            <li><b>Xiaomi / Samsung / Honor:</b> в настройках батареи снимите ограничения для «Глянец», иначе система «усыпит» пуш.</li>
            <li>Если пуш не пришёл — нажмите «Тест» и <b>сверните приложение</b>: при открытом окне уведомление показывается внутри (колокольчик).</li>
          </ul>
        </details>
      </div>
      {list.length === 0 ? <Empty text="Уведомлений пока нет" /> : (
        <div className="space-y-2">
          {list.map((n) => (
            <button key={n.id}
              onClick={() => { markRead(n.id); if (n.apptId && onOpenAppt) onOpenAppt(n.apptId); }}
              className={cx("block w-full rounded-xl border px-4 py-3 text-left transition-all cursor-pointer hover:shadow-sm active:scale-[.995]", n.read ? "border-ink-900/8 bg-white opacity-75" : "border-honey-500/40 bg-honey-100/60")}>
              <div className="flex items-center gap-2 text-sm font-bold">
                <span className={cx("h-2 w-2 shrink-0 rounded-full", n.read ? "bg-ink-900/15" : "bg-honey-500")} />{n.title}
                <span className="ml-auto shrink-0 text-[10px] font-semibold text-ink-700/45">{timeAgo(n.createdAt)}</span>
              </div>
              <div className="mt-0.5 pl-4 text-[13px] text-ink-800/75">{n.body}</div>
              {n.apptId && <div className="mt-1 pl-4 text-[10px] font-bold uppercase tracking-wider text-berry-600">Открыть запись →</div>}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/* ─── Профиль / кабинет ─── */
export function ProfileTab({ master }: { master: Master }) {
  const db = useDB();
  const toast = useToast();
  const plan = planOf(master);
  const [f, setF] = useState({
    name: master.name, profession: master.profession, phone: master.phone, address: master.address, city: master.city,
    description: master.description, photo: master.photo, paymentMethods: master.paymentMethods,
    loyalty: { ...master.loyalty },
  });
  const link = `${location.origin}${location.pathname}#/m/${master.slug}`;

  const save = () => {
    if (f.name.trim().length < 2) return toast("Введите имя", "err");
    updateMaster(master.id, { ...f, name: f.name.trim() });
    toast("Профиль обновлён");
  };
  const togglePay = (k: string) => {
    const has = f.paymentMethods.includes(k);
    if (has && f.paymentMethods.length === 1) return toast("Оставьте хотя бы один способ оплаты", "err");
    setF({ ...f, paymentMethods: has ? f.paymentMethods.filter((x) => x !== k) : [...f.paymentMethods, k] });
  };

  return (
    <div className="grid gap-5 lg:grid-cols-[1.15fr_.85fr]">
      <section className="rounded-xl border border-ink-900/10 bg-white p-5">
        <h3 className="font-display text-[15px] font-bold">Публичный профиль</h3>
        <div className="mt-4 space-y-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Имя"><input className={inp} value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} /></Field>
            <Field label="Специализация"><input className={inp} value={f.profession} onChange={(e) => setF({ ...f, profession: e.target.value })} /></Field>
            <Field label="Телефон"><input className={inp} value={f.phone} onChange={(e) => setF({ ...f, phone: e.target.value })} /></Field>
            <Field label="Адрес"><input className={inp} value={f.address} onChange={(e) => setF({ ...f, address: e.target.value })} /></Field>
            <Field label="Город (для маркетплейса)"><input className={inp} value={f.city} onChange={(e) => setF({ ...f, city: e.target.value })} placeholder="Минск" /></Field>
          </div>
          <Field label="О себе"><textarea className={cx(inp, "min-h-[80px] resize-y")} value={f.description} onChange={(e) => setF({ ...f, description: e.target.value })} /></Field>
          <Field label="Фото (URL)"><input className={inp} value={f.photo} onChange={(e) => setF({ ...f, photo: e.target.value })} placeholder="https://…" /></Field>
          <Field label="Способы оплаты (выбирает клиент при записи)">
            <div className="flex flex-wrap gap-2">
              {Object.entries(PAYMENTS).map(([k, v]) => {
                const on = f.paymentMethods.includes(k);
                return (
                  <button key={k} onClick={() => togglePay(k)}
                    className={cx("flex items-center gap-1.5 rounded-lg border-[1.5px] px-3 py-2 text-[13px] font-bold transition-all cursor-pointer", on ? "border-jade-500 bg-jade-100 text-jade-700" : "border-ink-900/12 text-ink-700/60 hover:border-ink-900/30")}>
                    {on && <IcCheck size={13} />}<IcWallet size={14} />{v}
                  </button>
                );
              })}
            </div>
          </Field>

          <div className="rounded-xl border border-honey-300/60 bg-honey-100/60 p-4">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2 text-honey-700">
                <IcGift size={18} />
                <span className="text-sm font-bold">Программа лояльности</span>
              </div>
              <Toggle on={f.loyalty.enabled} onChange={(v) => setF({ ...f, loyalty: { ...f.loyalty, enabled: v } })} />
            </div>
            {f.loyalty.enabled && (
              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                <Field label="Тип программы">
                  <select className={inp} value={f.loyalty.type} onChange={(e) => setF({ ...f, loyalty: { ...f.loyalty, type: e.target.value as "cashback" | "visit" } })}>
                    <option value="cashback">Кэшбек % бонусами</option>
                    <option value="visit">Каждый N-й визит со скидкой</option>
                  </select>
                </Field>
                <Field label={f.loyalty.type === "cashback" ? "Кэшбек, %" : "Каждый N-й визит"}>
                  <input className={inp} type="number" min={1} value={f.loyalty.value}
                    onChange={(e) => setF({ ...f, loyalty: { ...f.loyalty, value: Math.max(1, +e.target.value || 1) } })} />
                </Field>
              </div>
            )}
            <p className="mt-2 text-[11px] text-ink-700/60">Программа видна клиентам на вашей странице, бейдж «Бонусы» — в каталоге.</p>
          </div>

          <Btn onClick={save}><IcCheck size={16} />Сохранить изменения</Btn>
        </div>
      </section>

      <div className="space-y-5">
        <section className="rounded-xl border border-ink-900/10 bg-ink-900 p-5 text-milk-100">
          <h3 className="font-display text-[15px] font-bold flex items-center gap-2"><IcLink size={16} className="text-berry-400" />Ссылка на запись</h3>
          <p className="mt-1 text-xs text-milk-100/60">Разместите в сторис, WhatsApp, Telegram — клиенты будут записываться сами.</p>
          <div className="mt-3 flex items-center gap-2 rounded-lg bg-milk-100/8 px-3 py-2.5">
            <code className="min-w-0 flex-1 truncate text-[12px] text-milk-100/85">{link}</code>
            <button onClick={async () => { try { await navigator.clipboard.writeText(link); toast("Ссылка скопирована"); } catch { toast("Не удалось скопировать", "err"); } }}
              className="grid h-8 w-8 shrink-0 place-items-center rounded-md bg-berry-600 text-white hover:bg-berry-500 cursor-pointer"><IcCopy size={15} /></button>
          </div>
          <a href={`#/m/${master.slug}`} className="mt-3 inline-flex items-center gap-1.5 text-xs font-bold text-berry-300 hover:text-berry-200">Открыть страницу<IcArrowR size={13} /></a>
        </section>

        <section className="rounded-xl border border-ink-900/10 bg-white p-5">
          <div className="flex items-center justify-between">
            <h3 className="font-display text-[15px] font-bold">Тариф «{plan.label}»</h3>
            {master.plan === "vip" ? <Badge tone="berry"><IcCrown size={11} />Люкс</Badge> : master.plan === "pro" ? <Badge tone="honey">Профи</Badge> : <Badge>Старт</Badge>}
          </div>
          <ul className="mt-3 space-y-2 text-sm">
            <li className="flex justify-between"><span className="text-ink-700/70">Услуги</span><b>{plan.maxServices >= 999 ? "без лимита" : plan.maxServices}</b></li>
            <li className="flex justify-between"><span className="text-ink-700/70">Глубина статистики</span><b>{plan.statDays} дней</b></li>
            <li className="flex justify-between"><span className="text-ink-700/70">Напоминания клиентам</span><b className={plan.reminders ? "text-jade-600" : "text-coral-600"}>{plan.reminders ? "включены" : "выключены"}</b></li>
            <li className="flex justify-between"><span className="text-ink-700/70">Продвижение в каталоге</span><b className={master.promoted ? "text-jade-600" : "text-ink-700/50"}>{master.promoted ? "активно" : "нет"}</b></li>
          </ul>
          {master.plan !== "vip" && paidPlansVisible(db) && (
            <div className="mt-4 border-t border-ink-900/8 pt-4">
              <div className="text-xs font-bold uppercase tracking-wider text-ink-700/60 mb-2">Повысить тариф</div>
              <div className="flex gap-2">
                {(["pro", "vip"] as PlanId[]).filter((p) => p !== master.plan).map((p) => (
                  <Btn key={p} v="gold" sm onClick={() => { requestUpgrade(master.id, p); toast(`Заявка на «${db.settings.plans[p].label}» отправлена администрации`, "info"); }}>
                    <IcCrown size={14} />«{db.settings.plans[p].label}» · {db.settings.plans[p].price} BYN/мес
                  </Btn>
                ))}
              </div>
              <p className="mt-2 text-[11px] text-ink-700/50">Платёж не подключён: заявку подтверждает администрация платформы.</p>
            </div>
          )}
          {master.plan !== "vip" && !paidPlansVisible(db) && (
            <p className="mt-4 border-t border-ink-900/8 pt-3 text-[11px] leading-relaxed text-ink-700/50">Сейчас действует бесплатный тариф со всеми базовыми возможностями, включая push-уведомления.</p>
          )}
        </section>

        <section className="rounded-xl border border-ink-900/10 bg-white p-5">
          <h3 className="font-display text-[15px] font-bold">Аккаунт</h3>
          <div className="mt-3 grid grid-cols-2 gap-3 text-sm">
            <div><div className="text-[10px] font-bold uppercase tracking-wider text-ink-700/50">Логин</div><div className="font-semibold">{master.login}</div></div>
            <div><div className="text-[10px] font-bold uppercase tracking-wider text-ink-700/50">На платформе с</div><div className="font-semibold">{fmtDateLong(new Date(master.createdAt).toISOString().slice(0, 10))}</div></div>
          </div>
          <p className="mt-3 rounded-lg bg-milk-100 px-3.5 py-2.5 text-xs text-ink-700/70">Данные вашего кабинета изолированы: другие мастера не видят ни клиентов, ни записи, ни статистику.</p>
        </section>
      </div>
    </div>
  );
}

/* ─── Чат с администрацией ─── */
export function ChatTab({ master }: { master: Master }) {
  const db = useDB();
  const [text, setText] = useState("");
  const endRef = useRef<HTMLDivElement>(null);
  const msgs = db.chat.filter((m) => m.masterId === master.id).sort((a, b) => a.createdAt - b.createdAt);
  const unread = unreadChatFor(db, master.id, "master");

  // открываем вкладку — входящие от админа считаем прочитанными
  useEffect(() => {
    if (unread > 0) markChatRead(master.id, "master");
  }, [unread, master.id]);
  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [msgs.length]);

  const submit = () => {
    if (!text.trim()) return;
    sendChat(master.id, "master", text);
    setText("");
  };

  return (
    <div className="mx-auto flex h-[calc(100dvh-16.5rem)] max-w-2xl flex-col lg:h-[calc(100vh-11rem)]">
      <div className="flex items-center gap-3 rounded-t-xl border border-b-0 border-ink-900/10 bg-ink-900 px-4 py-3 text-milk-100">
        <span className="grid h-10 w-10 place-items-center rounded-lg bg-berry-600 text-white"><IcLifeBuoy size={19} /></span>
        <div className="min-w-0">
          <div className="font-display text-sm font-bold">Администрация «Глянец»</div>
          <div className="flex items-center gap-1.5 text-[11px] font-semibold text-milk-100/60">
            <span className="h-1.5 w-1.5 rounded-full bg-jade-400" />обычно отвечаем в течение нескольких часов
          </div>
        </div>
      </div>

      <div className="flex-1 space-y-2.5 overflow-y-auto border-x border-ink-900/10 bg-white/60 p-4">
        {msgs.length === 0 && (
          <div className="grid h-full place-items-center">
            <div className="max-w-xs text-center">
              <span className="mx-auto grid h-12 w-12 place-items-center rounded-xl bg-berry-100 text-berry-600"><IcChat size={22} /></span>
              <p className="mt-3 text-sm font-semibold text-ink-800/70">Напишите сюда по любому вопросу: тарифы, промо страницы, ошибки. Администрация увидит сообщение мгновенно.</p>
            </div>
          </div>
        )}
        {msgs.map((m) => {
          const mine = m.from === "master";
          return (
            <div key={m.id} className={cx("flex", mine ? "justify-end" : "justify-start")}>
              <div className={cx("max-w-[82%] rounded-xl px-3.5 py-2.5 text-sm leading-relaxed shadow-sm animate-rise",
                mine ? "rounded-br-sm bg-ink-900 text-milk-50" : "rounded-bl-sm border border-ink-900/8 bg-white text-ink-900")}>
                <p className="whitespace-pre-wrap break-words">{m.text}</p>
                <div className={cx("mt-1 text-[10px] font-semibold tabular-nums", mine ? "text-milk-100/50" : "text-ink-700/45")}>
                  {mine ? "Вы" : "Админ"} · {timeAgo(m.createdAt)}
                </div>
              </div>
            </div>
          );
        })}
        <div ref={endRef} />
      </div>

      <div className="flex gap-2 rounded-b-xl border border-ink-900/10 bg-white p-2.5">
        <input
          className={cx(inp, "flex-1")}
          placeholder="Сообщение администрации…"
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); submit(); } }}
        />
        <Btn onClick={submit} disabled={!text.trim()} aria-label="Отправить"><IcArrowR size={17} /></Btn>
      </div>
    </div>
  );
}

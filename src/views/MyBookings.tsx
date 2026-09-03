import { useMemo, useState } from "react";
import type { Appointment } from "../lib/types";
import { PAYMENTS } from "../lib/types";
import { useDB, cancelByClient, rescheduleAppt, hasReview, addReview } from "../lib/store";
import { fmtDate, todayISO, isActive, freeSlots } from "../lib/schedule";
import { cx, fmtMoney, fmtPhone, normPhone, timeAgo } from "../lib/util";
import { Btn, Confirm, StatusBadge, useToast, inp, Badge, Empty, Modal, CalendarMonth, SlotChips } from "../components/ui";
import { IcArrowL, IcBell, IcPhone, IcArrowR, IcBan, IcStar, IcCalendar, IcCheck } from "../components/icons";

export default function MyBookings() {
  const db = useDB();
  const toast = useToast();
  const [phone, setPhone] = useState("");
  const [searched, setSearched] = useState(false);
  const [toCancel, setToCancel] = useState<string | null>(null);
  const [reviewFor, setReviewFor] = useState<Appointment | null>(null);
  const [resched, setResched] = useState<Appointment | null>(null);

  const norm = normPhone(phone);
  const my = useMemo(() => {
    if (!searched || norm.replace(/\D/g, "").length < 10) return null;
    return db.appointments
      .filter((a) => {
        const c = db.clients.find((x) => x.id === a.clientId);
        return c && normPhone(c.phone) === norm;
      })
      .sort((a, b) => (b.date + b.start).localeCompare(a.date + a.start));
  }, [db, norm, searched]);

  const notifs = useMemo(() => (my ? db.notifications.filter((n) => n.target.kind === "client" && n.target.id === norm) : []), [db.notifications, norm, my]);
  const today = todayISO();
  const upcoming = (my ?? []).filter((a) => a.date >= today && isActive(a));
  const past = (my ?? []).filter((a) => a.date < today || !isActive(a));

  const doCancel = (id: string) => {
    cancelByClient(id);
    toast("Запись отменена. Мастер получил уведомление.", "info");
  };

  return (
    <div className="min-h-screen bg-milk-100 text-ink-900">
      <div className="border-b border-ink-900/8 bg-white">
        <div className="relative mx-auto flex h-14 sm:h-16 max-w-3xl items-center px-4 sm:px-6">
          <a href="#/" className="flex items-center gap-1.5 text-sm font-bold text-ink-800 hover:text-berry-600 transition-colors"><IcArrowL size={16} />На главную</a>
          <span className="absolute left-1/2 -translate-x-1/2 font-display text-base sm:text-lg font-bold whitespace-nowrap">Мои записи</span>
        </div>
      </div>

      <div className="mx-auto max-w-3xl px-4 sm:px-6 py-10">
        <div className="rounded-xl border border-ink-900/10 bg-white p-5">
          <label className="flex items-center gap-2 text-sm font-bold"><IcPhone size={16} className="text-berry-600" />Найти записи по номеру телефона</label>
          <div className="mt-3 flex gap-2">
            <input className={inp} type="tel" placeholder="+375 29 000-00-00" value={phone}
              onChange={(e) => setPhone(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && setSearched(true)} />
            <Btn onClick={() => setSearched(true)}>Найти</Btn>
          </div>
          <p className="mt-2 text-xs text-ink-700/55">Здесь же появляются напоминания о визитах. Данные видны только вам.</p>
        </div>

        {my === null && searched && <div className="mt-6"><Empty text="Укажите номер, на который записывались" /></div>}

        {my && my.length === 0 && (
          <div className="mt-6">
            <Empty text={`По номеру ${fmtPhone(norm)} записей не найдено`} />
            <div className="mt-4 text-center"><a href="#masters"><Btn v="outline" sm>Найти мастера<IcArrowR size={14} /></Btn></a></div>
          </div>
        )}

        {my && my.length > 0 && (
          <>
            {upcoming.length > 0 && (
              <section className="mt-8">
                <h2 className="font-display text-lg font-bold">Предстоящие · {upcoming.length}</h2>
                <div className="mt-3 space-y-2.5">
                  {upcoming.map((a) => {
                    const m = db.masters.find((x) => x.id === a.masterId);
                    return (
                      <div key={a.id} className="flex flex-col gap-3 rounded-xl border border-ink-900/10 bg-white p-4 sm:flex-row sm:items-center">
                        <span className="h-10 w-1.5 shrink-0 rounded-full" style={{ background: a.serviceColor }} />
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="font-display font-semibold">{a.serviceName}</span>
                            <StatusBadge s={a.status} />
                          </div>
                          <div className="mt-1 text-sm text-ink-800/70">
                            <a href={`#/m/${m?.slug}`} className="font-bold text-berry-600 hover:underline">{m?.name}</a>
                            {" · "}{fmtDate(a.date)} в {a.start} · {a.durationMin} мин
                          </div>
                          <div className="mt-0.5 text-xs font-semibold text-ink-700/60">{PAYMENTS[a.paymentMethod]} · {fmtMoney(a.price)}{m?.address ? ` · ${m.address}` : ""}</div>
                        </div>
                        <div className="flex shrink-0 flex-wrap gap-2">
                          <Btn v="outline" sm onClick={() => setResched(a)}><IcCalendar size={13} />Перенести</Btn>
                          <Btn v="dangerGhost" sm onClick={() => setToCancel(a.id)}><IcBan size={14} />Отменить</Btn>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </section>
            )}

            {notifs.length > 0 && (
              <section className="mt-8">
                <h2 className="font-display text-lg font-bold flex items-center gap-2"><IcBell size={17} className="text-honey-500" />Уведомления</h2>
                <div className="mt-3 space-y-2">
                  {notifs.slice(0, 8).map((n) => (
                    <div key={n.id} className="flex items-start gap-3 rounded-lg border border-ink-900/8 bg-white px-4 py-3">
                      <span className={cx("mt-1.5 h-2 w-2 shrink-0 rounded-full", n.read ? "bg-ink-900/15" : "bg-honey-500")} />
                      <div className="min-w-0">
                        <div className="text-sm font-bold">{n.title}</div>
                        <div className="text-[13px] text-ink-800/70">{n.body}</div>
                        <div className="mt-0.5 text-[11px] font-semibold text-ink-700/45">{timeAgo(n.createdAt)}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {past.length > 0 && (
              <section className="mt-8">
                <h2 className="font-display text-lg font-bold text-ink-800/70">История · {past.length}</h2>
                <div className="mt-3 space-y-2">
                  {past.slice(0, 10).map((a) => {
                    const m = db.masters.find((x) => x.id === a.masterId);
                    const reviewed = hasReview(db, a.id);
                    return (
                      <div key={a.id} className="flex flex-wrap items-center gap-3 rounded-lg border border-ink-900/8 bg-white/70 px-4 py-3 text-sm opacity-90">
                        <span className="h-7 w-1 shrink-0 rounded-full" style={{ background: a.serviceColor }} />
                        <div className="min-w-0 flex-1">
                          <span className="font-semibold">{a.serviceName}</span>
                          <span className="text-ink-700/60"> · {m?.name} · {fmtDate(a.date)}</span>
                        </div>
                        <span className="font-bold tabular-nums">{fmtMoney(a.price)}</span>
                        <StatusBadge s={a.status} />
                        {a.status === "done" && !reviewed && (
                          <Btn v="outline" sm onClick={() => setReviewFor(a)}><IcStar size={13} />Оценить</Btn>
                        )}
                        {a.status === "done" && reviewed && (
                          <Badge tone="jade"><IcStar size={11} />Отзыв оставлен</Badge>
                        )}
                      </div>
                    );
                  })}
                </div>
              </section>
            )}
          </>
        )}
      </div>

      {reviewFor && <ReviewModal appt={reviewFor} onClose={() => setReviewFor(null)} />}
      {resched && <RescheduleModal appt={resched} onClose={() => setResched(null)} />}
      <Confirm open={!!toCancel} onClose={() => setToCancel(null)} onYes={() => toCancel && doCancel(toCancel)} danger
        title="Отменить запись?" text="Слот станет доступен другим клиентам, а мастер получит уведомление об отмене." />
    </div>
  );
}

/* ─── Перенос записи клиентом ─── */
function RescheduleModal({ appt, onClose }: { appt: Appointment; onClose: () => void }) {
  const db = useDB();
  const toast = useToast();
  const master = db.masters.find((m) => m.id === appt.masterId);
  const today = todayISO();
  const [date, setDate] = useState<string>(appt.date >= today ? appt.date : today);
  const [start, setStart] = useState<string | null>(null);
  const slots = useMemo(
    () => (master ? freeSlots(master, db.appointments, date, appt.durationMin, appt.id) : []),
    [master, db.appointments, date, appt.durationMin, appt.id]
  );

  const submit = () => {
    if (!start) return toast("Выберите новое время", "err");
    const err = rescheduleAppt(appt.id, date, start, true);
    if (err) return toast(err, "err");
    toast("Запись перенесена — мастер подтвердит новое время");
    onClose();
  };

  return (
    <Modal open onClose={onClose} title="Перенести запись">
      <div className="rounded-lg bg-berry-50 border border-berry-200/70 px-3.5 py-2.5 text-sm">
        <span className="font-bold">{appt.serviceName}</span>
        <span className="text-berry-700/80"> · сейчас: {fmtDate(appt.date)} в {appt.start}</span>
      </div>
      <div className="mt-4 text-[11px] font-bold uppercase tracking-wider text-ink-700/60">Шаг 1 — новый день</div>
      <div className="mt-2">
        <CalendarMonth selected={date} onSelect={(d) => { setDate(d); setStart(null); }}
          slotsFor={(iso) => (master ? freeSlots(master, db.appointments, iso, appt.durationMin, appt.id) : [])} />
      </div>
      <div className="mt-4 flex items-baseline justify-between gap-2">
        <div className="text-[11px] font-bold uppercase tracking-wider text-ink-700/60">Шаг 2 — новое время</div>
        {slots.length > 0 && <span className="text-[11px] font-bold text-jade-600">{slots.length} свободно</span>}
      </div>
      {slots.length === 0 ? (
        <p className="mt-2 rounded-lg bg-milk-100 px-3.5 py-3 text-[12px] font-semibold text-ink-700/70">На этот день свободных окон нет — выберите другую дату.</p>
      ) : (
        <div className="mt-2"><SlotChips slots={slots} selected={start} onSelect={setStart} /></div>
      )}
      <Btn className="mt-4 w-full" disabled={!start} onClick={submit}><IcCheck size={16} />Подтвердить перенос</Btn>
      <p className="mt-2 text-center text-[11px] text-ink-700/55">После переноса запись получит статус «Ожидает» — мастер подтвердит новое время.</p>
    </Modal>
  );
}

function ReviewModal({ appt, onClose }: { appt: Appointment; onClose: () => void }) {
  const db = useDB();
  const toast = useToast();
  const master = db.masters.find((m) => m.id === appt.masterId);
  const [rating, setRating] = useState(5);
  const [hover, setHover] = useState(0);
  const [text, setText] = useState("");
  const submit = () => {
    const err = addReview(appt.id, rating, text);
    if (err) return toast(err, "err");
    toast("Спасибо за отзыв! Мастер его увидел");
    onClose();
  };
  return (
    <Modal open onClose={onClose} title="Как прошёл визит?">
      <p className="text-sm text-ink-800/70">
        <b>{appt.serviceName}</b> у {master?.name ?? "мастера"} · {fmtDate(appt.date)}. Оценка попадёт на публичную страницу мастера.
      </p>
      <div className="mt-5 flex justify-center gap-2">
        {[1, 2, 3, 4, 5].map((n) => (
          <button key={n} onClick={() => setRating(n)} onMouseEnter={() => setHover(n)} onMouseLeave={() => setHover(0)}
            className="cursor-pointer transition-transform hover:scale-110 active:scale-95" aria-label={`${n} звёзд`}>
            <IcStar size={34} className={cx("transition-colors", n <= (hover || rating) ? "text-honey-500" : "text-ink-900/15")} />
          </button>
        ))}
      </div>
      <div className="mt-1 text-center text-xs font-bold text-ink-700/60">
        {["", "Плохо", "Так себе", "Нормально", "Хорошо", "Отлично"][rating]}
      </div>
      <textarea className={cx(inp, "mt-4 min-h-[90px] resize-y")} placeholder="Расскажите о впечатлениях (необязательно)" value={text} onChange={(e) => setText(e.target.value)} />
      <Btn className="mt-4 w-full" onClick={submit}><IcStar size={15} />Опубликовать отзыв</Btn>
    </Modal>
  );
}

import { useMemo, useRef, useState } from "react";
import type { Appointment } from "../lib/types";
import { PAYMENTS } from "../lib/types";
import { useDB, book, getSalonOf } from "../lib/store";
import { freeSlots, todayISO, fmtDate, fmtDateLong, WD } from "../lib/schedule";
import { cx, fmtMoney, downloadICS, plural } from "../lib/util";
import { Btn, Stars, useToast, inp, Avatar, CalendarMonth, SlotChips } from "../components/ui";
import { IcSparkle, IcShield, IcClock, IcPin, IcWallet, IcCheck, IcArrowL, IcCopy, IcCalendar, IcDownload, IcArrowR, IcStore, IcGift, IcHeart } from "../components/icons";

export default function PublicPage({ slug, initialDate }: { slug: string; initialDate?: string }) {
  const db = useDB();
  const toast = useToast();
  const master = db.masters.find((m) => m.slug === slug);
  const bookRef = useRef<HTMLDivElement>(null);

  const services = useMemo(() => db.services.filter((s) => s.masterId === master?.id && s.active), [db.services, master?.id]);

  const [svcId, setSvcId] = useState<string | null>(null);
  const [date, setDate] = useState<string | null>(() =>
    initialDate && initialDate >= todayISO() ? initialDate : null
  );
  const [start, setStart] = useState<string | null>(null);
  const [form, setForm] = useState({ name: "", phone: "", payment: "" });
  const [done, setDone] = useState<Appointment | null>(null);

  if (!master || master.blocked) {
    return (
      <div className="grid min-h-screen place-items-center bg-milk-100 px-4 text-center">
        <div>
          <span className="mx-auto grid h-14 w-14 place-items-center rounded-xl bg-ink-900 text-berry-400"><IcSparkle size={26} /></span>
          <h1 className="mt-4 font-display text-2xl font-bold">Мастер не найден</h1>
          <p className="mt-2 text-sm text-ink-800/60">Возможно, ссылка устарела или страница скрыта.</p>
          <a href="#/" className="mt-4 inline-block"><Btn>На главную</Btn></a>
        </div>
      </div>
    );
  }

  const salon = getSalonOf(master.id);
  const svc = services.find((s) => s.id === svcId) ?? null;
  const slots = svc && date ? freeSlots(master, db.appointments, date, svc.durationMin) : [];
  const masterReviews = db.reviews.filter((r) => r.masterId === master.id).slice(0, 6);

  const pickService = (id: string) => {
    setSvcId(id); setStart(null); setDone(null); setDate(null);
    setTimeout(() => bookRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 60);
  };

  const copyLink = async () => {
    try { await navigator.clipboard.writeText(location.href); toast("Ссылка скопирована — делитесь!"); }
    catch { toast("Не удалось скопировать", "err"); }
  };

  const submit = () => {
    if (!svc || !date || !start) return;
    if (form.name.trim().length < 2) return toast("Укажите имя", "err");
    if (form.phone.replace(/\D/g, "").length < 10) return toast("Укажите корректный телефон", "err");
    if (!form.payment) return toast("Выберите способ оплаты", "err");
    const res = book({ masterId: master.id, serviceId: svc.id, date, start, name: form.name, phone: form.phone, paymentMethod: form.payment, byClient: true });
    if (!res.ok) return toast(res.error!, "err");
    setDone(res.appt!);
    toast("Запись создана! Мастер получил уведомление");
    setTimeout(() => bookRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 60);
  };

  return (
    <div className="min-h-screen bg-milk-100 text-ink-900 pb-[max(4.5rem,env(safe-area-inset-bottom))]">
      {/* Шапка мастера */}
      <div className="bg-ink-900 text-milk-100">
        <div className="mx-auto max-w-5xl px-4 sm:px-6 py-10">
          <a href="#/" className="mb-6 inline-flex items-center gap-1.5 text-xs font-bold text-milk-100/60 hover:text-berry-300 transition-colors"><IcArrowL size={14} />В каталог</a>
          <div className="flex flex-col gap-7 sm:flex-row sm:items-start">
            <div className="relative shrink-0">
              <Avatar src={master.photo} name={master.name} color={master.color} size={132} className="rounded-2xl border-2 border-milk-100/15 shadow-2xl" />
              {master.verified && <span className="absolute -bottom-2 -right-2 grid h-9 w-9 place-items-center rounded-full bg-jade-500 text-white shadow-lg" title="Проверен платформой"><IcShield size={17} /></span>}
            </div>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2.5">
                <h1 className="font-display text-2xl sm:text-3xl font-bold tracking-tight">{master.name}</h1>
                {master.reviews > 0 && <span className="flex items-center gap-1.5 rounded-md bg-milk-100/10 px-2 py-1 text-xs font-bold"><Stars v={master.rating} size={12} />{master.rating} · {master.reviews}</span>}
              </div>
              <div className="mt-1.5 flex flex-wrap items-center gap-2">
                <span className="text-[15px] font-semibold text-berry-300">{master.profession}</span>
                {salon && (
                  <a href={`#/salon/${salon.slug}`} className="inline-flex items-center gap-1.5 rounded-full bg-milk-100/10 px-2.5 py-1 text-xs font-bold text-milk-100/85 transition-colors hover:bg-milk-100/20">
                    <IcStore size={13} className="text-berry-400" />{salon.name}
                  </a>
                )}
              </div>
              <p className="mt-3 max-w-xl text-sm leading-relaxed text-milk-100/70">{master.description || "Мастер пока не добавил описание."}</p>
              <div className="mt-4 flex flex-wrap gap-x-5 gap-y-2 text-[13px] font-semibold text-milk-100/75">
                {master.address && <span className="flex items-center gap-1.5"><IcPin size={14} className="text-berry-400" />{master.address}</span>}
                <span className="flex items-center gap-1.5"><IcWallet size={14} className="text-berry-400" />{master.paymentMethods.map((p) => PAYMENTS[p]).join(" · ")}</span>
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                <Btn v="gold" sm onClick={copyLink}><IcCopy size={14} />Скопировать ссылку на запись</Btn>
                <a href="#/my"><Btn v="outline" sm className="!border-milk-100/25 !text-milk-100 hover:!border-berry-400 hover:!text-berry-300">Мои записи</Btn></a>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-5xl px-4 sm:px-6 py-10">
        <div className="grid gap-8 lg:grid-cols-[1.05fr_.95fr]">
          <div>
            <h2 className="font-display text-xl font-bold">Услуги и цены</h2>
            <p className="mt-1 text-sm text-ink-800/60">Выберите услугу — покажем только свободное время.</p>
            <div className="mt-4 space-y-2.5">
              {services.map((s) => {
                const active = svcId === s.id;
                return (
                  <button key={s.id} onClick={() => pickService(s.id)}
                    className={cx("group flex w-full items-center gap-4 rounded-xl border-[1.5px] bg-white p-4 text-left transition-all duration-200 cursor-pointer",
                      active ? "border-berry-500 shadow-lg shadow-berry-600/12 -translate-y-0.5" : "border-ink-900/10 hover:border-berry-300 hover:-translate-y-0.5")}>
                    <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: s.color }} />
                    <span className="min-w-0 flex-1">
                      <span className="block font-display text-[15px] font-semibold text-ink-900">{s.name}</span>
                      {s.description && <span className="mt-0.5 block truncate text-xs text-ink-700/60">{s.description}</span>}
                      <span className="mt-1 flex items-center gap-1.5 text-xs font-bold text-ink-700/70"><IcClock size={13} />{s.durationMin} мин</span>
                    </span>
                    <span className="text-right shrink-0">
                      <span className="block font-display text-[15px] font-bold tabular-nums text-ink-900">{fmtMoney(s.price)}</span>
                      <span className={cx("mt-1 inline-flex items-center gap-1 text-xs font-bold", active ? "text-berry-600" : "text-berry-600/70 group-hover:text-berry-600")}>{active ? "Выбрано" : "Выбрать"}<IcArrowR size={13} /></span>
                    </span>
                  </button>
                );
              })}
              {services.length === 0 && <div className="rounded-xl border border-dashed border-ink-900/20 py-10 text-center text-sm text-ink-700/60">Мастер пока не опубликовал услуги</div>}
            </div>

            {master.schedule && (
              <div className="mt-6 rounded-xl border border-ink-900/10 bg-white p-4 text-sm">
                <div className="text-[11px] font-bold uppercase tracking-wider text-ink-700/60">График работы</div>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {WD.map((w, i) => (
                    <span key={w} className={cx("rounded-md px-2.5 py-1 text-xs font-bold", master.schedule.workDays.includes(i) ? "bg-ink-900 text-milk-50" : "bg-ink-900/6 text-ink-700/40 line-through")}>{w}</span>
                  ))}
                </div>
                <div className="mt-2.5 font-semibold text-ink-800">По рабочим дням: {master.schedule.start}–{master.schedule.end}{master.schedule.breaks.length > 0 && <span className="text-ink-700/60"> · перерыв {master.schedule.breaks.map((b) => `${b.start}–${b.end}`).join(", ")}</span>}</div>
              </div>
            )}

            {master.loyalty.enabled && (
              <div className="mt-4 overflow-hidden rounded-xl border border-honey-300/60 bg-gradient-to-br from-honey-100 to-berry-50 p-4">
                <div className="flex items-center gap-2 text-honey-700">
                  <IcGift size={18} />
                  <span className="text-[11px] font-bold uppercase tracking-wider">Программа лояльности</span>
                </div>
                <div className="mt-2 font-display text-[15px] font-bold text-ink-900">
                  {master.loyalty.type === "cashback"
                    ? `Кэшбек ${master.loyalty.value}% бонусами с каждого визита`
                    : `Каждый ${master.loyalty.value}-й визит — со скидкой 50%`}
                </div>
                <p className="mt-1 text-xs leading-relaxed text-ink-800/65">
                  {master.loyalty.type === "cashback"
                    ? "Бонусы начисляются после визита и видны в вашей карточке у мастера."
                    : "Скидка применяется автоматически — мастер видит ваш прогресс в CRM."}
                </p>
              </div>
            )}

            {masterReviews.length > 0 && (
              <div className="mt-6">
                <div className="flex items-center justify-between">
                  <h2 className="font-display text-xl font-bold flex items-center gap-2"><IcHeart size={19} className="text-coral-500" />Отзывы</h2>
                  <span className="flex items-center gap-1.5 text-sm font-bold text-ink-800"><Stars v={master.rating} size={13} />{master.rating} · {master.reviews}</span>
                </div>
                <div className="mt-3 space-y-2.5">
                  {masterReviews.map((r) => (
                    <div key={r.id} className="rounded-xl border border-ink-900/10 bg-white p-3.5">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-sm font-bold">{r.clientName}</span>
                        <Stars v={r.rating} size={12} />
                      </div>
                      <div className="mt-0.5 text-[11px] font-semibold text-ink-700/50">{r.serviceName} · {new Date(r.createdAt).toLocaleDateString("ru-RU", { day: "numeric", month: "short" })}</div>
                      {r.text && <p className="mt-1.5 text-[13px] leading-relaxed text-ink-800/80">{r.text}</p>}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Запись */}
          <div ref={bookRef} className="scroll-mt-24">
            <div className="sticky top-4 rounded-xl border border-ink-900/10 bg-white shadow-xl shadow-ink-950/6 p-5 lg:top-20">
              <h2 className="font-display text-xl font-bold flex items-center gap-2"><IcCalendar size={19} className="text-berry-600" />Онлайн-запись</h2>

              {done ? (
                <div className="mt-4">
                  <div className="rounded-xl bg-jade-100 border border-jade-400/30 p-5 text-center">
                    <span className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-jade-500 text-white"><IcCheck size={24} /></span>
                    <div className="mt-3 font-display text-lg font-bold text-jade-700">Вы записаны!</div>
                    <p className="mt-1 text-sm text-jade-700/80">Мастер получил уведомление и скоро подтвердит запись.</p>
                  </div>
                  <div className="mt-4 rounded-xl border border-ink-900/10 p-4 text-sm">
                    <div className="font-bold">{done.serviceName}</div>
                    <div className="mt-0.5 text-ink-800/70">{fmtDate(done.date)} в {done.start} · {done.durationMin} мин</div>
                    <div className="mt-0.5 text-ink-800/70">{PAYMENTS[done.paymentMethod]} · {fmtMoney(done.price)}</div>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <Btn v="dark" sm onClick={() => downloadICS({ title: done.serviceName, date: done.date, start: done.start, durationMin: done.durationMin, address: master.address || "", master: master.name })}>
                        <IcDownload size={14} />В календарь (.ics)
                      </Btn>
                      <a href="#/my"><Btn v="outline" sm>Мои записи<IcArrowR size={13} /></Btn></a>
                    </div>
                  </div>
                  <Btn v="ghost" sm className="mt-3 w-full" onClick={() => { setDone(null); setSvcId(null); setStart(null); }}>Записаться ещё</Btn>
                </div>
              ) : (
                <>
                  {!svc && <p className="mt-3 rounded-lg bg-milk-100 px-3.5 py-3 text-[13px] font-semibold text-ink-700/70">Шаг 1 — выберите услугу из списка выше.</p>}
                  {svc && (
                    <>
                      <div className="mt-3 flex items-center justify-between rounded-lg bg-berry-50 border border-berry-200/70 px-3.5 py-2.5 text-sm">
                        <span className="font-bold">{svc.name}</span>
                        <span className="font-bold tabular-nums text-berry-700">{fmtMoney(svc.price)} · {svc.durationMin} мин</span>
                      </div>

                      <div className="mt-4">
                        <div className="flex items-baseline justify-between gap-2">
                          <div className="text-[11px] font-bold uppercase tracking-wider text-ink-700/60">Шаг 2 — выберите день</div>
                          {date && <span className="text-[11px] font-bold text-berry-600">{fmtDateLong(date)}</span>}
                        </div>
                        <div className="mt-2">
                          <CalendarMonth selected={date} onSelect={(d) => { setDate(d); setStart(null); }}
                            slotsFor={(iso) => freeSlots(master, db.appointments, iso, svc.durationMin)} />
                        </div>
                      </div>

                      {date && (
                        <div className="mt-4">
                          <div className="flex items-baseline justify-between gap-2">
                            <div className="text-[11px] font-bold uppercase tracking-wider text-ink-700/60">Шаг 3 — время</div>
                            {slots.length > 0 && (
                              <span className="text-[11px] font-bold text-jade-600">
                                {slots.length} {plural(slots.length, ["окно", "окна", "окон"])} свободно
                              </span>
                            )}
                          </div>
                          {slots.length === 0 ? (
                            <p className="mt-2 rounded-lg bg-milk-100 px-3.5 py-3 text-[12px] font-semibold text-ink-700/70">На этот день свободных окон нет — выберите другую дату в календаре.</p>
                          ) : (
                            <div className="mt-2"><SlotChips slots={slots} selected={start} onSelect={setStart} /></div>
                          )}
                        </div>
                      )}

                      {start && date && (
                        <div className="mt-4 border-t border-ink-900/8 pt-4">
                          <div className="text-[11px] font-bold uppercase tracking-wider text-ink-700/60">Шаг 4 — ваши контакты</div>
                          <div className="mt-2 space-y-2.5">
                            <input className={inp} placeholder="Ваше имя" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
                            <input className={inp} type="tel" placeholder="+375 29 000-00-00" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
                          </div>
                          <div className="mt-3 text-[11px] font-bold uppercase tracking-wider text-ink-700/60">Шаг 5 — оплата мастеру</div>
                          <div className="mt-2 flex flex-wrap gap-1.5">
                            {master.paymentMethods.map((p) => (
                              <button key={p} onClick={() => setForm({ ...form, payment: p })}
                                className={cx("rounded-md border-[1.5px] px-3 py-1.5 text-xs font-bold cursor-pointer", form.payment === p ? "border-jade-500 bg-jade-100 text-jade-700" : "border-ink-900/12 hover:border-jade-400")}>
                                {PAYMENTS[p]}
                              </button>
                            ))}
                          </div>
                          <p className="mt-2 text-[11px] text-ink-700/55">Оплата напрямую мастеру при визите или переводом — платформа комиссию не берёт.</p>
                          <Btn className="mt-3 w-full !py-3" onClick={submit}>
                            Записаться · {fmtDate(date)}, {start}<IcArrowR size={15} />
                          </Btn>
                        </div>
                      )}
                    </>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

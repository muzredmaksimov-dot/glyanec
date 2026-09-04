import { useMemo, useState } from "react";
import { useDB, useSession, searchMasters, suggest, paidPlansVisible } from "../lib/store";
import { freeSlots, addDays, todayISO, nextDays, fmtDate } from "../lib/schedule";
import { cx, fmtMoney } from "../lib/util";
import type { Master } from "../lib/types";
import { Badge, Btn, Reveal, useInstallPrompt, Avatar, inp, Empty } from "../components/ui";
import {
  IcSparkle, IcCalendar, IcUsers, IcChart, IcBell, IcLink, IcShield, IcArrowR, IcDownload,
  IcCheck, IcCrown, IcScissors, IcWallet, IcClock, IcPin, IcSearch, IcGift, IcLifeBuoy,
} from "../components/icons";
import { openFeedback } from "../components/Feedback";

export default function Landing() {
  const db = useDB();
  const session = useSession();
  const { canInstall, install } = useInstallPrompt();
  const [q, setQ] = useState("");
  const [city, setCity] = useState("Все");
  const [sort, setSort] = useState<"rating" | "reviews" | "price">("rating");
  const [panelProf, setPanelProf] = useState("Все");
  const [focus, setFocus] = useState(false);
  const sugs = useMemo(() => suggest(db, q), [db, q]);

  const masters = useMemo(() => {
    const ms = db.masters.filter((m) => !m.blocked);
    return [...ms].sort((a, b) => Number(b.promoted) - Number(a.promoted) || b.rating - a.rating);
  }, [db.masters]);

  const profs = useMemo(() => ["Все", ...Array.from(new Set(masters.map((m) => m.profession)))], [masters]);
  const cities = useMemo(() => ["Все", ...Array.from(new Set(masters.map((m) => m.city)))], [masters]);
  const shown = useMemo(() => searchMasters(db, q, city, sort), [db, q, city, sort]);
  const salonOf = (masterId: string) => db.salons.find((s) => s.masterIds.includes(masterId)) ?? null;

  const featured = masters.filter((m) => m.promoted).slice(0, 2);
  const hero = featured.length >= 2 ? featured : masters.slice(0, 2);

  const weekSlots = useMemo(
    () => masters.reduce((s, m) => {
      const svcs = db.services.filter((x) => x.masterId === m.id && x.active);
      const dur = svcs.length ? Math.min(...svcs.map((x) => x.durationMin)) : 60;
      return s + nextDays(7).reduce((ss, d) => ss + freeSlots(m, db.appointments, d, dur).length, 0);
    }, 0),
    [masters, db.services, db.appointments]
  );

  // Живая витрина: ближайшее свободное окно каждого мастера
  const panelRows = useMemo(() => {
    const rows: { m: Master; date: string; slots: string[]; total: number }[] = [];
    for (const m of masters) {
      if (panelProf !== "Все" && m.profession !== panelProf) continue;
      const svcs = db.services.filter((x) => x.masterId === m.id && x.active);
      if (!svcs.length) continue;
      const dur = Math.min(...svcs.map((x) => x.durationMin));
      for (const d of nextDays(14)) {
        const slots = freeSlots(m, db.appointments, d, dur);
        if (slots.length) { rows.push({ m, date: d, slots: slots.slice(0, 3), total: slots.length }); break; }
      }
    }
    return rows.sort((a, b) => a.date.localeCompare(b.date)).slice(0, 4);
  }, [masters, db.services, db.appointments, panelProf]);

  const relDay = (iso: string) =>
    iso === todayISO() ? "сегодня" : iso === addDays(todayISO(), 1) ? "завтра" : fmtDate(iso);

  const plans = db.settings.plans;
  const minPrice = (mid: string) => {
    const ps = db.services.filter((s) => s.masterId === mid && s.active).map((s) => s.price);
    return ps.length ? Math.min(...ps) : 0;
  };

  return (
    <div className="min-h-screen bg-milk-100 text-ink-900">
      {/* ─── Навигация ─── */}
      <header className="sticky top-0 z-50 border-b border-ink-900/8 bg-milk-100/85 backdrop-blur-md">
        <div className="mx-auto flex h-14 sm:h-16 max-w-6xl items-center justify-between gap-2 sm:gap-4 px-4 sm:px-6">
          <a href="#/" className="flex items-center gap-2">
            <span className="grid h-9 w-9 place-items-center rounded-lg bg-ink-900 text-berry-400"><IcSparkle size={20} /></span>
            <span className="font-display text-lg font-bold tracking-tight">Глянец</span>
          </a>
          <nav className="hidden md:flex items-center gap-6 text-sm font-semibold text-ink-800">
            <a href="#masters" className="hover:text-berry-600 transition-colors">Мастера</a>
            <a href="#how" className="hover:text-berry-600 transition-colors">Как это работает</a>
            <a href="#plans" className="hover:text-berry-600 transition-colors">Тарифы</a>
          </nav>
          <div className="flex items-center gap-2">
            <a href="#/my" className="hidden sm:inline-flex"><Btn v="ghost" sm>Мои записи</Btn></a>
            {session?.kind === "master" ? (
              <a href="#/app"><Btn sm v="dark">Кабинет</Btn></a>
            ) : (
              <a href="#/login"><Btn sm>Вход для мастеров</Btn></a>
            )}
          </div>
        </div>
      </header>

      {/* ─── Открытие: витрина ─── */}
      <section className="relative overflow-hidden">
        <div className="pointer-events-none absolute -top-32 -right-32 h-96 w-96 rounded-full bg-berry-200/50 blur-3xl" />
        <div className="pointer-events-none absolute top-40 -left-40 h-96 w-96 rounded-full bg-honey-100 blur-3xl" />
        <div className="relative mx-auto grid max-w-6xl gap-10 px-4 sm:px-6 pb-14 pt-10 sm:pt-12 lg:grid-cols-[1.05fr_.95fr] lg:items-center lg:pt-16">
          <div>
            <Reveal>
              <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-ink-900/12 bg-white/70 px-3 py-1.5 text-xs font-bold text-ink-800">
                <span className="relative flex h-2 w-2"><span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-jade-500 opacity-60" /><span className="relative inline-flex h-2 w-2 rounded-full bg-jade-500" /></span>
                Беларусь · {weekSlots} свободных окон на этой неделе
              </div>
            </Reveal>
            <Reveal delay={80}>
              <h1 className="font-display text-[clamp(1.9rem,5.4vw,3.6rem)] font-bold leading-[1.06] tracking-tight">
                Видно, когда<br />свободно. <span className="text-berry-600">Берите —</span><br />пока ваше.
              </h1>
            </Reveal>
            <Reveal delay={160}>
              <p className="mt-5 max-w-md text-[15px] leading-relaxed text-ink-800/80">
                Никаких «а во сколько вам удобно?» в переписке. Мастер, услуга, слот — и запись готова за минуту.
              </p>
            </Reveal>
            <Reveal delay={240}>
              <div className="mt-7 flex flex-wrap items-center gap-3">
                <a href="#free"><Btn className="!px-6 !py-3">Найти время<IcArrowR size={17} /></Btn></a>
                <a href="#/login"><Btn v="outline" className="!px-6 !py-3"><IcScissors size={17} />Я мастер</Btn></a>
                {canInstall && <Btn v="ghost" onClick={() => install()}><IcDownload size={17} />Установить</Btn>}
              </div>
            </Reveal>
            <Reveal delay={320}>
              <div className="mt-8 flex flex-wrap gap-x-8 gap-y-3">
                <div><div className="font-display text-2xl font-bold tabular-nums">{masters.length}</div><div className="text-xs font-semibold text-ink-700/60">мастеров принимают запись</div></div>
                <div><div className="font-display text-2xl font-bold tabular-nums text-berry-600">{weekSlots}</div><div className="text-xs font-semibold text-ink-700/60">окон свободно за 7 дней</div></div>
                <div><div className="font-display text-2xl font-bold">BYN</div><div className="text-xs font-semibold text-ink-700/60">оплата мастеру, без комиссии</div></div>
              </div>
            </Reveal>
          </div>

          {/* Живая витрина: ближайшие свободные окна */}
          <div className="relative">
            {hero[0]?.photo && (
              <div className="absolute -bottom-9 -right-3 z-0 hidden h-64 w-52 rotate-6 overflow-hidden rounded-xl border border-ink-900/10 shadow-xl shadow-ink-950/15 lg:block">
                <img src={hero[0].photo} alt="" className="h-full w-full object-cover" />
              </div>
            )}
            <Reveal delay={200}>
              <div id="free" className="relative z-10 scroll-mt-24 rounded-xl border border-ink-900/10 bg-white shadow-2xl shadow-ink-950/12">
                <div className="flex items-center justify-between gap-3 border-b border-ink-900/8 px-5 py-4">
                  <div>
                    <div className="font-display text-[15px] font-bold">Ближайшее свободное время</div>
                    <div className="text-[11px] font-semibold text-ink-700/55">рассчитано по расписаниям мастеров</div>
                  </div>
                  <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-berry-600 text-white"><IcClock size={18} /></span>
                </div>
                <div className="flex gap-1.5 overflow-x-auto px-5 pt-3.5 pb-1">
                  {profs.map((p) => (
                    <button key={p} onClick={() => setPanelProf(p)}
                      className={cx("shrink-0 rounded-full border px-3 py-1 text-xs font-bold transition-all cursor-pointer",
                        panelProf === p ? "border-ink-900 bg-ink-900 text-milk-50" : "border-ink-900/12 text-ink-800 hover:border-ink-900/35")}>{p}</button>
                  ))}
                </div>
                <div className="space-y-1 p-3">
                  {panelRows.length === 0 && (
                    <p className="px-3 py-6 text-center text-sm font-semibold text-ink-700/55">На ближайшие две недели всё занято — загляните чуть позже</p>
                  )}
                  {panelRows.map((r) => (
                    <a key={r.m.id} href={`#/m/${r.m.slug}?date=${r.date}`}
                      className="group block rounded-lg px-2.5 py-2.5 transition-colors hover:bg-berry-50/70">
                      <div className="flex items-center gap-3">
                        <Avatar src={r.m.photo || undefined} name={r.m.name} color={r.m.color} size={40} />
                        <div className="min-w-0 flex-1">
                          <div className="truncate font-display text-sm font-semibold">{r.m.name}</div>
                          <div className="truncate text-[11px] font-semibold text-ink-700/55">{r.m.profession} · от {fmtMoney(minPrice(r.m.id))}</div>
                        </div>
                        <span className="shrink-0 text-[10px] font-bold uppercase tracking-wider text-jade-600">{relDay(r.date)} · ещё {r.total}</span>
                      </div>
                      <div className="mt-2 flex flex-wrap gap-1.5 sm:pl-[52px]">
                        {r.slots.map((t) => (
                          <span key={t}
                            className="cursor-pointer rounded-md border border-ink-900/12 px-2.5 py-1 text-[12px] font-bold tabular-nums transition-all hover:border-berry-600 hover:bg-berry-600 hover:text-white active:scale-95">{t}</span>
                        ))}
                        <span className="flex items-center gap-1 px-1 text-[11px] font-bold text-berry-600 opacity-70 sm:opacity-0 transition-opacity sm:group-hover:opacity-100">все окна<IcArrowR size={12} /></span>
                      </div>
                    </a>
                  ))}
                </div>
                <a href="#masters" className="flex items-center justify-center gap-1.5 border-t border-ink-900/8 px-5 py-3 text-[13px] font-bold text-berry-600 transition-colors hover:bg-berry-50/70">
                  Все мастера и услуги<IcArrowR size={14} />
                </a>
              </div>
            </Reveal>
          </div>
        </div>
      </section>

      {/* ─── Маркетплейс ─── */}
      <section id="masters" className="mx-auto max-w-6xl scroll-mt-20 px-4 sm:px-6 py-16">
        <Reveal>
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <div className="text-xs font-bold uppercase tracking-[.18em] text-berry-600">Маркетплейс · Беларусь</div>
              <h2 className="mt-2 font-display text-3xl font-bold tracking-tight sm:text-4xl">Найдите своего мастера</h2>
            </div>
            <span className="text-sm font-semibold text-ink-700/55">{shown.length} {shown.length === 1 ? "мастер" : shown.length < 5 ? "мастера" : "мастеров"}</span>
          </div>
          <div className="mt-6 flex flex-col gap-3 lg:flex-row lg:items-center">
            <div className="relative flex-1">
              <IcSearch size={17} className="absolute left-3.5 top-1/2 z-10 -translate-y-1/2 text-ink-700/40" />
              <input
                className={cx(inp, "pl-10 !py-3")}
                placeholder="Услуга, имя или направление — «маникюр», «окрашивание», «Алина»…"
                value={q}
                onChange={(e) => { setQ(e.target.value); setFocus(true); }}
                onFocus={() => setFocus(true)}
                onBlur={() => setTimeout(() => setFocus(false), 140)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && sugs[0]) { setFocus(false); location.hash = sugs[0].href; }
                }}
              />
              {q.trim().length >= 2 && focus && (
                <div className="absolute left-0 right-0 top-full z-30 mt-1.5 overflow-hidden rounded-xl border border-ink-900/10 bg-white shadow-2xl shadow-ink-950/15 animate-rise">
                  {sugs.length === 0 ? (
                    <p className="px-4 py-3.5 text-[13px] font-semibold text-ink-700/55">Ничего похожего не нашлось — попробуйте иначе, мы понимаем опечатки</p>
                  ) : (
                    sugs.map((s, i) => (
                      <button key={s.kind + s.label + i} onMouseDown={() => { setFocus(false); setQ(s.label); location.hash = s.href; }}
                        className={cx("flex w-full items-center gap-3 px-4 py-2.5 text-left transition-colors cursor-pointer hover:bg-berry-50", i > 0 && "border-t border-ink-900/5")}>
                        <span className={cx("grid h-8 w-8 shrink-0 place-items-center rounded-lg", s.kind === "master" ? "bg-ink-900 text-berry-300" : "bg-berry-100 text-berry-600")}>
                          {s.kind === "master" ? <IcScissors size={15} /> : <IcSparkle size={15} />}
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-sm font-bold text-ink-900">{s.label}</span>
                          <span className="block truncate text-[11px] font-semibold text-ink-700/55">{s.sub}</span>
                        </span>
                        <span className="shrink-0 text-[10px] font-bold uppercase tracking-wider text-ink-700/40">{s.kind === "master" ? "мастер" : "услуга"}</span>
                      </button>
                    ))
                  )}
                </div>
              )}
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {cities.map((c) => (
                <button key={c} onClick={() => setCity(c)}
                  className={cx("flex items-center gap-1 rounded-full border px-3.5 py-2 text-[13px] font-bold transition-all cursor-pointer",
                    city === c ? "border-berry-600 bg-berry-600 text-white" : "border-ink-900/15 bg-white/60 text-ink-800 hover:border-ink-900/40")}>
                  <IcPin size={13} />{c}
                </button>
              ))}
              <select className={cx(inp, "!w-auto !py-2 cursor-pointer")} value={sort} onChange={(e) => setSort(e.target.value as typeof sort)}>
                <option value="rating">Сначала с высоким рейтингом</option>
                <option value="reviews">По числу отзывов</option>
                <option value="price">Сначала дешевле</option>
              </select>
            </div>
          </div>
        </Reveal>
        {shown.length === 0 && (
          <div className="mt-8"><Empty text="Никого не нашли — попробуйте другой запрос или город" /></div>
        )}
        <div className="mt-8 grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
          {shown.map((m, i) => (
            <Reveal key={m.id} delay={i * 70}>
              <a href={`#/m/${m.slug}`} className="group block overflow-hidden rounded-xl border border-ink-900/10 bg-white transition-all duration-300 hover:-translate-y-1.5 hover:shadow-xl hover:shadow-ink-950/10">
                <div className="relative aspect-[4/4.4] overflow-hidden">
                  {m.photo ? (
                    <img src={m.photo} alt={m.name} className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" />
                  ) : (
                    <div className="grid h-full w-full place-items-center" style={{ background: m.color }}><span className="font-display text-5xl font-bold text-white/90">{m.name[0]}</span></div>
                  )}
                  <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-ink-950/70 to-transparent" />
                  <div className="absolute left-3 top-3 flex flex-wrap gap-1.5">
                    {m.promoted && <Badge tone="berry"><IcCrown size={11} />Топ</Badge>}
                    {m.verified && <Badge tone="jade"><IcShield size={11} />Проверен</Badge>}
                    {m.loyalty.enabled && <Badge tone="honey"><IcGift size={11} />Бонусы</Badge>}
                  </div>
                  <div className="absolute bottom-3 left-3 right-3 flex items-end justify-between text-milk-50">
                    <div>
                      <div className="font-display text-base font-semibold leading-tight">{m.name}</div>
                      <div className="text-xs font-medium text-milk-100/75">{m.profession}{salonOf(m.id) && <span> · {salonOf(m.id)!.name}</span>}</div>
                    </div>
                    {m.reviews > 0 && <span className="flex items-center gap-1 text-xs font-bold"><IcSparkle size={12} className="text-honey-400" />{m.rating}</span>}
                  </div>
                </div>
                <div className="flex items-center justify-between p-3.5">
                  <span className="flex items-center gap-2 text-[13px] font-bold text-ink-800">
                    от {fmtMoney(minPrice(m.id))}
                    <span className="flex items-center gap-0.5 text-[11px] font-semibold text-ink-700/50"><IcPin size={11} />{m.city}</span>
                  </span>
                  <span className="flex items-center gap-1 text-[13px] font-bold text-berry-600 transition-transform group-hover:translate-x-0.5">Записаться<IcArrowR size={14} /></span>
                </div>
              </a>
            </Reveal>
          ))}
        </div>
      </section>

      {/* ─── Как это работает ─── */}
      <section id="how" className="scroll-mt-20 border-y border-ink-900/8 bg-white">
        <div className="mx-auto grid max-w-6xl gap-12 px-4 sm:px-6 py-16 lg:grid-cols-2 lg:gap-20">
          {[
            { title: "Клиенту", color: "text-berry-600", steps: [["Выбираете мастера", "Цены в BYN, длительность и адрес — сразу на странице"], ["Берёте свободный слот", "Показываются только времена, которые действительно свободны"], ["Платите как удобно", "Наличные, ЕРИП-перевод или карта при визите — как у мастера. Без предоплаты"]] },
            { title: "Мастеру", color: "text-jade-600", steps: [["Публичная страница", "Ссылка на услуги и запись — в сторис, мессенджеры, куда угодно"], ["Календарь без накладок", "Система не даст записать двух людей на одно время"], ["Клиенты и выручка", "CRM с историей визитов и статистика по среднему чеку"]] },
          ].map((col, ci) => (
            <Reveal key={col.title} delay={ci * 120}>
              <h3 className={cx("font-display text-sm font-bold uppercase tracking-[.18em]", col.color)}>{col.title}</h3>
              <div className="mt-6 space-y-7">
                {col.steps.map(([t, d], i) => (
                  <div key={t} className="group flex gap-5">
                    <span className="font-display text-4xl font-bold text-ink-900/12 transition-colors group-hover:text-berry-300 tabular-nums">0{i + 1}</span>
                    <div>
                      <div className="font-display text-lg font-semibold">{t}</div>
                      <p className="mt-1 text-sm leading-relaxed text-ink-800/70">{d}</p>
                    </div>
                  </div>
                ))}
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      {/* ─── Возможности ─── */}
      <section id="features" className="mx-auto max-w-6xl scroll-mt-20 px-4 sm:px-6 py-20">
        <div className="grid gap-10 lg:grid-cols-[.9fr_1.1fr]">
          <div className="lg:sticky lg:top-24 lg:self-start">
            <Reveal>
              <div className="text-xs font-bold uppercase tracking-[.18em] text-berry-600">Внутри кабинета</div>
              <h2 className="mt-2 font-display text-3xl font-bold tracking-tight sm:text-4xl">Весь салон —<br />в одном экране</h2>
              <p className="mt-4 max-w-sm text-[15px] leading-relaxed text-ink-800/75">
                Каждый мастер получает изолированный кабинет: свои услуги, свои клиенты, свои данные.
                Никто не видит чужую базу — кроме администратора платформы.
              </p>
              <div className="mt-6 rounded-xl border border-ink-900/10 bg-ink-900 p-5 text-milk-100">
                <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-berry-300"><IcPin size={14} />Уже в платформе</div>
                <p className="mt-2 text-sm leading-relaxed text-milk-100/75">Салоны и команды, маркетплейс с поиском по городу, отзывы клиентов и программы лояльности — работают прямо сейчас.</p>
              </div>
            </Reveal>
          </div>
          <div>
            {[
              { ic: IcLink, t: "Персональная страница", d: "Услуги, цены, длительность, описание и ссылка для записи — всё публично и всегда актуально." },
              { ic: IcCalendar, t: "Умный календарь", d: "Переносы, подтверждения, отмены и блокировки времени. Слоты пересчитываются мгновенно." },
              { ic: IcUsers, t: "CRM без дублей", d: "Клиент с тем же номером не создаётся дважды: история, суммы и заметки копятся в одной карточке." },
              { ic: IcClock, t: "Честные слоты", d: "Клиент видит только свободное время — с учётом длительности услуги, перерывов и отпусков." },
              { ic: IcBell, t: "Push-уведомления", d: "Новая запись, отмена, перенос и напоминание за день — мастеру и клиенту." },
              { ic: IcChart, t: "Статистика и деньги", d: "Выручка в BYN, средний чек, популярность услуг, отмены и загрузка рабочих часов." },
            ].map((f, i) => (
              <Reveal key={f.t} delay={i * 60}>
                <div className="group flex gap-5 border-t border-ink-900/10 py-6 transition-all hover:bg-berry-50/50 hover:pl-3 rounded-lg">
                  <span className="mt-0.5 grid h-11 w-11 shrink-0 place-items-center rounded-lg bg-ink-900 text-berry-300 transition-colors group-hover:bg-berry-600 group-hover:text-white"><f.ic size={20} /></span>
                  <div>
                    <div className="font-display text-[17px] font-semibold">{f.t}</div>
                    <p className="mt-1 text-sm leading-relaxed text-ink-800/70">{f.d}</p>
                  </div>
                </div>
              </Reveal>
            ))}
            <div className="border-t border-ink-900/10" />
          </div>
        </div>
      </section>

      {/* ─── Тарифы ─── */}
      <section id="plans" className="scroll-mt-20 border-y border-ink-900/8 bg-ink-900 text-milk-100">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 py-16">
          <Reveal className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <div className="text-xs font-bold uppercase tracking-[.18em] text-berry-400">Тарифы</div>
              <h2 className="mt-2 font-display text-3xl font-bold tracking-tight sm:text-4xl">
                {paidPlansVisible(db) ? "Растите — платформа подстроится" : "Начните бесплатно"}
              </h2>
            </div>
            <p className="max-w-xs text-sm text-milk-100/60">
              {paidPlansVisible(db)
                ? "Подключение тарифов — через администрацию платформы. Лимиты настраиваются в админ-панели."
                : "Полный кабинет мастера без платы: запись, календарь, CRM, статистика и push-уведомления."}
            </p>
          </Reveal>
          <div className={cx("mt-10 grid gap-4", paidPlansVisible(db) ? "lg:grid-cols-3" : "mx-auto max-w-sm")}>
            {((paidPlansVisible(db) ? Object.keys(plans) : ["free"]) as (keyof typeof plans)[]).map((k, i) => {
              const p = plans[k];
              const hot = k === "pro";
              return (
                <Reveal key={k} delay={i * 100}>
                  <div className={cx("relative flex h-full flex-col rounded-xl border p-6 transition-all duration-300 hover:-translate-y-1",
                    hot ? "border-berry-500 bg-berry-600 text-white shadow-2xl shadow-berry-600/30 lg:-my-4 lg:py-10" : "border-milk-100/12 bg-milk-100/4 hover:bg-milk-100/8")}>
                    {hot && <span className="absolute -top-3 left-6 rounded-md bg-honey-500 px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide text-ink-950">Популярный</span>}
                    <div className="font-display text-lg font-semibold">{p.label}</div>
                    <div className="mt-2 font-display text-3xl font-bold tabular-nums">{p.price === 0 ? "0 BYN" : `${p.price} BYN`}<span className="text-sm font-medium opacity-60">/мес</span></div>
                    <ul className="mt-5 flex-1 space-y-2.5">
                      {p.perks.map((perk) => (
                        <li key={perk} className="flex items-start gap-2 text-sm"><IcCheck size={15} className={cx("mt-0.5 shrink-0", hot ? "text-honey-300" : "text-jade-400")} />{perk}</li>
                      ))}
                      <li className="flex items-start gap-2 text-sm opacity-80"><IcWallet size={15} className="mt-0.5 shrink-0" />Без комиссии с записей</li>
                    </ul>
                    <a href="#/login" className="mt-6">
                      <Btn v={hot ? "gold" : "outline"} className={cx("w-full", !hot && "!border-milk-100/25 !text-milk-100 hover:!border-berry-400 hover:!text-berry-300")}>Начать с «{p.label}»</Btn>
                    </a>
                  </div>
                </Reveal>
              );
            })}
          </div>
        </div>
      </section>

      {/* ─── PWA ─── */}
      <section className="mx-auto max-w-6xl px-4 sm:px-6 py-16">
        <Reveal>
          <div className="flex flex-col items-start gap-6 rounded-xl border border-ink-900/10 bg-white p-7 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-4">
              <span className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-berry-100 text-berry-600"><IcDownload size={22} /></span>
              <div>
                <div className="font-display text-xl font-semibold">Глянец — это PWA</div>
                <p className="mt-1 max-w-lg text-sm leading-relaxed text-ink-800/70">
                  Установите на телефон как приложение — и получайте <b>настоящие push-уведомления</b>: новая запись,
                  отмена и напоминание прилетят даже при закрытом приложении.
                  Android — Chrome, меню ⋮ → «Установить приложение». iPhone — Safari, «Поделиться → На экран „Домой"».
                </p>
              </div>
            </div>
            {canInstall ? <Btn onClick={() => install()}><IcDownload size={17} />Установить приложение</Btn> : <Badge tone="jade"><IcCheck size={12} />Работает в любом браузере</Badge>}
          </div>
        </Reveal>
      </section>

      {/* ─── Футер ─── */}
      <footer className="border-t border-ink-900/10 bg-milk-100">
        <div className="mx-auto flex max-w-6xl flex-col gap-6 px-4 sm:px-6 py-10 md:flex-row md:items-center md:justify-between">
          <div>
            <a href="#/" className="flex items-center gap-2"><span className="grid h-8 w-8 place-items-center rounded-lg bg-ink-900 text-berry-400"><IcSparkle size={17} /></span><span className="font-display font-bold">Глянец</span></a>
            <p className="mt-2 max-w-xs text-xs leading-relaxed text-ink-700/60">Платформа онлайн-записи для бьюти-мастеров Беларуси. Демо-данные хранятся локально в вашем браузере.</p>
          </div>
          <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm font-semibold text-ink-800">
            <a href="#masters" className="hover:text-berry-600">Каталог</a>
            <a href="#/my" className="hover:text-berry-600">Мои записи</a>
            <a href="#/login" className="hover:text-berry-600">Мастерам</a>
            <button onClick={openFeedback} className="hover:text-berry-600 flex items-center gap-1 cursor-pointer"><IcLifeBuoy size={14} />Сообщить об ошибке</button>
            <a href="#/admin" className="hover:text-berry-600 text-ink-700/50 flex items-center gap-1"><IcShield size={14} />Админ</a>
          </div>
        </div>
      </footer>
    </div>
  );
}

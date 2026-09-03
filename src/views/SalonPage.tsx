import { useMemo } from "react";
import { useDB } from "../lib/store";
import { fmtDate, nextDays, freeSlots } from "../lib/schedule";
import { fmtMoney } from "../lib/util";
import { Btn, Badge, Stars, Avatar, Reveal } from "../components/ui";
import { IcArrowL, IcPin, IcShield, IcCrown, IcArrowR, IcClock, IcStore } from "../components/icons";

export default function SalonPage({ slug }: { slug: string }) {
  const db = useDB();
  const salon = db.salons.find((s) => s.slug === slug);

  const members = useMemo(
    () => (salon ? db.masters.filter((m) => salon.masterIds.includes(m.id) && !m.blocked) : []),
    [db.masters, salon]
  );

  if (!salon) {
    return (
      <div className="grid min-h-screen place-items-center bg-milk-100 px-4 text-center">
        <div>
          <span className="mx-auto grid h-14 w-14 place-items-center rounded-xl bg-ink-900 text-berry-400"><IcStore size={26} /></span>
          <h1 className="mt-4 font-display text-2xl font-bold">Салон не найден</h1>
          <a href="#/" className="mt-4 inline-block"><Btn>На главную</Btn></a>
        </div>
      </div>
    );
  }

  const nextSlot = (mid: string) => {
    const m = db.masters.find((x) => x.id === mid)!;
    const svcs = db.services.filter((s) => s.masterId === mid && s.active);
    if (!svcs.length) return null;
    const dur = Math.min(...svcs.map((s) => s.durationMin));
    for (const d of nextDays(14)) {
      const sl = freeSlots(m, db.appointments, d, dur);
      if (sl.length) return { date: d, t: sl[0] };
    }
    return null;
  };

  const minPrice = (mid: string) => {
    const ps = db.services.filter((s) => s.masterId === mid && s.active).map((s) => s.price);
    return ps.length ? Math.min(...ps) : 0;
  };

  return (
    <div className="min-h-screen bg-milk-100 text-ink-900">
      {/* Шапка салона */}
      <div className="text-milk-100" style={{ background: salon.color }}>
        <div className="mx-auto max-w-5xl px-4 sm:px-6 py-10">
          <a href="#/" className="mb-6 inline-flex items-center gap-1.5 text-xs font-bold text-milk-100/70 hover:text-white transition-colors"><IcArrowL size={14} />В каталог</a>
          <div className="flex flex-col gap-6 sm:flex-row sm:items-center">
            <span className="grid h-24 w-24 shrink-0 place-items-center rounded-2xl bg-milk-100/15 font-display text-4xl font-bold text-white shadow-2xl">
              {salon.name.replace(/[«»]/g, "").trim().split(" ").map((w) => w[0]).slice(0, 2).join("")}
            </span>
            <div className="min-w-0">
              <h1 className="font-display text-2xl sm:text-3xl font-bold tracking-tight">{salon.name}</h1>
              <div className="mt-1.5 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[13px] font-semibold text-milk-100/85">
                <span className="flex items-center gap-1.5"><IcPin size={14} />{salon.city}, {salon.address}</span>
                <span className="flex items-center gap-1.5"><IcCrown size={14} />{members.length} {members.length === 1 ? "мастер" : "мастера"} в команде</span>
              </div>
              <p className="mt-3 max-w-xl text-sm leading-relaxed text-milk-100/75">{salon.description}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Команда */}
      <div className="mx-auto max-w-5xl px-4 sm:px-6 py-10">
        <h2 className="font-display text-xl font-bold">Команда салона</h2>
        <p className="mt-1 text-sm text-ink-800/60">У каждого мастера — своя страница, свои услуги и свой календарь записи.</p>
        <div className="mt-5 grid gap-5 md:grid-cols-2">
          {members.map((m, i) => {
            const ns = nextSlot(m.id);
            const svcs = db.services.filter((s) => s.masterId === m.id && s.active).slice(0, 4);
            return (
              <Reveal key={m.id} delay={i * 80}>
                <a href={`#/m/${m.slug}`} className="group flex gap-4 rounded-xl border border-ink-900/10 bg-white p-4 transition-all duration-300 hover:-translate-y-1 hover:shadow-xl hover:shadow-ink-950/10">
                  <Avatar src={m.photo} name={m.name} color={m.color} size={84} className="rounded-xl" />
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-display font-semibold">{m.name}</span>
                      {m.verified && <Badge tone="jade"><IcShield size={11} />Проверен</Badge>}
                    </div>
                    <div className="text-xs font-semibold text-ink-700/60">{m.profession} · от {fmtMoney(minPrice(m.id))}</div>
                    {m.reviews > 0 && <div className="mt-1 flex items-center gap-1.5 text-xs font-bold text-ink-800"><Stars v={m.rating} size={11} />{m.rating} · {m.reviews} отзывов</div>}
                    <div className="mt-2 flex flex-wrap gap-1">
                      {svcs.map((s) => (
                        <span key={s.id} className="rounded-md bg-milk-100 px-2 py-0.5 text-[10px] font-bold text-ink-800/70">{s.name} · {s.durationMin} мин</span>
                      ))}
                    </div>
                    {ns && (
                      <div className="mt-2.5 inline-flex items-center gap-1.5 rounded-md bg-jade-100 px-2 py-1 text-[11px] font-bold text-jade-700">
                        <IcClock size={12} />Ближайшее окно: {fmtDate(ns.date)}, {ns.t}
                      </div>
                    )}
                  </div>
                  <span className="self-center text-berry-600 transition-transform group-hover:translate-x-1"><IcArrowR size={18} /></span>
                </a>
              </Reveal>
            );
          })}
        </div>
        <div className="mt-8 text-center">
          <a href="#/"><Btn v="outline">Все мастера платформы<IcArrowR size={14} /></Btn></a>
        </div>
      </div>
    </div>
  );
}

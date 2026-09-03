import React, { createContext, useContext, useEffect, useMemo, useRef, useState } from "react";
import { cx } from "../lib/util";
import { IcArrowL, IcArrowR, IcCheck, IcStar, IcX } from "./icons";
import { STATUS_META } from "../lib/types";
import type { ApptStatus } from "../lib/types";
import { MONTHS_NOM, WD, todayISO, toISO, wdIndex } from "../lib/schedule";

/* ─── Тосты ─── */
type Toast = { id: number; msg: string; tone: "ok" | "err" | "info" };
const ToastCtx = createContext<(msg: string, tone?: Toast["tone"]) => void>(() => {});
export const useToast = () => useContext(ToastCtx);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [list, setList] = useState<Toast[]>([]);
  const push = (msg: string, tone: Toast["tone"] = "ok") => {
    const id = Date.now() + Math.random();
    setList((l) => [...l, { id, msg, tone }]);
    setTimeout(() => setList((l) => l.filter((t) => t.id !== id)), 4200);
  };
  return (
    <ToastCtx.Provider value={push}>
      {children}
      <div className="fixed bottom-4 right-4 z-[90] flex flex-col gap-2 items-end pointer-events-none">
        {list.map((t) => (
          <div key={t.id} className={cx(
            "pointer-events-auto animate-pop max-w-xs rounded-lg px-4 py-3 text-sm font-semibold shadow-xl shadow-ink-950/20 border",
            t.tone === "ok" && "bg-ink-900 text-milk-50 border-ink-700",
            t.tone === "err" && "bg-coral-600 text-white border-coral-700",
            t.tone === "info" && "bg-honey-500 text-ink-950 border-honey-600"
          )}>
            {t.msg}
          </div>
        ))}
      </div>
    </ToastCtx.Provider>
  );
}

/* ─── Кнопки ─── */
const btnBase = "inline-flex items-center justify-center gap-2 font-bold rounded-lg transition-all duration-150 active:scale-[.97] disabled:opacity-45 disabled:pointer-events-none select-none cursor-pointer whitespace-nowrap";
const btnVariants: Record<string, string> = {
  primary: "bg-berry-600 text-white hover:bg-berry-500 shadow-md shadow-berry-600/25",
  dark: "bg-ink-900 text-milk-50 hover:bg-ink-800 shadow-md shadow-ink-900/20",
  gold: "bg-honey-500 text-ink-950 hover:bg-honey-400 shadow-md shadow-honey-500/25",
  outline: "border-[1.5px] border-ink-900/20 text-ink-900 hover:border-berry-500 hover:text-berry-600 bg-transparent",
  ghost: "text-ink-700 hover:bg-ink-900/6",
  danger: "bg-coral-600 text-white hover:bg-coral-500",
  dangerGhost: "text-coral-600 border-[1.5px] border-coral-600/30 hover:bg-coral-100",
};
export function Btn({ v = "primary", sm, className, ...rest }: React.ButtonHTMLAttributes<HTMLButtonElement> & { v?: keyof typeof btnVariants; sm?: boolean }) {
  return <button {...rest} className={cx(btnBase, btnVariants[v], sm ? "text-[13px] px-3 py-1.5" : "text-sm px-4 py-2.5", className)} />;
}

/* ─── Бейджи ─── */
const tones: Record<string, string> = {
  berry: "bg-berry-100 text-berry-700 border-berry-200",
  honey: "bg-honey-100 text-honey-700 border-honey-300",
  jade: "bg-jade-100 text-jade-700 border-jade-400/30",
  coral: "bg-coral-100 text-coral-700 border-coral-500/25",
  ink: "bg-ink-900/8 text-ink-800 border-ink-900/15",
  plum: "bg-ink-800 text-milk-100 border-ink-700",
};
export function Badge({ tone = "ink", className, children }: { tone?: keyof typeof tones; className?: string; children: React.ReactNode }) {
  return <span className={cx("inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-[11px] font-bold uppercase tracking-wide", tones[tone], className)}>{children}</span>;
}
export const StatusBadge = ({ s }: { s: ApptStatus }) => {
  const m = STATUS_META[s];
  return <Badge tone={m.tone as keyof typeof tones}>{m.label}</Badge>;
};

/* ─── Модалка ─── */
export function Modal({ open, onClose, title, children, wide }: { open: boolean; onClose: () => void; title?: React.ReactNode; children: React.ReactNode; wide?: boolean }) {
  useEffect(() => {
    if (!open) return;
    const h = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [open, onClose]);
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[70] flex items-end sm:items-center justify-center p-0 sm:p-6">
      <div className="absolute inset-0 bg-ink-950/55 backdrop-blur-[2px] animate-fade" onClick={onClose} />
      <div className={cx("relative w-full bg-milk-50 rounded-t-2xl sm:rounded-xl border border-ink-900/10 shadow-2xl shadow-ink-950/30 animate-rise max-h-[92vh] overflow-y-auto", wide ? "sm:max-w-2xl" : "sm:max-w-md")}>
        <div className="sticky top-0 z-10 flex items-center justify-between gap-4 bg-milk-50/95 backdrop-blur px-5 pt-4 pb-3 border-b border-ink-900/8">
          <h3 className="font-display text-[15px] font-semibold text-ink-900">{title}</h3>
          <button onClick={onClose} className="p-1.5 rounded-md hover:bg-ink-900/8 text-ink-700 cursor-pointer" aria-label="Закрыть"><IcX size={18} /></button>
        </div>
        <div className="px-5 py-4 pb-[max(1.25rem,env(safe-area-inset-bottom))]">{children}</div>
      </div>
    </div>
  );
}

/* ─── Поля ─── */
export const inp = "w-full rounded-lg border-[1.5px] border-ink-900/15 bg-white px-3 py-2.5 text-sm font-medium text-ink-900 placeholder:text-ink-900/35 outline-none transition-colors focus:border-berry-500";
export function Field({ label, children, hint }: { label: string; children: React.ReactNode; hint?: string }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-[11px] font-bold uppercase tracking-wider text-ink-700/70">{label}</span>
      {children}
      {hint && <span className="mt-1 block text-xs text-ink-700/60">{hint}</span>}
    </label>
  );
}
export function Toggle({ on, onChange, disabled }: { on: boolean; onChange: (v: boolean) => void; disabled?: boolean }) {
  return (
    <button type="button" disabled={disabled} onClick={() => onChange(!on)}
      className={cx("relative h-6 w-11 rounded-full transition-colors duration-200 shrink-0 cursor-pointer disabled:opacity-40", on ? "bg-jade-500" : "bg-ink-900/20")}>
      <span className={cx("absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all duration-200", on ? "left-[22px]" : "left-0.5")} />
    </button>
  );
}

/* ─── Рейтинг ─── */
export const Stars = ({ v, size = 13 }: { v: number; size?: number }) => (
  <span className="inline-flex items-center gap-0.5 text-honey-500">
    {[0, 1, 2, 3, 4].map((i) => <IcStar key={i} size={size} className={i < Math.round(v) ? "" : "opacity-25"} />)}
  </span>
);

/* ─── Аватар ─── */
export function Avatar({ src, name, color, size = 40, className }: { src?: string; name: string; color: string; size?: number; className?: string }) {
  const initials = name.split(" ").slice(0, 2).map((w) => w[0]).join("").toUpperCase();
  return src ? (
    <img src={src} alt={name} width={size} height={size} className={cx("rounded-lg object-cover shrink-0", className)} style={{ width: size, height: size }} loading="lazy" />
  ) : (
    <span className={cx("rounded-lg grid place-items-center font-display font-semibold text-white shrink-0", className)} style={{ width: size, height: size, background: color, fontSize: size * 0.36 }}>{initials}</span>
  );
}

/* ─── Scroll-reveal ─── */
export function Reveal({ children, delay = 0, className }: { children: React.ReactNode; delay?: number; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const [vis, setVis] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => { if (e.isIntersecting) { setVis(true); io.disconnect(); } }, { threshold: 0.12 });
    io.observe(el);
    return () => io.disconnect();
  }, []);
  return (
    <div ref={ref} className={cx("transition-all duration-700 ease-out will-change-transform", vis ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6", className)} style={{ transitionDelay: `${delay}ms` }}>
      {children}
    </div>
  );
}

/* ─── PWA install ─── */
export function useInstallPrompt() {
  const [ev, setEv] = useState<Event | null>(null);
  useEffect(() => {
    const h = (e: Event) => { e.preventDefault(); setEv(e); };
    window.addEventListener("beforeinstallprompt", h);
    return () => window.removeEventListener("beforeinstallprompt", h);
  }, []);
  return {
    canInstall: !!ev,
    install: async () => {
      if (!ev) return false;
      (ev as any).prompt();
      await (ev as any).userChoice;
      setEv(null);
      return true;
    },
  };
}

/* ─── Пустое состояние ─── */
export const Empty = ({ text }: { text: string }) => (
  <div className="rounded-xl border border-dashed border-ink-900/20 bg-white/50 py-10 text-center text-sm font-medium text-ink-700/60">{text}</div>
);

/* ─── Подтверждение ─── */
export function Confirm({ open, onClose, onYes, title, text, danger }: { open: boolean; onClose: () => void; onYes: () => void; title: string; text: string; danger?: boolean }) {
  return (
    <Modal open={open} onClose={onClose} title={title}>
      <p className="text-sm text-ink-800 leading-relaxed">{text}</p>
      <div className="mt-5 flex gap-2 justify-end">
        <Btn v="ghost" onClick={onClose}>Отмена</Btn>
        <Btn v={danger ? "danger" : "primary"} onClick={() => { onYes(); onClose(); }}><IcCheck size={16} />Да, продолжить</Btn>
      </div>
    </Modal>
  );
}

/* ─── Календарь-месяц (бесконечный выбор даты) ─── */
export function CalendarMonth({ selected, onSelect, slotsFor }: {
  selected: string | null;
  onSelect: (iso: string) => void;
  slotsFor: (iso: string) => string[];
}) {
  const today = todayISO();
  const init = selected && selected >= today ? selected : today;
  const [ym, setYm] = useState(() => ({ y: +init.slice(0, 4), m: +init.slice(5, 7) - 1 }));
  const key = `${ym.y}-${ym.m}`;

  const grid = useMemo(() => {
    const dim = new Date(ym.y, ym.m + 1, 0).getDate();
    const offset = wdIndex(toISO(new Date(ym.y, ym.m, 1)));
    const cells: (string | null)[] = Array.from({ length: offset }, () => null);
    for (let d = 1; d <= dim; d++) cells.push(`${ym.y}-${String(ym.m + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`);
    return cells;
  }, [ym.y, ym.m]);

  const avail = useMemo(() => {
    const map: Record<string, number> = {};
    for (const iso of grid) if (iso && iso >= today) map[iso] = slotsFor(iso).length;
    return map;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, today]);

  const withSlots = Object.values(avail).filter((n) => n > 0).length;
  const curYm = { y: +today.slice(0, 4), m: +today.slice(5, 7) - 1 };
  const canPrev = ym.y > curYm.y || (ym.y === curYm.y && ym.m > curYm.m);
  const nav = (dir: number) => {
    const d = new Date(ym.y, ym.m + dir, 1);
    setYm({ y: d.getFullYear(), m: d.getMonth() });
  };

  return (
    <div className="overflow-hidden rounded-xl border border-ink-900/10 bg-white shadow-sm">
      <div className="flex items-center justify-between border-b border-ink-900/8 bg-milk-100/60 px-3 py-2.5">
        <button onClick={() => nav(-1)} disabled={!canPrev} aria-label="Предыдущий месяц"
          className="grid h-8 w-8 place-items-center rounded-lg text-ink-800 transition-all hover:bg-berry-100 hover:text-berry-700 active:scale-90 disabled:opacity-25 disabled:pointer-events-none cursor-pointer">
          <IcArrowL size={16} />
        </button>
        <div key={key} className="animate-fade font-display text-[15px] font-bold text-ink-900">
          {MONTHS_NOM[ym.m]} <span className="text-ink-700/50 tabular-nums">{ym.y}</span>
        </div>
        <button onClick={() => nav(1)} aria-label="Следующий месяц"
          className="grid h-8 w-8 place-items-center rounded-lg text-ink-800 transition-all hover:bg-berry-100 hover:text-berry-700 active:scale-90 cursor-pointer">
          <IcArrowR size={16} />
        </button>
      </div>
      <div className="px-2.5 pb-2.5 pt-2">
        <div className="grid grid-cols-7 px-0.5">
          {WD.map((w) => <span key={w} className="py-1 text-center text-[10px] font-bold uppercase tracking-wider text-ink-700/45">{w}</span>)}
        </div>
        <div key={`g-${key}`} className="animate-fade grid grid-cols-7 gap-1">
          {grid.map((iso, i) => {
            if (!iso) return <span key={`e${i}`} />;
            const n = avail[iso] ?? 0;
            const past = iso < today;
            const dead = past || n === 0;
            const sel = selected === iso;
            const isToday = iso === today;
            return (
              <button key={iso} disabled={dead} onClick={() => onSelect(iso)}
                className={cx(
                  "relative flex aspect-square flex-col items-center justify-center rounded-lg text-sm font-bold tabular-nums transition-all duration-150 cursor-pointer",
                  sel
                    ? "bg-berry-600 text-white shadow-lg shadow-berry-600/30 scale-[1.04]"
                    : dead
                      ? "cursor-not-allowed text-ink-900/22"
                      : "text-ink-900 hover:bg-berry-50 hover:text-berry-700 active:scale-90",
                  isToday && !sel && "ring-1.5 ring-berry-400/70"
                )}>
                {+iso.slice(8)}
                {n > 0 && <span className={cx("absolute bottom-1 h-1 w-1 rounded-full", sel ? "bg-honey-300" : "bg-berry-500")} />}
              </button>
            );
          })}
        </div>
        <div className="mt-2 flex items-center justify-between border-t border-ink-900/6 px-1 pt-2 text-[10px] font-bold text-ink-700/55">
          <span className="flex items-center gap-1.5"><span className="h-1.5 w-1.5 rounded-full bg-berry-500" />есть свободные окна</span>
          <span>{withSlots > 0 ? `${withSlots} ${withSlots === 1 ? "день" : withSlots < 5 ? "дня" : "дней"} со окнами` : "в этом месяце окон нет"}</span>
        </div>
      </div>
    </div>
  );
}

/* ─── Сетка слотов (переносится на любую ширину) ─── */
export function SlotChips({ slots, selected, onSelect }: { slots: string[]; selected: string | null; onSelect: (t: string) => void }) {
  return (
    <div className="grid gap-1.5" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(74px, 1fr))" }}>
      {slots.map((t) => (
        <button key={t} onClick={() => onSelect(t)}
          className={cx(
            "rounded-lg border-[1.5px] py-2.5 text-sm font-bold tabular-nums transition-all duration-150 cursor-pointer active:scale-95",
            selected === t
              ? "border-berry-500 bg-berry-600 text-white shadow-md shadow-berry-600/25"
              : "border-ink-900/12 bg-white text-ink-900 hover:-translate-y-0.5 hover:border-berry-400 hover:text-berry-700"
          )}>
          {t}
        </button>
      ))}
    </div>
  );
}

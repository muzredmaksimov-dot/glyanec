import React, { createContext, useContext, useEffect, useRef, useState } from "react";
import { cx } from "../lib/util";
import { IcCheck, IcStar, IcX } from "./icons";
import { STATUS_META } from "../lib/types";
import type { ApptStatus } from "../lib/types";

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

import { useState } from "react";
import { cx } from "../lib/util";

/* Столбчатый график с hover-подсказкой */
export function BarChart({ data, fmt }: { data: { label: string; value: number }[]; fmt?: (n: number) => string }) {
  const [hi, setHi] = useState<number | null>(null);
  const max = Math.max(...data.map((d) => d.value), 1);
  const step = data.length > 40 ? Math.ceil(data.length / 30) : 1;
  return (
    <div className="relative">
      {hi !== null && (
        <div className="pointer-events-none absolute -top-1 left-1/2 z-10 -translate-x-1/2 -translate-y-full rounded-md bg-ink-900 px-2.5 py-1 text-[11px] font-bold text-milk-50 shadow-lg whitespace-nowrap">
          {data[hi].label} · {fmt ? fmt(data[hi].value) : data[hi].value}
        </div>
      )}
      <div className="flex h-40 items-end gap-[3px]">
        {data.map((d, i) => (
          <div key={i} className="group flex h-full flex-1 flex-col justify-end" onMouseEnter={() => setHi(i)} onMouseLeave={() => setHi(null)}>
            <div
              className={cx("w-full rounded-t-[3px] transition-all duration-200", hi === i ? "bg-berry-600" : "bg-berry-200 group-hover:bg-berry-400")}
              style={{ height: `${Math.max((d.value / max) * 100, d.value > 0 ? 3 : 1)}%` }}
            />
          </div>
        ))}
      </div>
      <div className="mt-1.5 flex justify-between text-[10px] font-bold tabular-nums text-ink-700/45">
        {data.map((d, i) => (i % step === 0 ? <span key={i}>{d.label}</span> : null))}
      </div>
    </div>
  );
}

/* Горизонтальные бары (топ услуг) */
export function TopBars({ rows, fmt }: { rows: { label: string; value: number; color: string; sub?: string }[]; fmt?: (n: number) => string }) {
  const max = Math.max(...rows.map((r) => r.value), 1);
  return (
    <div className="space-y-3">
      {rows.map((r) => (
        <div key={r.label} className="group">
          <div className="mb-1 flex items-baseline justify-between gap-3">
            <span className="truncate text-[13px] font-bold text-ink-900">{r.label}</span>
            <span className="shrink-0 text-[12px] font-bold tabular-nums text-ink-700/70">
              {fmt ? fmt(r.value) : r.value}{r.sub && <span className="ml-1.5 text-ink-700/45">{r.sub}</span>}
            </span>
          </div>
          <div className="h-2.5 overflow-hidden rounded-full bg-ink-900/6">
            <div className="h-full rounded-full transition-all duration-500 group-hover:opacity-80" style={{ width: `${(r.value / max) * 100}%`, background: r.color }} />
          </div>
        </div>
      ))}
    </div>
  );
}

/* Кольцевой индикатор */
export function Ring({ pct, color = "#2FA396", label, sub }: { pct: number; color?: string; label: string; sub?: string }) {
  const R = 52;
  const C = 2 * Math.PI * R;
  const v = Math.min(Math.max(pct, 0), 100);
  return (
    <div className="relative grid place-items-center">
      <svg width={140} height={140} viewBox="0 0 140 140" className="-rotate-90">
        <circle cx="70" cy="70" r={R} fill="none" stroke="rgba(27,18,38,0.08)" strokeWidth="12" />
        <circle
          cx="70" cy="70" r={R} fill="none" stroke={color} strokeWidth="12" strokeLinecap="round"
          strokeDasharray={C} strokeDashoffset={C - (v / 100) * C}
          style={{ transition: "stroke-dashoffset .8s cubic-bezier(.2,.8,.2,1)" }}
        />
      </svg>
      <div className="absolute text-center">
        <div className="font-display text-2xl font-bold tabular-nums">{Math.round(v)}%</div>
        <div className="text-[10px] font-bold uppercase tracking-wider text-ink-700/55">{label}</div>
        {sub && <div className="mt-0.5 text-[10px] font-semibold text-ink-700/45">{sub}</div>}
      </div>
    </div>
  );
}

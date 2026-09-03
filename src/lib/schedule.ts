import type { Master, Appointment } from "./types";

export const WD = ["пн", "вт", "ср", "чт", "пт", "сб", "вс"];
export const WDF = ["Понедельник", "Вторник", "Среда", "Четверг", "Пятница", "Суббота", "Воскресенье"];
export const MO = ["янв", "фев", "мар", "апр", "мая", "июн", "июл", "авг", "сен", "окт", "ноя", "дек"];
export const MOF = ["января", "февраля", "марта", "апреля", "мая", "июня", "июля", "августа", "сентября", "октября", "ноября", "декабря"];
export const MONTHS_NOM = ["Январь", "Февраль", "Март", "Апрель", "Май", "Июнь", "Июль", "Август", "Сентябрь", "Октябрь", "Ноябрь", "Декабрь"];

export const hm = (s: string) => {
  const [a, b] = s.split(":").map(Number);
  return a * 60 + (b || 0);
};
export const mh = (m: number) =>
  `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;

export const toISO = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
export const fromISO = (iso: string) => {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d);
};
export const addDays = (iso: string, n: number) => {
  const d = fromISO(iso);
  d.setDate(d.getDate() + n);
  return toISO(d);
};
export const todayISO = () => toISO(new Date());
export const wdIndex = (iso: string) => (fromISO(iso).getDay() + 6) % 7;
export const nextDays = (n: number, offset = 0) =>
  Array.from({ length: n }, (_, i) => addDays(todayISO(), i + offset));
export const mondayOf = (iso: string) => addDays(iso, -wdIndex(iso));

export const fmtDate = (iso: string) => {
  const d = fromISO(iso);
  return `${WD[wdIndex(iso)]}, ${d.getDate()} ${MO[d.getMonth()]}`;
};
export const fmtDateLong = (iso: string) => {
  const d = fromISO(iso);
  return `${d.getDate()} ${MOF[d.getMonth()]} ${d.getFullYear()}`;
};
export const fmtRange = (a: string, b: string) => {
  const da = fromISO(a), db = fromISO(b);
  return `${da.getDate()} ${MO[da.getMonth()]} — ${db.getDate()} ${MO[db.getMonth()]}`;
};

export interface DayInfo {
  start: number;
  end: number;
  busy: { s: number; e: number; kind: "break" | "block"; label?: string }[];
  reason?: string;
}

/** Рабочий день мастера: null, если выходной / отпуск / нерабочий день недели */
export function dayInfo(m: Master, iso: string): DayInfo | null {
  if (!m.schedule.workDays.includes(wdIndex(iso))) return null;
  if (m.daysOff.includes(iso)) return null;
  const vac = m.vacations.find((v) => iso >= v.start && iso <= v.end);
  if (vac) return null;
  const start = hm(m.schedule.start);
  const end = hm(m.schedule.end);
  const busy = [
    ...m.schedule.breaks.map((b) => ({ s: hm(b.start), e: hm(b.end), kind: "break" as const, label: "Перерыв" })),
    ...m.blocks.filter((b) => b.date === iso).map((b) => ({ s: hm(b.start), e: hm(b.end), kind: "block" as const, label: b.reason })),
  ];
  return { start, end, busy };
}

export const isActive = (a: Appointment) => a.status === "pending" || a.status === "confirmed";

/** Свободные слоты: учитывают длительность, записи, перерывы, блокировки и прошедшее время */
export function freeSlots(
  m: Master,
  appts: Appointment[],
  iso: string,
  dur: number,
  ignoreId?: string
): string[] {
  const info = dayInfo(m, iso);
  if (!info) return [];
  const step = m.schedule.slotStep || 30;
  const taken = appts.filter((a) => a.masterId === m.id && a.date === iso && a.id !== ignoreId && isActive(a));
  const out: string[] = [];
  const now = new Date();
  const nowMin = now.getHours() * 60 + now.getMinutes();
  const isToday = iso === todayISO();
  for (let t = info.start; t + dur <= info.end; t += step) {
    const e = t + dur;
    if (info.busy.some((b) => t < b.e && b.s < e)) continue;
    if (taken.some((a) => {
      const as = hm(a.start);
      return t < as + a.durationMin && as < e;
    })) continue;
    if (isToday && t < nowMin + 30) continue;
    out.push(mh(t));
  }
  return out;
}

export function workMinutesInRange(m: Master, from: string, to: string) {
  let sum = 0;
  let d = from;
  while (d <= to) {
    const info = dayInfo(m, d);
    if (info) {
      sum += info.end - info.start - info.busy.filter((b) => b.kind === "break").reduce((s, b) => s + (b.e - b.s), 0);
    }
    d = addDays(d, 1);
  }
  return sum;
}

export function bookedMinutes(appts: Appointment[], from: string, to: string, masterId?: string) {
  return appts
    .filter((a) => (masterId ? a.masterId === masterId : true) && a.date >= from && a.date <= to && (a.status === "done" || a.status === "confirmed"))
    .reduce((s, a) => s + a.durationMin, 0);
}

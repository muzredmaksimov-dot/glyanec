export const cx = (...a: (string | false | undefined | null)[]) => a.filter(Boolean).join(" ");

export const uid = () => Math.random().toString(36).slice(2, 10) + Math.random().toString(36).slice(2, 6);

export function mulberry(seed: number) {
  return function () {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export const fmtMoney = (n: number) =>
  `${(Math.round(n * 100) / 100).toLocaleString("ru-RU", { maximumFractionDigits: 2 })} BYN`;

export function normPhone(s: string) {
  let d = s.replace(/\D/g, "");
  if (d.startsWith("80") && d.length === 11) d = "375" + d.slice(2);
  if (d.startsWith("8") && d.length === 12 && d[1] === "0") d = "375" + d.slice(2);
  if (d.length === 9 && /^(25|29|33|44|17)/.test(d)) d = "375" + d;
  if (d.length === 10 && d.startsWith("375")) d = d;
  return d;
}

export const fmtPhone = (p: string) => {
  const d = normPhone(p);
  if (d.length !== 11 || !d.startsWith("375")) return p;
  return `+375 ${d.slice(3, 5)} ${d.slice(5, 8)}-${d.slice(8, 10)}-${d.slice(10)}`;
};

export function plural(n: number, forms: [string, string, string]) {
  const a = Math.abs(n) % 100;
  const b = a % 10;
  if (a > 10 && a < 20) return forms[2];
  if (b > 1 && b < 5) return forms[1];
  if (b === 1) return forms[0];
  return forms[2];
}

export function timeAgo(ts: number) {
  const diff = Date.now() - ts;
  const min = Math.floor(diff / 60000);
  if (min < 1) return "только что";
  if (min < 60) return `${min} мин назад`;
  const h = Math.floor(min / 60);
  if (h < 24) return `${h} ч назад`;
  const d = Math.floor(h / 24);
  if (d === 1) return "вчера";
  return `${d} ${plural(d, ["день", "дня", "дней"])} назад`;
}

export const translit = (s: string) =>
  s
    .toLowerCase()
    .split("")
    .map((c) => {
      const map: Record<string, string> = { а: "a", б: "b", в: "v", г: "g", д: "d", е: "e", ё: "e", ж: "zh", з: "z", и: "i", й: "y", к: "k", л: "l", м: "m", н: "n", о: "o", п: "p", р: "r", с: "s", т: "t", у: "u", ф: "f", х: "h", ц: "ts", ч: "ch", ш: "sh", щ: "sch", ъ: "", ы: "y", ь: "", э: "e", ю: "yu", я: "ya" };
      return map[c] ?? (/[a-z0-9-]/.test(c) ? c : "-");
    })
    .join("")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");

export function downloadICS(p: { title: string; date: string; start: string; durationMin: number; address: string; master: string }) {
  const [y, m, d] = p.date.split("-");
  const [h, mm] = p.start.split(":");
  const end = new Date(+y, +m - 1, +d, +h, +mm + p.durationMin);
  const pad = (n: number) => String(n).padStart(2, "0");
  const dtEnd = `${y}${m}${d}T${pad(end.getHours())}${pad(end.getMinutes())}00`;
  const ics = [
    "BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//Glyanets//BY", "BEGIN:VEVENT",
    `UID:${uid()}@glyanets`, `DTSTART:${y}${m}${d}T${h}${mm}00`, `DTEND:${dtEnd}`,
    `SUMMARY:${p.title} — ${p.master}`, `LOCATION:${p.address}`,
    "BEGIN:VALARM", "TRIGGER:-PT30M", "ACTION:DISPLAY", "DESCRIPTION:Напоминание о записи", "END:VALARM",
    "END:VEVENT", "END:VCALENDAR",
  ].join("\r\n");
  const blob = new Blob([ics], { type: "text/calendar;charset=utf-8" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = "zapis.ics";
  a.click();
  URL.revokeObjectURL(a.href);
}

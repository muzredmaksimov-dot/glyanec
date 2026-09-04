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
  if (d.length !== 12 || !d.startsWith("375")) return p;
  return `+375 ${d.slice(3, 5)} ${d.slice(5, 8)}-${d.slice(8, 10)}-${d.slice(10)}`;
};

/* ─── Нечёткий поиск (терпим к опечаткам) ─── */
export const normStr = (s: string) =>
  s.toLowerCase().replace(/ё/g, "е").replace(/[^a-zа-я0-9]/g, "");

/** Расстояние Левенштейна с ранним выходом */
export function editDist(a: string, b: string, max = 2): number {
  if (Math.abs(a.length - b.length) > max) return max + 1;
  const dp = Array.from({ length: a.length + 1 }, (_, i) => [i, ...Array(b.length).fill(0)] as number[]);
  for (let j = 0; j <= b.length; j++) dp[0][j] = j;
  for (let i = 1; i <= a.length; i++) {
    let rowMin = Infinity;
    for (let j = 1; j <= b.length; j++) {
      dp[i][j] = Math.min(dp[i - 1][j] + 1, dp[i][j - 1] + 1, dp[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
      rowMin = Math.min(rowMin, dp[i][j]);
    }
    if (rowMin > max) return max + 1;
  }
  return dp[a.length][b.length];
}

/**
 * Скор совпадения запроса с текстом: 0 — не подходит.
 * Понимает опечатки: «маникюр» ≈ «маникюр», «маникур» ≈ «маникюр», «алин» ≈ «Алина».
 */
export function fuzzyScore(queryRaw: string, textRaw: string): number {
  const q = normStr(queryRaw);
  const t = normStr(textRaw);
  if (!q || !t) return 0;
  if (t.includes(q)) return 100 - Math.min(t.indexOf(q), 40) + (t === q ? 50 : 0);
  const qTokens = queryRaw.toLowerCase().split(/\s+/).map(normStr).filter(Boolean);
  const words = textRaw.toLowerCase().replace(/ё/g, "е").split(/[^a-zа-я0-9]+/).filter(Boolean);
  let total = 0;
  for (const qt of qTokens) {
    let best = 0;
    for (const w of words) {
      const tol = qt.length >= 6 ? 2 : qt.length >= 4 ? 1 : 0;
      if (w.startsWith(qt)) best = Math.max(best, 80);
      else if (tol > 0 && editDist(w.slice(0, Math.min(w.length, qt.length + 1)), qt, tol) <= tol) best = Math.max(best, 55);
      else if (qt.length >= 3 && w.includes(qt)) best = Math.max(best, 45);
    }
    if (best === 0) return 0; // хоть одно слово запроса не нашлось — не совпадение
    total += best;
  }
  return total / qTokens.length;
}

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

/**
 * Добавить запись в календарь устройства.
 * 1) На телефонах — системное окно «Поделиться» с файлом .ics:
 *    Android сразу предложит Google Calendar, iOS — «Добавить в Календарь».
 * 2) Если шаринг недоступен (старый браузер / десктоп) — скачивание файла.
 */
export interface IcsEvent { title: string; date: string; start: string; durationMin: number; address: string; description?: string }

const icsEsc = (s: string) => s.replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\r?\n/g, "\\n");

/** Файл .ics — одно событие или сразу несколько (синхронизация всего календаря) */
export function buildICS(events: IcsEvent | IcsEvent[]): string {
  const list = Array.isArray(events) ? events : [events];
  const blocks = list.map((p) => {
    const [y, m, d] = p.date.split("-");
    const [h, mm] = p.start.split(":");
    const end = new Date(+y, +m - 1, +d, +h, +mm + p.durationMin);
    const pad = (n: number) => String(n).padStart(2, "0");
    return [
      "BEGIN:VEVENT",
      `UID:${uid()}@glyanets`,
      `DTSTART:${y}${m}${d}T${h}${mm}00`,
      `DTEND:${y}${m}${d}T${pad(end.getHours())}${pad(end.getMinutes())}00`,
      `SUMMARY:${icsEsc(p.title)}`,
      p.address ? `LOCATION:${icsEsc(p.address)}` : "",
      p.description ? `DESCRIPTION:${icsEsc(p.description)}` : "",
      "BEGIN:VALARM", "TRIGGER:-PT30M", "ACTION:DISPLAY", "DESCRIPTION:Напоминание о записи", "END:VALARM",
      "END:VEVENT",
    ].filter(Boolean).join("\r\n");
  });
  return ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//Glyanets//BY", ...blocks, "END:VCALENDAR"].join("\r\n");
}

export function downloadICS(p: IcsEvent | (IcsEvent & { master?: string }) | IcsEvent[], filename = "zapis.ics"): "shared" | "downloaded" {
  const single = !Array.isArray(p);
  const ics = buildICS(p as IcsEvent | IcsEvent[]);
  const title = single && "master" in (p as IcsEvent & { master?: string })
    ? `${(p as IcsEvent & { master?: string }).title} — ${(p as IcsEvent & { master?: string }).master}`
    : "Глянец — записи";

  try {
    const file = new File([ics], filename, { type: "text/calendar" });
    const nav = navigator as Navigator & { canShare?: (data: ShareData) => boolean; share?: (d: ShareData) => Promise<void> };
    if (typeof nav.canShare === "function" && typeof nav.share === "function" && nav.canShare({ files: [file] })) {
      nav.share({ files: [file], title }).catch(() => {
        /* пользователь закрыл окно — это нормально */
      });
      return "shared";
    }
  } catch { /* переходим к скачиванию */ }

  const blob = new Blob([ics], { type: "text/calendar;charset=utf-8" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 2000);
  return "downloaded";
}

/** Ссылка для звонка прямо из приложения: tel:+375… */
export const telHref = (p: string) => `tel:+${normPhone(p).replace(/^\+/, "")}`;
export const isPhoneLike = (s: string) => s.replace(/\D/g, "").length >= 9;

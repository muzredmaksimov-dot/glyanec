import { useCallback, useEffect, useState } from "react";
import { pushState, subscribePush, unsubscribePush, sendTestPush, pushDiagnostics, type PushTarget, type PushState, type DiagStep } from "../lib/push";
import { Btn, useToast } from "./ui";
import { IcBell, IcCheck, IcX } from "./icons";
import { cx } from "../lib/util";

const META: Record<PushState["kind"], { label: string; text: string; dot: string; card: string }> = {
  on: {
    label: "Push включены",
    text: "Записи, отмены, переносы и напоминания прилетят даже при закрытом приложении.",
    dot: "bg-jade-500",
    card: "border-jade-400/50 bg-jade-100/50",
  },
  off: {
    label: "Push выключены",
    text: "Включите, чтобы получать уведомления о записях даже при закрытом приложении.",
    dot: "bg-honey-500",
    card: "border-ink-900/10 bg-white",
  },
  denied: {
    label: "Уведомления запрещены браузером",
    text: "Откройте настройки сайта в браузере (значок рядом с адресом) → разрешите уведомления → нажмите «Включить» ещё раз.",
    dot: "bg-coral-500",
    card: "border-coral-500/40 bg-coral-100/50",
  },
  "not-configured": {
    label: "Push ещё не настроены",
    text: "Администратору платформы нужно подключить VAPID-ключ (раздел README «Push-уведомления»). После этого кнопка заработает.",
    dot: "bg-honey-500",
    card: "border-honey-500/50 bg-honey-100/60",
  },
  "no-cloud": {
    label: "Нужно общее облако",
    text: "Push работают через Supabase (раздел «Данные и облако» в админке). В локальном режиме доступны только уведомления внутри приложения.",
    dot: "bg-honey-500",
    card: "border-honey-500/50 bg-honey-100/60",
  },
  unsupported: {
    label: "Браузер не поддерживает push",
    text: "Попробуйте Chrome, Edge или Safari (на iPhone — после установки сайта на экран Домой, iOS 16.4+).",
    dot: "bg-ink-900/30",
    card: "border-ink-900/10 bg-white",
  },
};

/** Карточка настройки push-уведомлений: статус, включение, тест, отключение */
export default function PushCard({ target, title, hint }: { target: PushTarget; title: string; hint?: string }) {
  const toast = useToast();
  const [st, setSt] = useState<PushState | null>(null);
  const [busy, setBusy] = useState(false);
  const [diag, setDiag] = useState<DiagStep[] | null>(null);

  const refresh = useCallback(() => { void pushState().then(setSt); }, []);
  useEffect(refresh, [refresh]);

  const runDiag = async () => {
    setBusy(true);
    const steps = await pushDiagnostics(target);
    setBusy(false);
    setDiag(steps);
  };

  const m = st ? META[st.kind] : null;

  const enable = async () => {
    setBusy(true);
    const r = await subscribePush(target);
    setBusy(false);
    if (r.ok) toast("Push включены! Сверните приложение и нажмите «Тест»");
    else toast(r.error ?? "Не получилось", "err");
    refresh();
  };

  const test = async () => {
    setBusy(true);
    const err = await sendTestPush(target);
    setBusy(false);
    if (err) return toast(err, "err");
    toast("Тест отправлен! Сверните приложение — пуш придёт в течение нескольких секунд", "info");
  };

  const disable = async () => {
    setBusy(true);
    await unsubscribePush();
    setBusy(false);
    toast("Push на этом устройстве выключены", "info");
    refresh();
  };

  return (
    <section className={cx("rounded-xl border p-4 transition-colors sm:p-5", m?.card ?? "border-ink-900/10 bg-white")}>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex min-w-0 items-start gap-3">
          <span className={cx("grid h-10 w-10 shrink-0 place-items-center rounded-lg", st?.kind === "on" ? "bg-jade-500 text-white" : "bg-ink-900 text-berry-300")}>
            <IcBell size={19} />
          </span>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="font-display text-[15px] font-bold">{title}</h3>
              {m && (
                <span className="flex items-center gap-1.5 rounded-full bg-white/70 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-ink-800">
                  <span className="relative flex h-2 w-2">
                    {st?.kind === "on" && <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-jade-500 opacity-60" />}
                    <span className={cx("relative inline-flex h-2 w-2 rounded-full", m.dot)} />
                  </span>
                  {m.label}
                </span>
              )}
            </div>
            <p className="mt-1 text-xs leading-relaxed text-ink-800/70">{m?.text ?? "Проверяем статус…"}</p>
            {hint && st?.kind !== "unsupported" && <p className="mt-1.5 text-[11px] font-semibold text-ink-700/55">{hint}</p>}
          </div>
        </div>
        <div className="flex shrink-0 flex-wrap gap-2 sm:justify-end">
          {(st?.kind === "off" || st?.kind === "denied") && (
            <Btn sm onClick={enable} disabled={busy}>{busy ? "Включаем…" : "Включить push"}</Btn>
          )}
          {st?.kind === "on" && (
            <>
              <Btn sm v="outline" onClick={test} disabled={busy}><IcCheck size={13} />Тест</Btn>
              <Btn sm v="ghost" onClick={disable} disabled={busy}>Выключить</Btn>
            </>
          )}
        </div>
      </div>
    </section>
  );
}

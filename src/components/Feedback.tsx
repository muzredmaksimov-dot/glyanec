import { useEffect, useState } from "react";
import { useDB, useSession, submitTicket } from "../lib/store";
import { Btn, Field, inp, Modal, useToast } from "./ui";
import { IcCheck, IcLifeBuoy } from "./icons";
import { cx } from "../lib/util";

export const FEEDBACK_EVENT = "glyanets:feedback";
export const openFeedback = () => window.dispatchEvent(new Event(FEEDBACK_EVENT));

const TOPICS = ["Ошибка на сайте", "Не получается записаться", "Вопрос по тарифам", "Предложение", "Другое"];

/** Плавающая кнопка «Сообщить об ошибке» — видна на каждом экране платформы */
export function FeedbackFab() {
  const [open, setOpen] = useState(false);
  useEffect(() => {
    const h = () => setOpen(true);
    window.addEventListener(FEEDBACK_EVENT, h);
    return () => window.removeEventListener(FEEDBACK_EVENT, h);
  }, []);
  return (
    <>
      <button onClick={() => setOpen(true)} aria-label="Сообщить об ошибке администрации"
        className="fixed bottom-[max(1rem,env(safe-area-inset-bottom))] left-4 z-[60] flex items-center gap-2 rounded-full bg-ink-900 py-2.5 pl-3.5 pr-4 text-[13px] font-bold text-milk-50 shadow-xl shadow-ink-950/30 transition-all hover:bg-berry-600 hover:shadow-berry-600/30 active:scale-95 cursor-pointer">
        <IcLifeBuoy size={17} />
        <span className="hidden min-[430px]:inline">Сообщить об ошибке</span>
      </button>
      <FeedbackModal open={open} onClose={() => setOpen(false)} />
    </>
  );
}

function FeedbackModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const db = useDB();
  const session = useSession();
  const toast = useToast();
  const master = session?.kind === "master" ? db.masters.find((m) => m.id === session.masterId) : null;
  const [sent, setSent] = useState(false);
  const [f, setF] = useState({ author: "", contact: "", topic: TOPICS[0], message: "" });

  useEffect(() => {
    if (open) {
      setSent(false);
      setF({ author: master?.name ?? "", contact: master?.phone ?? "", topic: TOPICS[0], message: "" });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const submit = () => {
    if (f.author.trim().length < 2) return toast("Укажите имя, чтобы мы могли ответить", "err");
    if (f.message.trim().length < 10) return toast("Опишите проблему подробнее — минимум 10 символов", "err");
    submitTicket({ author: f.author.trim(), contact: f.contact.trim(), topic: f.topic, message: f.message.trim() });
    setSent(true);
  };

  return (
    <Modal open={open} onClose={onClose} title="Сообщить об ошибке">
      {sent ? (
        <div className="py-6 text-center">
          <span className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-jade-100 text-jade-600 animate-pop"><IcCheck size={26} /></span>
          <div className="mt-3 font-display text-lg font-bold">Отправлено!</div>
          <p className="mx-auto mt-1 max-w-xs text-sm leading-relaxed text-ink-800/70">
            Обращение уже в админ-панели платформы. Администрация свяжется с вами{f.contact ? ` по контакту ${f.contact}` : ""}.
          </p>
          <Btn className="mt-5" v="dark" onClick={onClose}>Понятно</Btn>
        </div>
      ) : (
        <div className="space-y-3.5">
          <p className="text-sm leading-relaxed text-ink-800/70">
            Что-то сломалось или работает не так? Напишите — обращение попадёт напрямую администрации платформы вместе со страницей, где произошла ошибка.
          </p>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Ваше имя">
              <input className={inp} value={f.author} onChange={(e) => setF({ ...f, author: e.target.value })} placeholder="Как к вам обращаться" />
            </Field>
            <Field label="Телефон или Telegram">
              <input className={inp} value={f.contact} onChange={(e) => setF({ ...f, contact: e.target.value })} placeholder="+375… или @nickname" />
            </Field>
          </div>
          <Field label="Тема">
            <div className="flex flex-wrap gap-1.5">
              {TOPICS.map((t) => (
                <button key={t} onClick={() => setF({ ...f, topic: t })}
                  className={cx("rounded-full border px-3 py-1.5 text-xs font-bold transition-all cursor-pointer",
                    f.topic === t ? "border-ink-900 bg-ink-900 text-milk-50" : "border-ink-900/15 hover:border-ink-900/40")}>{t}</button>
              ))}
            </div>
          </Field>
          <Field label="Что случилось?">
            <textarea className={cx(inp, "min-h-[110px] resize-y")} value={f.message} onChange={(e) => setF({ ...f, message: e.target.value })}
              placeholder="Что делали, что ожидали и что произошло. Чем подробнее — тем быстрее починим." />
          </Field>
          <p className="rounded-lg bg-milk-100 px-3 py-2 text-[11px] font-semibold text-ink-700/60">
            Страница приложится автоматически: <b className="text-ink-800">{location.hash || "#/"}</b>
          </p>
          <Btn className="w-full" onClick={submit}><IcLifeBuoy size={16} />Отправить администрации</Btn>
        </div>
      )}
    </Modal>
  );
}

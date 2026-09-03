import { useState } from "react";
import { useSession, loginMaster, registerMaster } from "../lib/store";
import { Btn, Field, inp, useToast } from "../components/ui";
import { cx } from "../lib/util";
import { IcSparkle, IcCheck, IcArrowL, IcScissors } from "../components/icons";

const DEMO = [
  { l: "alina", p: "alina123", n: "Алина · маникюр" },
  { l: "mark", p: "mark123", n: "Марк · барбер" },
  { l: "eva", p: "eva123", n: "Ева · ресницы" },
  { l: "dana", p: "dana123", n: "Дана · косметолог" },
  { l: "nadia", p: "nadia123", n: "Надежда · массаж" },
  { l: "vera", p: "vera123", n: "Вера · волосы" },
];

export default function Login() {
  const session = useSession();
  if (session?.kind === "master") {
    location.hash = "#/app";
    return null;
  }
  return <Gate />;
}

function Gate() {
  const toast = useToast();
  const [mode, setMode] = useState<"login" | "register">("login");
  const [login, setLogin] = useState("");
  const [pass, setPass] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [reg, setReg] = useState({ name: "", profession: "Мастер маникюра", phone: "", login: "", password: "" });

  const doLogin = () => {
    const e = loginMaster(login, pass);
    setErr(e);
    if (!e) { toast("С возвращением!"); location.hash = "#/app"; }
  };

  const doReg = () => {
    const e = registerMaster(reg);
    setErr(e);
    if (!e) { toast("Кабинет создан! Настройте услуги и график"); location.hash = "#/app"; }
  };

  return (
    <div className="grid min-h-screen bg-milk-100 text-ink-900 lg:grid-cols-[1fr_1.1fr]">
      {/* Бренд-панель */}
      <div className="relative hidden overflow-hidden bg-ink-900 p-10 text-milk-100 lg:flex lg:flex-col lg:justify-between">
        <div className="pointer-events-none absolute -bottom-24 -left-24 h-80 w-80 rounded-full bg-berry-600/25 blur-3xl" />
        <a href="#/" className="flex items-center gap-2"><span className="grid h-9 w-9 place-items-center rounded-lg bg-milk-100/10 text-berry-400"><IcSparkle size={20} /></span><span className="font-display text-lg font-bold">Глянец</span></a>
        <div className="relative">
          <h1 className="font-display text-4xl font-bold leading-[1.12] tracking-tight">Кабинет мастера —<br />за <span className="text-berry-400">60 секунд</span></h1>
          <ul className="mt-7 space-y-3.5">
            {["Публичная страница с услугами и онлайн-записью", "Календарь с защитой от двойных бронирований", "CRM: клиенты сами попадают в базу — без дублей", "Статистика выручки и загрузки с первого дня"].map((t) => (
              <li key={t} className="flex items-start gap-2.5 text-sm text-milk-100/80"><span className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full bg-jade-500/20 text-jade-400"><IcCheck size={12} /></span>{t}</li>
            ))}
          </ul>
        </div>
        <p className="relative text-xs text-milk-100/45">Демо-режим: данные хранятся локально и не покидают ваш браузер.</p>
      </div>

      {/* Форма */}
      <div className="flex items-center justify-center px-4 py-10 sm:px-8">
        <div className="w-full max-w-md">
          <a href="#/" className="mb-6 inline-flex items-center gap-1.5 text-xs font-bold text-ink-700/60 hover:text-berry-600"><IcArrowL size={14} />На главную</a>
          <div className="mb-6 flex rounded-lg border border-ink-900/10 bg-white p-1">
            {(["login", "register"] as const).map((m) => (
              <button key={m} onClick={() => { setMode(m); setErr(null); }}
                className={cx("flex-1 rounded-md py-2 text-sm font-bold transition-all cursor-pointer", mode === m ? "bg-ink-900 text-milk-50 shadow" : "text-ink-700/60 hover:text-ink-900")}>
                {m === "login" ? "Вход" : "Регистрация"}
              </button>
            ))}
          </div>

          {mode === "login" ? (
            <div className="space-y-3.5">
              <Field label="Логин"><input className={inp} value={login} onChange={(e) => setLogin(e.target.value)} autoFocus placeholder="alina" /></Field>
              <Field label="Пароль"><input className={inp} type="password" value={pass} onChange={(e) => setPass(e.target.value)} placeholder="••••••" onKeyDown={(e) => e.key === "Enter" && doLogin()} /></Field>
              {err && <div className="rounded-lg bg-coral-100 px-3 py-2 text-sm font-semibold text-coral-700">{err}</div>}
              <Btn className="w-full !py-3" onClick={doLogin}>Войти в кабинет</Btn>

              <div className="pt-3">
                <div className="text-[11px] font-bold uppercase tracking-wider text-ink-700/55 mb-2">Демо-кабинеты — вход в один клик</div>
                <div className="grid grid-cols-2 gap-2">
                  {DEMO.map((d) => (
                    <button key={d.l} onClick={() => { setLogin(d.l); setPass(d.p); setErr(null); const e = loginMaster(d.l, d.p); if (!e) { toast(`Вы вошли как ${d.n.split(" · ")[0]}`); location.hash = "#/app"; } else setErr(e); }}
                      className="rounded-lg border-[1.5px] border-ink-900/12 bg-white px-3 py-2.5 text-left text-[12px] font-bold text-ink-800 transition-all hover:border-berry-500 hover:text-berry-600 cursor-pointer active:scale-[.98]">
                      {d.n}<span className="block text-[10px] font-semibold text-ink-700/45">{d.l} / {d.p}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-3.5">
              <Field label="Имя и фамилия"><input className={inp} value={reg.name} onChange={(e) => setReg({ ...reg, name: e.target.value })} placeholder="Мария Иванова" autoFocus /></Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Специализация"><input className={inp} value={reg.profession} onChange={(e) => setReg({ ...reg, profession: e.target.value })} /></Field>
                <Field label="Телефон"><input className={inp} type="tel" value={reg.phone} onChange={(e) => setReg({ ...reg, phone: e.target.value })} placeholder="+375 29 000-00-00" /></Field>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Логин"><input className={inp} value={reg.login} onChange={(e) => setReg({ ...reg, login: e.target.value })} placeholder="maria" /></Field>
                <Field label="Пароль"><input className={inp} type="password" value={reg.password} onChange={(e) => setReg({ ...reg, password: e.target.value })} placeholder="минимум 4 символа" /></Field>
              </div>
              {err && <div className="rounded-lg bg-coral-100 px-3 py-2 text-sm font-semibold text-coral-700">{err}</div>}
              <Btn className="w-full !py-3" onClick={doReg}><IcScissors size={16} />Создать кабинет</Btn>
              <p className="text-center text-[11px] text-ink-700/50">Тариф «Старт» — бесплатно. Повышение тарифа подтверждает администрация.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

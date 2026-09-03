import { useSyncExternalStore } from "react";
import type { DB, Master, Service, Client, Appointment, Notif, NotifTarget, PlanId, Session, ApptStatus, Review, Salon, Ticket } from "./types";
import { PAYMENTS } from "./types";
import { freeSlots, addDays, todayISO, fmtDate, dayInfo } from "./schedule";
import { uid, mulberry, normPhone, translit } from "./util";

const DB_KEY = "glyanets_db";
const SES_KEY = "glyanets_session";
const SEED_VERSION = 8;

const IMG = {
  alina: "https://image.qwenlm.ai/generated-images/7f738ec2-30c3-4cfe-b559-b148dc710214/_result.png",
  mark: "https://image.qwenlm.ai/generated-images/2770ce38-84b0-4826-a842-5558c1e087d0/_result.png",
  eva: "https://image.qwenlm.ai/generated-images/17e1dd27-9185-4fd0-82f2-4a3cc468b419/_result.png",
  dana: "https://image.qwenlm.ai/generated-images/774d63b3-26ea-4dd4-9aed-b8aba217d210/_result.png",
  nadia: "https://image.qwenlm.ai/generated-images/53b85f68-b265-4ca4-b506-ef29e7c8eaaa/_result.png",
  vika: "https://image.qwenlm.ai/generated-images/6147c562-57e5-451e-95d1-6b604a8a2098/_result.png",
};

const DEFAULT_PLANS: DB["settings"]["plans"] = {
  free: { label: "Старт", price: 0, maxServices: 5, statDays: 7, reminders: false, priority: 0, perks: ["До 5 услуг", "Статистика за 7 дней", "Публичная страница", "Онлайн-запись"] },
  pro: { label: "Профи", price: 25, maxServices: 20, statDays: 90, reminders: true, priority: 1, perks: ["До 20 услуг", "Статистика за 90 дней", "Push-напоминания", "Значок «Проверен»"] },
  vip: { label: "Люкс", price: 49, maxServices: 999, statDays: 365, reminders: true, priority: 2, perks: ["Услуги без лимита", "Статистика за год", "Приоритет в каталоге", "Бейдж «Топ» на витрине"] },
};

function seedDB(): DB {
  const rng = mulberry(20240917);
  const today = todayISO();
  const pick = <T,>(arr: T[]) => arr[Math.floor(rng() * arr.length)];

  const mkMaster = (p: Partial<Master> & { id: string; name: string; slug: string; profession: string; login: string; password: string }): Master => ({
    phone: "+375 29 000-00-00", address: "", city: "Минск", description: "", photo: "", color: "#D63D80",
    paymentMethods: ["cash", "transfer"],
    schedule: { workDays: [0, 1, 2, 3, 4], start: "10:00", end: "19:00", slotStep: 30, breaks: [] },
    daysOff: [], vacations: [], blocks: [], plan: "free", promoted: false, verified: false, blocked: false,
    rating: 0, reviews: 0, createdAt: Date.now() - 90 * 864e5,
    loyalty: { enabled: false, type: "cashback", value: 5 }, ...p,
  } as Master);

  const masters: Master[] = [
    mkMaster({
      id: "m-alina", name: "Алина Крылова", slug: "alina-nails", profession: "Мастер маникюра",
      login: "alina", password: "alina123", phone: "+375 29 402-11-87", address: "Минск, ул. Октябрьская, 16 · студия «Пудра»",
      description: "Аккуратный маникюр с укреплением, стерильные инструменты, палитра 300+ оттенков. Кофе и плед — по умолчанию.",
      photo: IMG.alina, color: "#D63D80", plan: "free", verified: true, rating: 4.9, reviews: 127,
      paymentMethods: ["cash", "transfer"], salonId: "sal-pudra",
      schedule: { workDays: [0, 1, 2, 3, 4, 5], start: "10:00", end: "19:00", slotStep: 30, breaks: [{ start: "13:00", end: "13:45" }] },
      daysOff: [addDays(today, 12)],
    }),
    mkMaster({
      id: "m-mark", name: "Марк Соколов", slug: "mark-hair", profession: "Барбер",
      login: "mark", password: "mark123", phone: "+375 33 733-58-20", address: "Минск, пр. Независимости, 44 · барбершоп «Форма»",
      description: "Стрижки, бороды, опасное бритьё. Работаю быстро и точно, без «как-нибудь покороче». PlayStation и эспрессо в зоне ожидания.",
      photo: IMG.mark, color: "#E3A33D", plan: "pro", promoted: true, verified: true, rating: 4.8, reviews: 98,
      paymentMethods: ["cash", "card", "transfer"], salonId: "sal-forma",
      schedule: { workDays: [1, 2, 3, 4, 5, 6], start: "11:00", end: "20:00", slotStep: 30, breaks: [{ start: "15:00", end: "15:30" }] },
      blocks: [{ date: today, start: "17:00", end: "18:00", reason: "Личное время" }],
    }),
    mkMaster({
      id: "m-eva", name: "Ева Мороз", slug: "eva-lash", profession: "Lash- и brow-мастер",
      login: "eva", password: "eva123", phone: "+375 44 254-90-31", address: "Минск, ул. Зыбицкая, 9 · бьюти-коворкинг «Мята»",
      description: "Ресницы, которые не чувствуются на глазах, и брови, которые не нужно рисовать по утрам. Материалы премиум-класса.",
      photo: IMG.eva, color: "#2FA396", plan: "pro", verified: true, rating: 5.0, reviews: 76,
      paymentMethods: ["transfer", "card"], salonId: "sal-pudra",
      loyalty: { enabled: true, type: "visit", value: 6 },
      schedule: { workDays: [0, 1, 2, 3, 4], start: "09:00", end: "18:00", slotStep: 30, breaks: [{ start: "12:30", end: "13:00" }] },
      vacations: [{ start: addDays(today, 21), end: addDays(today, 27), label: "Отпуск" }],
    }),
    mkMaster({
      id: "m-dana", name: "Дана Ли", slug: "dana-skin", profession: "Косметолог-эстетист",
      login: "dana", password: "dana123", phone: "+375 29 118-42-76", address: "Минск, ул. Сурганова, 57 · клиника «Линия»",
      description: "Чистки, пилинги, аппаратные методики. Составляю домашний уход после каждой процедуры. Диплом медсестры, стаж 9 лет.",
      photo: IMG.dana, color: "#E05C4A", plan: "vip", promoted: true, verified: true, rating: 4.9, reviews: 211,
      paymentMethods: ["card", "transfer", "cash"],
      loyalty: { enabled: true, type: "cashback", value: 10 },
      schedule: { workDays: [0, 2, 3, 4, 5], start: "10:00", end: "20:00", slotStep: 30, breaks: [{ start: "14:00", end: "14:30" }] },
    }),
    mkMaster({
      id: "m-nadia", name: "Надежда Савицкая", slug: "nadia-massage", profession: "Массажист",
      login: "nadia", password: "nadia123", phone: "+375 25 640-33-18", address: "Минск, ул. К. Маркса, 17 · спа-студия «Гармония»",
      description: "Массаж, после которого тело говорит «спасибо». Лечебный, лимфодренажный, спортивный — подберу технику под вашу спину. Диплом медколледжа, стаж 11 лет.",
      photo: IMG.nadia, color: "#7D5BA6", plan: "pro", verified: true, rating: 4.9, reviews: 64,
      paymentMethods: ["cash", "transfer", "card"],
      schedule: { workDays: [0, 1, 2, 3, 4, 5], start: "09:00", end: "18:00", slotStep: 30, breaks: [{ start: "12:30", end: "13:00" }] },
      daysOff: [addDays(today, 6)],
      blocks: [{ date: addDays(today, 3), start: "09:00", end: "11:00", reason: "Обучение" }],
    }),
    mkMaster({
      id: "m-vika", name: "Вера Ланская", slug: "vera-hair", profession: "Стилист-колорист",
      login: "vera", password: "vera123", phone: "+375 44 512-77-40", address: "Минск, ул. Немига, 30 · салон «Пигмент»",
      description: "Окрашивания, которые выглядят дорого, и наращивание, которое не отличить от своих волос. Работаю на премиум-красителях, даю гарантию на цвет 2 недели.",
      photo: IMG.vika, color: "#C86FA8", plan: "pro", promoted: true, verified: true, rating: 4.9, reviews: 143,
      paymentMethods: ["cash", "card", "transfer"],
      schedule: { workDays: [1, 2, 3, 4, 5, 6], start: "10:00", end: "19:00", slotStep: 30, breaks: [{ start: "13:30", end: "14:00" }] },
      daysOff: [addDays(today, 9)],
    }),
  ];

  const svc = (masterId: string, name: string, price: number, durationMin: number, color: string, description = ""): Service =>
    ({ id: uid(), masterId, name, price, durationMin, color, description, active: true });

  const services: Service[] = [
    svc("m-alina", "Маникюр классический", 40, 60, "#D63D80", "Аппаратный или комбинированный, с покрытием базы"),
    svc("m-alina", "Маникюр + гель-лак", 65, 90, "#D63D80", "Полный комплекс с покрытием и дизайном на 2 ногтя"),
    svc("m-alina", "Снятие покрытия", 15, 30, "#B92C69"),
    svc("m-alina", "Дизайн / френч", 20, 30, "#EE8FBB", "Втирки, стемпинг, ручная роспись"),
    svc("m-alina", "Педикюр", 70, 90, "#B92C69", "Аппаратный, с покрытием гель-лаком"),
    svc("m-mark", "Мужская стрижка", 35, 45, "#E3A33D", "Ножницы + машинка, укладка стайлингом"),
    svc("m-mark", "Стрижка машинкой", 25, 30, "#E3A33D"),
    svc("m-mark", "Стрижка + борода", 50, 75, "#C4832B", "Комплекс: стрижка и оформление бороды"),
    svc("m-mark", "Оформление бороды", 20, 30, "#C4832B"),
    svc("m-mark", "Королевское бритьё", 30, 40, "#E3A33D", "Опасная бритва, горячее полотенце"),
    svc("m-mark", "Детская стрижка", 22, 30, "#EBB95F", "До 12 лет"),
    svc("m-mark", "Камуфляж седины", 25, 30, "#EBB95F", "Естественный тон без резких границ"),
    svc("m-mark", "Массаж головы", 18, 30, "#C4832B", "Расслабляющий, с маслом мяты"),
    svc("m-eva", "Классическое наращивание", 80, 120, "#2FA396", "Поресничное, естественный эффект"),
    svc("m-eva", "Объём 2D / 3D", 95, 150, "#2FA396", "Пышный объём, изгиб на выбор"),
    svc("m-eva", "Ламинирование ресниц", 60, 60, "#4DB8AB", "С ботоксом и окрашиванием"),
    svc("m-eva", "Коррекция бровей", 25, 30, "#2FA396", "Воск / пинцет, архитектура"),
    svc("m-eva", "Окрашивание бровей хной", 30, 40, "#4DB8AB"),
    svc("m-eva", "Снятие ресниц", 18, 30, "#1C6861"),
    svc("m-eva", "Комбо: ресницы + брови", 100, 90, "#4DB8AB", "Ламинирование ресниц и бровей за один визит"),
    svc("m-dana", "Ультразвуковая чистка", 90, 90, "#E05C4A", "С энзимным пилингом и маской по типу кожи"),
    svc("m-dana", "Химический пилинг", 85, 60, "#E05C4A", "Миндальный, молочный, azelaic"),
    svc("m-dana", "Скульптурный массаж лица", 70, 60, "#C4453A"),
    svc("m-dana", "RF-лифтинг", 120, 75, "#E05C4A", "Аппаратная подтяжка, курс от 5 процедур"),
    svc("m-dana", "Альгинатная маска", 45, 40, "#E08A7E"),
    svc("m-dana", "Консультация + план ухода", 35, 30, "#E08A7E"),
    svc("m-dana", "Дарсонвализация лица", 40, 30, "#E08A7E", "Против воспалений, курс 10 процедур"),
    svc("m-dana", "Массаж гуаша", 55, 45, "#C4453A", "Нефритовыми скребками, лимфодренаж лица"),
    svc("m-nadia", "Лечебный массаж спины", 45, 45, "#7D5BA6", "Шейно-воротниковая зона и поясница"),
    svc("m-nadia", "Массаж всего тела", 70, 60, "#7D5BA6", "Классическая техника, проработка всех зон"),
    svc("m-nadia", "Лимфодренажный массаж", 65, 60, "#9B7FC0", "Снимает отёки, ускоряет обмен веществ"),
    svc("m-nadia", "Релакс с аромамаслами", 60, 60, "#9B7FC0", "Мягкие техники, тёплые масла, тишина"),
    svc("m-nadia", "Скульптурный массаж лица", 40, 40, "#5F4385", "Лифтинг-эффект без инъекций"),
    svc("m-nadia", "Массаж стоп", 35, 40, "#5F4385", "Рефлексотерапия, снятие усталости"),
    svc("m-nadia", "Спортивный массаж", 60, 60, "#7D5BA6", "Восстановление после тренировок"),
    svc("m-nadia", "Антицеллюлитный массаж", 55, 45, "#9B7FC0", "Интенсивный, курс от 8 сеансов"),
    svc("m-vika", "Окрашивание в один тон", 90, 90, "#C86FA8", "Стойкий цвет, уход в составе"),
    svc("m-vika", "Сложное окрашивание", 220, 180, "#C86FA8", "Балаяж / шатуш / airtouch"),
    svc("m-vika", "Мелирование", 130, 120, "#B25892", "Классическое или калифорнийское"),
    svc("m-vika", "Тонирование", 60, 45, "#B25892", "Освежение цвета без аммиака"),
    svc("m-vika", "Наращивание волос капсульное", 250, 180, "#C86FA8", "Итальянские капсулы, славянские волосы"),
    svc("m-vika", "Наращивание волос ленточное", 180, 120, "#C86FA8", "Быстро и бережно, до 3 мес носки"),
    svc("m-vika", "Коррекция наращивания", 120, 90, "#B25892", "Перестановка прядей + уход"),
    svc("m-vika", "Снятие наращенных волос", 40, 40, "#B25892", "Безопасное, с восстановлением"),
    svc("m-vika", "Ботокс / кератин для волос", 150, 120, "#C86FA8", "Гладкость и блеск до 3 месяцев"),
    svc("m-vika", "Стрижка + укладка", 55, 60, "#B25892", "Женская стрижка любой сложности"),
  ];

  const FN = ["Анна", "Мария", "Ольга", "Ксения", "Дарья", "Полина", "Виктория", "Софья", "Елена", "Наталья", "Ирина", "Татьяна", "Юлия", "Маргарита", "Светлана", "Кристина", "Вероника", "Алиса"];
  const LN = ["Смирнова", "Иванова", "Козлова", "Новикова", "Морозова", "Волкова", "Соколова", "Лебедева", "Орлова", "Никитина", "Захарова", "Белова", "Романова", "Крылова", "Ершова", "Громова"];
  const MN = ["Дмитрий", "Алексей", "Сергей", "Артём", "Максим", "Иван", "Никита", "Егор", "Павел", "Роман"];
  const MLN = ["Смирнов", "Иванов", "Петров", "Кузнецов", "Волков", "Фёдоров", "Михайлов", "Беляев", "Громов", "Котов"];
  const NOTES = ["Предпочитает тихую музыку", "Аллергия на цитрус!", "Просит напомнить за день", "Любит кофе без сахара", "Часто опаздывает на 10 минут", ""];

  const clients: Client[] = [];
  const appointments: Appointment[] = [];
  const notifications: Notif[] = [];
  const notify = (target: NotifTarget, type: Notif["type"], title: string, body: string, read = false) =>
    notifications.unshift({ id: uid(), target, type, title, body, read, createdAt: Date.now() - Math.floor(rng() * 36e5) });

  for (const m of masters) {
    const isBarber = m.id === "m-mark";
    const poolSize = 7 + Math.floor(rng() * 4);
    const pool: Client[] = [];
    for (let i = 0; i < poolSize; i++) {
      const name = isBarber ? `${pick(MN)} ${pick(MLN)}` : `${pick(FN)} ${pick(LN)}`;
      const phone = `375${pick(["29", "33", "44", "25", "17"])}${Math.floor(1000000 + rng() * 8999999)}`;
      const c: Client = { id: uid(), masterId: m.id, name, phone, notes: pick(NOTES), createdAt: Date.now() - Math.floor(30 + rng() * 60) * 864e5 };
      clients.push(c); pool.push(c);
    }
    const mySvcs = services.filter((s) => s.masterId === m.id);
    const pay = () => pick(m.paymentMethods);

    // История за 60 дней
    for (let d = 60; d >= 1; d--) {
      const iso = addDays(today, -d);
      if (!dayInfo(m, iso)) continue;
      const r = rng();
      const count = r < 0.16 ? 0 : r < 0.45 ? 1 + Math.floor(rng() * 2) : 2 + Math.floor(rng() * 3);
      for (let i = 0; i < count; i++) {
        const s = pick(mySvcs);
        const slots = freeSlots(m, appointments, iso, s.durationMin);
        if (!slots.length) break;
        const c = pick(pool);
        const sr = rng();
        const status: ApptStatus = sr < 0.8 ? "done" : sr < 0.92 ? "cancelled" : "no_show";
        appointments.push({
          id: uid(), masterId: m.id, clientId: c.id, serviceId: s.id, serviceName: s.name, serviceColor: s.color,
          price: s.price, durationMin: s.durationMin, date: iso, start: pick(slots), status,
          paymentMethod: pay(), createdAt: Date.now() - d * 864e5, source: rng() < 0.6 ? "online" : "master",
        });
      }
    }
    // Будущие записи (включая сегодня)
    const futureCounts: Record<string, number[]> = { "m-alina": [2, 2, 1, 2, 1, 0, 2, 1, 2, 1], "m-mark": [3, 2, 2, 3, 2, 1, 3, 2, 2, 3], "m-eva": [2, 1, 2, 1, 2, 0, 1, 2, 1, 2], "m-dana": [2, 2, 1, 2, 2, 1, 2, 1, 2, 2], "m-nadia": [2, 1, 2, 2, 1, 0, 2, 1, 2, 1], "m-vika": [2, 2, 1, 2, 2, 1, 2, 1, 2, 2] };
    (futureCounts[m.id] || []).forEach((count, i) => {
      const iso = addDays(today, i);
      if (!dayInfo(m, iso)) return;
      for (let k = 0; k < count; k++) {
        const s = pick(mySvcs);
        const slots = freeSlots(m, appointments, iso, s.durationMin);
        if (!slots.length) break;
        const c = pick(pool);
        const status: ApptStatus = rng() < 0.55 ? "confirmed" : "pending";
        const a: Appointment = {
          id: uid(), masterId: m.id, clientId: c.id, serviceId: s.id, serviceName: s.name, serviceColor: s.color,
          price: s.price, durationMin: s.durationMin, date: iso, start: pick(slots), status,
          paymentMethod: pay(), createdAt: Date.now() - Math.floor(rng() * 2 * 864e5), source: "online",
        };
        appointments.push(a);
        if (status === "pending" && i <= 2)
          notify({ kind: "master", id: m.id }, "new", "Новая запись", `${c.name} · ${s.name}, ${fmtDate(iso)} в ${a.start}`);
      }
    });
  }

  notify({ kind: "admin" }, "system", "Заявка на тариф «Профи»", "Алина Крылова (alina-nails) хочет перейти с тарифа «Старт»");
  notify({ kind: "master", id: "m-mark" }, "remind", "Напоминание", "Завтра 3 записи — проверьте расписание", true);

  // Салоны
  const salons: Salon[] = [
    { id: "sal-pudra", name: "Студия «Пудра»", slug: "pudra", city: "Минск", address: "ул. Октябрьская, 16", description: "Камерная студия красоты в центре: маникюр, педикюр, ресницы и брови. Своя атмосфера, свой плейлист, свой кофе.", photo: "", color: "#D63D80", masterIds: ["m-alina", "m-eva"], createdAt: Date.now() - 200 * 864e5 },
    { id: "sal-forma", name: "Барбершоп «Форма»", slug: "forma", city: "Минск", address: "пр. Независимости, 44", description: "Мужские стрижки, бороды и опасное бритьё. PlayStation, эспрессо и никакой суеты.", photo: "", color: "#E3A33D", masterIds: ["m-mark"], createdAt: Date.now() - 180 * 864e5 },
  ];

  // Отзывы на основе завершённых визитов
  const RTXT = [
    "Очень довольна, вернусь обязательно!", "Мастер — золото, всё сделано аккуратно.",
    "Приятная атмосфера и отличный результат.", "Всё быстро и качественно, рекомендую.",
    "Лучшая в городе!", "Спасибо, всё супер!", "Записалась ещё до того, как вышла из студии.",
    "Идеально! Ни одного замечания.",
  ];
  const reviews: Review[] = [];
  for (const m of masters) {
    const mine = appointments.filter((a) => a.masterId === m.id && a.status === "done");
    const take = Math.min(6, mine.length);
    for (let i = 0; i < take; i++) {
      const a = mine[i];
      const c = clients.find((x) => x.id === a.clientId);
      reviews.push({
        id: uid(), masterId: m.id, clientId: a.clientId, clientName: c?.name ?? "Клиент", apptId: a.id,
        serviceName: a.serviceName, rating: rng() < 0.82 ? 5 : 4, text: RTXT[Math.floor(rng() * RTXT.length)],
        createdAt: a.createdAt + 36e5,
      });
    }
  }
  reviews.sort((a, b) => b.createdAt - a.createdAt);

  // Обращения в поддержку
  const tickets: Ticket[] = [
    { id: uid(), author: "Марина Ковалёва", contact: "+375 29 640-22-10", topic: "Ошибка на сайте", message: "Выбрала слот на завтра в 14:30, а на шаге контактов он пропал. Пришлось перезаписываться на 15:00. Подскажите, это сбой?", page: "#/m/alina-nails", status: "open", createdAt: Date.now() - 5 * 36e5 },
    { id: uid(), author: "Алина Крылова", contact: "@alina_nails", topic: "Вопрос по тарифам", message: "Если перейти на «Профи» в середине месяца — оплата за полный месяц или пропорционально дням?", page: "#/app", status: "resolved", createdAt: Date.now() - 2 * 864e5 },
  ];

  return {
    version: SEED_VERSION, masters, services, clients, appointments, notifications, reviews, salons, tickets,
    settings: { adminLogin: "admin", adminPassword: "admin", plans: DEFAULT_PLANS, lastReminderDate: "" },
  };
}

function loadDB(): DB {
  try {
    const raw = localStorage.getItem(DB_KEY);
    if (raw) {
      const d = JSON.parse(raw) as DB;
      if (d.version === SEED_VERSION) return d;
    }
  } catch { /* повреждённые данные — пересоздаём */ }
  const d = seedDB();
  try { localStorage.setItem(DB_KEY, JSON.stringify(d)); } catch { /* приватный режим */ }
  return d;
}

let db: DB = loadDB();
let session: Session = (() => {
  try { return JSON.parse(localStorage.getItem(SES_KEY) || "null"); } catch { return null; }
})();

const subs = new Set<() => void>();
const emit = () => subs.forEach((f) => f());
const subscribe = (cb: () => void) => { subs.add(cb); return () => { subs.delete(cb); }; };

export const useDB = () => useSyncExternalStore(subscribe, () => db, () => db);
export const useSession = () => useSyncExternalStore(subscribe, () => session, () => session);
export const getDB = () => db;

export function set(mut: (d: DB) => void) {
  mut(db);
  db = {
    ...db,
    masters: [...db.masters], services: [...db.services], clients: [...db.clients],
    appointments: [...db.appointments], notifications: [...db.notifications],
    reviews: [...db.reviews], salons: [...db.salons], tickets: [...db.tickets],
  };
  try { localStorage.setItem(DB_KEY, JSON.stringify(db)); } catch { /* ignore */ }
  emit();
}

export function setSession(s: Session) {
  session = s;
  try { localStorage.setItem(SES_KEY, s ? JSON.stringify(s) : ""); } catch { /* ignore */ }
  emit();
}

export const notify = (d: DB, target: NotifTarget, type: Notif["type"], title: string, body: string) => {
  d.notifications.unshift({ id: uid(), target, type, title, body, read: false, createdAt: Date.now() });
  try {
    if (typeof Notification !== "undefined" && Notification.permission === "granted") {
      new Notification(title, { body, icon: "https://image.qwenlm.ai/generated-images/d6f7b473-8512-424a-996f-2579acb49cb5/_result.png" });
    }
  } catch { /* не поддерживается */ }
};

export const planOf = (m: Master) => db.settings.plans[m.plan] ?? db.settings.plans.free;

// ─── Аутентификация ────────────────────────────────────────────
export function loginMaster(login: string, password: string): string | null {
  const m = db.masters.find((x) => x.login.toLowerCase() === login.trim().toLowerCase());
  if (!m || m.password !== password) return "Неверный логин или пароль";
  if (m.blocked) return "Кабинет заблокирован администратором";
  setSession({ kind: "master", masterId: m.id });
  return null;
}

export function loginAdmin(login: string, password: string): string | null {
  if (login.trim() !== db.settings.adminLogin || password !== db.settings.adminPassword) return "Неверные данные администратора";
  setSession({ kind: "admin" });
  return null;
}

export function registerMaster(p: { name: string; profession: string; login: string; password: string; phone: string; city?: string }): string | null {
  const login = p.login.trim().toLowerCase();
  if (login.length < 3) return "Логин — минимум 3 символа";
  if (p.password.length < 4) return "Пароль — минимум 4 символа";
  if (!p.name.trim()) return "Укажите имя";
  if (login === db.settings.adminLogin) return "Этот логин занят";
  if (db.masters.some((m) => m.login.toLowerCase() === login)) return "Такой логин уже занят";
  const id = uid();
  set((d) => {
    d.masters.push({
      id, name: p.name.trim(), slug: translit(p.name.trim()) + "-" + id.slice(0, 3), profession: p.profession,
      login, password: p.password, phone: p.phone, address: "", photo: "", color: "#D63D80", city: p.city || "Минск",
      description: "", paymentMethods: ["cash", "transfer"],
      schedule: { workDays: [0, 1, 2, 3, 4], start: "10:00", end: "19:00", slotStep: 30, breaks: [] },
      daysOff: [], vacations: [], blocks: [], plan: "free", promoted: false, verified: false, blocked: false,
      rating: 0, reviews: 0, createdAt: Date.now(), loyalty: { enabled: false, type: "cashback", value: 5 },
    });
    d.notifications.unshift({ id: uid(), target: { kind: "admin" }, type: "system", title: "Новый мастер на платформе", body: `${p.name.trim()} (${p.profession}) создал(а) кабинет`, read: false, createdAt: Date.now() });
  });
  setSession({ kind: "master", masterId: id });
  return null;
}

export const logout = () => setSession(null);

// ─── Услуги (с лимитами тарифа) ────────────────────────────────
export function addService(masterId: string, s: Omit<Service, "id" | "masterId">): string | null {
  const m = db.masters.find((x) => x.id === masterId);
  if (!m) return "Мастер не найден";
  const limit = planOf(m).maxServices;
  if (db.services.filter((x) => x.masterId === masterId).length >= limit)
    return `Лимит тарифа «${planOf(m).label}» — ${limit} услуг. Повысьте тариф.`;
  set((d) => { d.services.push({ ...s, id: uid(), masterId }); });
  return null;
}
export const updateService = (id: string, patch: Partial<Service>) =>
  set((d) => { const s = d.services.find((x) => x.id === id); if (s) Object.assign(s, patch); });
export const deleteService = (id: string) => set((d) => { d.services = d.services.filter((x) => x.id !== id); });

// ─── Записи ────────────────────────────────────────────────────
export interface BookParams {
  masterId: string; serviceId: string; date: string; start: string;
  name: string; phone: string; paymentMethod: string; byClient: boolean; clientId?: string;
}

export function book(p: BookParams): { ok: boolean; error?: string; appt?: Appointment; newClient?: boolean } {
  let res: { ok: boolean; error?: string; appt?: Appointment; newClient?: boolean } = { ok: false };
  set((d) => {
    const m = d.masters.find((x) => x.id === p.masterId);
    const s = d.services.find((x) => x.id === p.serviceId);
    if (!m || m.blocked) { res = { ok: false, error: "Мастер временно недоступен" }; return; }
    if (!s || !s.active) { res = { ok: false, error: "Услуга недоступна" }; return; }
    const phone = normPhone(p.phone);
    if (phone.replace(/\D/g, "").length < 10) { res = { ok: false, error: "Укажите корректный номер телефона" }; return; }
    // проверка слота по свежему состоянию — защита от двойного бронирования
    const slots = freeSlots(m, d.appointments, p.date, s.durationMin);
    if (!slots.includes(p.start)) { res = { ok: false, error: "Увы, это время только что заняли. Выберите другой слот." }; return; }

    let client = p.clientId ? d.clients.find((c) => c.id === p.clientId && c.masterId === m.id) : d.clients.find((c) => c.masterId === m.id && normPhone(c.phone) === phone);
    let newClient = false;
    if (!client) {
      newClient = true;
      client = { id: uid(), masterId: m.id, name: p.name.trim() || "Клиент", phone, notes: "", createdAt: Date.now() };
      d.clients.push(client);
    } else if (p.name.trim() && (client.name === "Клиент" || client.name.trim() === "")) {
      client.name = p.name.trim();
    }
    const appt: Appointment = {
      id: uid(), masterId: m.id, clientId: client.id, serviceId: s.id, serviceName: s.name, serviceColor: s.color,
      price: s.price, durationMin: s.durationMin, date: p.date, start: p.start,
      status: p.byClient ? "pending" : "confirmed", paymentMethod: p.paymentMethod,
      createdAt: Date.now(), source: p.byClient ? "online" : "master",
    };
    d.appointments.push(appt);
    notify(d, { kind: "master", id: m.id }, "new", p.byClient ? "Новая запись" : "Запись создана", `${client.name} · ${s.name}, ${fmtDate(p.date)} в ${p.start}`);
    notify(d, { kind: "client", id: phone }, "status", "Запись создана", `${m.name}: ${s.name}, ${fmtDate(p.date)} в ${p.start}`);
    res = { ok: true, appt, newClient };
  });
  return res;
}

export function setApptStatus(id: string, status: ApptStatus, by: "master" | "client"): string | null {
  let err: string | null = null;
  set((d) => {
    const a = d.appointments.find((x) => x.id === id);
    if (!a) { err = "Запись не найдена"; return; }
    const m = d.masters.find((x) => x.id === a.masterId);
    const c = d.clients.find((x) => x.id === a.clientId);
    a.status = status;
    const meta: Record<string, [Notif["type"], string]> = {
      confirmed: ["status", "Запись подтверждена"], done: ["status", "Визит завершён"],
      cancelled: ["cancel", "Запись отменена"], no_show: ["status", "Клиент не пришёл"],
    };
    const [t, title] = meta[status] ?? ["status", "Запись обновлена"];
    if (by === "master" && c) notify(d, { kind: "client", id: c.phone }, t, title, `${m?.name ?? "Мастер"}: ${a.serviceName}, ${fmtDate(a.date)} в ${a.start}`);
    if (by === "client" && m) notify(d, { kind: "master", id: m.id }, t, title, `${c?.name ?? "Клиент"} · ${a.serviceName}, ${fmtDate(a.date)} в ${a.start}`);
  });
  return err;
}

export function rescheduleAppt(id: string, date: string, start: string): string | null {
  let err: string | null = null;
  set((d) => {
    const a = d.appointments.find((x) => x.id === id);
    const m = d.masters.find((x) => x.id === a?.masterId);
    if (!a || !m) { err = "Запись не найдена"; return; }
    const slots = freeSlots(m, d.appointments, date, a.durationMin, a.id);
    if (!slots.includes(start)) { err = "Это время занято или вне рабочего графика"; return; }
    a.date = date; a.start = start;
    const c = d.clients.find((x) => x.id === a.clientId);
    notify(d, { kind: "client", id: c?.phone ?? "" }, "move", "Запись перенесена", `${m.name}: ${a.serviceName}, теперь ${fmtDate(date)} в ${start}`);
    notify(d, { kind: "master", id: m.id }, "move", "Перенос в календаре", `${c?.name ?? "Клиент"} · ${a.serviceName} → ${fmtDate(date)} в ${start}`);
  });
  return err;
}

export function cancelByClient(apptId: string): string | null {
  return setApptStatus(apptId, "cancelled", "client");
}

// ─── Мастер / профиль ──────────────────────────────────────────
export const updateMaster = (id: string, patch: Partial<Master>) =>
  set((d) => { const m = d.masters.find((x) => x.id === id); if (m) Object.assign(m, patch); });

export function requestUpgrade(masterId: string, plan: PlanId) {
  set((d) => {
    const m = d.masters.find((x) => x.id === masterId);
    if (m) {
      m.upgradeRequest = plan;
      notify(d, { kind: "admin" }, "system", `Заявка на тариф «${d.settings.plans[plan].label}»`, `${m.name} (${m.slug}) хочет сменить тариф`);
    }
  });
}

export function approveUpgrade(masterId: string) {
  set((d) => {
    const m = d.masters.find((x) => x.id === masterId);
    if (m?.upgradeRequest) {
      const p = m.upgradeRequest;
      m.plan = p; m.upgradeRequest = undefined;
      notify(d, { kind: "master", id: masterId }, "system", "Заявка одобрена 🎉", `Вам подключён тариф «${d.settings.plans[p].label}». Лимиты обновлены.`);
    }
  });
}
export function rejectUpgrade(masterId: string) {
  set((d) => {
    const m = d.masters.find((x) => x.id === masterId);
    if (m) { m.upgradeRequest = undefined; notify(d, { kind: "master", id: masterId }, "system", "Заявка отклонена", "Администратор отклонил заявку на смену тарифа"); }
  });
}

// ─── Клиенты ───────────────────────────────────────────────────
export const updateClientNote = (id: string, notes: string) =>
  set((d) => { const c = d.clients.find((x) => x.id === id); if (c) c.notes = notes; });

// ─── Уведомления ───────────────────────────────────────────────
export const matchTarget = (n: Notif, t: NotifTarget) =>
  t.kind === "admin" ? n.target.kind === "admin" : n.target.kind === t.kind && ("id" in n.target && n.target.id === t.id);
export const unreadFor = (d: DB, t: NotifTarget) => d.notifications.filter((n) => matchTarget(n, t) && !n.read).length;

export function markAllRead(t: NotifTarget) {
  set((d) => d.notifications.forEach((n) => { if (matchTarget(n, t)) n.read = true; }));
}
export function markRead(id: string) {
  set((d) => { const n = d.notifications.find((x) => x.id === id); if (n) n.read = true; });
}
export function pushNotify(t: NotifTarget, type: Notif["type"], title: string, body: string) {
  set((d) => notify(d, t, type, title, body));
}

export function enablePush(): Promise<boolean> {
  return new Promise((res) => {
    try {
      if (typeof Notification === "undefined") return res(false);
      Notification.requestPermission().then((p) => res(p === "granted"));
    } catch { res(false); }
  });
}
export const pushGranted = () => typeof Notification !== "undefined" && Notification.permission === "granted";

// Напоминания о завтрашних записях — раз в сутки
export function runReminderJob() {
  const today = todayISO();
  if (db.settings.lastReminderDate === today) return;
  set((d) => {
    d.settings.lastReminderDate = today;
    const tomorrow = addDays(today, 1);
    const seen = new Set<string>();
    for (const a of d.appointments) {
      if (a.date !== tomorrow || (a.status !== "confirmed" && a.status !== "pending")) continue;
      const m = d.masters.find((x) => x.id === a.masterId);
      const c = d.clients.find((x) => x.id === a.clientId);
      if (!m || !c) continue;
      if (planOf(m).reminders && !seen.has("m" + m.id)) {
        seen.add("m" + m.id);
        const list = d.appointments.filter((x) => x.masterId === m.id && x.date === tomorrow && (x.status === "confirmed" || x.status === "pending")).sort((x, y) => x.start.localeCompare(y.start));
        notify(d, { kind: "master", id: m.id }, "remind", "Напоминание о записях", `Завтра у вас ${list.length} ${list.length === 1 ? "запись" : list.length < 5 ? "записи" : "записей"} — первая в ${list[0].start}`);
      }
      if (!seen.has("c" + a.id)) {
        seen.add("c" + a.id);
        notify(d, { kind: "client", id: c.phone }, "remind", "Напоминание", `Завтра в ${a.start} — ${a.serviceName} у ${m.name}`);
      }
    }
  });
}

// ─── Админ ─────────────────────────────────────────────────────
export function updateAdminCreds(cur: string, login: string, pass: string): string | null {
  if (cur !== db.settings.adminPassword) return "Текущий пароль указан неверно";
  if (login.trim().length < 3) return "Логин — минимум 3 символа";
  if (pass.length < 4) return "Пароль — минимум 4 символа";
  if (db.masters.some((m) => m.login.toLowerCase() === login.trim().toLowerCase())) return "Этот логин занят мастером";
  set((d) => { d.settings.adminLogin = login.trim(); d.settings.adminPassword = pass; });
  return null;
}
export const adminSetPlan = (masterId: string, plan: PlanId) =>
  set((d) => { const m = d.masters.find((x) => x.id === masterId); if (m) { m.plan = plan; notify(d, { kind: "master", id: masterId }, "system", "Тариф изменён", `Администратор подключил вам тариф «${d.settings.plans[plan].label}»`); } });
export const adminToggle = (masterId: string, key: "promoted" | "verified" | "blocked") =>
  set((d) => { const m = d.masters.find((x) => x.id === masterId); if (m) m[key] = !m[key]; });
export const adminUpdatePlan = (plan: PlanId, patch: Partial<DB["settings"]["plans"][PlanId]>) =>
  set((d) => { Object.assign(d.settings.plans[plan], patch); });
export const resetDemo = () => { localStorage.removeItem(DB_KEY); localStorage.removeItem(SES_KEY); location.reload(); };
export const clearNotifications = (t: NotifTarget) =>
  set((d) => { d.notifications = d.notifications.filter((n) => !matchTarget(n, t)); });

// ─── Обращения (обратная связь) ────────────────────────────────
export function submitTicket(p: { author: string; contact: string; topic: string; message: string }) {
  set((d) => {
    d.tickets.unshift({ id: uid(), author: p.author, contact: p.contact, topic: p.topic, message: p.message, page: location.hash || "#/", status: "open", createdAt: Date.now() });
    notify(d, { kind: "admin" }, "system", "Новое обращение", `${p.author} · ${p.topic}: ${p.message.slice(0, 70)}…`);
  });
}
export const setTicketStatus = (id: string, status: Ticket["status"]) =>
  set((d) => { const t = d.tickets.find((x) => x.id === id); if (t) t.status = status; });

// ─── Отзывы и рейтинги ─────────────────────────────────────────
export const hasReview = (d: DB, apptId: string) => d.reviews.some((r) => r.apptId === apptId);

export function addReview(apptId: string, rating: number, text: string): string | null {
  let err: string | null = null;
  set((d) => {
    if (d.reviews.some((r) => r.apptId === apptId)) { err = "Отзыв на этот визит уже оставлен"; return; }
    const a = d.appointments.find((x) => x.id === apptId);
    if (!a) { err = "Запись не найдена"; return; }
    const c = d.clients.find((x) => x.id === a.clientId);
    d.reviews.unshift({ id: uid(), masterId: a.masterId, clientId: a.clientId, clientName: c?.name ?? "Клиент", apptId, serviceName: a.serviceName, rating, text: text.trim(), createdAt: Date.now() });
    const m = d.masters.find((x) => x.id === a.masterId);
    if (m) {
      m.reviews += 1;
      m.rating = Math.round(((m.rating * (m.reviews - 1) + rating) / m.reviews) * 10) / 10;
      notify(d, { kind: "master", id: m.id }, "system", "Новый отзыв ⭐", `${c?.name ?? "Клиент"} оценил(а) «${a.serviceName}» на ${rating} из 5`);
    }
  });
  return err;
}

// ─── Лояльность ────────────────────────────────────────────────
export function loyaltyFor(masterId: string, clientId: string) {
  const done = db.appointments.filter((a) => a.masterId === masterId && a.clientId === clientId && a.status === "done");
  const total = done.reduce((s, a) => s + a.price, 0);
  const m = db.masters.find((x) => x.id === masterId);
  const bonus = m?.loyalty.type === "cashback" ? Math.round(total * (m.loyalty.value / 100)) : 0;
  return { visits: done.length, total, bonus };
}

// ─── Салоны и поиск ────────────────────────────────────────────
export const getSalonOf = (masterId: string) => db.salons.find((s) => s.masterIds.includes(masterId)) ?? null;

export function searchMasters(d: DB, q: string, city: string, sort: "rating" | "reviews" | "price"): Master[] {
  const minPrice = (mid: string) => {
    const ps = d.services.filter((s) => s.masterId === mid && s.active).map((s) => s.price);
    return ps.length ? Math.min(...ps) : 0;
  };
  let list = d.masters.filter((m) => !m.blocked);
  if (city !== "Все") list = list.filter((m) => m.city === city);
  const query = q.trim().toLowerCase();
  if (query) {
    list = list.filter((m) => {
      const svcNames = d.services.filter((s) => s.masterId === m.id && s.active).map((s) => s.name.toLowerCase()).join(" ");
      return (m.name + " " + m.profession + " " + svcNames + " " + m.city).toLowerCase().includes(query);
    });
  }
  const plan = (m: Master) => d.settings.plans[m.plan]?.priority ?? 0;
  return [...list].sort((a, b) => {
    const p = plan(b) - plan(a) || Number(b.promoted) - Number(a.promoted);
    if (p) return p;
    if (sort === "price") return minPrice(a.id) - minPrice(b.id);
    if (sort === "reviews") return b.reviews - a.reviews;
    return b.rating - a.rating;
  });
}

export const PAY_LIST = (m?: Master | null) => (m ? m.paymentMethods : Object.keys(PAYMENTS)).map((k) => ({ id: k, label: PAYMENTS[k] }));

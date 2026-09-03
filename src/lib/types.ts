export type PlanId = "free" | "pro" | "vip";
export type ApptStatus = "pending" | "confirmed" | "done" | "cancelled" | "no_show";
export type NotifType = "new" | "cancel" | "move" | "remind" | "system" | "status";
export type NotifTarget = { kind: "master" | "client"; id: string } | { kind: "admin" };

export interface Break { start: string; end: string }
export interface Schedule { workDays: number[]; start: string; end: string; slotStep: number; breaks: Break[] }
export interface Vacation { start: string; end: string; label: string }
export interface Block { date: string; start: string; end: string; reason: string }
export interface Loyalty { enabled: boolean; type: "cashback" | "visit"; value: number }

export interface Master {
  id: string; name: string; slug: string; profession: string; login: string; password: string;
  phone: string; address: string; city: string; description: string; photo: string; color: string;
  paymentMethods: string[]; schedule: Schedule; daysOff: string[]; vacations: Vacation[]; blocks: Block[];
  plan: PlanId; promoted: boolean; verified: boolean; blocked: boolean;
  rating: number; reviews: number; createdAt: number;
  salonId?: string; loyalty: Loyalty; upgradeRequest?: PlanId;
}

export interface Service { id: string; masterId: string; name: string; price: number; durationMin: number; color: string; description: string; active: boolean }
export interface Client { id: string; masterId: string; name: string; phone: string; notes: string; createdAt: number }
export interface Appointment {
  id: string; masterId: string; clientId: string; serviceId: string; serviceName: string; serviceColor: string;
  price: number; durationMin: number; date: string; start: string; status: ApptStatus;
  paymentMethod: string; createdAt: number; source: "online" | "master";
}
export interface Notif { id: string; target: NotifTarget; type: NotifType; title: string; body: string; read: boolean; createdAt: number }
export interface Review { id: string; masterId: string; clientId: string; clientName: string; apptId: string; serviceName: string; rating: number; text: string; createdAt: number }
export interface Salon { id: string; name: string; slug: string; city: string; address: string; description: string; photo: string; color: string; masterIds: string[]; createdAt: number }
export interface Ticket { id: string; author: string; contact: string; topic: string; message: string; page: string; status: "open" | "resolved"; createdAt: number }

export interface Settings {
  adminLogin: string; adminPassword: string;
  plans: Record<PlanId, { label: string; price: number; maxServices: number; statDays: number; reminders: boolean; priority: number; perks: string[] }>;
  lastReminderDate: string;
}

export interface DB {
  version: number; masters: Master[]; services: Service[]; clients: Client[]; appointments: Appointment[];
  notifications: Notif[]; reviews: Review[]; salons: Salon[]; tickets: Ticket[]; settings: Settings;
}

export type Session = { kind: "master"; masterId: string } | { kind: "admin" } | null;

export const PAYMENTS: Record<string, string> = {
  cash: "Наличные",
  transfer: "Перевод (ЕРИП / карта)",
  card: "Карта при визите",
};

export const STATUS_META: Record<ApptStatus, { label: string; tone: string; color: string }> = {
  pending: { label: "Ожидает", tone: "honey", color: "#dda33e" },
  confirmed: { label: "Подтверждена", tone: "jade", color: "#2fa396" },
  done: { label: "Завершена", tone: "ink", color: "#54446b" },
  cancelled: { label: "Отменена", tone: "coral", color: "#e05c4a" },
  no_show: { label: "Не пришёл", tone: "plum", color: "#423457" },
};

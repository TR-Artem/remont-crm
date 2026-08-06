// Единый источник правды по ролям, статусам и правам доступа.
// ВАЖНО: эти же проверки повторяются на backend (API routes) — см. lib/rbac.ts.
// Фронтенд может скрывать элементы UI, но окончательное решение всегда за сервером.

export const ROLES = [
  "master",
  "callcenter",
  "admin",
  "director",
  "regional_director",
] as const;
export type Role = (typeof ROLES)[number];

export const ROLE_LABELS: Record<Role, string> = {
  master: "Мастер",
  callcenter: "Колл-центр",
  admin: "Администратор",
  director: "Директор",
  regional_director: "Региональный директор",
};

// Ровно 6 статусов, порядок важен — это порядок колонок канбана.
export const STATUSES = [
  "waiting",
  "on_the_way",
  "in_progress",
  "in_progress_complex",
  "refused",
  "done",
] as const;
export type Status = (typeof STATUSES)[number];

export const STATUS_LABELS: Record<Status, string> = {
  waiting: "В ожидании",
  on_the_way: "В пути",
  in_progress: "В работе",
  in_progress_complex: "В работе СД",
  refused: "Отказ",
  done: "Готово",
};

export const STATUS_COLORS: Record<Status, { bg: string; text: string }> = {
  waiting: { bg: "#FFF4DE", text: "#B8860B" },
  on_the_way: { bg: "#E7F0FF", text: "#2F6FED" },
  in_progress: { bg: "#E7F0FF", text: "#2F6FED" },
  in_progress_complex: { bg: "#FFF4DE", text: "#B8860B" },
  refused: { bg: "#FDEAEA", text: "#DC2626" },
  done: { bg: "#E5F8EE", text: "#1CA05C" },
};

// Статусы, которые закрывают заявку и требуют модалку закрытия (2.4)
export const CLOSING_STATUSES: Status[] = ["done", "refused"];

export const AD_TYPES = ["avito", "flyers", "stickers", "posters", "other"] as const;
export type AdType = (typeof AD_TYPES)[number];
export const AD_TYPE_LABELS: Record<AdType, string> = {
  avito: "Авито",
  flyers: "Листовки",
  stickers: "Наклейки",
  posters: "Расклейка",
  other: "Другое",
};
export const AD_TYPE_ICONS: Record<AdType, string> = {
  avito: "🌐",
  flyers: "📰",
  stickers: "🏷️",
  posters: "📌",
  other: "📢",
};
export const AD_TYPE_COLORS: Record<AdType, { bg: string; text: string }> = {
  avito: { bg: "#E7F0FF", text: "#2F6FED" },
  flyers: { bg: "#FFF4DE", text: "#B8860B" },
  stickers: { bg: "#E9E4FF", text: "#6D3FE0" },
  posters: { bg: "#E5F8EE", text: "#1CA05C" },
  other: { bg: "#F0F1F4", text: "#6B7280" },
};
/** Онлайн/печать — вспомогательная метка для карточек источников (не хранится отдельно в БД) */
export function adTypeChannel(type: AdType): "Онлайн" | "Печать" {
  return type === "avito" ? "Онлайн" : "Печать";
}

export const REFUSAL_REASONS = [
  "Нашли дешевле",
  "Передумали",
  "Долгое ожидание мастера",
  "Не дозвонились",
  "Другое",
] as const;

export const CASH_TX_TYPES = ["income", "expense", "salary"] as const;
export type CashTxType = (typeof CASH_TX_TYPES)[number];
export const CASH_TX_LABELS: Record<CashTxType, string> = {
  income: "Приход",
  expense: "Расход",
  salary: "Зарплата",
};

export const EDIT_WINDOW_MS = 24 * 60 * 60 * 1000; // 24 часа — правка карточки колл-центром
export const CLOSE_EDIT_WINDOW_MS = 60 * 60 * 1000; // 1 час — правка закрытой заявки

// Раздел, куда роль попадает сразу после входа (см. п.7)
export const DEFAULT_ROUTE: Record<Role, string> = {
  master: "/chat",
  callcenter: "/requests",
  admin: "/ads",
  director: "/requests",
  regional_director: "/requests",
};

// Разделы, доступные каждой роли (для сайдбара и route guard в middleware)
// Модуль «Чат» (п.6) нужен колл-центру и администратору для связи с мастерами,
// поэтому он добавлен им в доступные разделы наравне с их основным разделом.
export const ROLE_SECTIONS: Record<Role, string[]> = {
  master: ["/chat"],
  callcenter: ["/requests", "/chat"],
  admin: ["/ads", "/requests", "/chat"],
  director: [
    "/requests",
    "/ads",
    "/accounting",
    "/chat",
    "/employees",
  ],
  regional_director: [
    "/requests",
    "/ads",
    "/accounting",
    "/chat",
    "/employees",
  ],
};

export function sectionAllowed(role: Role, pathname: string): boolean {
  const allowed = ROLE_SECTIONS[role] ?? [];
  return allowed.some((base) => pathname === base || pathname.startsWith(base + "/"));
}

export function roundDownToWhole(amount: number): number {
  return Math.floor(amount);
}

/** "3 ч назад" / "20 мин назад" — для бейджа времени ожидания на канбане */
export function formatElapsed(date: Date, now: number = Date.now()): string {
  const ms = now - date.getTime();
  const minutes = Math.floor(ms / 60000);
  if (minutes < 1) return "только что";
  if (minutes < 60) return `${minutes} мин назад`;
  const hours = Math.floor(minutes / 60);
  return `${hours} ч назад`;
}
export function formatShortName(fullName: string): string {
  const parts = fullName.trim().split(/\s+/);
  if (parts.length < 2) return fullName;
  return `${parts[0]} ${parts[1][0]}.`;
}

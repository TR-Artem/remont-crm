import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { EDIT_WINDOW_MS, CLOSE_EDIT_WINDOW_MS, type Role } from "@/lib/domain";

export class ForbiddenError extends Error {
  constructor(message = "Доступ запрещён") {
    super(message);
    this.name = "ForbiddenError";
  }
}

export async function requireSession() {
  const session = await auth();
  if (!session?.user) {
    throw new ForbiddenError("Не авторизован");
  }
  return session;
}

export async function requireRole(roles: Role[]) {
  const session = await requireSession();
  if (!roles.includes(session.user.role)) {
    throw new ForbiddenError(
      `Требуется одна из ролей: ${roles.join(", ")}, текущая роль: ${session.user.role}`
    );
  }
  return session;
}

export function forbiddenResponse(message: string) {
  return NextResponse.json({ error: message }, { status: 403 });
}

// --- Права по разделу «Заявки» ---

export const CAN_CREATE_REQUEST: Role[] = ["callcenter", "director", "regional_director"];
export const CAN_CLOSE_REQUEST: Role[] = ["admin", "director", "regional_director"];
export const CAN_MANAGE_ADS: Role[] = ["admin", "director", "regional_director"];
export const CAN_ADD_AD_SOURCE: Role[] = ["admin"]; // колл-центр только выбирает из списка
export const CAN_VIEW_AD_ANALYTICS: Role[] = ["admin", "director", "regional_director"];
export const CAN_VIEW_REQUEST_ANALYTICS: Role[] = ["director", "regional_director"];
export const CAN_VIEW_ACCOUNTING: Role[] = ["director", "regional_director"];
export const CAN_MANAGE_EMPLOYEES: Role[] = ["director", "regional_director"];
export const CAN_EDIT_CLOSED_REQUEST: Role[] = ["director", "regional_director"];

/** Окно 24ч для правки имени/адреса/причины звонка (п.2.2) */
export function isBasicFieldsEditWindowOpen(createdAt: Date): boolean {
  return Date.now() - createdAt.getTime() < EDIT_WINDOW_MS;
}

/** Окно 1ч для правки суммы/статуса уже закрытой заявки директором/рег. директором (п.2.4) */
export function isCloseEditWindowOpen(closedAt: Date | null): boolean {
  if (!closedAt) return false;
  return Date.now() - closedAt.getTime() < CLOSE_EDIT_WINDOW_MS;
}

/**
 * Колл-центр может править имя/адрес/причину звонка только в течение 24ч и только
 * если заявка ещё не закрыта. Директор/рег.директор к этому ограничению не относятся
 * (для них действует отдельное часовое окно ПОСЛЕ закрытия — на сумму/статус/фото).
 */
export function canEditBasicFields(role: Role, createdAt: Date): boolean {
  if (role === "director" || role === "regional_director") return true;
  if (role === "callcenter") return isBasicFieldsEditWindowOpen(createdAt);
  return false;
}

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSession, forbiddenResponse, ForbiddenError } from "@/lib/rbac";
import { updateStatusSchema } from "@/lib/validation";
import { CLOSING_STATUSES } from "@/lib/domain";
import { logAudit } from "@/lib/audit";

// Колл-центр и админ/директора могут двигать заявку по НЕзакрывающим статусам.
// Закрывающие статусы (готово/отказ) идут только через POST /api/requests/[id]/close.
const CAN_MOVE_STATUS = ["callcenter", "admin", "director", "regional_director"];

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    const session = await requireSession();
    if (!CAN_MOVE_STATUS.includes(session.user.role)) {
      return forbiddenResponse("Недостаточно прав для изменения статуса заявки");
    }

    const body = await req.json();
    const parsed = updateStatusSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    }

    if (CLOSING_STATUSES.includes(parsed.data.status)) {
      return forbiddenResponse(
        "Статусы «Готово»/«Отказ» устанавливаются только через закрытие заявки (с суммой/фото/причиной)"
      );
    }

    const existing = await prisma.request.findUnique({ where: { id } });
    if (!existing) return NextResponse.json({ error: "Не найдено" }, { status: 404 });
    if (existing.closedAt) {
      return forbiddenResponse("Заявка уже закрыта");
    }

    const updated = await prisma.request.update({
      where: { id },
      data: { status: parsed.data.status },
      include: { source: true, assignedMaster: true },
    });

    await logAudit({
      entity: "request",
      entityId: id,
      userId: session.user.id,
      action: "update_status",
      oldValue: { status: existing.status },
      newValue: { status: parsed.data.status },
    });

    return NextResponse.json(updated);
  } catch (e) {
    if (e instanceof ForbiddenError) return forbiddenResponse(e.message);
    console.error(e);
    return NextResponse.json({ error: "Внутренняя ошибка" }, { status: 500 });
  }
}

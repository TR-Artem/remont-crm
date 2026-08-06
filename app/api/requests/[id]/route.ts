import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  requireSession,
  forbiddenResponse,
  ForbiddenError,
  canEditBasicFields,
} from "@/lib/rbac";
import { updateRequestBasicSchema } from "@/lib/validation";
import { logAudit } from "@/lib/audit";
import { notifyMasterAboutRequest } from "@/lib/notify";

const CAN_VIEW_REQUESTS = ["callcenter", "admin", "director", "regional_director"];

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    const session = await requireSession();
    if (!CAN_VIEW_REQUESTS.includes(session.user.role)) {
      return forbiddenResponse("Роль «Мастер» не имеет доступа к заявкам");
    }
    const request = await prisma.request.findUnique({
      where: { id },
      include: { source: true, assignedMaster: true, documents: true, branch: true, closedBy: true, createdBy: true },
    });
    if (!request) return NextResponse.json({ error: "Не найдено" }, { status: 404 });

    if (session.user.role === "regional_director" && session.user.branchId && request.branchId !== session.user.branchId) {
      return forbiddenResponse("Заявка вне вашего филиала");
    }

    return NextResponse.json(request);
  } catch (e) {
    if (e instanceof ForbiddenError) return forbiddenResponse(e.message);
    console.error(e);
    return NextResponse.json({ error: "Внутренняя ошибка" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    const session = await requireSession();
    if (!CAN_VIEW_REQUESTS.includes(session.user.role)) {
      return forbiddenResponse("Роль «Мастер» не имеет доступа к заявкам");
    }

    const existing = await prisma.request.findUnique({ where: { id } });
    if (!existing) return NextResponse.json({ error: "Не найдено" }, { status: 404 });

    if (existing.closedAt) {
      return forbiddenResponse("Заявка закрыта — правка основных полей недоступна. Используйте окно правки закрытой заявки.");
    }

    const body = await req.json();
    const parsed = updateRequestBasicSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    }
    const data = parsed.data;

    // Поля имя/адрес/причина звонка/телефон — под 24-часовым ограничением для колл-центра
    const touchesBasicFields =
      data.clientName !== undefined || data.address !== undefined || data.reason !== undefined || data.phone !== undefined;

    if (touchesBasicFields && !canEditBasicFields(session.user.role, existing.createdAt)) {
      return forbiddenResponse(
        "Правка недоступна — прошло более 24 часов с момента создания заявки, либо роль не имеет права редактировать эти поля"
      );
    }

    // Назначение мастера, дата выезда, источник — не относятся к ограничению 24ч,
    // но требовать хотя бы какую-то роль колл-центра/руководства (уже проверено выше)
    const updated = await prisma.request.update({
      where: { id },
      data: {
        clientName: data.clientName,
        address: data.address,
        reason: data.reason,
        phone: data.phone,
        assignedMasterId: data.assignedMasterId,
        visitDatetime: data.visitDatetime ? new Date(data.visitDatetime) : data.visitDatetime === null ? null : undefined,
        sourceId: data.sourceId,
      },
      include: { source: true, assignedMaster: true },
    });

    await logAudit({
      entity: "request",
      entityId: id,
      userId: session.user.id,
      action: "update_basic_fields",
      oldValue: existing,
      newValue: data,
    });

    if (
      data.assignedMasterId &&
      data.assignedMasterId !== existing.assignedMasterId
    ) {
      await notifyMasterAboutRequest({
        masterId: data.assignedMasterId,
        senderId: session.user.id,
        requestId: id,
        address: updated.address,
        visitDatetime: updated.visitDatetime,
      });
    }

    return NextResponse.json(updated);
  } catch (e) {
    if (e instanceof ForbiddenError) return forbiddenResponse(e.message);
    console.error(e);
    return NextResponse.json({ error: "Внутренняя ошибка" }, { status: 500 });
  }
}

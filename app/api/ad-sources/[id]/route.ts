import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSession, forbiddenResponse, ForbiddenError, CAN_ADD_AD_SOURCE } from "@/lib/rbac";
import { adSourceSchema } from "@/lib/validation";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    const session = await requireSession();
    if (!CAN_ADD_AD_SOURCE.includes(session.user.role)) {
      return forbiddenResponse("Редактировать источники рекламы может только администратор");
    }
    const body = await req.json();
    const parsed = adSourceSchema.partial().safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    }
    const updated = await prisma.adSource.update({ where: { id }, data: parsed.data });
    return NextResponse.json(updated);
  } catch (e) {
    if (e instanceof ForbiddenError) return forbiddenResponse(e.message);
    console.error(e);
    return NextResponse.json({ error: "Внутренняя ошибка" }, { status: 500 });
  }
}

// Удаление источника, уже используемого в заявках, запрещено — вместо этого архивируем:
// он пропадает из списка выбора для новых заявок, но сохраняется в старых.
export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    const session = await requireSession();
    if (!CAN_ADD_AD_SOURCE.includes(session.user.role)) {
      return forbiddenResponse("Удалять источники рекламы может только администратор");
    }

    const usageCount = await prisma.request.count({ where: { sourceId: id } });
    if (usageCount > 0) {
      const archived = await prisma.adSource.update({ where: { id }, data: { archived: true } });
      return NextResponse.json({ archived: true, source: archived });
    }

    await prisma.adSource.delete({ where: { id } });
    return NextResponse.json({ deleted: true });
  } catch (e) {
    if (e instanceof ForbiddenError) return forbiddenResponse(e.message);
    console.error(e);
    return NextResponse.json({ error: "Внутренняя ошибка" }, { status: 500 });
  }
}

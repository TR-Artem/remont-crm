import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSession, forbiddenResponse, ForbiddenError, CAN_ADD_AD_SOURCE } from "@/lib/rbac";
import { adSourceSchema } from "@/lib/validation";

// Список источников нужен и колл-центру (для выпадающего списка в карточке клиента) —
// поэтому GET открыт всем авторизованным ролям, кроме мастера.
const CAN_VIEW = ["callcenter", "admin", "director", "regional_director"];

export async function GET() {
  try {
    const session = await requireSession();
    if (!CAN_VIEW.includes(session.user.role)) {
      return forbiddenResponse("Недостаточно прав");
    }
    const sources = await prisma.adSource.findMany({
      where: { archived: false },
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json(sources);
  } catch (e) {
    if (e instanceof ForbiddenError) return forbiddenResponse(e.message);
    console.error(e);
    return NextResponse.json({ error: "Внутренняя ошибка" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await requireSession();
    if (!CAN_ADD_AD_SOURCE.includes(session.user.role)) {
      return forbiddenResponse("Добавлять источники рекламы может только администратор");
    }
    const body = await req.json();
    const parsed = adSourceSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    }
    const created = await prisma.adSource.create({
      data: { ...parsed.data, createdById: session.user.id, branchId: parsed.data.branchId || session.user.branchId },
    });
    return NextResponse.json(created, { status: 201 });
  } catch (e) {
    if (e instanceof ForbiddenError) return forbiddenResponse(e.message);
    console.error(e);
    return NextResponse.json({ error: "Внутренняя ошибка" }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSession, forbiddenResponse, ForbiddenError, CAN_MANAGE_EMPLOYEES } from "@/lib/rbac";
import { updateUserSchema } from "@/lib/validation";
import bcrypt from "bcryptjs";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    const session = await requireSession();
    if (!CAN_MANAGE_EMPLOYEES.includes(session.user.role)) {
      return forbiddenResponse("Редактировать сотрудников может только директор или региональный директор");
    }

    const existing = await prisma.user.findUnique({ where: { id } });
    if (!existing) return NextResponse.json({ error: "Не найдено" }, { status: 404 });

    // Региональный директор может редактировать только сотрудников своего филиала
    if (session.user.role === "regional_director" && session.user.branchId && existing.branchId !== session.user.branchId) {
      return forbiddenResponse("Сотрудник вне вашего филиала");
    }

    const body = await req.json();
    const parsed = updateUserSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    }
    const data = parsed.data;

    const passwordHash = data.password ? await bcrypt.hash(data.password, 10) : undefined;

    const updated = await prisma.user.update({
      where: { id },
      data: {
        name: data.name,
        role: data.role,
        branchId: data.branchId,
        ...(passwordHash ? { passwordHash } : {}),
      },
      select: { id: true, name: true, login: true, role: true, branchId: true, createdAt: true, branch: true },
    });

    return NextResponse.json(updated);
  } catch (e) {
    if (e instanceof ForbiddenError) return forbiddenResponse(e.message);
    console.error(e);
    return NextResponse.json({ error: "Внутренняя ошибка" }, { status: 500 });
  }
}

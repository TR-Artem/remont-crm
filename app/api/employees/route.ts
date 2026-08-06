import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSession, forbiddenResponse, ForbiddenError, CAN_MANAGE_EMPLOYEES } from "@/lib/rbac";
import { createUserSchema } from "@/lib/validation";
import bcrypt from "bcryptjs";

export async function GET() {
  try {
    const session = await requireSession();
    if (!CAN_MANAGE_EMPLOYEES.includes(session.user.role)) {
      return forbiddenResponse("Раздел «Сотрудники» доступен только директору и региональному директору");
    }
    const where =
      session.user.role === "regional_director" && session.user.branchId
        ? { branchId: session.user.branchId }
        : {};
    const users = await prisma.user.findMany({
      where,
      select: { id: true, name: true, login: true, role: true, branchId: true, createdAt: true, branch: true },
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json(users);
  } catch (e) {
    if (e instanceof ForbiddenError) return forbiddenResponse(e.message);
    console.error(e);
    return NextResponse.json({ error: "Внутренняя ошибка" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await requireSession();
    if (!CAN_MANAGE_EMPLOYEES.includes(session.user.role)) {
      return forbiddenResponse("Создавать сотрудников может только директор или региональный директор");
    }
    const body = await req.json();
    const parsed = createUserSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    }
    const existing = await prisma.user.findUnique({ where: { login: parsed.data.login } });
    if (existing) {
      return NextResponse.json({ error: "Логин уже занят" }, { status: 400 });
    }
    const passwordHash = await bcrypt.hash(parsed.data.password, 10);
    const created = await prisma.user.create({
      data: {
        name: parsed.data.name,
        login: parsed.data.login,
        passwordHash,
        role: parsed.data.role,
        branchId: parsed.data.branchId || session.user.branchId || null,
      },
      select: { id: true, name: true, login: true, role: true, branchId: true, createdAt: true },
    });
    return NextResponse.json(created, { status: 201 });
  } catch (e) {
    if (e instanceof ForbiddenError) return forbiddenResponse(e.message);
    console.error(e);
    return NextResponse.json({ error: "Внутренняя ошибка" }, { status: 500 });
  }
}

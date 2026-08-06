import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSession, forbiddenResponse, ForbiddenError } from "@/lib/rbac";

export async function GET() {
  try {
    const session = await requireSession();

    const users = await prisma.user.findMany({
      where: { id: { not: session.user.id } },
      select: { id: true, name: true, role: true, branch: { select: { name: true } } },
      orderBy: { name: "asc" },
    });

    const groups = await prisma.chatGroup.findMany({
      where: { members: { some: { userId: session.user.id } } },
      include: { members: { include: { user: true } } },
    });

    return NextResponse.json({ users, groups });
  } catch (e) {
    if (e instanceof ForbiddenError) return forbiddenResponse(e.message);
    console.error(e);
    return NextResponse.json({ error: "Внутренняя ошибка" }, { status: 500 });
  }
}

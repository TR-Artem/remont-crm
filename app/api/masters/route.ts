import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSession, forbiddenResponse, ForbiddenError } from "@/lib/rbac";

const CAN_VIEW = ["callcenter", "admin", "director", "regional_director"];

export async function GET() {
  try {
    const session = await requireSession();
    if (!CAN_VIEW.includes(session.user.role)) {
      return forbiddenResponse("Недостаточно прав");
    }
    const where: Record<string, unknown> = { role: "master" };
    if (session.user.role === "regional_director" && session.user.branchId) {
      where.branchId = session.user.branchId;
    }
    const masters = await prisma.user.findMany({
      where,
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    });
    return NextResponse.json(masters);
  } catch (e) {
    if (e instanceof ForbiddenError) return forbiddenResponse(e.message);
    console.error(e);
    return NextResponse.json({ error: "Внутренняя ошибка" }, { status: 500 });
  }
}

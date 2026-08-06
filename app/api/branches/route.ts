import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSession, requireRole, forbiddenResponse, ForbiddenError } from "@/lib/rbac";
import { z } from "zod";

export async function GET() {
  try {
    await requireSession();
    const branches = await prisma.branch.findMany({ orderBy: { name: "asc" } });
    return NextResponse.json(branches);
  } catch (e) {
    if (e instanceof ForbiddenError) return forbiddenResponse(e.message);
    console.error(e);
    return NextResponse.json({ error: "Внутренняя ошибка" }, { status: 500 });
  }
}

const createBranchSchema = z.object({
  name: z.string().min(1, "Укажите название филиала"),
});

// Добавлять новые филиалы/регионы может только директор — региональный директор
// сам привязан к одному конкретному филиалу, а не заводит новые.
export async function POST(req: NextRequest) {
  try {
    await requireRole(["director"]);
    const body = await req.json();
    const parsed = createBranchSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    }
    const created = await prisma.branch.create({ data: { name: parsed.data.name } });
    return NextResponse.json(created, { status: 201 });
  } catch (e) {
    if (e instanceof ForbiddenError) return forbiddenResponse(e.message);
    console.error(e);
    return NextResponse.json({ error: "Внутренняя ошибка" }, { status: 500 });
  }
}

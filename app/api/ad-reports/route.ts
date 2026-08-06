import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSession, forbiddenResponse, ForbiddenError, CAN_MANAGE_ADS } from "@/lib/rbac";
import { adReportSchema } from "@/lib/validation";

export async function GET(req: NextRequest) {
  try {
    const session = await requireSession();
    if (!CAN_MANAGE_ADS.includes(session.user.role)) {
      return forbiddenResponse("Недостаточно прав для просмотра отчётов по рекламе");
    }

    const { searchParams } = new URL(req.url);
    const from = searchParams.get("from");
    const to = searchParams.get("to");
    const branchId = searchParams.get("branchId");

    const where: Record<string, unknown> = {};
    if (from || to) {
      where.date = {
        ...(from ? { gte: new Date(from) } : {}),
        ...(to ? { lte: new Date(to) } : {}),
      };
    }
    if (session.user.role === "regional_director" && session.user.branchId) {
      where.branchId = session.user.branchId;
    } else if (branchId) {
      where.branchId = branchId;
    }

    const reports = await prisma.adDailyReport.findMany({ where, orderBy: { date: "desc" } });
    return NextResponse.json(reports);
  } catch (e) {
    if (e instanceof ForbiddenError) return forbiddenResponse(e.message);
    console.error(e);
    return NextResponse.json({ error: "Внутренняя ошибка" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await requireSession();
    if (!CAN_MANAGE_ADS.includes(session.user.role)) {
      return forbiddenResponse("Заполнять отчёты по рекламе может только администратор или руководство");
    }
    const body = await req.json();
    const parsed = adReportSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    }
    const created = await prisma.adDailyReport.create({
      data: {
        date: new Date(parsed.data.date),
        promotersCount: parsed.data.promotersCount,
        flyersDistributed: parsed.data.flyersDistributed,
        stickersDistributed: parsed.data.stickersDistributed,
        postersDistributed: parsed.data.postersDistributed,
        branchId: parsed.data.branchId || session.user.branchId,
        createdById: session.user.id,
      },
    });
    return NextResponse.json(created, { status: 201 });
  } catch (e) {
    if (e instanceof ForbiddenError) return forbiddenResponse(e.message);
    console.error(e);
    return NextResponse.json({ error: "Внутренняя ошибка" }, { status: 500 });
  }
}

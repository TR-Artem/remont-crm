import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSession, forbiddenResponse, ForbiddenError, CAN_VIEW_AD_ANALYTICS } from "@/lib/rbac";

export async function GET(req: NextRequest) {
  try {
    const session = await requireSession();
    if (!CAN_VIEW_AD_ANALYTICS.includes(session.user.role)) {
      return forbiddenResponse("Недостаточно прав для просмотра аналитики рекламы");
    }

    const { searchParams } = new URL(req.url);
    const from = searchParams.get("from");
    const to = searchParams.get("to");
    const branchId = searchParams.get("branchId");

    const where: Record<string, unknown> = {};
    if (from || to) {
      where.createdAt = {
        ...(from ? { gte: new Date(from) } : {}),
        ...(to ? { lte: new Date(to) } : {}),
      };
    }
    if (session.user.role === "regional_director" && session.user.branchId) {
      where.branchId = session.user.branchId;
    } else if (branchId) {
      where.branchId = branchId;
    }

    const requests = await prisma.request.findMany({
      where,
      include: { source: true },
    });

    const bySource = new Map<string, { name: string; calls: number; done: number }>();
    for (const r of requests) {
      if (!r.source) continue;
      const entry = bySource.get(r.source.id) ?? { name: r.source.name, calls: 0, done: 0 };
      entry.calls += 1;
      if (r.status === "done") entry.done += 1;
      bySource.set(r.source.id, entry);
    }

    const totalCalls = requests.filter((r) => r.sourceId).length;
    const totalDone = requests.filter((r) => r.status === "done").length;

    const ranking = Array.from(bySource.entries())
      .map(([id, v]) => ({
        id,
        name: v.name,
        calls: v.calls,
        share: totalCalls > 0 ? Math.round((v.calls / totalCalls) * 1000) / 10 : 0,
        conversion: v.calls > 0 ? Math.round((v.done / v.calls) * 1000) / 10 : 0,
      }))
      .sort((a, b) => b.calls - a.calls);

    const best = ranking[0] ?? null;
    const worst = ranking.length > 0 ? ranking[ranking.length - 1] : null;

    return NextResponse.json({
      totalCalls,
      conversionRate: totalCalls > 0 ? Math.round((totalDone / totalCalls) * 1000) / 10 : 0,
      ranking,
      best,
      worst,
    });
  } catch (e) {
    if (e instanceof ForbiddenError) return forbiddenResponse(e.message);
    console.error(e);
    return NextResponse.json({ error: "Внутренняя ошибка" }, { status: 500 });
  }
}

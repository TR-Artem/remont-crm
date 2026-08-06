import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSession, forbiddenResponse, ForbiddenError, CAN_VIEW_REQUEST_ANALYTICS } from "@/lib/rbac";
import { STATUSES, STATUS_LABELS, type Status } from "@/lib/domain";

export async function GET(req: NextRequest) {
  try {
    const session = await requireSession();
    if (!CAN_VIEW_REQUEST_ANALYTICS.includes(session.user.role)) {
      return forbiddenResponse("Аналитика заявок доступна только директору и региональному директору");
    }

    const { searchParams } = new URL(req.url);
    const from = searchParams.get("from");
    const to = searchParams.get("to");
    const branchId = searchParams.get("branchId");
    const masterId = searchParams.get("masterId");

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
    if (masterId) where.assignedMasterId = masterId;

    const requests = await prisma.request.findMany({ where });

    const total = requests.length;
    const statusCounts = Object.fromEntries(STATUSES.map((s) => [s, 0])) as Record<Status, number>;
    for (const r of requests) {
      statusCounts[r.status as Status] = (statusCounts[r.status as Status] ?? 0) + 1;
    }

    const done = statusCounts.done;
    const refused = statusCounts.refused;

    const refusalCounts = new Map<string, number>();
    for (const r of requests) {
      if (r.status === "refused" && r.refusalReason) {
        refusalCounts.set(r.refusalReason, (refusalCounts.get(r.refusalReason) ?? 0) + 1);
      }
    }
    const topRefusalReasons = Array.from(refusalCounts.entries())
      .map(([reason, count]) => ({ reason, count }))
      .sort((a, b) => b.count - a.count);

    return NextResponse.json({
      total,
      done: { count: done, percent: total > 0 ? Math.round((done / total) * 1000) / 10 : 0 },
      refused: { count: refused, percent: total > 0 ? Math.round((refused / total) * 1000) / 10 : 0 },
      inProgress: {
        waiting: statusCounts.waiting,
        on_the_way: statusCounts.on_the_way,
        in_progress: statusCounts.in_progress,
        in_progress_complex: statusCounts.in_progress_complex,
      },
      statusDistribution: STATUSES.map((s) => ({ status: s, label: STATUS_LABELS[s], count: statusCounts[s] })),
      topRefusalReasons,
    });
  } catch (e) {
    if (e instanceof ForbiddenError) return forbiddenResponse(e.message);
    console.error(e);
    return NextResponse.json({ error: "Внутренняя ошибка" }, { status: 500 });
  }
}

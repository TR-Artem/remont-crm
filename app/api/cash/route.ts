import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSession, forbiddenResponse, ForbiddenError, CAN_VIEW_ACCOUNTING } from "@/lib/rbac";
import { cashTxSchema } from "@/lib/validation";

export async function GET(req: NextRequest) {
  try {
    const session = await requireSession();
    if (!CAN_VIEW_ACCOUNTING.includes(session.user.role)) {
      return forbiddenResponse("Бухгалтерия доступна только директору и региональному директору");
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

    const transactions = await prisma.cashTransaction.findMany({
      where,
      include: { request: true, master: true, createdBy: true },
      orderBy: { date: "desc" },
    });

    const income = transactions.filter((t) => t.type === "income").reduce((s, t) => s + t.amount, 0);
    const expense = transactions.filter((t) => t.type === "expense").reduce((s, t) => s + t.amount, 0);
    const salary = transactions.filter((t) => t.type === "salary").reduce((s, t) => s + t.amount, 0);

    return NextResponse.json({
      transactions,
      totals: { income, expense, salary, balance: income - expense - salary },
    });
  } catch (e) {
    if (e instanceof ForbiddenError) return forbiddenResponse(e.message);
    console.error(e);
    return NextResponse.json({ error: "Внутренняя ошибка" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await requireSession();
    if (!CAN_VIEW_ACCOUNTING.includes(session.user.role)) {
      return forbiddenResponse("Вносить операции может только директор или региональный директор");
    }
    const body = await req.json();
    const parsed = cashTxSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    }
    if (parsed.data.type === "income") {
      return forbiddenResponse("Приход рассчитывается автоматически при закрытии заявок и не вводится вручную");
    }
    const created = await prisma.cashTransaction.create({
      data: {
        type: parsed.data.type,
        amount: parsed.data.amount,
        comment: parsed.data.comment,
        masterId: parsed.data.masterId || null,
        date: parsed.data.date ? new Date(parsed.data.date) : new Date(),
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

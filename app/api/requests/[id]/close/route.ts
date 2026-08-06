import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  requireSession,
  forbiddenResponse,
  ForbiddenError,
  CAN_CLOSE_REQUEST,
  CAN_EDIT_CLOSED_REQUEST,
  isCloseEditWindowOpen,
} from "@/lib/rbac";
import { closeRequestSchema, editClosedRequestSchema } from "@/lib/validation";
import { splitCloseAmount, DEFAULT_MASTER_PERCENT } from "@/lib/money";
import { logAudit } from "@/lib/audit";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    const session = await requireSession();
    if (!CAN_CLOSE_REQUEST.includes(session.user.role)) {
      return forbiddenResponse("Закрывать заявки может только администратор или руководство");
    }

    const existing = await prisma.request.findUnique({ where: { id } });
    if (!existing) return NextResponse.json({ error: "Не найдено" }, { status: 404 });
    if (existing.closedAt) {
      return forbiddenResponse("Заявка уже закрыта");
    }

    const body = await req.json();
    const parsed = closeRequestSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    }
    const data = parsed.data;

    let amountRecorded: number | null = null;
    let masterEarning: number | null = null;
    const masterPercent = data.masterPercent ?? DEFAULT_MASTER_PERCENT;

    if (data.closeStatus === "done" && data.amountFull !== undefined) {
      const split = splitCloseAmount(data.amountFull, masterPercent);
      amountRecorded = split.amountRecorded;
      masterEarning = split.masterEarning;
    }

    const closedAt = new Date();

    const updated = await prisma.$transaction(async (tx) => {
      const req = await tx.request.update({
        where: { id },
        data: {
          status: data.closeStatus,
          closeStatus: data.closeStatus,
          closedAt,
          closedById: session.user.id,
          amountFull: data.amountFull ?? null,
          amountRecorded,
          masterPercent: data.closeStatus === "done" ? masterPercent : null,
          refusalReason: data.closeStatus === "refused" ? data.refusalReason : null,
          documents: data.documentUrls
            ? { create: data.documentUrls.map((url) => ({ fileUrl: url })) }
            : undefined,
        },
        include: { documents: true, assignedMaster: true, source: true },
      });

      if (data.closeStatus === "done" && amountRecorded !== null) {
        await tx.cashTransaction.create({
          data: {
            type: "income",
            amount: amountRecorded,
            requestId: id,
            branchId: req.branchId,
            createdById: session.user.id,
          },
        });
        if (masterEarning && masterEarning > 0 && req.assignedMasterId) {
          await tx.cashTransaction.create({
            data: {
              type: "salary",
              amount: masterEarning,
              requestId: id,
              masterId: req.assignedMasterId,
              branchId: req.branchId,
              createdById: session.user.id,
            },
          });
        }
      }

      return req;
    });

    await logAudit({
      entity: "request",
      entityId: id,
      userId: session.user.id,
      action: "close",
      newValue: data,
    });

    return NextResponse.json(updated);
  } catch (e) {
    if (e instanceof ForbiddenError) return forbiddenResponse(e.message);
    console.error(e);
    return NextResponse.json({ error: "Внутренняя ошибка" }, { status: 500 });
  }
}

// Правка уже закрытой заявки — только директор/рег.директор, в течение 1 часа после closedAt
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    const session = await requireSession();
    if (!CAN_EDIT_CLOSED_REQUEST.includes(session.user.role)) {
      return forbiddenResponse("Правку закрытой заявки может выполнять только директор или региональный директор");
    }

    const existing = await prisma.request.findUnique({ where: { id }, include: { documents: true } });
    if (!existing || !existing.closedAt) {
      return NextResponse.json({ error: "Заявка не закрыта или не найдена" }, { status: 404 });
    }

    if (!isCloseEditWindowOpen(existing.closedAt)) {
      return forbiddenResponse("Окно на правку истекло (более 1 часа с момента закрытия)");
    }

    const body = await req.json();
    const parsed = editClosedRequestSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    }
    const data = parsed.data;

    let amountRecorded = existing.amountRecorded;
    let masterEarning: number | null = null;
    const masterPercent = data.masterPercent ?? existing.masterPercent ?? DEFAULT_MASTER_PERCENT;
    const amountFull = data.amountFull ?? existing.amountFull ?? undefined;

    if ((data.closeStatus ?? existing.closeStatus) === "done" && amountFull !== undefined) {
      const split = splitCloseAmount(amountFull, masterPercent);
      amountRecorded = split.amountRecorded;
      masterEarning = split.masterEarning;
    }

    const updated = await prisma.$transaction(async (tx) => {
      const req = await tx.request.update({
        where: { id },
        data: {
          status: data.closeStatus ?? existing.status,
          closeStatus: data.closeStatus ?? existing.closeStatus,
          amountFull: amountFull ?? null,
          amountRecorded,
          masterPercent,
          documents: data.documentUrls
            ? { create: data.documentUrls.map((url) => ({ fileUrl: url })) }
            : undefined,
        },
        include: { documents: true, assignedMaster: true, source: true },
      });

      // Пересчитываем связанные кассовые операции (простая стратегия: удалить старые и создать новые)
      if ((data.amountFull !== undefined || data.masterPercent !== undefined) && req.closeStatus === "done") {
        await tx.cashTransaction.deleteMany({ where: { requestId: id } });
        if (amountRecorded) {
          await tx.cashTransaction.create({
            data: { type: "income", amount: amountRecorded, requestId: id, branchId: req.branchId, createdById: session.user.id },
          });
        }
        if (masterEarning && masterEarning > 0 && req.assignedMasterId) {
          await tx.cashTransaction.create({
            data: {
              type: "salary",
              amount: masterEarning,
              requestId: id,
              masterId: req.assignedMasterId,
              branchId: req.branchId,
              createdById: session.user.id,
            },
          });
        }
      }

      return req;
    });

    await logAudit({
      entity: "request",
      entityId: id,
      userId: session.user.id,
      action: "edit_closed_request",
      oldValue: existing,
      newValue: data,
    });

    return NextResponse.json(updated);
  } catch (e) {
    if (e instanceof ForbiddenError) return forbiddenResponse(e.message);
    console.error(e);
    return NextResponse.json({ error: "Внутренняя ошибка" }, { status: 500 });
  }
}

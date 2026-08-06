import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSession, forbiddenResponse, CAN_CREATE_REQUEST, ForbiddenError } from "@/lib/rbac";
import { createRequestSchema } from "@/lib/validation";
import { notifyMasterAboutRequest } from "@/lib/notify";

// Мастер вообще не должен видеть заявки — блокируется и в middleware, и здесь (defense in depth)
const CAN_VIEW_REQUESTS = ["callcenter", "admin", "director", "regional_director"];

export async function GET(req: NextRequest) {
  try {
    const session = await requireSession();
    if (!CAN_VIEW_REQUESTS.includes(session.user.role)) {
      return forbiddenResponse("Роль «Мастер» не имеет доступа к заявкам");
    }

    const { searchParams } = new URL(req.url);
    const branchId = searchParams.get("branchId");

    const branchFilter =
      session.user.role === "regional_director" && session.user.branchId
        ? { branchId: session.user.branchId }
        : branchId
          ? { branchId }
          : {};

    const requests = await prisma.request.findMany({
      where: branchFilter,
      include: {
        source: true,
        assignedMaster: true,
        documents: true,
        branch: true,
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(requests);
  } catch (e) {
    if (e instanceof ForbiddenError) return forbiddenResponse(e.message);
    console.error(e);
    return NextResponse.json({ error: "Внутренняя ошибка" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await requireSession();
    if (!CAN_CREATE_REQUEST.includes(session.user.role)) {
      return forbiddenResponse("Создавать заявки может только колл-центр или руководство");
    }

    const body = await req.json();
    const parsed = createRequestSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    }
    const data = parsed.data;

    const created = await prisma.request.create({
      data: {
        clientName: data.clientName,
        phone: data.phone,
        address: data.address,
        reason: data.reason,
        sourceId: data.sourceId,
        assignedMasterId: data.assignedMasterId || null,
        visitDatetime: data.visitDatetime ? new Date(data.visitDatetime) : null,
        branchId: data.branchId || session.user.branchId || null,
        createdById: session.user.id,
        status: "waiting",
      },
      include: { source: true, assignedMaster: true },
    });

    if (created.assignedMasterId) {
      await notifyMasterAboutRequest({
        masterId: created.assignedMasterId,
        senderId: session.user.id,
        requestId: created.id,
        address: created.address,
        visitDatetime: created.visitDatetime,
      });
    }

    return NextResponse.json(created, { status: 201 });
  } catch (e) {
    if (e instanceof ForbiddenError) return forbiddenResponse(e.message);
    console.error(e);
    return NextResponse.json({ error: "Внутренняя ошибка" }, { status: 500 });
  }
}

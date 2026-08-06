import { prisma } from "@/lib/prisma";

export async function logAudit(params: {
  entity: string;
  entityId: string;
  userId: string;
  action: string;
  oldValue?: unknown;
  newValue?: unknown;
}) {
  await prisma.auditLog.create({
    data: {
      entity: params.entity,
      entityId: params.entityId,
      userId: params.userId,
      action: params.action,
      oldValue: params.oldValue !== undefined ? JSON.stringify(params.oldValue) : null,
      newValue: params.newValue !== undefined ? JSON.stringify(params.newValue) : null,
    },
  });
}

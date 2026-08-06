import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSession, forbiddenResponse, ForbiddenError } from "@/lib/rbac";
import { z } from "zod";

const createGroupSchema = z.object({
  name: z.string().min(1),
  memberIds: z.array(z.string()).min(1),
});

export async function POST(req: NextRequest) {
  try {
    const session = await requireSession();
    const body = await req.json();
    const parsed = createGroupSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    }
    const memberIds = Array.from(new Set([...parsed.data.memberIds, session.user.id]));

    const group = await prisma.chatGroup.create({
      data: {
        name: parsed.data.name,
        members: { create: memberIds.map((userId) => ({ userId })) },
      },
      include: { members: { include: { user: true } } },
    });

    return NextResponse.json(group, { status: 201 });
  } catch (e) {
    if (e instanceof ForbiddenError) return forbiddenResponse(e.message);
    console.error(e);
    return NextResponse.json({ error: "Внутренняя ошибка" }, { status: 500 });
  }
}

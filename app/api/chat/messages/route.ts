import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSession, forbiddenResponse, ForbiddenError } from "@/lib/rbac";
import { chatMessageSchema } from "@/lib/validation";

export async function GET(req: NextRequest) {
  try {
    const session = await requireSession();
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get("userId");
    const groupId = searchParams.get("groupId");

    if (groupId) {
      const membership = await prisma.groupMember.findUnique({
        where: { groupId_userId: { groupId, userId: session.user.id } },
      });
      if (!membership) return forbiddenResponse("Вы не состоите в этой группе");

      const messages = await prisma.chatMessage.findMany({
        where: { groupId },
        include: { sender: true },
        orderBy: { createdAt: "asc" },
      });
      return NextResponse.json(messages);
    }

    if (userId) {
      const messages = await prisma.chatMessage.findMany({
        where: {
          OR: [
            { senderId: session.user.id, receiverId: userId },
            { senderId: userId, receiverId: session.user.id },
          ],
        },
        include: { sender: true },
        orderBy: { createdAt: "asc" },
      });
      return NextResponse.json(messages);
    }

    return NextResponse.json({ error: "Укажите userId или groupId" }, { status: 400 });
  } catch (e) {
    if (e instanceof ForbiddenError) return forbiddenResponse(e.message);
    console.error(e);
    return NextResponse.json({ error: "Внутренняя ошибка" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await requireSession();
    const body = await req.json();
    const parsed = chatMessageSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    }
    const data = parsed.data;
    if (!data.receiverId && !data.groupId) {
      return NextResponse.json({ error: "Укажите получателя или группу" }, { status: 400 });
    }
    if (!data.text && !data.attachmentUrl) {
      return NextResponse.json({ error: "Пустое сообщение" }, { status: 400 });
    }

    if (data.groupId) {
      const membership = await prisma.groupMember.findUnique({
        where: { groupId_userId: { groupId: data.groupId, userId: session.user.id } },
      });
      if (!membership) return forbiddenResponse("Вы не состоите в этой группе");
    }

    const created = await prisma.chatMessage.create({
      data: {
        senderId: session.user.id,
        receiverId: data.receiverId,
        groupId: data.groupId,
        text: data.text,
        attachmentUrl: data.attachmentUrl,
      },
      include: { sender: true },
    });

    return NextResponse.json(created, { status: 201 });
  } catch (e) {
    if (e instanceof ForbiddenError) return forbiddenResponse(e.message);
    console.error(e);
    return NextResponse.json({ error: "Внутренняя ошибка" }, { status: 500 });
  }
}

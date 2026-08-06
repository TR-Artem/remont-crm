import { prisma } from "@/lib/prisma";

/**
 * Уведомление мастера о новой/изменённой заявке (п.6, вопрос-ответ: "нужна push/email нотификация").
 *
 * В этой реализации гарантированно работает in-app-уведомление: системное сообщение в чат мастера,
 * которое видно сразу при открытии приложения (список бесед в чате).
 *
 * Email/push — подключаются к внешнему провайдеру (например, Resend для email и Web Push/VAPID
 * или FCM для push-уведомлений) и требуют реальных API-ключей, поэтому здесь оставлены как
 * явные точки расширения: sendEmail()/sendPush() ниже — заглушки с логированием.
 */
export async function notifyMasterAboutRequest(params: {
  masterId: string;
  senderId: string; // системный инициатор (колл-центр/админ), либо null для системного пользователя
  requestId: string;
  address: string;
  visitDatetime?: Date | null;
}) {
  const text = params.visitDatetime
    ? `Новая заявка передана. ${params.address} — к ${params.visitDatetime.toLocaleString("ru-RU")}`
    : `Новая заявка передана. ${params.address}`;

  await prisma.chatMessage.create({
    data: {
      senderId: params.senderId,
      receiverId: params.masterId,
      text,
    },
  });

  const master = await prisma.user.findUnique({ where: { id: params.masterId } });
  if (master) {
    await sendEmail(master.id, "Новая заявка", text);
    await sendPush(master.id, "Новая заявка", text);
  }
}

async function sendEmail(userId: string, subject: string, body: string) {
  // TODO(production): интегрировать email-провайдера (например, Resend/SendGrid) и адрес сотрудника.
  console.log(`[email-stub] to user ${userId}: ${subject} — ${body}`);
}

async function sendPush(userId: string, title: string, body: string) {
  // TODO(production): интегрировать Web Push (VAPID) или FCM с подпиской устройства сотрудника.
  console.log(`[push-stub] to user ${userId}: ${title} — ${body}`);
}

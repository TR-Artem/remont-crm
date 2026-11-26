import { PrismaClient } from "@prisma/client";

// Глобально скрываем passwordHash: сотрудники отдаются в /api/cash, /api/requests,
// /api/employees и т.д. вместе с include/select, и без этого любой, кто открывает кассу,
// получал бы bcrypt-хеши всех учёток, включая директора. Пароль нужен только в одном
// месте — при входе (lib/auth.ts), там omit переопределяется точечно.
function createPrismaClient() {
  return new PrismaClient({
    omit: { user: { passwordHash: true } },
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  });
}

const globalForPrisma = globalThis as unknown as {
  prisma?: ReturnType<typeof createPrismaClient>;
};

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;

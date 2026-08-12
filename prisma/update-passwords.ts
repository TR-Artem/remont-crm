// Разово обновляет пароли уже существующих сотрудников в базе (не создаёт новых —
// в отличие от seed.ts, который только создаёт записи "с нуля").
// Запуск: npm run db:update-passwords
// Пароли редактируются в prisma/demo-passwords.ts.
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { DEMO_PASSWORDS } from "./demo-passwords";

const prisma = new PrismaClient();

async function main() {
  for (const [login, password] of Object.entries(DEMO_PASSWORDS)) {
    const user = await prisma.user.findUnique({ where: { login } });
    if (!user) {
      console.log(`⏭  Пропущено: пользователь с логином "${login}" не найден в базе`);
      continue;
    }
    const passwordHash = await bcrypt.hash(password, 10);
    await prisma.user.update({ where: { login }, data: { passwordHash } });
    console.log(`✔  Пароль обновлён: ${login}`);
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

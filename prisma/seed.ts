import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { DEMO_PASSWORDS } from "./demo-passwords";

const prisma = new PrismaClient();

async function main() {
  const branch = await prisma.branch.create({ data: { name: "Москва (центр)" } });
  const branch2 = await prisma.branch.create({ data: { name: "Санкт-Петербург" } });

  const director = await prisma.user.create({
    data: {
      name: "Кирилл Директор",
      login: "director",
      passwordHash: await bcrypt.hash(DEMO_PASSWORDS.director, 10),
      role: "director",
    },
  });
  const regional = await prisma.user.create({
    data: {
      name: "Руслан Региональнал",
      login: "regional",
      passwordHash: await bcrypt.hash(DEMO_PASSWORDS.regional, 10),
      role: "regional_director",
      branchId: branch.id,
    },
  });
  const admin = await prisma.user.create({
    data: {
      name: "Света Админ",
      login: "admin",
      passwordHash: await bcrypt.hash(DEMO_PASSWORDS.admin, 10),
      role: "admin",
      branchId: branch.id,
    },
  });
  const callcenter = await prisma.user.create({
    data: {
      name: "Мария Колцентр",
      login: "callcenter",
      passwordHash: await bcrypt.hash(DEMO_PASSWORDS.callcenter, 10),
      role: "callcenter",
      branchId: branch.id,
    },
  });
  const master1 = await prisma.user.create({
    data: {
      name: "Олег Мастер",
      login: "master1",
      passwordHash: await bcrypt.hash(DEMO_PASSWORDS.master1, 10),
      role: "master",
      branchId: branch.id,
    },
  });
  const master2 = await prisma.user.create({
    data: {
      name: "Сергей Ключников",
      login: "master2",
      passwordHash: await bcrypt.hash(DEMO_PASSWORDS.master2, 10),
      role: "master",
      branchId: branch.id,
    },
  });

  const source1 = await prisma.adSource.create({
    data: { name: "Авито — основной аккаунт", type: "avito", createdById: admin.id, branchId: branch.id },
  });
  const source2 = await prisma.adSource.create({
    data: { name: "Листовки, Александр", type: "flyers", createdById: admin.id, branchId: branch.id },
  });
  const source3 = await prisma.adSource.create({
    data: { name: "Наклейки в подъездах", type: "stickers", createdById: admin.id, branchId: branch.id },
  });

  await prisma.request.create({
    data: {
      clientName: "Анна Соколова",
      phone: "+7 900 111-22-33",
      address: "ул. Ленина, 14",
      reason: "Не работает розетка на кухне",
      status: "waiting",
      sourceId: source1.id,
      branchId: branch.id,
      createdById: callcenter.id,
    },
  });

  await prisma.request.create({
    data: {
      clientName: "Дмитрий Орлов",
      phone: "+7 900 222-33-44",
      address: "пр. Мира, 5, кв. 12",
      reason: "Течёт кран в ванной",
      status: "in_progress",
      sourceId: source2.id,
      assignedMasterId: master1.id,
      branchId: branch.id,
      createdById: callcenter.id,
    },
  });

  const doneReq = await prisma.request.create({
    data: {
      clientName: "Екатерина Волкова",
      phone: "+7 900 333-44-55",
      address: "ул. Садовая, 9",
      reason: "Установка кондиционера",
      status: "done",
      sourceId: source3.id,
      assignedMasterId: master2.id,
      branchId: branch.id,
      createdById: callcenter.id,
      closedAt: new Date(),
      closedById: admin.id,
      closeStatus: "done",
      amountFull: 8000,
      amountRecorded: 4000,
      masterPercent: 50,
    },
  });

  await prisma.cashTransaction.create({
    data: {
      type: "income",
      amount: 4000,
      requestId: doneReq.id,
      branchId: branch.id,
      createdById: admin.id,
    },
  });

  await prisma.adDailyReport.create({
    data: {
      date: new Date(),
      promotersCount: 4,
      flyersDistributed: 320,
      stickersDistributed: 150,
      postersDistributed: 40,
      branchId: branch.id,
      createdById: admin.id,
    },
  });

  console.log("Seed complete. Demo logins — пароли см. prisma/demo-passwords.ts:");
  console.log("director / regional / admin / callcenter / master1 / master2");
  console.log({ branch2: branch2.id });
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

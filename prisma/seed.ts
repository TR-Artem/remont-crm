import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { DEMO_PASSWORDS } from "./demo-passwords";

const prisma = new PrismaClient();

/** Дата N дней назад (и, при необходимости, в конкретный час). */
function daysAgo(days: number, hour = 10, minute = 0): Date {
  const d = new Date();
  d.setDate(d.getDate() - days);
  d.setHours(hour, minute, 0, 0);
  return d;
}

function daysAhead(days: number, hour = 10, minute = 0): Date {
  return daysAgo(-days, hour, minute);
}

/** Полная очистка демо-данных перед повторным сидом (SEED_RESET=1). */
async function resetDemoData() {
  await prisma.chatMessage.deleteMany();
  await prisma.groupMember.deleteMany();
  await prisma.chatGroup.deleteMany();
  await prisma.auditLog.deleteMany();
  await prisma.cashTransaction.deleteMany();
  await prisma.requestDocument.deleteMany();
  await prisma.request.deleteMany();
  await prisma.adDailyReport.deleteMany();
  await prisma.adSource.deleteMany();
  await prisma.user.deleteMany();
  await prisma.branch.deleteMany();
}

async function main() {
  // Сид одноразовый: повторный запуск на той же базе создал бы дубли сотрудников,
  // заявок и кассы. Поэтому без SEED_RESET=1 на заполненной базе просто выходим.
  const existingUsers = await prisma.user.count();
  if (existingUsers > 0 && process.env.SEED_RESET !== "1") {
    console.log("База уже заполнена — демо-данные не дублирую.");
    console.log("Пересоздать демо-данные с нуля: SEED_RESET=1 npm run db:seed");
    return;
  }
  if (existingUsers > 0) {
    console.log("SEED_RESET=1 — удаляю текущие данные и заполняю заново.");
    await resetDemoData();
  }

  // ── Филиалы ────────────────────────────────────────────────────────────────
  const branch = await prisma.branch.create({ data: { name: "Москва (центр)" } });
  const branch2 = await prisma.branch.create({ data: { name: "Санкт-Петербург" } });

  // ── Сотрудники ─────────────────────────────────────────────────────────────
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
      name: "Руслан Региональный",
      login: "regional",
      passwordHash: await bcrypt.hash(DEMO_PASSWORDS.regional, 10),
      role: "regional_director",
      branchId: branch2.id,
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
  const callcenter2 = await prisma.user.create({
    data: {
      name: "Ольга Колцентр",
      login: "callcenter2",
      passwordHash: await bcrypt.hash(DEMO_PASSWORDS.callcenter2, 10),
      role: "callcenter",
      branchId: branch2.id,
    },
  });
  const master1 = await prisma.user.create({
    data: {
      name: "Александр Мастер",
      login: "master1",
      passwordHash: await bcrypt.hash(DEMO_PASSWORDS.master1, 10),
      role: "master",
      branchId: branch.id,
    },
  });
  const master2 = await prisma.user.create({
    data: {
      name: "Сергей Мастер",
      login: "master2",
      passwordHash: await bcrypt.hash(DEMO_PASSWORDS.master2, 10),
      role: "master",
      branchId: branch.id,
    },
  });
  const master3 = await prisma.user.create({
    data: {
      name: "Игорь Мастер",
      login: "master3",
      passwordHash: await bcrypt.hash(DEMO_PASSWORDS.master3, 10),
      role: "master",
      branchId: branch2.id,
    },
  });

  // ── Источники рекламы ──────────────────────────────────────────────────────
  const source1 = await prisma.adSource.create({
    data: { name: "Авито — основной аккаунт", type: "avito", createdById: admin.id, branchId: branch.id },
  });
  const source2 = await prisma.adSource.create({
    data: { name: "Листовки, Александр", type: "flyers", createdById: admin.id, branchId: branch.id },
  });
  const source3 = await prisma.adSource.create({
    data: { name: "Наклейки в подъездах", type: "stickers", createdById: admin.id, branchId: branch.id },
  });
  const source4 = await prisma.adSource.create({
    data: { name: "Расклейка, входные группы", type: "posters", createdById: admin.id, branchId: branch.id },
  });
  const source5 = await prisma.adSource.create({
    data: { name: "Авито — Санкт-Петербург", type: "avito", createdById: admin.id, branchId: branch2.id },
  });

  // ── Заявки ─────────────────────────────────────────────────────────────────
  const requestSeed: Array<{
    clientName: string;
    phone: string;
    address: string;
    reason: string;
    status: string;
    sourceId: string;
    assignedMasterId?: string;
    branchId: string;
    createdById: string;
    createdDaysAgo: number;
    visitAt?: Date;
    closed?: { daysAgo: number; byId: string; closeStatus: "done" | "refused"; amountFull?: number; amountRecorded?: number; masterPercent?: number; refusalReason?: string };
  }> = [
    // Москва — в ожидании (свежие, ещё в окне правки)
    {
      clientName: "Анна Соколова",
      phone: "+7 900 111-22-33",
      address: "ул. Ленина, 14, кв. 8",
      reason: "Не работает розетка на кухне",
      status: "waiting",
      sourceId: source1.id,
      branchId: branch.id,
      createdById: callcenter.id,
      createdDaysAgo: 0,
    },
    {
      clientName: "Павел Григорьев",
      phone: "+7 900 445-67-89",
      address: "ул. Профсоюзная, 42, кв. 117",
      reason: "Течёт батарея в спальне, нужен срочный выезд",
      status: "waiting",
      sourceId: source2.id,
      branchId: branch.id,
      createdById: callcenter.id,
      createdDaysAgo: 0,
    },
    {
      clientName: "Ирина Мельникова",
      phone: "+7 900 778-12-34",
      address: "Садовая ул., 3, кв. 21",
      reason: "Повесить полку и смеситель, мелкие работы",
      status: "waiting",
      sourceId: source3.id,
      branchId: branch.id,
      createdById: admin.id,
      createdDaysAgo: 1,
    },
    {
      clientName: "Максим Ковалёв",
      phone: "+7 921 334-55-66",
      address: "Невский пр., 88, кв. 5",
      reason: "Замена смесителя на кухне",
      status: "waiting",
      sourceId: source5.id,
      branchId: branch2.id,
      createdById: callcenter2.id,
      createdDaysAgo: 0,
    },
    // Москва — в пути
    {
      clientName: "Дмитрий Орлов",
      phone: "+7 900 222-33-44",
      address: "пр. Мира, 5, кв. 12",
      reason: "Течёт кран в ванной",
      status: "on_the_way",
      sourceId: source2.id,
      assignedMasterId: master1.id,
      branchId: branch.id,
      createdById: callcenter.id,
      createdDaysAgo: 1,
      visitAt: daysAhead(0, 14, 30),
    },
    {
      clientName: "Ольга Никитина",
      phone: "+7 900 909-10-11",
      address: "ул. Гагарина, 27, кв. 44",
      reason: "Не закрывается дверца шкафа, сорваны петли",
      status: "on_the_way",
      sourceId: source4.id,
      assignedMasterId: master2.id,
      branchId: branch.id,
      createdById: callcenter.id,
      createdDaysAgo: 1,
      visitAt: daysAhead(0, 16, 0),
    },
    // Москва — в работе
    {
      clientName: "Виктор Семёнов",
      phone: "+7 900 555-66-77",
      address: "ул. Чехова, 12, кв. 3",
      reason: "Сборка кухонного гарнитура после доставки",
      status: "in_progress",
      sourceId: source1.id,
      assignedMasterId: master1.id,
      branchId: branch.id,
      createdById: callcenter.id,
      createdDaysAgo: 2,
      visitAt: daysAhead(0, 10, 0),
    },
    {
      clientName: "Наталья Белова",
      phone: "+7 900 123-98-76",
      address: "Ленинский пр., 60, кв. 205",
      reason: "Заменить унитаз, установить новую сантехнику",
      status: "in_progress",
      sourceId: source3.id,
      assignedMasterId: master2.id,
      branchId: branch.id,
      createdById: admin.id,
      createdDaysAgo: 2,
      visitAt: daysAhead(0, 12, 0),
    },
    {
      clientName: "Роман Асташов",
      phone: "+7 921 777-88-99",
      address: "Лиговский пр., 150, кв. 12",
      reason: "Установка душевой кабины",
      status: "in_progress",
      sourceId: source5.id,
      assignedMasterId: master3.id,
      branchId: branch2.id,
      createdById: callcenter2.id,
      createdDaysAgo: 1,
      visitAt: daysAhead(0, 15, 0),
    },
    // Москва — в работе СД (сложные)
    {
      clientName: "Елена Гордеева",
      phone: "+7 900 321-45-67",
      address: "Кутузовский пр., 31, кв. 78",
      reason: "Разводка труб в новостройке, два санузла",
      status: "in_progress_complex",
      sourceId: source1.id,
      assignedMasterId: master1.id,
      branchId: branch.id,
      createdById: callcenter.id,
      createdDaysAgo: 3,
      visitAt: daysAhead(1, 9, 30),
    },
    {
      clientName: "Артём Фомин",
      phone: "+7 921 202-30-40",
      address: "Московский пр., 205, кв. 61",
      reason: "Монтаж тёплого пола в ванной",
      status: "in_progress_complex",
      sourceId: source5.id,
      assignedMasterId: master3.id,
      branchId: branch2.id,
      createdById: callcenter2.id,
      createdDaysAgo: 4,
      visitAt: daysAhead(1, 11, 0),
    },
    // Москва — готово (закрытые с суммами)
    {
      clientName: "Екатерина Волкова",
      phone: "+7 900 333-44-55",
      address: "ул. Садовая, 9, кв. 33",
      reason: "Установка кондиционера",
      status: "done",
      sourceId: source3.id,
      assignedMasterId: master2.id,
      branchId: branch.id,
      createdById: callcenter.id,
      createdDaysAgo: 5,
      closed: { daysAgo: 4, byId: admin.id, closeStatus: "done", amountFull: 8000, amountRecorded: 4000, masterPercent: 50 },
    },
    {
      clientName: "Григорий Лапин",
      phone: "+7 900 654-32-10",
      address: "ул. Новая, 4, кв. 16",
      reason: "Замена проводки в двух комнатах",
      status: "done",
      sourceId: source1.id,
      assignedMasterId: master1.id,
      branchId: branch.id,
      createdById: callcenter.id,
      createdDaysAgo: 6,
      closed: { daysAgo: 5, byId: admin.id, closeStatus: "done", amountFull: 12500, amountRecorded: 7500, masterPercent: 40 },
    },
    {
      clientName: "Татьяна Кузьмина",
      phone: "+7 900 876-54-32",
      address: "Варшавское ш., 12, кв. 90",
      reason: "Ремонт смесителя и замена гибкой подводки",
      status: "done",
      sourceId: source2.id,
      assignedMasterId: master2.id,
      branchId: branch.id,
      createdById: admin.id,
      createdDaysAgo: 7,
      closed: { daysAgo: 7, byId: admin.id, closeStatus: "done", amountFull: 3200, amountRecorded: 3200, masterPercent: 0 },
    },
    {
      clientName: "Денис Шевчук",
      phone: "+7 921 111-22-33",
      address: "наб. Фонтанки, 40, кв. 7",
      reason: "Сборка шкафа-купе",
      status: "done",
      sourceId: source5.id,
      assignedMasterId: master3.id,
      branchId: branch2.id,
      createdById: callcenter2.id,
      createdDaysAgo: 4,
      closed: { daysAgo: 3, byId: regional.id, closeStatus: "done", amountFull: 6500, amountRecorded: 3900, masterPercent: 40 },
    },
    {
      clientName: "Юлия Панова",
      phone: "+7 921 555-66-77",
      address: "пр. Просвещения, 71, кв. 155",
      reason: "Подключение стиральной машины",
      status: "done",
      sourceId: source5.id,
      assignedMasterId: master3.id,
      branchId: branch2.id,
      createdById: callcenter2.id,
      createdDaysAgo: 2,
      closed: { daysAgo: 2, byId: regional.id, closeStatus: "done", amountFull: 2500, amountRecorded: 2500, masterPercent: 0 },
    },
    // Москва — отказы
    {
      clientName: "Алексей Бирюков",
      phone: "+7 900 987-65-43",
      address: "ул. Пушкина, 2, кв. 1",
      reason: "Требовался ремонт плитки, смета выше бюджета клиента",
      status: "refused",
      sourceId: source1.id,
      assignedMasterId: master1.id,
      branchId: branch.id,
      createdById: callcenter.id,
      createdDaysAgo: 3,
      closed: { daysAgo: 2, byId: admin.id, closeStatus: "refused", refusalReason: "Клиент отказался от сметы" },
    },
    {
      clientName: "Светлана Дроздова",
      phone: "+7 900 135-79-24",
      address: "ул. Кирова, 18, кв. 4",
      reason: "Выезд не состоялся, клиент не открыл дверь",
      status: "refused",
      sourceId: source2.id,
      assignedMasterId: master2.id,
      branchId: branch.id,
      createdById: callcenter.id,
      createdDaysAgo: 4,
      closed: { daysAgo: 3, byId: admin.id, closeStatus: "refused", refusalReason: "Клиент недоступен" },
    },
  ];

  const createdRequests = [];
  for (const item of requestSeed) {
    const createdAt = daysAgo(item.createdDaysAgo, 9, 15);
    const closedAt = item.closed ? daysAgo(item.closed.daysAgo, 18, 40) : null;
    const request = await prisma.request.create({
      data: {
        clientName: item.clientName,
        phone: item.phone,
        address: item.address,
        reason: item.reason,
        status: item.status,
        sourceId: item.sourceId,
        assignedMasterId: item.assignedMasterId,
        branchId: item.branchId,
        createdById: item.createdById,
        createdAt,
        updatedAt: closedAt ?? createdAt,
        visitDatetime: item.visitAt,
        closedAt,
        closedById: item.closed?.byId,
        closeStatus: item.closed?.closeStatus,
        amountFull: item.closed?.amountFull,
        amountRecorded: item.closed?.amountRecorded,
        masterPercent: item.closed?.masterPercent,
        refusalReason: item.closed?.refusalReason,
      },
    });
    createdRequests.push({ ...request, seed: item });
  }

  // ── Касса ──────────────────────────────────────────────────────────────────
  for (const request of createdRequests) {
    const seed = request.seed;
    if (!seed.closed || seed.closed.closeStatus !== "done" || !seed.closed.amountRecorded) continue;

    await prisma.cashTransaction.create({
      data: {
        type: "income",
        amount: seed.closed.amountRecorded,
        comment: `Оплата по заявке: ${seed.reason.slice(0, 40)}`,
        date: daysAgo(seed.closed.daysAgo, 19, 0),
        requestId: request.id,
        branchId: seed.branchId,
        createdById: seed.closed.byId,
      },
    });

    const masterPart = (seed.closed.amountFull ?? 0) * ((seed.closed.masterPercent ?? 0) / 100);
    if (masterPart > 0 && seed.assignedMasterId) {
      await prisma.cashTransaction.create({
        data: {
          type: "salary",
          amount: masterPart,
          comment: `Выплата мастеру по заявке ${request.id.slice(-6)}`,
          date: daysAgo(Math.max(seed.closed.daysAgo - 1, 0), 20, 0),
          masterId: seed.assignedMasterId,
          branchId: seed.branchId,
          createdById: admin.id,
        },
      });
    }
  }

  await prisma.cashTransaction.create({
    data: {
      type: "expense",
      amount: 4600,
      comment: "Закупка расходников: гибкая подводка, уплотнители, крепёж",
      date: daysAgo(3, 12, 0),
      branchId: branch.id,
      createdById: admin.id,
    },
  });
  await prisma.cashTransaction.create({
    data: {
      type: "expense",
      amount: 2300,
      comment: "Бензин, выезды по городу за неделю",
      date: daysAgo(2, 18, 30),
      branchId: branch2.id,
      createdById: regional.id,
    },
  });

  // ── Отчёты по рекламе за неделю ────────────────────────────────────────────
  const adDays = [
    { branchId: branch.id, byId: admin.id, days: 6 },
    { branchId: branch.id, byId: admin.id, days: 5 },
    { branchId: branch.id, byId: admin.id, days: 4 },
    { branchId: branch.id, byId: admin.id, days: 3 },
    { branchId: branch.id, byId: admin.id, days: 2 },
    { branchId: branch.id, byId: admin.id, days: 1 },
    { branchId: branch.id, byId: admin.id, days: 0 },
    { branchId: branch2.id, byId: regional.id, days: 3 },
    { branchId: branch2.id, byId: regional.id, days: 1 },
    { branchId: branch2.id, byId: regional.id, days: 0 },
  ];

  for (const [index, day] of adDays.entries()) {
    const base = day.branchId === branch.id ? 1 : 0.6;
    await prisma.adDailyReport.create({
      data: {
        date: daysAgo(day.days, 9, 0),
        promotersCount: day.branchId === branch.id ? 4 : 2,
        flyersIssued: Math.round(400 * base),
        flyersDistributed: Math.round((300 + (index % 4) * 25) * base),
        stickersIssued: Math.round(200 * base),
        stickersDistributed: Math.round((120 + (index % 3) * 18) * base),
        postersIssued: Math.round(60 * base),
        postersDistributed: Math.round((35 + (index % 5) * 4) * base),
        branchId: day.branchId,
        createdById: day.byId,
        createdAt: daysAgo(day.days, 19, 0),
      },
    });
  }

  // ── Чат ────────────────────────────────────────────────────────────────────
  const group = await prisma.chatGroup.create({ data: { name: "Общий чат" } });
  for (const user of [director, regional, admin, callcenter, callcenter2, master1, master2, master3]) {
    await prisma.groupMember.create({ data: { groupId: group.id, userId: user.id } });
  }

  const chatSeed: Array<{ from: string; to?: string; groupId?: string; text: string; days: number; hour: number; minute: number }> = [
    { from: callcenter.id, groupId: group.id, text: "Добрый день. По заявке на Профсоюзной клиент просит выезд до 15:00, успеем?", days: 0, hour: 9, minute: 5 },
    { from: master1.id, groupId: group.id, text: "Успеем, у меня предыдущий адрес рядом. Освобожусь к 13:30.", days: 0, hour: 9, minute: 12 },
    { from: admin.id, groupId: group.id, text: "Тогда ставлю мастера Александра. Клиенту не звоните, я предупрежу сама.", days: 0, hour: 9, minute: 20 },
    { from: master2.id, to: admin.id, text: "По Волковой закрыл, чек и фото загрузил. Сумма 8 000, как в смете.", days: 4, hour: 18, minute: 45 },
    { from: admin.id, to: master2.id, text: "Принято, провела по кассе. Спасибо.", days: 4, hour: 18, minute: 52 },
    { from: regional.id, groupId: group.id, text: "По Питеру за неделю 4 заявки с Авито, две уже закрыты. Прикладываю цифры в отчёт.", days: 1, hour: 17, minute: 30 },
  ];

  for (const message of chatSeed) {
    await prisma.chatMessage.create({
      data: {
        senderId: message.from,
        receiverId: message.to,
        groupId: message.groupId,
        text: message.text,
        createdAt: daysAgo(message.days, message.hour, message.minute),
        readAt: message.days > 0 ? daysAgo(message.days, message.hour, message.minute + 5) : null,
      },
    });
  }

  // ── Аудит правок ───────────────────────────────────────────────────────────
  const audited = createdRequests[0];
  const audited2 = createdRequests[1];

  await prisma.auditLog.create({
    data: {
      entity: "request",
      entityId: audited.id,
      userId: callcenter.id,
      action: "update",
      oldValue: "Не работает розетка",
      newValue: "Не работает розетка на кухне",
      createdAt: daysAgo(0, 9, 40),
    },
  });
  await prisma.auditLog.create({
    data: {
      entity: "request",
      entityId: audited2.id,
      userId: admin.id,
      action: "status",
      oldValue: "waiting",
      newValue: "on_the_way",
      createdAt: daysAgo(0, 10, 5),
    },
  });
  await prisma.auditLog.create({
    data: {
      entity: "cash",
      entityId: createdRequests.find((r) => r.seed.status === "done")?.id ?? audited.id,
      userId: admin.id,
      action: "create",
      newValue: "income 8000",
      createdAt: daysAgo(4, 19, 2),
    },
  });

  console.log("Seed complete. Demo logins — пароли см. prisma/demo-passwords.ts:");
  console.log("director / regional / admin / callcenter / callcenter2 / master1 / master2 / master3");
  console.log(`Заявок: ${createdRequests.length}, касса: ${await prisma.cashTransaction.count()}, отчётов по рекламе: ${await prisma.adDailyReport.count()}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

import { z } from "zod";
import { STATUSES, AD_TYPES, CASH_TX_TYPES } from "@/lib/domain";

export const createRequestSchema = z.object({
  clientName: z.string().min(1, "Укажите имя клиента"),
  phone: z.string().min(1, "Укажите телефон"),
  address: z.string().min(1, "Укажите адрес"),
  reason: z.string().min(1, "Укажите причину звонка"),
  sourceId: z.string().min(1, "Выберите источник рекламы"),
  assignedMasterId: z.string().optional().nullable(),
  visitDatetime: z.string().optional().nullable(),
  branchId: z.string().optional().nullable(),
});

export const updateRequestBasicSchema = z.object({
  clientName: z.string().min(1).optional(),
  address: z.string().min(1).optional(),
  reason: z.string().min(1).optional(),
  phone: z.string().min(1).optional(),
  assignedMasterId: z.string().nullable().optional(),
  visitDatetime: z.string().nullable().optional(),
  sourceId: z.string().optional(),
});

export const updateStatusSchema = z.object({
  status: z.enum(STATUSES),
});

export const closeRequestSchema = z
  .object({
    closeStatus: z.enum(["done", "refused"]),
    amountFull: z.number().nonnegative().optional(),
    masterPercent: z.number().min(0).max(100).optional(),
    documentUrls: z.array(z.string()).optional(),
    refusalReason: z.string().optional(),
  })
  .superRefine((val, ctx) => {
    if (val.closeStatus === "done") {
      if (val.amountFull === undefined) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Укажите сумму закрытия", path: ["amountFull"] });
      }
      if (!val.documentUrls || val.documentUrls.length === 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Прикрепите хотя бы одно фото документа",
          path: ["documentUrls"],
        });
      }
    }
    if (val.closeStatus === "refused" && !val.refusalReason) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Укажите причину отказа", path: ["refusalReason"] });
    }
  });

export const editClosedRequestSchema = z.object({
  closeStatus: z.enum(["done", "refused"]).optional(),
  amountFull: z.number().nonnegative().optional(),
  masterPercent: z.number().min(0).max(100).optional(),
  documentUrls: z.array(z.string()).optional(),
});

export const adSourceSchema = z.object({
  name: z.string().min(1),
  type: z.enum(AD_TYPES),
  photoUrl: z.string().optional().nullable(),
  branchId: z.string().optional().nullable(),
});

export const adReportSchema = z.object({
  date: z.string(),
  promotersCount: z.number().int().nonnegative(),
  flyersDistributed: z.number().int().nonnegative(),
  stickersDistributed: z.number().int().nonnegative(),
  postersDistributed: z.number().int().nonnegative(),
  branchId: z.string().optional().nullable(),
});

export const cashTxSchema = z.object({
  type: z.enum(CASH_TX_TYPES),
  amount: z.number(),
  comment: z.string().optional().nullable(),
  masterId: z.string().optional().nullable(),
  date: z.string().optional(),
  branchId: z.string().optional().nullable(),
});

export const createUserSchema = z.object({
  name: z.string().min(1),
  login: z.string().min(3),
  password: z.string().min(6),
  role: z.enum(["master", "callcenter", "admin", "director", "regional_director"]),
  branchId: z.string().optional().nullable(),
});

export const updateUserSchema = z.object({
  name: z.string().min(1).optional(),
  role: z.enum(["master", "callcenter", "admin", "director", "regional_director"]).optional(),
  branchId: z.string().nullable().optional(),
  password: z.string().min(6).optional(), // необязательно — сброс пароля, если заполнено
});

export const chatMessageSchema = z.object({
  text: z.string().optional(),
  attachmentUrl: z.string().optional(),
  receiverId: z.string().optional(),
  groupId: z.string().optional(),
});

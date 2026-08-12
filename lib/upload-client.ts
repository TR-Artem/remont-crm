"use client";

import { upload } from "@vercel/blob/client";

/**
 * Загружает файл напрямую в Vercel Blob из браузера, минуя тело нашего API-роута
 * (у serverless-функций Vercel жёсткий лимит тела запроса 4.5 МБ — фото с телефона
 * часто больше). Возвращает публичный URL загруженного файла.
 */
export async function uploadFile(file: File): Promise<string> {
  const blob = await upload(file.name, file, {
    access: "public",
    handleUploadUrl: "/api/upload",
  });
  return blob.url;
}

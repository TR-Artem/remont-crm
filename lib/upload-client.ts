"use client";

const MAX_DIMENSION = 1600; // px по длинной стороне — с запасом достаточно для просмотра документов
const JPEG_QUALITY = 0.82;
const MAX_BYTES_AFTER_COMPRESSION = 4 * 1024 * 1024; // держим запас от лимита Vercel в 4.5 МБ

/**
 * Сжимает фото прямо в браузере (canvas) перед отправкой на сервер. Нужно по двум причинам:
 * 1) фото с телефона часто весят 3-10 МБ, а тело запроса к serverless-функции Vercel
 *    ограничено 4.5 МБ (иначе 413 Payload Too Large);
 * 2) прямая загрузка из браузера в Vercel Blob (минуя наш сервер) требует, чтобы устройство
 *    пользователя могло достучаться до vercel.com напрямую — в некоторых сетях/регионах это
 *    заблокировано. Загрузка через наш сервер обходит эту проблему, т.к. запрос от сервера
 *    Vercel к самому Vercel идёт по их внутренней инфраструктуре, а не через сеть пользователя.
 */
async function compressImage(file: File): Promise<File> {
  if (!file.type.startsWith("image/") || file.type === "image/svg+xml") {
    return file; // не изображение (видео и т.п.) — не трогаем
  }

  try {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, MAX_DIMENSION / Math.max(bitmap.width, bitmap.height));
    const width = Math.round(bitmap.width * scale);
    const height = Math.round(bitmap.height * scale);

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) return file;
    ctx.drawImage(bitmap, 0, 0, width, height);

    const blob: Blob | null = await new Promise((resolve) => canvas.toBlob(resolve, "image/jpeg", JPEG_QUALITY));
    if (!blob || blob.size >= file.size) return file; // сжатие не помогло — используем оригинал

    return new File([blob], file.name.replace(/\.\w+$/, "") + ".jpg", { type: "image/jpeg" });
  } catch {
    return file; // canvas недоступен/ошибка — используем оригинал как есть
  }
}

export async function uploadFile(file: File): Promise<string> {
  const prepared = await compressImage(file);

  if (prepared.size > MAX_BYTES_AFTER_COMPRESSION) {
    throw new Error("Файл слишком большой даже после сжатия — выберите фото поменьше");
  }

  const fd = new FormData();
  fd.append("file", prepared);
  const res = await fetch("/api/upload", { method: "POST", body: fd });
  if (!res.ok) {
    const data = await res.json().catch(() => null);
    throw new Error(data?.error || "Не удалось загрузить фото");
  }
  const data = await res.json();
  return data.url as string;
}

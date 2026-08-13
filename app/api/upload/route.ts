import { NextRequest, NextResponse } from "next/server";
import { requireSession, forbiddenResponse, ForbiddenError } from "@/lib/rbac";
import { put } from "@vercel/blob";

// Файл приходит от клиента уже сжатым (см. lib/upload-client.ts), поэтому укладывается
// в лимит тела serverless-функции (4.5 МБ у Vercel). Сама загрузка в Vercel Blob идёт
// отсюда — с сервера Vercel к самому Vercel, по их внутренней сети, а не через интернет
// пользователя. Это осознанный выбор вместо "прямой загрузки из браузера": в некоторых
// сетях/регионах устройство пользователя не может напрямую достучаться до API Vercel Blob.
export async function POST(req: NextRequest) {
  try {
    await requireSession();

    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    if (!file) {
      return NextResponse.json({ error: "Файл не передан" }, { status: 400 });
    }

    const blob = await put(`uploads/${file.name}`, file, {
      access: "public",
      addRandomSuffix: true,
    });

    return NextResponse.json({ url: blob.url });
  } catch (e) {
    if (e instanceof ForbiddenError) return forbiddenResponse(e.message);
    console.error(e);
    return NextResponse.json({ error: e instanceof Error ? e.message : "Внутренняя ошибка" }, { status: 500 });
  }
}

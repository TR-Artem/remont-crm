import { NextRequest, NextResponse } from "next/server";
import { requireSession, forbiddenResponse, ForbiddenError } from "@/lib/rbac";
import { put } from "@vercel/blob";
import { randomUUID } from "crypto";

// Загрузка в Vercel Blob — облачное хранилище файлов от Vercel.
// Локальная файловая система на serverless-хостингах (Vercel) только для чтения во время
// выполнения, писать туда "насовсем" нельзя, поэтому обычная папка /public/uploads не работает
// в проде (только при локальной разработке). Чтобы это заработало, в панели Vercel нужно
// один раз подключить Storage → Blob — тогда переменная BLOB_READ_WRITE_TOKEN появится
// автоматически (её не нужно вписывать в .env вручную).
export async function POST(req: NextRequest) {
  try {
    await requireSession();

    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    if (!file) {
      return NextResponse.json({ error: "Файл не передан" }, { status: 400 });
    }

    const ext = file.name.includes(".") ? file.name.split(".").pop() : "";
    const filename = `uploads/${randomUUID()}${ext ? `.${ext}` : ""}`;

    const blob = await put(filename, file, {
      access: "public",
      addRandomSuffix: false,
    });

    return NextResponse.json({ url: blob.url });
  } catch (e) {
    if (e instanceof ForbiddenError) return forbiddenResponse(e.message);
    console.error(e);
    return NextResponse.json({ error: "Внутренняя ошибка" }, { status: 500 });
  }
}

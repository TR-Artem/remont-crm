import { NextRequest, NextResponse } from "next/server";
import { mkdir, writeFile } from "fs/promises";
import path from "path";
import { randomUUID } from "crypto";
import { requireSession, forbiddenResponse, ForbiddenError } from "@/lib/rbac";
import { put } from "@vercel/blob";

// Файл приходит от клиента уже сжатым (см. lib/upload-client.ts), поэтому укладывается
// в лимит тела serverless-функции (4.5 МБ у Vercel). Сама загрузка в Vercel Blob идёт
// отсюда — с сервера Vercel к самому Vercel, по их внутренней сети, а не через интернет
// пользователя. Это осознанный выбор вместо "прямой загрузки из браузера": в некоторых
// сетях/регионах устройство пользователя не может напрямую достучаться до API Vercel Blob.
//
// Если BLOB-хранилище не подключено (локальная разработка, свой сервер), файл кладётся
// в public/uploads — так главный сценарий «закрыть заявку с фото» работает без облака.
// На Vercel такой режим бесполезен (файловая система только для чтения), поэтому там
// без хранилища возвращаем понятную ошибку, а не молчаливую поломку.
//
// Vercel Blob v2 умеет два вида доступа: статический токен BLOB_READ_WRITE_TOKEN
// и OIDC (BLOB_STORE_ID + VERCEL_OIDC_TOKEN, который Vercel подставляет сам) —
// панель Storage по умолчанию подключает именно OIDC.

const LOCAL_UPLOADS_DIR = path.join(process.cwd(), "public", "uploads");
const blobConfigured = Boolean(process.env.BLOB_READ_WRITE_TOKEN || process.env.BLOB_STORE_ID);
const localUploadsEnabled =
  !blobConfigured &&
  (process.env.NODE_ENV !== "production" || process.env.ALLOW_LOCAL_UPLOADS === "1");

export async function POST(req: NextRequest) {
  try {
    await requireSession();

    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    if (!file) {
      return NextResponse.json({ error: "Файл не передан" }, { status: 400 });
    }

    if (blobConfigured) {
      const blob = await put(`uploads/${file.name}`, file, {
        access: "public",
        addRandomSuffix: true,
      });
      return NextResponse.json({ url: blob.url });
    }

    if (!localUploadsEnabled) {
      return NextResponse.json(
        {
          error:
            "Хранилище фото не настроено: подключите Vercel Blob (Storage → Create → Blob). " +
            "Без него нельзя приложить фото, а статус «Готово» требует фото.",
        },
        { status: 503 }
      );
    }

    const ext = path.extname(file.name).toLowerCase().replace(/[^.a-z0-9]/g, "") || ".bin";
    const fileName = `${Date.now()}-${randomUUID().slice(0, 8)}${ext}`;
    await mkdir(LOCAL_UPLOADS_DIR, { recursive: true });
    await writeFile(path.join(LOCAL_UPLOADS_DIR, fileName), Buffer.from(await file.arrayBuffer()));

    return NextResponse.json({ url: `/uploads/${fileName}` });
  } catch (e) {
    if (e instanceof ForbiddenError) return forbiddenResponse(e.message);
    console.error(e);
    return NextResponse.json({ error: e instanceof Error ? e.message : "Внутренняя ошибка" }, { status: 500 });
  }
}

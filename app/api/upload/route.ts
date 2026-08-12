import { NextRequest, NextResponse } from "next/server";
import { requireSession, ForbiddenError } from "@/lib/rbac";
import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";

// Файл здесь НЕ загружается через тело этого запроса — Vercel ограничивает тело запроса
// serverless-функции 4.5 МБ, а фото с телефона обычно весят больше (413 Payload Too Large).
// Вместо этого браузер грузит файл напрямую в Vercel Blob, а этот роут только выдаёт
// одноразовый авторизованный токен на загрузку (см. lib/upload-client.ts на фронте).
export async function POST(req: NextRequest) {
  const body = (await req.json()) as HandleUploadBody;

  try {
    await requireSession();

    const jsonResponse = await handleUpload({
      body,
      request: req,
      onBeforeGenerateToken: async () => {
        return {
          allowedContentTypes: ["image/jpeg", "image/png", "image/webp", "image/gif", "image/heic", "video/mp4", "video/quicktime"],
          addRandomSuffix: true,
          maximumSizeInBytes: 25 * 1024 * 1024, // 25 МБ — с запасом под фото с телефона
        };
      },
      onUploadCompleted: async () => {
        // Здесь можно было бы залогировать факт загрузки — сейчас не требуется.
      },
    });

    return NextResponse.json(jsonResponse);
  } catch (e) {
    if (e instanceof ForbiddenError) {
      return NextResponse.json({ error: e.message }, { status: 403 });
    }
    console.error(e);
    return NextResponse.json({ error: e instanceof Error ? e.message : "Внутренняя ошибка" }, { status: 400 });
  }
}

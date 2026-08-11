import { NextResponse, type NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";
import { sectionAllowed, type Role } from "@/lib/domain";

// Читаем JWT напрямую через getToken(), а не через полноценный NextAuth()/auth() —
// это заметно легче для Edge Function (у неё жёсткий лимит размера, 1 МБ на бесплатном
// тарифе Vercel). Даже "пустой" NextAuth() тянет за собой всю инфраструктуру роутинга,
// CSRF, парсинга cookie и т.д. — getToken() лишь расшифровывает JWT из cookie, без этого.
const PUBLIC_PATHS = ["/login"];

export default async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // API-роуты никогда не должны получать редирект на HTML-страницу логина —
  // fetch() на фронте следует за редиректом и получает HTML вместо JSON,
  // из-за чего падает res.json() с "Unexpected token '<'". Каждый /api/**
  // роут сам проверяет сессию и роль (см. lib/rbac.ts) и возвращает
  // корректный JSON-ответ с кодом 401/403 — здесь его просто не трогаем.
  if (pathname.startsWith("/api/")) {
    return NextResponse.next();
  }

  if (PUBLIC_PATHS.some((p) => pathname.startsWith(p))) {
    return NextResponse.next();
  }

  const token = await getToken({ req, secret: process.env.AUTH_SECRET });
  if (!token) {
    const url = req.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  const role = token.role as Role | undefined;
  if (pathname === "/" || !role) {
    return NextResponse.next();
  }

  if (!sectionAllowed(role, pathname) && pathname !== "/access-denied") {
    const url = req.nextUrl.clone();
    url.pathname = "/access-denied";
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|uploads).*)"],
};

import { NextResponse } from "next/server";
import NextAuth from "next-auth";
import { authConfig } from "@/lib/auth.config";
import { sectionAllowed, type Role } from "@/lib/domain";

// Собственный, "лёгкий" экземпляр auth() для Edge Runtime — без провайдеров/Prisma/bcrypt,
// только чтение JWT-сессии. Полный auth() с провайдером — в lib/auth.ts (Node.js-рантайм).
const { auth } = NextAuth(authConfig);

const PUBLIC_PATHS = ["/login"];

export default auth((req) => {
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

  const session = req.auth;
  if (!session?.user) {
    const url = req.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  const role = session.user.role as Role;
  if (pathname === "/") {
    return NextResponse.next();
  }

  if (!sectionAllowed(role, pathname) && pathname !== "/access-denied") {
    const url = req.nextUrl.clone();
    url.pathname = "/access-denied";
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
});

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|uploads).*)"],
};
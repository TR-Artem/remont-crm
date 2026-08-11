import type { NextAuthConfig } from "next-auth";
import type { Role } from "@/lib/domain";

declare module "next-auth" {
  interface User {
    role: Role;
    branchId: string | null;
  }
  interface Session {
    user: {
      id: string;
      name: string;
      role: Role;
      branchId: string | null;
    };
  }
}

interface AppToken {
  id?: string;
  role?: Role;
  branchId?: string | null;
  [key: string]: unknown;
}

/**
 * Только то, что нужно для чтения/обновления JWT-сессии — БЕЗ провайдеров и БЕЗ Prisma/bcrypt.
 * Prisma Client слишком тяжёлый для Edge Runtime (middleware.ts выполняется на Edge у Vercel,
 * лимит функции — 1 МБ на бесплатном тарифе) — если завести сюда Credentials-провайдер с
 * обращением к БД, сборка мидлвари превышает лимит и деплой падает с ошибкой "exceeds ... limit".
 * Полный конфиг с провайдером — в lib/auth.ts, используется только в Node.js-рантайме (API-роуты).
 */
export const authConfig = {
  session: { strategy: "jwt" },
  pages: { signIn: "/login" },
  providers: [],
  callbacks: {
    jwt({ token, user }) {
      const t = token as AppToken;
      if (user) {
        t.id = user.id;
        t.role = user.role;
        t.branchId = user.branchId;
      }
      return t;
    },
    session({ session, token }) {
      const t = token as AppToken;
      session.user.id = t.id ?? "";
      session.user.role = (t.role ?? "master") as Role;
      session.user.branchId = t.branchId ?? null;
      return session;
    },
  },
} satisfies NextAuthConfig;

import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
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

// Примечание: аугментация "next-auth/jwt" (реэкспорт из @auth/core/jwt) в TS
// с moduleResolution "bundler" не резолвится надёжно — расширяем токен через
// точечные приведения типов в колбэках ниже вместо augmentation-блока.
interface AppToken {
  id?: string;
  role?: Role;
  branchId?: string | null;
  [key: string]: unknown;
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  session: { strategy: "jwt" },
  pages: { signIn: "/login" },
  providers: [
    Credentials({
      name: "credentials",
      credentials: {
        login: { label: "Логин", type: "text" },
        password: { label: "Пароль", type: "password" },
      },
      async authorize(credentials) {
        const login = credentials?.login as string | undefined;
        const password = credentials?.password as string | undefined;
        if (!login || !password) return null;

        const user = await prisma.user.findUnique({ where: { login } });
        if (!user) return null;

        const valid = await bcrypt.compare(password, user.passwordHash);
        if (!valid) return null;

        return {
          id: user.id,
          name: user.name,
          role: user.role as Role,
          branchId: user.branchId,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      const t = token as AppToken;
      if (user) {
        t.id = user.id;
        t.role = user.role;
        t.branchId = user.branchId;
      }
      return t;
    },
    async session({ session, token }) {
      const t = token as AppToken;
      session.user.id = t.id ?? "";
      session.user.role = (t.role ?? "master") as Role;
      session.user.branchId = t.branchId ?? null;
      return session;
    },
  },
});

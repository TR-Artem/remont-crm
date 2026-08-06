import Link from "next/link";
import { auth } from "@/lib/auth";
import { DEFAULT_ROUTE, type Role } from "@/lib/domain";

export default async function AccessDeniedPage() {
  const session = await auth();
  const homeRoute = session?.user ? DEFAULT_ROUTE[session.user.role as Role] : "/login";

  return (
    <div className="flex flex-1 items-center justify-center bg-surface px-4">
      <div className="card max-w-sm p-8 text-center">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-danger-light text-2xl text-danger">
          ⛔
        </div>
        <h1 className="text-lg font-semibold text-text">Доступ ограничен</h1>
        <p className="mt-2 text-sm text-text-secondary">
          Ваша роль не имеет доступа к этому разделу приложения.
        </p>
        <Link href={homeRoute} className="btn-primary mt-6 inline-block">
          Вернуться
        </Link>
      </div>
    </div>
  );
}

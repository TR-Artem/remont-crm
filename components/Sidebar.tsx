"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import { useState } from "react";
import { ROLE_LABELS, formatShortName, type Role } from "@/lib/domain";

const ALL_ITEMS: { href: string; label: string; icon: string; roles: Role[] }[] = [
  { href: "/requests", label: "Заявки", icon: "📋", roles: ["callcenter", "admin", "director", "regional_director"] },
  {
    href: "/requests/analytics",
    label: "Аналитика заявок",
    icon: "📊",
    roles: ["director", "regional_director"],
  },
  { href: "/ads/sources", label: "Реклама", icon: "📢", roles: ["admin", "director", "regional_director"] },
  { href: "/ads/reports", label: "Отчёты по рекламе", icon: "🗒️", roles: ["admin", "director", "regional_director"] },
  {
    href: "/ads/analytics",
    label: "Аналитика рекламы",
    icon: "📈",
    roles: ["admin", "director", "regional_director"],
  },
  { href: "/accounting", label: "Бухгалтерия", icon: "💰", roles: ["director", "regional_director"] },
  {
    href: "/chat",
    label: "Чат",
    icon: "💬",
    roles: ["master", "callcenter", "admin", "director", "regional_director"],
  },
  { href: "/employees", label: "Сотрудники", icon: "👥", roles: ["director", "regional_director"] },
];

export default function Sidebar({ role, userName }: { role: Role; userName: string }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const items = ALL_ITEMS.filter((i) => i.roles.includes(role));

  const content = (
    <>
      <div className="px-5 py-5">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent text-sm font-bold text-white">
            Р
          </div>
          <span className="text-base font-semibold text-white">РемонтCRM</span>
        </div>
      </div>
      <nav className="flex-1 space-y-1 px-3">
        {items.map((item) => {
          const active = pathname === item.href || pathname.startsWith(item.href + "/");
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setOpen(false)}
              className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                active ? "bg-accent text-white" : "text-white/70 hover:bg-sidebar-card hover:text-white"
              }`}
            >
              <span>{item.icon}</span>
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>
      <div className="border-t border-white/10 px-5 py-4">
        <div className="flex items-center gap-2">
          <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-accent text-[11px] font-semibold text-white">
            {userName.trim()[0]?.toUpperCase()}
          </span>
          <p className="truncate text-xs text-white/70">
            {ROLE_LABELS[role]}: {formatShortName(userName)}
          </p>
        </div>
        <button
          onClick={() => signOut({ callbackUrl: "/login" })}
          className="mt-2 text-xs font-medium text-white/50 hover:text-white"
        >
          Выйти
        </button>
      </div>
    </>
  );

  return (
    <>
      {/* Mobile top bar */}
      <div className="flex items-center justify-between bg-sidebar px-4 py-3 md:hidden">
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-accent text-xs font-bold text-white">
            Р
          </div>
          <span className="text-sm font-semibold text-white">РемонтCRM</span>
        </div>
        <button onClick={() => setOpen(!open)} className="text-white text-xl leading-none">
          ☰
        </button>
      </div>
      {open && (
        <div className="flex flex-col bg-sidebar pb-2 md:hidden">{content}</div>
      )}

      {/* Desktop sidebar */}
      <aside className="hidden w-60 shrink-0 flex-col bg-sidebar md:flex">{content}</aside>
    </>
  );
}

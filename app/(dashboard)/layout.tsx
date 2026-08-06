import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import Sidebar from "@/components/Sidebar";
import type { Role } from "@/lib/domain";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session?.user) {
    redirect("/login");
  }

  return (
    <div className="flex min-h-screen flex-1 flex-col md:flex-row">
      <Sidebar role={session.user.role as Role} userName={session.user.name} />
      <main className="flex-1 overflow-x-hidden bg-surface p-4 md:p-8">{children}</main>
    </div>
  );
}

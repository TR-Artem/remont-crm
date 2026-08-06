import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { DEFAULT_ROUTE, type Role } from "@/lib/domain";

export default async function Home() {
  const session = await auth();
  if (!session?.user) {
    redirect("/login");
  }
  redirect(DEFAULT_ROUTE[session.user.role as Role]);
}

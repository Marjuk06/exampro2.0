import { redirect } from "next/navigation";
import { getServerSession } from "@/lib/auth/session";
import { isAdminRole } from "@/lib/permissions";

export default async function HomePage() {
  const session = await getServerSession();
  if (!session) redirect("/auth/login");
  if (isAdminRole(session.role)) redirect("/admin");
  redirect("/student");
}

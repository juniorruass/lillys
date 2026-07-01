export const dynamic = "force-dynamic";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { jwtVerify } from "jose";
import Sidebar from "@/components/layout/Sidebar";
import BottomNav from "@/components/layout/BottomNav";
import FloatingOrbs from "@/components/ui/FloatingOrbs";

async function requireAuth() {
  const cookieStore = await cookies();
  const token = cookieStore.get("lillys-session")?.value;
  if (!token) redirect("/login");
  const secret = process.env.SESSION_SECRET ?? "";
  if (!secret) redirect("/login");
  try {
    await jwtVerify(token, new TextEncoder().encode(secret));
  } catch {
    redirect("/login");
  }
}

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  await requireAuth();
  return (
    <div className="relative min-h-screen bg-transparent">
      <FloatingOrbs parallax />
      <Sidebar />
      <div className="lg:ml-56 flex flex-col min-h-screen pb-16 lg:pb-0">
        {children}
      </div>
      <BottomNav />
    </div>
  );
}

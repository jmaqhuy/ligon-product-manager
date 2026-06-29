import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/layout/app-sidebar";
import { TopBar } from "@/components/layout/top-bar";
import { ConfettiCelebration } from "@/components/confetti-celebration";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();

  if (!session?.user?.id) {
    const headersList = await headers();
    // Try to get the original path from referer, fallback to /dashboard
    let pathname = "/dashboard";
    try {
      const referer = headersList.get("referer");
      if (referer) {
        const url = new URL(referer);
        pathname = url.pathname + url.search;
      }
    } catch { /* keep default */ }
    const loginUrl = `/login?callbackUrl=${encodeURIComponent(pathname)}`;
    redirect(loginUrl);
  }

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <TopBar />
        <main className="flex-1 px-4 py-3 md:px-6 md:py-4">
          {children}
        </main>
        <ConfettiCelebration />
      </SidebarInset>
    </SidebarProvider>
  );
}

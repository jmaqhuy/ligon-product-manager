import { redirect } from "next/navigation";
import { headers, cookies } from "next/headers";
import { auth } from "@/lib/auth";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/layout/app-sidebar";
import { TopBar } from "@/components/layout/top-bar";
import { ConfettiCelebration } from "@/components/confetti-celebration";
import { NuqsAdapter } from 'nuqs/adapters/next/app';
import { AuthGuard } from "@/components/auth-guard";

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

  const cookieStore = await cookies();
  const sidebarState = cookieStore.get("sidebar_state")?.value;
  const defaultOpen = sidebarState === "false" ? false : true;

  return (
    <NuqsAdapter>
      <AuthGuard>
        <SidebarProvider defaultOpen={defaultOpen}>
          <AppSidebar />
          <SidebarInset>
            <TopBar />
            <main className="flex-1 px-4 py-3 md:px-6 md:py-4">
              {children}
            </main>
            <ConfettiCelebration />
          </SidebarInset>
        </SidebarProvider>
      </AuthGuard>
    </NuqsAdapter>
  );
}

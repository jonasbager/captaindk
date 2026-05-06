import { useLocation } from "react-router-dom";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { ThemeToggle } from "@/components/ThemeToggle";
import { CaptainChat } from "@/components/CaptainChat";
import { MobileTabBar } from "@/components/MobileTabBar";

export function Layout({ children }: { children: React.ReactNode }) {
  const location = useLocation();
  const isChat = location.pathname === "/chat";
  const isSnap = location.pathname === "/snap";

  if (isSnap) return <>{children}</>;

  return (
    <SidebarProvider defaultOpen={false}>
      <div className="min-h-screen flex w-full">
        <AppSidebar />
        <div className="flex-1 flex flex-col min-w-0">
          <header className="h-11 flex items-center justify-between border-b border-border/30 px-2 shrink-0">
            <SidebarTrigger className="text-muted-foreground hover:text-foreground hidden md:inline-flex" />
            <div className="md:hidden" />
            <ThemeToggle />
          </header>
          <main className="flex-1 overflow-auto pb-14 md:pb-0">{children}</main>
        </div>
        {!isChat && <CaptainChat />}
        <MobileTabBar />
      </div>
    </SidebarProvider>
  );
}

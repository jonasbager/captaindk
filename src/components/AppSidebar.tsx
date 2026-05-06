import {
  LayoutGrid,
  MessageSquare,
  Inbox,
  Receipt,
  List,
  BookOpen,
  Percent,
  Building2,
  Upload,
  Plug,
  Settings,
  FileText,
  ChevronDown,
  Users,
  LogOut,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useIsAdmin } from "@/hooks/useIsAdmin";
import { Logo } from "@/components/Logo";
import { NavLink } from "@/components/NavLink";
import { useState } from "react";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarFooter,
  useSidebar,
} from "@/components/ui/sidebar";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { useCompany } from "@/hooks/useCompany";

const primary = [
  { title: "Chat", url: "/chat", icon: MessageSquare },
  { title: "Dashboard", url: "/dashboard", icon: LayoutGrid },
  { title: "Indbakke", url: "/indbakke", icon: Inbox },
  { title: "Faktura", url: "/faktura", icon: FileText },
];

const admin = [
  { title: "Posteringer", url: "/posteringer", icon: List },
  { title: "Kontoplan", url: "/kontoplan", icon: BookOpen },
  { title: "Moms", url: "/moms", icon: Percent },
  { title: "SKAT", url: "/skat", icon: Building2 },
  { title: "Bilag", url: "/bilag", icon: Receipt },
  { title: "Import", url: "/import", icon: Upload },
  { title: "Integrationer", url: "/integrationer", icon: Plug },
  { title: "Indstillinger", url: "/indstillinger", icon: Settings },
];

export function AppSidebar() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const { company } = useCompany();
  const { isAdmin } = useIsAdmin();
  const [adminOpen, setAdminOpen] = useState(false);

  const adminItems = isAdmin
    ? [...admin, { title: "Venteliste", url: "/waitlist-admin", icon: Users }]
    : admin;

  const initials = company?.name
    ? company.name.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase()
    : "??";

  const renderItem = (item: { title: string; url: string; icon: typeof primary[number]["icon"]; end?: boolean }) => (
    <SidebarMenuItem key={item.title}>
      <SidebarMenuButton asChild>
        <NavLink
          to={item.url}
          end={item.end}
          className="hover:bg-sidebar-accent/50 transition-colors relative"
          activeClassName="bg-sidebar-accent text-sidebar-accent-foreground"
        >
          <item.icon className="h-4 w-4 shrink-0" />
          {!collapsed && <span className="ml-2">{item.title}</span>}
        </NavLink>
      </SidebarMenuButton>
    </SidebarMenuItem>
  );

  return (
    <Sidebar collapsible="icon" className="border-r border-border/50 hidden md:flex">
      <SidebarContent className="pt-4">
        {!collapsed ? (
          <div className="px-4 pb-4 mb-2 border-b border-border/30 flex justify-center">
            <Logo className="h-10 w-auto" />
          </div>
        ) : (
          <div className="flex justify-center pb-4 mb-2 border-b border-border/30">
            <Logo variant="hat" className="h-7 w-auto" />
          </div>
        )}

        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>{primary.map(renderItem)}</SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupContent>
            {collapsed ? (
              <SidebarMenu>{adminItems.map(renderItem)}</SidebarMenu>
            ) : (
              <Collapsible open={adminOpen} onOpenChange={setAdminOpen}>
                <CollapsibleTrigger className="w-full flex items-center gap-2 px-3 py-1.5 text-[10px] uppercase tracking-wider text-muted-foreground hover:text-foreground transition-colors">
                  <ChevronDown className={`h-3 w-3 transition-transform ${adminOpen ? "" : "-rotate-90"}`} />
                  Admin
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <SidebarMenu>{adminItems.map(renderItem)}</SidebarMenu>
                </CollapsibleContent>
              </Collapsible>
            )}
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter className="border-t border-border/30 p-3">
        {!collapsed ? (
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded bg-primary/20 text-primary flex items-center justify-center text-xs font-mono font-semibold">
              {initials}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium truncate">{company?.name || "—"}</p>
              {company?.cvr && <p className="text-[10px] text-muted-foreground font-mono">CVR {company.cvr}</p>}
            </div>
          </div>
        ) : (
          <div className="w-7 h-7 rounded bg-primary/20 text-primary flex items-center justify-center text-xs font-mono font-semibold mx-auto">
            {initials}
          </div>
        )}
      </SidebarFooter>
    </Sidebar>
  );
}

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
  Compass,
  FileText,
} from "lucide-react";
import { NavLink } from "@/components/NavLink";
import { useLocation } from "react-router-dom";
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
import { company, inboxCounts } from "@/lib/demo-data";

const navItems = [
  { title: "Dashboard", url: "/dashboard", icon: LayoutGrid },
  { title: "Bogfør", url: "/bogfoer", icon: MessageSquare },
  { title: "Indbakke", url: "/indbakke", icon: Inbox, badge: inboxCounts.pendingSuggestions },
  { title: "Faktura", url: "/faktura", icon: FileText },
  { title: "Bilag", url: "/bilag", icon: Receipt },
  { title: "Posteringer", url: "/posteringer", icon: List },
  { title: "Kontoplan", url: "/kontoplan", icon: BookOpen },
  { title: "Moms", url: "/moms", icon: Percent },
  { title: "SKAT", url: "/skat", icon: Building2 },
  { title: "Import", url: "/import", icon: Upload },
  { title: "Integrationer", url: "/integrationer", icon: Plug },
  { title: "Indstillinger", url: "/indstillinger", icon: Settings },
];

export function AppSidebar() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const location = useLocation();

  return (
    <Sidebar collapsible="icon" className="border-r border-border/50">
      <SidebarContent className="pt-4">
        {!collapsed ? (
          <div className="px-4 pb-4 mb-2 border-b border-border/30 flex items-center gap-2">
            <Compass className="h-5 w-5 text-primary" />
            <span className="text-xs font-mono tracking-widest uppercase text-muted-foreground">Captain</span>
          </div>
        ) : (
          <div className="flex justify-center pb-4 mb-2 border-b border-border/30">
            <Compass className="h-5 w-5 text-primary" />
          </div>
        )}
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {navItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <NavLink
                      to={item.url}
                      end
                      className="hover:bg-sidebar-accent/50 transition-colors relative"
                      activeClassName="bg-sidebar-accent text-sidebar-accent-foreground"
                    >
                      <item.icon className="h-4 w-4 shrink-0" />
                      {!collapsed && <span className="ml-2">{item.title}</span>}
                      {item.badge && !collapsed && (
                        <span className="ml-auto text-[10px] font-mono bg-primary/20 text-primary px-1.5 py-0.5 rounded">
                          {item.badge}
                        </span>
                      )}
                      {item.badge && collapsed && (
                        <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-primary" />
                      )}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter className="border-t border-border/30 p-3">
        {!collapsed ? (
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded bg-primary/20 text-primary flex items-center justify-center text-xs font-mono font-semibold">
              JB
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium truncate">{company.name}</p>
              <p className="text-[10px] text-muted-foreground font-mono">CVR {company.cvr}</p>
            </div>
          </div>
        ) : (
          <div className="w-7 h-7 rounded bg-primary/20 text-primary flex items-center justify-center text-xs font-mono font-semibold mx-auto">
            JB
          </div>
        )}
      </SidebarFooter>
    </Sidebar>
  );
}

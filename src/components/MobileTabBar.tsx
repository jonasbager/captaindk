import { NavLink, useLocation } from "react-router-dom";
import { MessageSquare, LayoutGrid, Inbox, Camera } from "lucide-react";
import { useEffect, useState } from "react";
import { useCompany } from "@/hooks/useCompany";
import { supabase } from "@/integrations/supabase/client";

const items = [
  { to: "/chat", icon: MessageSquare, label: "Chat" },
  { to: "/dashboard", icon: LayoutGrid, label: "Dashboard" },
  { to: "/indbakke", icon: Inbox, label: "Indbakke", badge: true },
  { to: "/snap", icon: Camera, label: "Scan" },
];

export function MobileTabBar() {
  const location = useLocation();
  const { company } = useCompany();
  const [badge, setBadge] = useState(0);

  useEffect(() => {
    if (!company) return;
    supabase
      .from("documents")
      .select("id", { count: "exact", head: true })
      .eq("company_id", company.id)
      .eq("status", "pending")
      .then(({ count }) => setBadge(count ?? 0));
  }, [company, location.pathname]);

  if (location.pathname === "/snap") return null;

  return (
    <nav className="md:hidden fixed bottom-0 inset-x-0 z-40 border-t border-border/40 bg-background/95 backdrop-blur grid grid-cols-4 h-14">
      {items.map((it) => (
        <NavLink
          key={it.to}
          to={it.to}
          end={it.to === "/chat"}
          className={({ isActive }) =>
            `flex flex-col items-center justify-center gap-0.5 text-[10px] relative ${
              isActive ? "text-primary" : "text-muted-foreground"
            }`
          }
        >
          <it.icon className="h-5 w-5" />
          <span>{it.label}</span>
          {it.badge && badge > 0 && (
            <span className="absolute top-2 right-1/3 h-4 min-w-4 px-1 rounded-full bg-destructive text-destructive-foreground text-[9px] font-mono flex items-center justify-center">
              {badge}
            </span>
          )}
        </NavLink>
      ))}
    </nav>
  );
}

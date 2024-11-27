import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import { Calendar, Home, Inbox, Search, Settings } from "lucide-react";
import Link from "next/link"; // Link wird importiert

const items = [
  {
    title: "Home",
    url: "/",
    icon: Home,
  },
  {
    title: "To-dos",
    url: "/todos",
    icon: Inbox,
  },
  {
    title: "Finanzen",
    url: "/finance", // Dies sollte "/finance" sein
    icon: Calendar,
  },
  {
    title: "Trading",
    url: "/trading", // Dies sollte "/trading" sein
    icon: Search,
  },
  {
    title: "Stats",
    url: "/stats",
    icon: Settings,
  },
  {
    title: "Skilltree",
    url: "/skilltree",
    icon: Settings,
  },
  {
    title: "Settings",
    url: "/settings",
    icon: Settings,
  },
];

export function AppSidebar() {
  return (
    <Sidebar>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>FocusPath</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {items.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    {/* Entferne das <a> Tag und benutze nur Link */}
                    <Link href={item.url}>
                      <div>
                        <item.icon />
                        <span>{item.title}</span>
                      </div>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}

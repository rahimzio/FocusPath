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
    url: "/overview/todos",
    icon: Inbox,
  },
  {
    title: "Finanzen",
    url: "/overview/finance",
    icon: Calendar,
  },
  {
    title: "Goals",
    url: "/goals",
    icon: Calendar,
  },
  {
    title: "Trading",
    url: "/overview/trading",
    icon: Search,
  },
  {
    title: "sport",
    url: "/overview/sport",
    icon: Settings,
  },
  {
    title: "Stats",
    url: "/overview/stats",
    icon: Settings,
  },
  {
    title: "Skilltree",
    url: "/overview/Skilltree",
    icon: Settings,
  },
  {
  title: "uni",
  url: "/overview/uni",
  icon: Inbox,
  },
  {
    title: "calorin tracker",
    url: "/overview/calorin-tracker",
    icon: Inbox,
    },
  {
    title: "Settings",
    url: "/overview/Settings",
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

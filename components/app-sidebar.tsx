"use client"
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
import { Calendar, Home, Inbox, Search, Settings, SlidersHorizontal } from "lucide-react";
import Link from "next/link";
import { signOut } from "next-auth/react";
import { useEffect, useState } from "react";

const defaultItems = [
  { title: "Home", url: "/", icon: Home },
  { title: "To-dos", url: "/overview/todos", icon: Inbox },
  { title: "Finanzen", url: "/overview/finance", icon: Calendar },
  { title: "Goals", url: "/overview/goals", icon: Calendar },
  { title: "Trading", url: "/overview/trading", icon: Search },
  { title: "sport", url: "/overview/sport", icon: Settings },
  { title: "Stats", url: "/overview/stats", icon: Settings },
  { title: "Skilltree", url: "/overview/Skilltree", icon: Settings },
  { title: "uni", url: "/overview/uni", icon: Inbox },
  { title: "calorin tracker", url: "/overview/calorin-tracker", icon: Inbox },
  { title: "Community", url: "/overview/community", icon: Inbox },
  { title: "Settings", url: "/overview/Settings", icon: Settings },
];

export function AppSidebar() {
  const [visibleItems, setVisibleItems] = useState(defaultItems);

  useEffect(() => {
    const stored = localStorage.getItem("customSidebarItems");
    if (stored) setVisibleItems(JSON.parse(stored));
  }, []);

  function handleCustomizeSidebar() {
    const newVisible = prompt("Gib die Titel der gewünschten Menüpunkte kommasepariert ein (z. B. To-dos,Trading)");
    if (!newVisible) return;
    const selectedTitles = newVisible.split(",").map((t) => t.trim().toLowerCase());
    const filtered = defaultItems.filter((item) => selectedTitles.includes(item.title.toLowerCase()));
    setVisibleItems(filtered);
    localStorage.setItem("customSidebarItems", JSON.stringify(filtered));
  }

  return (
    <Sidebar>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>FocusPath</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {visibleItems.map((item) => (
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

      {/* Footer mit Logout und Konfiguration */}
      <div className="mt-auto px-4 pb-4 space-y-2">
        <button
          onClick={handleCustomizeSidebar}
          className="w-full px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
        >
          Sidebar anpassen
        </button>

        <button
          onClick={() => signOut({ callbackUrl: "/login/login" })}
          className="w-full px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600"
        >
          Abmelden
        </button>
      </div>
    </Sidebar>
  );
}

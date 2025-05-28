"use client";

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
import {
  Calendar,
  Home,
  Inbox,
  Menu,
  Search,
  Settings,
  X,
} from "lucide-react";
import Link from "next/link";
import { signOut } from "next-auth/react";
import { useEffect, useState, Dispatch, SetStateAction } from "react";

const defaultItems = [
  { title: "Home", url: "/", icon: Home },
  { title: "Finanzen", url: "/overview/finance", icon: Calendar },
  { title: "Community", url: "/overview/community", icon: Inbox },
  { title: "Settings", url: "/overview/Settings", icon: Settings },
];

const defaultItemsOriginal = [
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
interface AppSidebarProps {
  mobileOpen: boolean;
  setMobileOpen: Dispatch<SetStateAction<boolean>>;
}

export function AppSidebar({ mobileOpen, setMobileOpen }: AppSidebarProps) {
  const [visibleItems, setVisibleItems] = useState(defaultItems);

  useEffect(() => {
    const stored = localStorage.getItem("customSidebarItems");
    if (stored) setVisibleItems(JSON.parse(stored));
  }, []);

  useEffect(() => {
    console.log("[Sidebar] mobileOpen:", mobileOpen);
  }, [mobileOpen]);

  function handleCustomizeSidebar() {
    const newVisible = prompt(
      "Gib die Titel der gewünschten Menüpunkte kommasepariert ein (z. B. To-dos,Trading)"
    );
    if (!newVisible) return;
    const selectedTitles = newVisible
      .split(",")
      .map((t) => t.trim().toLowerCase());
    const filtered = defaultItems.filter((item) =>
      selectedTitles.includes(item.title.toLowerCase())
    );
    setVisibleItems(filtered);
    localStorage.setItem("customSidebarItems", JSON.stringify(filtered));
  }

  return (
    <>
      {/* Mobile Sidebar Overlay */}
      {mobileOpen && (
        <div className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm sm:hidden">
          <div className="w-[220px] h-full bg-[#111111]/90 text-white p-4 flex flex-col justify-between rounded-r-xl shadow-lg">
            <div className="flex justify-center mb-4">
              <button
                className="w-12 h-12 flex items-center justify-center rounded-full hover:bg-white/10 transition"
                onClick={() => {
                  console.log("[Sidebar] Schließen durch X-Button");
                  setMobileOpen(false);
                }}
              >
                <X className="ml-auto" />
              </button>
            </div>
            <div className="flex flex-col items-center gap-4">
              {visibleItems.map((item) => (
                <Link
                  key={item.title}
                  href={item.url}
                  className="flex flex-col items-center text-white/80 hover:text-blue-400 transition"
                  onClick={() => {
                    console.log("[Sidebar] Link geklickt → schließe Sidebar");
                    setMobileOpen(false);
                  }}
                >
                  <item.icon className="w-7 h-7" />
                  <span className="text-[10px] mt-1 text-center lowercase block">
                    {item.title.split(" ")[0]}
                  </span>
                </Link>
              ))}
            </div>

            <div className="flex flex-col gap-2 mt-8">
              <button
                onClick={handleCustomizeSidebar}
                className="w-full px-4 py-2 bg-[#007AFF] text-white rounded hover:brightness-110 transition"
              >
                Sidebar anpassen
              </button>
              <button
                onClick={() => signOut({ callbackUrl: "/login/login" })}
                className="w-full px-4 py-2 bg-[#FF3B30] text-white rounded hover:brightness-110 transition"
              >
                Abmelden
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Desktop Sidebar */}
      <div className="hidden sm:flex flex-col w-[64px] bg-[#111111]/90 text-white items-center py-4 rounded-r-xl shadow-md">
        <div className="flex flex-col items-center gap-4">
          {visibleItems.map((item) => (
            <Link
              key={item.title}
              href={item.url}
              className="flex flex-col items-center text-white/80 hover:text-blue-400 transition"
            >
              <item.icon className="w-5 h-5" />
              <span className="text-[10px] mt-1 text-center lowercase block">
                {item.title.split(" ")[0]}
              </span>
            </Link>
          ))}
        </div>

        {/* Footer */}
        <div className="mt-auto flex flex-col gap-2 py-4">
          <button
            onClick={handleCustomizeSidebar}
            className="w-10 h-10 bg-[#007AFF] rounded-full hover:brightness-110 text-white flex items-center justify-center"
            title="Sidebar anpassen"
          >
            ✏️
          </button>
          <button
            onClick={() => signOut({ callbackUrl: "/login/login" })}
            className="w-10 h-10 bg-[#FF3B30] rounded-full hover:brightness-110 text-white flex items-center justify-center"
            title="Abmelden"
          >
            🚪
          </button>
        </div>
      </div>
    </>
  );
}

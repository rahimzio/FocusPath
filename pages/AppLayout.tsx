"use client";

import { ReactNode, useEffect, useState } from "react";
import { AppSidebar } from "@/components/app-sidebar";
import { useRouter } from "next/router";
import { Menu, LogOut } from "lucide-react";
import { TooltipProvider } from "@/components/ui/tooltip";
import { signOut } from "next-auth/react";
export default function AppLayout({ children }: { children: ReactNode }) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const handleRouteChange = () => setMobileOpen(false);
    router.events.on("routeChangeStart", handleRouteChange);
    return () => {
      router.events.off("routeChangeStart", handleRouteChange);
    };
  }, [router]);

  return (
    <div className="min-h-screen flex bg-[#F5F5F7] text-[#1c1c1e] overflow-x-hidden">
      {/* Sidebar mit Steuerung */}
      <AppSidebar mobileOpen={mobileOpen} setMobileOpen={setMobileOpen} />

      <div className="flex-1 flex flex-col">
        {/* Topbar */}
        <header className="sticky top-0 z-10 backdrop-blur bg-white/80 px-4 py-2 border-b border-[#e5e5ea] flex justify-between items-center">
          <button
            className="sm:hidden text-[#1c1c1e]"
            onClick={() => setMobileOpen(true)}
          >
            <Menu className="w-5 h-5" />
          </button>
          <h1 className="text-lg font-semibold">FocusPath</h1>
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-500">
              {new Date().toLocaleDateString("de-DE")}
            </span>
            <button
              className="sm:hidden text-[#1c1c1e]"
              onClick={() => signOut({ callbackUrl: "/login/login" })}
              aria-label="Abmelden"
            >
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        </header>

        {/* Main Content */}
        <div className="flex justify-center px-4 sm:px-6 md:px-8">
          <TooltipProvider>
            <main className="w-full max-w-full sm:max-w-2xl md:max-w-4xl bg-white shadow-md rounded-xl p-4 sm:p-6 md:p-8 mt-6 mb-8">
              {children}
            </main>
          </TooltipProvider>
        </div>
      </div>
    </div>
  );
}

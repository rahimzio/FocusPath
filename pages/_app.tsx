import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { Sidebar } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import "./globals.css";
import type { AppProps } from "next/app";

export default function App({ Component, pageProps }: AppProps) {
  return (
    <SidebarProvider>
      <AppSidebar /> {/* Sidebar appears on all pages */}
      <main>
      <SidebarTrigger />
        <Component {...pageProps} />
      </main>
    </SidebarProvider>
  );
}

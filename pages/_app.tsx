// pages/_app.tsx
import React from "react";
import { AppProps } from "next/app";
import { SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import "./globals.css";

function MyApp({ Component, pageProps }: AppProps) {
  return (
    <SidebarProvider>
      <AppSidebar />
      <main className="Main">
        <Component {...pageProps} />
      </main>
    </SidebarProvider>
  );
}

export default MyApp;

// pages/_app.tsx
import React from "react";
import { AppProps } from "next/app";
import { SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import "./globals.css";

// Importiere ToastContainer und die CSS-Styles von react-toastify
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

function MyApp({ Component, pageProps }: AppProps) {
  return (
    <SidebarProvider>
      <AppSidebar />
      <main className="Main">
        <Component {...pageProps} />
        {/* Füge den ToastContainer hinzu */}
        <ToastContainer 
          position="top-right"
          autoClose={5000}
          hideProgressBar={false}
          newestOnTop={false}
          closeOnClick
          rtl={false}
          pauseOnFocusLoss
          draggable
          pauseOnHover
          theme="colored"
        />
      </main>
    </SidebarProvider>
  );
}

export default MyApp;

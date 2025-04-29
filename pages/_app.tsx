import { SessionProvider, useSession } from "next-auth/react";
import { AppProps } from "next/app";
import { SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { ToastContainer } from "react-toastify";
import { AuthWrapper } from "@/components/login/AuthWrapper";

import "react-toastify/dist/ReactToastify.css";
import "./globals.css";

import { useRouter } from "next/router";

function AppContent({ Component, pageProps }: AppProps) {
  const { data: session } = useSession();
  const router = useRouter();

  const isAuthPage = router.pathname.startsWith("/login");

  return (
    <SidebarProvider>
      {/* Nur anzeigen wenn eingeloggt UND nicht auf Login/Register */}
      {session && !isAuthPage && <AppSidebar />}

      <AuthWrapper>
        <main className="Main">
          <Component {...pageProps} className="px-5"/>
          <ToastContainer position="top-right" autoClose={5000} theme="colored" />
        </main>
      </AuthWrapper>
    </SidebarProvider>
  );
}


function MyApp(appProps: AppProps) {
  return (
    <SessionProvider session={appProps.pageProps.session}>
      <AppContent {...appProps} />
    </SessionProvider>
  );
}



export default MyApp;

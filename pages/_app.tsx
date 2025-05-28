import { SessionProvider } from "next-auth/react";
import { AppProps } from "next/app";
import { ToastContainer } from "react-toastify";
import { AuthWrapper } from "@/components/login/AuthWrapper";
import AppLayout from "./AppLayout";
import "react-toastify/dist/ReactToastify.css";
import "./globals.css";

export default function MyApp({ Component, pageProps }: AppProps) {
  return (
    <SessionProvider session={pageProps.session}>
      <AuthWrapper>
        <AppLayout>
          <Component {...pageProps} />
          <ToastContainer position="top-right" autoClose={5000} theme="colored" />
        </AppLayout>
      </AuthWrapper>
    </SessionProvider>
  );
}

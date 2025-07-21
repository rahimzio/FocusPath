import { SessionProvider } from "next-auth/react";
import { AppProps } from "next/app";
import { ToastContainer } from "react-toastify";
import { AuthWrapper } from "@/components/login/AuthWrapper";
import AppLayout from "./AppLayout";
import { useRouter } from "next/router";
import "react-toastify/dist/ReactToastify.css";
import "./globals.css";

export default function MyApp({ Component, pageProps }: AppProps) {
  const router = useRouter();
  const authPaths = [
    "/login",
    "/login/login",
    "/login/register",
    "/login/forgot-password",
    "/login/reset-password",
  ]; const isAuthPage = authPaths.includes(router.pathname);

  const content = (
    <>
      <Component {...pageProps} />
      <ToastContainer position="top-right" autoClose={5000} theme="colored" />
    </>
  );

  return (
    <SessionProvider session={pageProps.session}>
      <AuthWrapper>
        {isAuthPage ? content : <AppLayout>{content}</AppLayout>}
      </AuthWrapper>
    </SessionProvider>
  );
}

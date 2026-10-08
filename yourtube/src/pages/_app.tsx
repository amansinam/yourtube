import type { AppProps } from "next/app";
import { Toaster } from "sonner";
import { AuthProvider } from "@/lib/AuthContext";
import OtpDialog from "@/components/OtpDialog";
import "@/styles/globals.css";
import { useEffect } from "react";
import { useAuth } from "@/lib/AuthContext";

function ThemeSync() {
  const { user } = useAuth();
  useEffect(() => { document.documentElement.classList.toggle("dark", user?.effectiveTheme === "dark"); }, [user?.effectiveTheme]);
  return null;
}

export default function App({ Component, pageProps }: AppProps) {
  return (
    <AuthProvider>
      <ThemeSync />
      <Component {...pageProps} />
      <OtpDialog />
      <Toaster position="bottom-center" richColors />
    </AuthProvider>
  );
}

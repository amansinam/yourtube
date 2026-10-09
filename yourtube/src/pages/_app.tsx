import type { AppProps } from "next/app";
import { Toaster } from "sonner";
import { AuthProvider } from "@/lib/AuthContext";
import "@/styles/globals.css";
import { useEffect } from "react";
import { useAuth } from "@/lib/AuthContext";

function ThemeSync() {
  const { user } = useAuth();
  useEffect(() => {
    const guestTheme = window.localStorage.getItem("yourtube_guest_theme");
    const theme = user?.effectiveTheme || guestTheme || "light";
    document.documentElement.classList.toggle("dark", theme === "dark");
  }, [user?.effectiveTheme]);
  return null;
}

export default function App({ Component, pageProps }: AppProps) {
  return (
    <AuthProvider>
      <ThemeSync />
      <Component {...pageProps} />
      <Toaster position="bottom-center" richColors />
    </AuthProvider>
  );
}

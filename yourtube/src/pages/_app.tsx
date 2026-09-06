import type { AppProps } from "next/app";
import { Toaster } from "sonner";
import { AuthProvider } from "@/lib/AuthContext";
import "@/styles/globals.css";

export default function App({ Component, pageProps }: AppProps) {
  return (
    <AuthProvider>
      <Component {...pageProps} />
      <Toaster position="bottom-center" richColors />
    </AuthProvider>
  );
}

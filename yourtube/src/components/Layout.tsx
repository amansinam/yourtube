import { useEffect, useState, ReactNode } from "react";
import Head from "next/head";
import Header from "./Header";
import Sidebar from "./Sidebar";

export default function Layout({
  children,
  title = "YourTube",
}: {
  children: ReactNode;
  title?: string;
}) {
  // Start closed so mobile never flashes an open drawer on refresh. Desktop
  // expands it after hydration, when the viewport can be read safely.
  const [sidebarOpen, setSidebarOpen] = useState(false);
  useEffect(() => {
    const desktop = window.matchMedia("(min-width: 640px)");
    const sync = () => setSidebarOpen(desktop.matches);
    sync();
    desktop.addEventListener("change", sync);
    return () => desktop.removeEventListener("change", sync);
  }, []);

  return (
    <>
      <Head>
        <title>{title}</title>
      </Head>
      <Header onToggleSidebar={() => setSidebarOpen((o) => !o)} />
      <Sidebar open={sidebarOpen} onNavigate={() => { if (window.innerWidth < 640) setSidebarOpen(false); }} />
      {sidebarOpen && <button aria-label="Close navigation" onClick={() => setSidebarOpen(false)} className="fixed inset-0 top-14 z-30 bg-black/40 sm:hidden" />}
      <main
        className={`pt-14 min-h-screen transition-all duration-200 ${
          sidebarOpen ? "sm:ml-64" : "sm:ml-[84px]"
        }`}
      >
        {children}
      </main>
    </>
  );
}

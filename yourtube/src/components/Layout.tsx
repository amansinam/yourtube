import { useState, ReactNode } from "react";
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
  const [sidebarOpen, setSidebarOpen] = useState(true);

  return (
    <>
      <Head>
        <title>{title}</title>
      </Head>
      <Header onToggleSidebar={() => setSidebarOpen((o) => !o)} />
      <Sidebar open={sidebarOpen} />
      <main
        className={`pt-14 min-h-screen transition-all duration-200 ${
          sidebarOpen ? "sm:ml-60" : "sm:ml-[72px]"
        }`}
      >
        {children}
      </main>
    </>
  );
}

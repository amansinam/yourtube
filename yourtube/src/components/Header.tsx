import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import Link from "next/link";
import Image from "next/image";
import { Menu, Search, Upload, LogOut, Moon, Sun, Shield } from "lucide-react";
import { useAuth } from "@/lib/AuthContext";
import api from "@/lib/api";
import VideoUploader from "./VideoUploader";

export default function Header({ onToggleSidebar }: { onToggleSidebar?: () => void }) {
  const [query, setQuery] = useState("");
  const [showUploader, setShowUploader] = useState(false);
  const [mobileSearch, setMobileSearch] = useState(false);
  const [guestTheme, setGuestTheme] = useState<"light" | "dark">("light");
  const router = useRouter();
  const { user, loginWithGoogle, logout, loading, refreshUser, loginError } = useAuth();
  useEffect(() => {
    setGuestTheme(window.localStorage.getItem("yourtube_guest_theme") === "dark" ? "dark" : "light");
  }, []);
  const theme = user?.effectiveTheme || guestTheme;
  async function toggleTheme() {
    const next = theme === "dark" ? "light" : "dark";
    if (!user) {
      setGuestTheme(next);
      window.localStorage.setItem("yourtube_guest_theme", next);
      document.documentElement.classList.toggle("dark", next === "dark");
      return;
    }
    const { data } = await api.patch("/user/theme", { theme: next });
    document.documentElement.classList.toggle("dark", data.user.effectiveTheme === "dark");
    await refreshUser();
  }

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = query.trim();
    if (trimmed) {
      router.push(`/search?q=${encodeURIComponent(trimmed)}`);
    }
  }

  return (
    <header className="fixed top-0 left-0 right-0 z-50 border-b border-gray-200 bg-white">
      <div className="flex h-14 items-center justify-between gap-2 px-3 sm:px-4">
      <div className="flex min-w-0 items-center gap-1 sm:gap-3">
        <button
          onClick={onToggleSidebar}
          className="ui-icon-button"
          aria-label="Toggle sidebar"
        >
          <Menu size={22} />
        </button>
        <Link href="/" className="truncate px-1 text-lg font-bold tracking-tight sm:text-xl">
          YourTube
        </Link>
      </div>

      <form
        onSubmit={handleSearch}
        className="hidden sm:flex flex-1 max-w-xl mx-4 items-center"
      >
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search"
          className="ui-input rounded-r-none"
        />
        <button
          type="submit"
          className="ui-icon-button -ml-px rounded-l-none border border-gray-300"
        >
          <Search size={18} />
        </button>
      </form>

      <div className="flex shrink-0 items-center gap-1 sm:gap-2">
        <button onClick={() => setMobileSearch((value) => !value)} className="ui-icon-button sm:hidden" aria-label="Search"><Search size={20} /></button>
        <button onClick={toggleTheme} className="ui-icon-button" title="Change theme" aria-label="Change theme">{theme === "dark" ? <Sun size={19}/> : <Moon size={19}/>}</button>
        {user && (
          <>
          <Link href="/security" className="ui-icon-button" title="Security"><Shield size={20}/></Link>
          <button
            onClick={() => setShowUploader(true)}
            className="ui-icon-button"
            aria-label="Upload video"
            title="Upload video"
          >
            <Upload size={20} />
          </button>
          </>
        )}

        {loading ? (
          <div className="w-8 h-8 rounded-full bg-gray-200 animate-pulse" />
        ) : user ? (
          <div className="flex items-center gap-2">
            <Link href={`/channel/${user._id}`} title={user.channelname}>
              {user.image ? (
                <Image
                  src={user.image}
                  alt={user.channelname || "channel"}
                  width={32}
                  height={32}
                  className="rounded-full"
                />
              ) : (
                <div className="w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center text-sm font-semibold">
                  {(user.channelname || user.email)[0]?.toUpperCase()}
                </div>
              )}
            </Link>
            <button
              onClick={() => logout()}
              className="ui-icon-button"
              title="Sign out"
            >
              <LogOut size={18} />
            </button>
          </div>
        ) : (
          <button
            onClick={() => loginWithGoogle()}
            className="ui-button ui-button-secondary px-3 py-2 text-sm"
          >
            Sign in with Google
          </button>
        )}
      </div></div>

      {mobileSearch && <form onSubmit={(event) => { handleSearch(event); setMobileSearch(false); }} className="flex gap-2 border-t border-gray-200 bg-white p-3 sm:hidden"><input autoFocus value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search videos" className="ui-input min-w-0 flex-1"/><button className="ui-button ui-button-primary" aria-label="Submit search"><Search size={18}/></button></form>}

      {!loading && !user && loginError && (
        <p role="alert" className="absolute right-4 top-14 max-w-sm rounded bg-red-50 px-3 py-2 text-sm text-red-700 shadow">
          {loginError}
        </p>
      )}

      {showUploader && (
        <VideoUploader onClose={() => setShowUploader(false)} />
      )}
    </header>
  );
}

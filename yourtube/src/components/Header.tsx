import { useState } from "react";
import { useRouter } from "next/router";
import Link from "next/link";
import Image from "next/image";
import { Menu, Search, Upload, LogOut } from "lucide-react";
import { useAuth } from "@/lib/AuthContext";
import VideoUploader from "./VideoUploader";

export default function Header({ onToggleSidebar }: { onToggleSidebar?: () => void }) {
  const [query, setQuery] = useState("");
  const [showUploader, setShowUploader] = useState(false);
  const router = useRouter();
  const { user, loginWithGoogle, logout, loading } = useAuth();

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = query.trim();
    if (trimmed) {
      router.push(`/search?q=${encodeURIComponent(trimmed)}`);
    }
  }

  return (
    <header className="fixed top-0 left-0 right-0 h-14 z-50 flex items-center justify-between px-4 bg-white border-b border-gray-200">
      <div className="flex items-center gap-4">
        <button
          onClick={onToggleSidebar}
          className="p-2 rounded-full hover:bg-gray-100"
          aria-label="Toggle sidebar"
        >
          <Menu size={22} />
        </button>
        <Link href="/" className="flex items-center gap-1">
          <span className="text-xl font-bold tracking-tight">YourTube</span>
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
          className="flex-1 border border-gray-300 rounded-l-full px-4 py-2 outline-none focus:border-blue-500"
        />
        <button
          type="submit"
          className="border border-l-0 border-gray-300 rounded-r-full px-5 py-2 bg-gray-50 hover:bg-gray-100"
        >
          <Search size={18} />
        </button>
      </form>

      <div className="flex items-center gap-3">
        {user && (
          <button
            onClick={() => setShowUploader(true)}
            className="p-2 rounded-full hover:bg-gray-100"
            aria-label="Upload video"
            title="Upload video"
          >
            <Upload size={20} />
          </button>
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
              className="p-2 rounded-full hover:bg-gray-100"
              title="Sign out"
            >
              <LogOut size={18} />
            </button>
          </div>
        ) : (
          <button
            onClick={() => loginWithGoogle()}
            className="flex items-center gap-2 px-3 py-1.5 border border-blue-500 text-blue-600 rounded-full hover:bg-blue-50 text-sm font-medium"
          >
            Sign in
          </button>
        )}
      </div>

      {showUploader && (
        <VideoUploader onClose={() => setShowUploader(false)} />
      )}
    </header>
  );
}

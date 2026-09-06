import Link from "next/link";
import { useRouter } from "next/router";
import { Home, Compass, Users, History, ThumbsUp, Clock } from "lucide-react";
import { useAuth } from "@/lib/AuthContext";

const navItems = [
  { href: "/", label: "Home", icon: Home },
  { href: "/explore", label: "Explore", icon: Compass },
  { href: "/subscriptions", label: "Subscriptions", icon: Users },
  { href: "/history", label: "History", icon: History },
  { href: "/liked", label: "Liked videos", icon: ThumbsUp },
  { href: "/watch-later", label: "Watch later", icon: Clock },
];

export default function Sidebar({ open }: { open: boolean }) {
  const router = useRouter();
  const { user } = useAuth();

  return (
    <aside
      className={`fixed top-14 left-0 bottom-0 bg-white border-r border-gray-200 overflow-y-auto transition-all duration-200 z-40 ${
        open ? "w-60" : "w-0 sm:w-[72px]"
      }`}
    >
      <nav className="py-2">
        {navItems.map(({ href, label, icon: Icon }) => {
          const active = router.pathname === href;
          const requiresAuth = ["/subscriptions", "/history", "/liked", "/watch-later"].includes(href);
          const disabled = requiresAuth && !user;

          return (
            <Link
              key={href}
              href={disabled ? "#" : href}
              onClick={(e) => disabled && e.preventDefault()}
              className={`flex items-center gap-5 px-6 py-2.5 mx-2 rounded-lg text-sm ${
                active ? "bg-gray-100 font-semibold" : "hover:bg-gray-100"
              } ${disabled ? "opacity-40 cursor-not-allowed" : ""} ${
                open ? "" : "justify-center px-0"
              }`}
              title={disabled ? "Sign in to view this" : label}
            >
              <Icon size={22} />
              {open && <span className="whitespace-nowrap overflow-hidden">{label}</span>}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}

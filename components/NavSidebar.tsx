"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase";

const NAV = [
  { href: "/dashboard", label: "Overzicht" },
  { href: "/dashboard/maandcijfers", label: "Maandcijfers" },
  { href: "/dashboard/jaarcijfers", label: "Jaarcijfers" },
  { href: "/dashboard/omzet", label: "Omzet" },
  { href: "/dashboard/kosten", label: "Kosten" },
  { href: "/dashboard/marge", label: "Marge" },
  { href: "/dashboard/klanten", label: "Klanten" },
  { href: "/dashboard/facturen", label: "Facturen" },
];

export default function NavSidebar({ email, rol }: { email: string; rol: string }) {
  const pad = usePathname();
  const router = useRouter();

  async function uitloggen() {
    const supabase = createSupabaseBrowserClient();
    await supabase.auth.signOut();
    router.push("/login");
  }

  return (
    <aside className="w-56 flex-shrink-0 bg-[#001D3A] text-white flex flex-col">
      <div className="px-5 py-6 border-b border-white/10">
        <p className="font-bold text-lg">Elztec</p>
        <p className="text-xs text-white/60 mt-0.5">Dashboard</p>
      </div>

      <nav className="flex-1 px-3 py-4 space-y-1">
        {NAV.map((item) => {
          const actief = pad === item.href || (item.href !== "/dashboard" && pad.startsWith(item.href));
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`block px-3 py-2 rounded-lg text-sm transition ${actief ? "bg-[#6979D6] font-semibold" : "hover:bg-white/10"}`}
            >
              {item.label}
            </Link>
          );
        })}
        {rol === "admin" && (
          <Link
            href="/dashboard/beheer"
            className={`block px-3 py-2 rounded-lg text-sm transition ${pad.startsWith("/dashboard/beheer") ? "bg-[#6979D6] font-semibold" : "hover:bg-white/10"}`}
          >
            Beheer
          </Link>
        )}
      </nav>

      <div className="px-5 py-4 border-t border-white/10">
        <p className="text-xs text-white/60 truncate mb-2">{email}</p>
        <button
          onClick={uitloggen}
          className="text-xs text-white/70 hover:text-white transition"
        >
          Uitloggen
        </button>
      </div>
    </aside>
  );
}

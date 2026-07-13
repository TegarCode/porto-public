"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const navItems = [
  { label: "Home", href: "/" },
  { label: "SIDE", href: "/projects/side-analysis" },
  { label: "Sentiment", href: "/projects/sentiment" },
  { label: "Scraping", href: "/projects/scraping" },
  { label: "Pentaho", href: "/projects/pentaho-dashboard" },
];

export function Navbar() {
  const pathname = usePathname();
  const isHome = pathname === "/";

  return (
    <header
      className={`fixed inset-x-0 top-0 z-50 border-b ${
        isHome
          ? "border-white/20 bg-ink/35 text-white backdrop-blur-md"
          : "border-ink/15 bg-background/88 text-ink backdrop-blur-md"
      }`}
    >
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6 md:px-10 lg:px-14">
        <Link href="/" className="flex items-center gap-3">
          <span
            className={`flex h-8 w-8 items-center justify-center border font-mono text-xs font-semibold ${
              isHome ? "border-white/40" : "border-ink/20"
            }`}
          >
            TO
          </span>
          <span className="hidden font-mono text-xs uppercase tracking-[0.22em] sm:inline">
            Tegar Oktavianto
          </span>
        </Link>

        <nav className="flex items-center gap-1 overflow-x-auto">
          {navItems.map((item) => {
            const isActive =
              item.href === "/"
                ? pathname === "/"
                : pathname.startsWith(item.href);

            return (
              <Link
                key={item.href}
                href={item.href}
                className={`whitespace-nowrap px-3 py-2 font-mono text-[11px] uppercase tracking-[0.16em] transition ${
                  isActive
                    ? isHome
                      ? "bg-white text-ink"
                      : "bg-ink text-white"
                    : isHome
                      ? "text-white/72 hover:text-white"
                      : "text-muted hover:text-ink"
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>
      </div>
    </header>
  );
}

"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

export type NavItem = { href: string; label: string };

/** Role navigation in the app header; highlights the current page. */
export function HeaderNav({ items }: { items: NavItem[] }) {
  const pathname = usePathname();
  if (items.length === 0) return null;
  // The most specific matching link is the active one (/student/badges is not "Home").
  const activeHref = items
    .filter((i) => pathname === i.href || pathname.startsWith(i.href + "/"))
    .sort((a, b) => b.href.length - a.href.length)[0]?.href;
  return (
    <nav aria-label="Main" className="-mx-1 flex gap-1 overflow-x-auto">
      {items.map((item) => {
        const active = item.href === activeHref;
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "shrink-0 rounded-full px-3 py-1.5 text-sm font-medium transition",
              active ? "bg-white text-brand shadow-sm" : "text-white/80 hover:bg-white/10 hover:text-white",
            )}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}

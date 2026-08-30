"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

/**
 * The section switcher.
 *
 * Built for more sections than it currently holds: it scrolls sideways rather
 * than wrapping, so adding Menu, Settings and Analytics later changes nothing
 * about the header's shape. The current section is marked by a gold rule under
 * it, which reads at a glance and does not depend on how many items there are.
 */
export function AdminNav({ items }: { items: { href: string; label: string }[] }) {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Admin sections"
      className="-mx-1 flex gap-1 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
    >
      {items.map((n) => {
        // /admin matches only itself; the rest match their whole section.
        const active = n.href === "/admin" ? pathname === "/admin" : pathname.startsWith(n.href);
        return (
          <Link
            key={n.href}
            href={n.href}
            aria-current={active ? "page" : undefined}
            className={`whitespace-nowrap border-b-2 px-3 py-1.5 text-[15px] transition-colors ${
              active
                ? "border-gold font-semibold text-ink"
                : "border-transparent text-ink-soft hover:border-line hover:text-ink"
            }`}
          >
            {n.label}
          </Link>
        );
      })}
    </nav>
  );
}

"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

/** Sticky category strip. Scrolls horizontally on a phone rather than wrapping. */
export function CategoryNav({
  categories,
}: {
  categories: { slug: string; nameEn: string }[];
}) {
  const pathname = usePathname();

  return (
    <div className="sticky top-16 z-30 border-b border-line-soft bg-cream/95 backdrop-blur sm:top-20">
      <div className="mx-auto max-w-content px-5 sm:px-8">
        <div className="flex gap-2 overflow-x-auto py-3 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          <Chip href="/menu" label="All" active={pathname === "/menu"} />
          {categories.map((c) => (
            <Chip
              key={c.slug}
              href={`/menu/${c.slug}`}
              label={c.nameEn}
              active={pathname === `/menu/${c.slug}`}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

function Chip({ href, label, active }: { href: string; label: string; active: boolean }) {
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={`whitespace-nowrap rounded-full border px-5 py-2 text-[14.5px] transition-colors ${
        active
          ? "border-ink bg-ink text-cream"
          : "border-line bg-cream-warm text-ink-soft hover:border-ink/40"
      }`}
    >
      {label}
    </Link>
  );
}

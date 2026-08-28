"use client";

import { useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { ProductCard } from "./product-card";
import type { ListedProduct } from "@/lib/catalog";

type Category = { slug: string; nameEn: string; products: ListedProduct[] };

/**
 * Browsing 70+ dishes.
 *
 * Category is the primary way in — the four categories are shown as real
 * choices, not an afterthought above one endless list. Search filters across
 * every dish at once and takes over the view while it has a query.
 */
export function MenuBrowser({
  categories,
  initialCategory = null,
}: {
  categories: Category[];
  initialCategory?: string | null;
}) {
  const [active, setActive] = useState<string | null>(initialCategory);
  const [query, setQuery] = useState("");
  // Carry the event context through every link, so the journey is never lost.
  const forEvent = useSearchParams().get("for") === "event";
  const q = forEvent ? "?for=event" : "";

  const all = useMemo(
    () => categories.flatMap((c) => c.products.map((p) => ({ p, cat: c }))),
    [categories],
  );

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return null;
    return all.filter(({ p }) =>
      (p.nameEn + " " + (p.descriptionEn ?? "")).toLowerCase().includes(q),
    );
  }, [query, all]);

  const shown = active ? categories.filter((c) => c.slug === active) : categories;

  return (
    <div>
      {/* Search + category bar */}
      <div className="sticky top-16 z-30 border-y border-line-soft bg-cream/95 backdrop-blur sm:top-20">
        <div className="mx-auto max-w-content px-5 sm:px-8">
          <div className="flex flex-col gap-3 py-4 lg:flex-row lg:items-center lg:gap-6">
            <label className="relative flex-1 lg:max-w-xs">
              <span className="sr-only">Search the menu</span>
              <svg
                width="15" height="15" viewBox="0 0 16 16" fill="none" aria-hidden="true"
                className="pointer-events-none absolute start-4 top-1/2 -translate-y-1/2 text-ink-faint"
              >
                <circle cx="7" cy="7" r="5.2" stroke="currentColor" strokeWidth="1.3" />
                <path d="M11 11l4 4" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
              </svg>
              <input
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search dishes"
                className="w-full rounded-full border border-line bg-cream-warm py-2.5 pe-4 ps-11 text-[15px] text-ink placeholder:text-ink-faint focus:border-gold focus:outline-none"
              />
            </label>

            <div className="-mx-5 flex gap-2 overflow-x-auto px-5 [scrollbar-width:none] lg:mx-0 lg:px-0 [&::-webkit-scrollbar]:hidden">
              <Chip label="All" active={active === null} onClick={() => setActive(null)} />
              {categories.map((c) => (
                <Chip
                  key={c.slug}
                  label={c.nameEn}
                  count={c.products.length}
                  active={active === c.slug}
                  onClick={() => setActive(c.slug)}
                />
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-content px-5 pb-10 sm:px-8">
        {results ? (
          <section className="pt-12">
            <p className="text-[15px] text-ink-soft">
              {results.length === 0
                ? "Nothing matched that."
                : `${results.length} ${results.length === 1 ? "dish" : "dishes"} matching "${query.trim()}"`}
            </p>
            {results.length > 0 && (
              <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                {results.map(({ p }) => (
                  <ProductCard key={p.id} product={p} forEvent={forEvent} />
                ))}
              </div>
            )}
            {results.length === 0 && (
              <button
                type="button"
                onClick={() => setQuery("")}
                className="mt-6 text-[15px] text-gold underline underline-offset-4"
              >
                Clear the search
              </button>
            )}
          </section>
        ) : (
          shown.map((category) => (
            <section key={category.slug} id={category.slug} className="scroll-mt-40 pt-16">
              <div className="flex flex-wrap items-baseline justify-between gap-4">
                <div className="flex items-baseline gap-4">
                  <h2 className="font-display text-[27px] font-semibold text-ink sm:text-[33px]">
                    {category.nameEn}
                  </h2>
                  <span className="text-[13.5px] tabular-nums text-ink-faint">
                    {category.products.length}
                  </span>
                </div>
                {!active && (
                  <Link href={`/menu/${category.slug}${q}`} className="text-[14.5px] text-gold hover:underline">
                    Only {category.nameEn.toLowerCase()} &rarr;
                  </Link>
                )}
              </div>
              <span className="hair mt-3" aria-hidden="true" />

              <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                {category.products.map((p) => (
                  <ProductCard key={p.id} product={p} forEvent={forEvent} />
                ))}
              </div>
            </section>
          ))
        )}
      </div>
    </div>
  );
}

function Chip({
  label, count, active, onClick,
}: { label: string; count?: number; active: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`flex items-center gap-2 whitespace-nowrap rounded-full border px-5 py-2 text-[14.5px] transition-colors ${
        active
          ? "border-ink bg-ink text-cream"
          : "border-line bg-cream-warm text-ink-soft hover:border-ink/40"
      }`}
    >
      {label}
      {count !== undefined && (
        <span className={`tabular-nums text-[12px] ${active ? "text-cream/60" : "text-ink-faint"}`}>
          {count}
        </span>
      )}
    </button>
  );
}

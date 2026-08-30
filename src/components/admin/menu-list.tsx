"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { formatEGP } from "@/lib/money";
import { setProductAvailability, moveProduct } from "@/app/admin/menu-actions";
import type { MenuProduct } from "@/lib/admin-menu";

/**
 * The menu, by course.
 *
 * The edit made most often is not an edit at all — it is "we have run out of
 * that today" — so availability is a switch on the row itself, and everything
 * else is one click further in.
 */

const FLAG_TEXT: Record<string, string> = {
  "no-unit": "No selling unit",
  "unreviewed-allergens": "Allergens unchecked",
  "has-note": "Has a note",
  "no-price": "No price",
};

export function MenuList({
  products, filter,
}: { products: MenuProduct[]; filter: string | null }) {
  const shown = products.filter((p) => {
    if (filter === "unavailable") return !p.isAvailable;
    if (filter === "no-unit") return p.flags.includes("no-unit");
    if (filter === "unreviewed") return p.flags.includes("unreviewed-allergens");
    if (filter === "notes") return p.flags.includes("has-note");
    return true;
  });

  const courses: { name: string; slug: string; items: MenuProduct[] }[] = [];
  for (const p of shown) {
    const last = courses[courses.length - 1];
    if (last && last.slug === p.category.slug) last.items.push(p);
    else courses.push({ name: p.category.nameEn, slug: p.category.slug, items: [p] });
  }

  if (shown.length === 0) {
    return (
      <p className="rounded-sm border border-line bg-cream-warm px-6 py-10 text-center text-[15.5px] text-ink-soft">
        Nothing here.
      </p>
    );
  }

  return (
    <div className="grid gap-6">
      {courses.map((c) => (
        <section key={c.slug} className="overflow-hidden rounded-sm border border-line bg-cream-warm">
          <header className="flex flex-wrap items-baseline justify-between gap-4 border-b border-line px-6 py-4">
            <h2 className="font-display text-[18px] font-semibold text-ink">{c.name}</h2>
            <span className="text-[13.5px] tabular-nums text-ink-faint">
              {c.items.length} {c.items.length === 1 ? "dish" : "dishes"}
            </span>
          </header>
          <ul className="divide-y divide-line-soft">
            {c.items.map((p, i) => (
              <Row key={p.id} product={p} first={i === 0} last={i === c.items.length - 1} />
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}

function Row({ product, first, last }: { product: MenuProduct; first: boolean; last: boolean }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const run = (fn: () => Promise<{ ok: boolean; error?: string }>) =>
    start(async () => {
      const r = await fn();
      if (!r.ok) setError(r.error ?? "That did not work.");
      else { setError(null); router.refresh(); }
    });

  const price =
    product.basePrice !== null
      ? formatEGP(product.basePrice)
      : product.variants.length > 0
        ? `from ${formatEGP(Math.min(...product.variants.map((v) => v.price)))}`
        : "—";

  return (
    <li className={`px-6 py-3.5 ${pending ? "opacity-60" : ""}`}>
      <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
        {/* Order within the course, which is the order customers see. */}
        <span className="flex flex-col gap-0.5">
          <button
            type="button" disabled={first || pending}
            onClick={() => run(() => moveProduct(product.id, "up"))}
            aria-label={`Move ${product.nameEn} up`}
            className="text-[11px] leading-none text-ink-faint hover:text-ink disabled:opacity-25"
          >
            &#9650;
          </button>
          <button
            type="button" disabled={last || pending}
            onClick={() => run(() => moveProduct(product.id, "down"))}
            aria-label={`Move ${product.nameEn} down`}
            className="text-[11px] leading-none text-ink-faint hover:text-ink disabled:opacity-25"
          >
            &#9660;
          </button>
        </span>

        <Link href={`/admin/menu/${product.id}`} className="min-w-0 flex-1">
          <span className="block font-display text-[17px] font-semibold text-ink hover:text-gold">
            {product.nameEn}
          </span>
          <span className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-1">
            {product.variants.length > 0 && (
              <span className="text-[13px] text-ink-faint">
                {product.variants.length} priced choices
              </span>
            )}
            {product.flags.map((f) => (
              <span key={f} className="rounded-full border border-line px-2 py-0.5 text-[11px] uppercase tracking-[0.12em] text-ink-faint">
                {FLAG_TEXT[f]}
              </span>
            ))}
            {product.isFeatured && (
              <span className="rounded-full border border-gold/45 px-2 py-0.5 text-[11px] uppercase tracking-[0.12em] text-gold">
                On the homepage
              </span>
            )}
          </span>
        </Link>

        <span className="whitespace-nowrap font-display text-[16px] font-semibold tabular-nums text-ink">
          {price}
        </span>

        {/* The daily edit. */}
        <button
          type="button"
          disabled={pending}
          onClick={() => run(() => setProductAvailability(product.id, !product.isAvailable))}
          aria-pressed={product.isAvailable}
          className={`whitespace-nowrap rounded-full border px-4 py-1.5 text-[13.5px] transition-colors ${
            product.isAvailable
              ? "border-[#2E6B45]/40 bg-[#2E6B45]/[0.08] text-[#2E6B45] hover:border-[#2E6B45]"
              : "border-[#A6391C]/40 bg-[#A6391C]/[0.07] text-[#A6391C] hover:border-[#A6391C]"
          }`}
        >
          {product.isAvailable ? "On the menu" : "Off the menu"}
        </button>
      </div>

      {error && <p className="mt-2 text-[13.5px] text-[#A6391C]">{error}</p>}
    </li>
  );
}

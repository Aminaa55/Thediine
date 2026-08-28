import Link from "next/link";
import { formatEGP } from "@/lib/money";
import { displayPrice, type ListedProduct } from "@/lib/catalog";

/**
 * Designed to be complete WITHOUT a photograph.
 *
 * Set against a printed menu card rather than a delivery-app tile: the dish
 * name and its price share a baseline under a gold hairline. When a real
 * photograph is uploaded the card grows an image; nothing else changes, and
 * nothing here ever implies a missing picture.
 */
export function ProductCard({ product }: { product: ListedProduct }) {
  const price = displayPrice(product);
  const allergens = product.allergens.map((a) => a.allergen.nameEn);

  return (
    <Link
      href={`/product/${product.slug}`}
      className="group relative flex flex-col overflow-hidden rounded-sm border border-line bg-cream-warm transition-all duration-200 hover:-translate-y-0.5 hover:border-gold/70 hover:shadow-[0_12px_28px_-20px_rgba(59,35,16,.5)]"
    >
      {product.imageUrl && (
        <div className="relative aspect-[4/3] overflow-hidden">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={product.imageUrl}
            alt={product.nameEn}
            loading="lazy"
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
          />
        </div>
      )}

      <div className="flex flex-1 flex-col p-6">
        <span className="hair" aria-hidden="true" />

        <h3 className="mt-4 font-display text-[19px] font-semibold leading-snug text-ink">
          {product.nameEn}
        </h3>

        {/* Selling unit and serving size appear only when supplied. */}
        {product.sellingUnitEn && (
          <p className="mt-1.5 text-[13px] text-ink-faint">{product.sellingUnitEn}</p>
        )}

        {product.descriptionEn && (
          <p className="mt-3 line-clamp-2 text-[14.5px] leading-relaxed text-ink-soft">
            {product.descriptionEn}
          </p>
        )}

        {allergens.length > 0 && (
          <p className="mt-4 text-[11px] uppercase tracking-[0.14em] text-ink-faint">
            {allergens.join(" · ")}
          </p>
        )}

        {/* Price sits on its own row so it stays put however long a dish name runs. */}
        <div className="mt-auto flex items-baseline justify-between gap-4 border-t border-line-soft pt-4 mt-6">
          {price ? (
            <span className="font-display text-[18px] font-semibold tabular-nums text-ink">
              {price.from && (
                <span className="me-1.5 font-body text-[12px] font-normal text-ink-faint">from</span>
              )}
              {formatEGP(price.amount)}
            </span>
          ) : (
            <span />
          )}
          <span className="whitespace-nowrap text-[13px] text-gold opacity-0 transition-opacity duration-200 group-hover:opacity-100">
            Choose &rarr;
          </span>
        </div>

        {!product.isAvailable && (
          <p className="mt-4 border-t border-line pt-3 text-[12px] uppercase tracking-[0.14em] text-ink-faint">
            Currently unavailable
          </p>
        )}
      </div>
    </Link>
  );
}

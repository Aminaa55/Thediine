import Link from "next/link";
import { DishImage } from "./dish-image";
import { formatEGP } from "@/lib/money";
import { displayPrice, type ListedProduct } from "@/lib/catalog";

export function ProductCard({ product }: { product: ListedProduct }) {
  const price = displayPrice(product);
  const allergens = product.allergens.map((a) => a.allergen.nameEn);

  return (
    <Link
      href={`/product/${product.slug}`}
      className="group flex flex-col overflow-hidden rounded-sm border border-line bg-cream-warm transition-colors duration-200 hover:border-gold/60"
    >
      <div className="relative aspect-[4/3] overflow-hidden">
        <DishImage name={product.nameEn} src={product.imageUrl} />
        {!product.isAvailable && (
          <div className="absolute inset-0 flex items-center justify-center bg-cream/75">
            <span className="rounded-full border border-ink/25 bg-cream px-4 py-1.5 text-[12px] uppercase tracking-widest text-ink-soft">
              Unavailable
            </span>
          </div>
        )}
      </div>

      <div className="flex flex-1 flex-col p-5">
        <h3 className="font-display text-[19px] font-semibold leading-snug text-ink">
          {product.nameEn}
        </h3>

        {/* Selling unit and serving size are shown only when the business has
            supplied them — never as a placeholder. */}
        {product.sellingUnitEn && (
          <p className="mt-1 text-[13px] text-ink-faint">{product.sellingUnitEn}</p>
        )}

        {product.descriptionEn && (
          <p className="mt-2 line-clamp-2 text-[14.5px] leading-relaxed text-ink-soft">
            {product.descriptionEn}
          </p>
        )}

        {allergens.length > 0 && (
          <p className="mt-3 text-[12px] uppercase tracking-wider text-ink-faint">
            Contains {allergens.join(" · ")}
          </p>
        )}

        <div className="mt-auto flex items-baseline gap-2 pt-5">
          {price && (
            <>
              {price.from && <span className="text-[13px] text-ink-faint">from</span>}
              <span className="font-display text-[19px] font-semibold text-ink tabular-nums">
                {formatEGP(price.amount)}
              </span>
            </>
          )}
          <span className="ms-auto text-[13px] text-gold opacity-0 transition-opacity group-hover:opacity-100">
            View &rarr;
          </span>
        </div>
      </div>
    </Link>
  );
}

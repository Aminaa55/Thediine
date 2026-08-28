import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getProduct, displayPrice } from "@/lib/catalog";
import { formatEGP } from "@/lib/money";
import { DishImage } from "@/components/dish-image";
import { ProductConfigurator } from "@/components/product-configurator";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const product = await getProduct(slug);
  return {
    title: product?.nameEn ?? "Menu",
    description: product?.descriptionEn ?? undefined,
  };
}

export default async function ProductPage({ params }: Props) {
  const { slug } = await params;
  const product = await getProduct(slug);
  if (!product) notFound();

  const price = displayPrice(product);
  const allergens = product.allergens.map((a) => a.allergen.nameEn);
  const serves =
    product.servesMin && product.servesMax
      ? `Serves ${product.servesMin}–${product.servesMax}`
      : product.servesMin
        ? `Serves ${product.servesMin}`
        : null;

  return (
    <article className="mx-auto max-w-content px-5 py-10 sm:px-8 sm:py-16">
      <nav className="mb-8 text-[14px] text-ink-faint">
        <Link href="/menu" className="hover:text-ink">Menu</Link>
        <span className="mx-2" aria-hidden="true">/</span>
        <Link href={`/menu/${product.category.slug}`} className="hover:text-ink">
          {product.category.nameEn}
        </Link>
      </nav>

      <div className="grid gap-10 lg:grid-cols-2 lg:gap-16">
        <div className="relative aspect-[4/3] overflow-hidden rounded-sm border border-line lg:sticky lg:top-28 lg:self-start">
          <DishImage name={product.nameEn} src={product.imageUrl} priority />
        </div>

        <div>
          <h1 className="font-display text-[32px] font-semibold leading-tight text-ink sm:text-[40px]">
            {product.nameEn}
          </h1>

          {/* Only rendered when the business has supplied the information. */}
          {(product.sellingUnitEn || serves) && (
            <p className="mt-3 text-[14.5px] text-ink-faint">
              {[product.sellingUnitEn, serves].filter(Boolean).join(" · ")}
            </p>
          )}

          {price && (
            <p className="mt-5 font-display text-[26px] font-semibold text-ink tabular-nums">
              {price.from && <span className="me-2 text-[15px] font-normal text-ink-faint">from</span>}
              {formatEGP(price.amount)}
            </p>
          )}

          {product.descriptionEn && (
            <p className="mt-6 text-[17px] leading-relaxed text-ink-soft">
              {product.descriptionEn}
            </p>
          )}

          {allergens.length > 0 && (
            <div className="mt-7 rounded-sm border border-line bg-cream-warm px-5 py-4">
              <p className="eyebrow">Allergens</p>
              <p className="mt-2 text-[15px] text-ink-soft">
                Contains {allergens.join(", ").toLowerCase()}.
              </p>
              <p className="mt-2 text-[13.5px] text-ink-faint">
                Please tell us about any allergy when you order.
              </p>
            </div>
          )}

          <ProductConfigurator
            productId={product.id}
            basePrice={product.basePrice}
            variants={product.variants}
            groups={product.optionGroups}
            minQuantity={product.minQuantity}
            quantityStep={product.quantityStep}
            isAvailable={product.isAvailable}
          />
        </div>
      </div>
    </article>
  );
}

import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getProduct, getEventTiers, displayPrice } from "@/lib/catalog";
import { ProductConfigurator } from "@/components/product-configurator";
import { ProductPrice } from "@/components/product-price";

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
  const [product, tiers] = await Promise.all([getProduct(slug), getEventTiers()]);
  if (!product) notFound();

  const price = displayPrice(product);
  const pricing = {
    eventPricingEnabled: product.eventPricingEnabled,
    tiers: product.eventTiers,
  };
  const allergens = product.allergens.map((a) => a.allergen.nameEn);
  const serves =
    product.servesMin && product.servesMax
      ? `Serves ${product.servesMin}-${product.servesMax}`
      : product.servesMin
        ? `Serves ${product.servesMin}`
        : null;
  const meta = [product.sellingUnitEn, serves].filter(Boolean);

  return (
    <article className="mx-auto max-w-3xl px-5 pb-16 sm:px-8">
      <div className="pt-6" />

      {product.imageUrl && (
        <div className="mb-10 aspect-[16/10] overflow-hidden rounded-sm border border-line">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={product.imageUrl} alt={product.nameEn} className="h-full w-full object-cover" />
        </div>
      )}

      {/* The header block carries the dish on its own — no photograph needed. */}
      <header className="rounded-sm border border-line bg-cream-warm px-6 py-8 sm:px-10 sm:py-10">
        <span className="hair" aria-hidden="true" />
        <p className="mt-5 eyebrow">{product.category.nameEn}</p>
        <h1 className="mt-3 font-display text-[32px] font-semibold leading-[1.15] text-ink sm:text-[42px]">
          {product.nameEn}
        </h1>

        {meta.length > 0 && (
          <p className="mt-3 text-[14.5px] text-ink-faint">{meta.join(" · ")}</p>
        )}

        {price && (
          <div className="mt-6">
            <ProductPrice
              amount={price.amount}
              from={price.from}
              pricing={pricing}
              tiers={tiers}
            />
          </div>
        )}

        {product.descriptionEn && (
          <p className="mt-6 max-w-xl text-[17px] leading-relaxed text-ink-soft">
            {product.descriptionEn}
          </p>
        )}
      </header>

      {allergens.length > 0 && (
        <div className="mt-5 rounded-sm border border-gold/30 bg-gold-pale/40 px-6 py-5">
          <p className="eyebrow">Allergens</p>
          <p className="mt-2 text-[15px] text-ink-soft">
            Contains {allergens.join(", ").toLowerCase()}. Please tell us about any
            allergy when you order.
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
        pricing={pricing}
        tiers={tiers}
      />
    </article>
  );
}

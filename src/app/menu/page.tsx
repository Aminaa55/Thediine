import type { Metadata } from "next";
import { getMenu } from "@/lib/catalog";
import { ProductCard } from "@/components/product-card";
import { CategoryNav } from "@/components/category-nav";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Menu" };

export default async function MenuPage() {
  const categories = await getMenu();

  return (
    <>
      <div className="mx-auto max-w-content px-5 pt-14 sm:px-8 sm:pt-20">
        <p className="eyebrow">Our menu</p>
        <h1 className="mt-3 font-display text-[36px] font-semibold leading-tight text-ink sm:text-[48px]">
          Everything we cook
        </h1>
        <p className="mt-5 max-w-xl text-[17px] leading-relaxed text-ink-soft">
          Choose whatever you like — there is no minimum order. Dishes with a choice of
          rice, sauce or accompaniment let you pick when you add them.
        </p>
      </div>

      <div className="mt-10">
        <CategoryNav categories={categories.map((c) => ({ slug: c.slug, nameEn: c.nameEn }))} />
      </div>

      <div className="mx-auto max-w-content px-5 pb-8 sm:px-8">
        {categories.map((category) => (
          <section key={category.id} id={category.slug} className="scroll-mt-32 pt-16">
            <div className="flex items-baseline gap-4">
              <h2 className="font-display text-[27px] font-semibold text-ink sm:text-[33px]">
                {category.nameEn}
              </h2>
              <span className="text-[13.5px] text-ink-faint tabular-nums">
                {category.products.length}
              </span>
            </div>
            <div className="mt-3 h-px w-full bg-line" />

            <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {category.products.map((p) => (
                <ProductCard key={p.id} product={p} />
              ))}
            </div>
          </section>
        ))}
      </div>
    </>
  );
}

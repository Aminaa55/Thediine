import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getCategories, getCategory } from "@/lib/catalog";
import { ProductCard } from "@/components/product-card";
import { CategoryNav } from "@/components/category-nav";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ category: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { category } = await params;
  const found = await getCategory(category);
  return { title: found?.nameEn ?? "Menu" };
}

export default async function CategoryPage({ params }: Props) {
  const { category } = await params;
  const [found, categories] = await Promise.all([getCategory(category), getCategories()]);
  if (!found) notFound();

  return (
    <>
      <div className="mx-auto max-w-content px-5 pt-14 sm:px-8 sm:pt-20">
        <p className="eyebrow">Our menu</p>
        <h1 className="mt-3 font-display text-[36px] font-semibold leading-tight text-ink sm:text-[48px]">
          {found.nameEn}
        </h1>
        {found.descriptionEn && (
          <p className="mt-5 max-w-xl text-[17px] leading-relaxed text-ink-soft">
            {found.descriptionEn}
          </p>
        )}
      </div>

      <div className="mt-10">
        <CategoryNav categories={categories.map((c) => ({ slug: c.slug, nameEn: c.nameEn }))} />
      </div>

      <div className="mx-auto max-w-content px-5 pb-8 pt-12 sm:px-8">
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {found.products.map((p) => (
            <ProductCard key={p.id} product={p} />
          ))}
        </div>
      </div>
    </>
  );
}

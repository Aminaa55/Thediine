import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getMenu } from "@/lib/catalog";
import { MenuBrowser } from "@/components/menu-browser";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ category: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { category } = await params;
  const all = await getMenu();
  const found = all.find((c) => c.slug === category);
  return { title: found?.nameEn ?? "Menu" };
}

export default async function CategoryPage({ params }: Props) {
  const { category } = await params;
  const categories = await getMenu();
  const found = categories.find((c) => c.slug === category);
  if (!found) notFound();

  return (
    <>
      <div className="border-b border-line bg-cream-deep">
        <div className="mx-auto max-w-content px-5 py-14 sm:px-8 sm:py-20">
          <p className="eyebrow">Our menu</p>
          <h1 className="mt-3 font-display text-[36px] font-semibold leading-tight text-ink sm:text-[48px]">
            {found.nameEn}
          </h1>
          <p className="mt-5 text-[17px] text-ink-soft">
            {found.products.length} dishes
          </p>
        </div>
      </div>

      <MenuBrowser categories={categories} initialCategory={found.slug} />
    </>
  );
}

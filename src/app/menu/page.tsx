import type { Metadata } from "next";
import { getMenu } from "@/lib/catalog";
import { MenuBrowser } from "@/components/menu-browser";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Menu" };

export default async function MenuPage() {
  const categories = await getMenu();
  const total = categories.reduce((n, c) => n + c.products.length, 0);

  return (
    <>
      <div className="border-b border-line bg-cream-deep">
        <div className="mx-auto max-w-content px-5 py-14 sm:px-8 sm:py-20">
          <p className="eyebrow">Our menu</p>
          <h1 className="mt-3 font-display text-[36px] font-semibold leading-tight text-ink sm:text-[48px]">
            Everything we cook
          </h1>
          <p className="mt-5 max-w-xl text-[17px] leading-relaxed text-ink-soft">
            {total} dishes across four courses. Pick a course to narrow things down, or
            search if you already know what you are after.
          </p>
        </div>
      </div>

      <MenuBrowser categories={categories} />
    </>
  );
}

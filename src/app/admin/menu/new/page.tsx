import Link from "next/link";
import { requireAdminPage } from "@/lib/admin-auth";
import { getCategories } from "@/lib/admin-menu";
import { NewDishForm } from "@/components/admin/new-dish-form";

export const dynamic = "force-dynamic";
export const metadata = { title: "Add a dish" };

export default async function NewDishPage() {
  await requireAdminPage();
  const categories = await getCategories();

  return (
    <div className="mx-auto max-w-2xl">
      <Link href="/admin/menu" className="text-[14px] text-ink-faint hover:text-ink">
        &larr; The menu
      </Link>
      <h1 className="mt-4 font-display text-[30px] font-semibold text-ink">Add a dish</h1>
      <p className="mt-3 text-[15.5px] leading-relaxed text-ink-soft">
        Just enough to put it on the menu. Everything else — the selling unit, allergens, priced
        choices, how it scales for events — comes next, on its own page.
      </p>

      <NewDishForm categories={categories.map((c) => ({ id: c.id, nameEn: c.nameEn }))} />
    </div>
  );
}

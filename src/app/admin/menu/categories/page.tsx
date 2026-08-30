import Link from "next/link";
import { requireAdminPage } from "@/lib/admin-auth";
import { getCategories } from "@/lib/admin-menu";
import { CategoryEditor } from "@/components/admin/category-editor";

export const dynamic = "force-dynamic";
export const metadata = { title: "Courses" };

export default async function CategoriesPage() {
  await requireAdminPage();
  const categories = await getCategories();

  return (
    <div className="mx-auto max-w-3xl">
      <Link href="/admin/menu" className="text-[14px] text-ink-faint hover:text-ink">
        &larr; The menu
      </Link>
      <h1 className="mt-4 font-display text-[30px] font-semibold text-ink">Courses</h1>
      <p className="mt-3 max-w-xl text-[15.5px] leading-relaxed text-ink-soft">
        The parts the menu is divided into, in the order customers see them. Hiding a course takes
        it off the site without touching the dishes in it.
      </p>

      <div className="mt-8">
        <CategoryEditor
          categories={categories.map((c) => ({
            id: c.id, nameEn: c.nameEn, descriptionEn: c.descriptionEn,
            isActive: c.isActive, count: c._count.products,
          }))}
        />
      </div>
    </div>
  );
}

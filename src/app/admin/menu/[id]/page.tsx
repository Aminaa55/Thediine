import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAdminPage } from "@/lib/admin-auth";
import { getMenuProduct, getCategories, getAllergens, getSharedTiers } from "@/lib/admin-menu";
import { DishEditor } from "@/components/admin/dish-editor";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Props) {
  const { id } = await params;
  const product = await getMenuProduct(id);
  return { title: product?.nameEn ?? "Dish" };
}

export default async function DishPage({ params }: Props) {
  await requireAdminPage();
  const { id } = await params;

  const [product, categories, allergens, sharedTiers] = await Promise.all([
    getMenuProduct(id), getCategories(), getAllergens(), getSharedTiers(),
  ]);
  if (!product) notFound();

  return (
    <div>
      <Link href="/admin/menu" className="text-[14px] text-ink-faint hover:text-ink">
        &larr; The menu
      </Link>

      <div className="mt-4 flex flex-wrap items-baseline justify-between gap-x-8 gap-y-2">
        <div>
          <p className="eyebrow">{product.category.nameEn}</p>
          <h1 className="mt-2 font-display text-[30px] font-semibold text-ink">{product.nameEn}</h1>
        </div>
        <Link href={`/product/${product.slug}`} target="_blank" className="text-[14px] text-gold hover:underline">
          See it on the site &rarr;
        </Link>
      </div>

      {product.archivedAt && (
        <p className="mt-5 rounded-sm border border-[#A6391C]/30 bg-[#A6391C]/[0.06] px-5 py-4 text-[15px] text-[#A6391C]">
          This dish is retired. It is off the menu but every order that contains it is intact.
        </p>
      )}

      <div className="mt-8">
        <DishEditor
          product={{
            id: product.id,
            nameEn: product.nameEn,
            descriptionEn: product.descriptionEn,
            categoryId: product.categoryId,
            basePrice: product.basePrice,
            sellingUnitEn: product.sellingUnitEn,
            unitConfirmed: product.unitConfirmed,
            unitRequired: product.unitRequired,
            servesMin: product.servesMin,
            servesMax: product.servesMax,
            minQuantity: product.minQuantity,
            quantityStep: product.quantityStep,
            menuGroups: product.menuGroups,
            reviewNote: product.reviewNote,
            isAvailable: product.isAvailable,
            isFeatured: product.isFeatured,
            eventPricingEnabled: product.eventPricingEnabled,
            eventPricingNote: product.eventPricingNote,
            variants: product.variants.map((v) => ({
              id: v.id, nameEn: v.nameEn, price: v.price, isAvailable: v.isAvailable,
            })),
            optionGroups: product.optionGroups.map((g) => ({
              id: g.id, nameEn: g.nameEn,
              choices: g.choices.map((c) => ({ id: c.id, nameEn: c.nameEn, isAvailable: c.isAvailable })),
            })),
            allergens: product.allergens.map((a) => ({
              allergen: { id: a.allergen.id, nameEn: a.allergen.nameEn }, reviewed: a.reviewed,
            })),
            eventTiers: product.eventTiers.map((t) => ({
              id: t.id, minGuests: t.minGuests, maxGuests: t.maxGuests,
              multiplierBp: t.multiplierBp, fixedPrice: t.fixedPrice,
            })),
            orderCount: product._count.orderItems,
          }}
          categories={categories.map((c) => ({ id: c.id, nameEn: c.nameEn, groupsEn: c.groupsEn }))}
          allergens={allergens.map((a) => ({ id: a.id, nameEn: a.nameEn }))}
          sharedTiers={sharedTiers.map((t) => ({
            minGuests: t.minGuests, maxGuests: t.maxGuests, multiplierBp: t.multiplierBp,
          }))}
        />
      </div>
    </div>
  );
}

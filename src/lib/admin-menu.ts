import { db } from "./db";
import { MULTIPLIER_SCALE } from "./event-pricing";

/**
 * The menu, as admin sees it.
 *
 * The customer's view hides anything unavailable or archived. This one shows
 * everything, plus the things the business still has to decide: a dish with no
 * selling unit, allergen tags nobody has checked, a note left during setup.
 */

export type MenuFlag = "no-unit" | "unreviewed-allergens" | "has-note" | "no-price";

export type MenuProduct = Awaited<ReturnType<typeof getMenuProducts>>[number];

export async function getMenuProducts() {
  const products = await db.product.findMany({
    where: { archivedAt: null },
    orderBy: [{ category: { sortOrder: "asc" } }, { sortOrder: "asc" }],
    select: {
      id: true, slug: true, nameEn: true, descriptionEn: true,
      basePrice: true, sellingUnitEn: true, unitConfirmed: true,
      isAvailable: true, isFeatured: true, sortOrder: true, reviewNote: true,
      eventPricingEnabled: true,
      category: { select: { id: true, slug: true, nameEn: true, sortOrder: true } },
      variants: {
        orderBy: { sortOrder: "asc" },
        select: { id: true, nameEn: true, price: true, isAvailable: true },
      },
      allergens: { select: { reviewed: true, allergen: { select: { slug: true, nameEn: true } } } },
      eventTiers: { select: { id: true } },
      _count: { select: { orderItems: true } },
    },
  });

  return products.map((p) => {
    const flags: MenuFlag[] = [];
    if (!p.sellingUnitEn || !p.unitConfirmed) flags.push("no-unit");
    if (p.allergens.some((a) => !a.reviewed)) flags.push("unreviewed-allergens");
    if (p.reviewNote) flags.push("has-note");
    if (p.basePrice === null && p.variants.length === 0) flags.push("no-price");
    return { ...p, flags };
  });
}

export async function getMenuProduct(id: string) {
  return db.product.findUnique({
    where: { id },
    include: {
      category: { select: { id: true, nameEn: true } },
      variants: { orderBy: { sortOrder: "asc" } },
      optionGroups: {
        orderBy: { sortOrder: "asc" },
        include: { choices: { orderBy: { sortOrder: "asc" } } },
      },
      allergens: { include: { allergen: true } },
      eventTiers: { orderBy: { minGuests: "asc" } },
      _count: { select: { orderItems: true } },
    },
  });
}

export async function getCategories() {
  return db.category.findMany({
    orderBy: { sortOrder: "asc" },
    select: {
      id: true, slug: true, nameEn: true, descriptionEn: true,
      isActive: true, sortOrder: true,
      _count: { select: { products: { where: { archivedAt: null } } } },
    },
  });
}

export async function getAllergens() {
  return db.allergen.findMany({ orderBy: { nameEn: "asc" } });
}

/** The shared ladder, shown beside a dish so its own bands make sense. */
export async function getSharedTiers() {
  return db.eventPriceTier.findMany({ orderBy: { minGuests: "asc" } });
}

/** "2.5x" from a stored multiplier. */
export function multiplierText(bp: number): string {
  const x = bp / MULTIPLIER_SCALE;
  return `${Number.isInteger(x) ? x : x.toFixed(2).replace(/0$/, "")}x`;
}

/** What is still waiting for a decision, for the menu header. */
export async function menuAttention() {
  const products = await getMenuProducts();
  return {
    total: products.length,
    unavailable: products.filter((p) => !p.isAvailable).length,
    noUnit: products.filter((p) => p.flags.includes("no-unit")).length,
    unreviewed: products.filter((p) => p.flags.includes("unreviewed-allergens")).length,
    notes: products.filter((p) => p.flags.includes("has-note")).length,
  };
}

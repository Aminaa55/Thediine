import { db } from "./db";
import { DEFAULT_EVENT_TIERS, type EventTier } from "./event-pricing";

/**
 * Every read of the menu goes through here, so the interface never hard-codes
 * a dish, a price or a category. Admin edits appear on the site immediately.
 *
 * Archived and unavailable products are excluded from customer-facing lists;
 * `reviewNote` is admin-only and is never selected into these shapes.
 */

const productSelect = {
  id: true,
  slug: true,
  nameEn: true,
  descriptionEn: true,
  basePrice: true,
  eventPricingEnabled: true,
  eventTiers: {
    orderBy: { minGuests: "asc" },
    select: { minGuests: true, maxGuests: true, multiplierBp: true, fixedPrice: true },
  },
  sellingUnitEn: true,
  menuGroups: true,
  servesMin: true,
  servesMax: true,
  minQuantity: true,
  quantityStep: true,
  imageUrl: true,
  isAvailable: true,
  isFeatured: true,
  category: { select: { slug: true, nameEn: true } },
  variants: {
    where: { isAvailable: true },
    orderBy: { sortOrder: "asc" },
    select: { id: true, nameEn: true, price: true },
  },
  allergens: { select: { allergen: { select: { slug: true, nameEn: true } } } },
} as const;

const configurableSelect = {
  ...productSelect,
  optionGroups: {
    orderBy: { sortOrder: "asc" },
    select: {
      id: true,
      nameEn: true,
      isRequired: true,
      choices: {
        where: { isAvailable: true },
        orderBy: { sortOrder: "asc" },
        select: { id: true, nameEn: true, priceDelta: true },
      },
    },
  },
} as const;

export type ListedProduct = Awaited<ReturnType<typeof getMenu>>[number]["products"][number];
export type FullProduct = NonNullable<Awaited<ReturnType<typeof getProduct>>>;

/** The whole menu, grouped by category, in admin-defined order. */
export async function getMenu() {
  return db.category.findMany({
    where: { isActive: true },
    orderBy: { sortOrder: "asc" },
    select: {
      id: true,
      slug: true,
      nameEn: true,
      descriptionEn: true,
      groupsEn: true,
      products: {
        where: { archivedAt: null },
        orderBy: { sortOrder: "asc" },
        select: productSelect,
      },
    },
  });
}

export async function getCategory(slug: string) {
  return db.category.findFirst({
    where: { slug, isActive: true },
    select: {
      id: true,
      slug: true,
      nameEn: true,
      descriptionEn: true,
      products: {
        where: { archivedAt: null },
        orderBy: { sortOrder: "asc" },
        select: productSelect,
      },
    },
  });
}

export async function getCategories() {
  return db.category.findMany({
    where: { isActive: true },
    orderBy: { sortOrder: "asc" },
    select: {
      slug: true,
      nameEn: true,
      _count: { select: { products: { where: { archivedAt: null } } } },
    },
  });
}

export async function getProduct(slug: string) {
  return db.product.findFirst({
    where: { slug, archivedAt: null },
    select: configurableSelect,
  });
}

/** Homepage picks: featured first, then whatever else is available. */
export async function getFeatured(take = 6) {
  const featured = await db.product.findMany({
    where: { archivedAt: null, isAvailable: true, isFeatured: true },
    orderBy: { sortOrder: "asc" },
    take,
    select: productSelect,
  });
  if (featured.length >= take) return featured;

  const filler = await db.product.findMany({
    where: {
      archivedAt: null,
      isAvailable: true,
      isFeatured: false,
      category: { slug: { in: ["main-courses", "desserts"] } },
    },
    orderBy: { sortOrder: "asc" },
    take: take - featured.length,
    select: productSelect,
  });
  return [...featured, ...filler];
}

/**
 * The shared event pricing ladder.
 *
 * Read from the database so the business can reprice every dish at once from
 * admin. Falls back to the ladder they supplied if the table has not been
 * seeded, so the site can never quietly drop back to normal prices for events.
 */
export async function getEventTiers(): Promise<EventTier[]> {
  const rows = await db.eventPriceTier.findMany({
    orderBy: { minGuests: "asc" },
    select: { minGuests: true, maxGuests: true, multiplierBp: true },
  });
  if (rows.length === 0) return DEFAULT_EVENT_TIERS;
  return rows.map((r) => ({ ...r, fixedPrice: null }));
}

/** Lowest price shown on a card: base price, or the cheapest variant. */
export function displayPrice(p: {
  basePrice: number | null;
  variants: { price: number }[];
}): { amount: number; from: boolean } | null {
  if (p.basePrice !== null) return { amount: p.basePrice, from: false };
  if (p.variants.length === 0) return null;
  const lowest = Math.min(...p.variants.map((v) => v.price));
  return { amount: lowest, from: p.variants.length > 1 };
}

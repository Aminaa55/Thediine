"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { currentAdmin } from "@/lib/admin-auth";
import { poundsToPiastres } from "@/lib/money";
import { MULTIPLIER_SCALE } from "@/lib/event-pricing";

/**
 * Editing the menu.
 *
 * Two rules run through all of it.
 *
 * A price is entered in POUNDS and stored in piastres, so nothing here ever
 * holds a price as a float.
 *
 * Nothing is ever deleted while an order points at it. A dish that has been
 * ordered is archived, not removed, and a variant that has been ordered can
 * only be switched off — because an order keeps its own snapshot of what was
 * bought, and the link back to the real dish is worth keeping intact.
 */

async function requireAdmin() {
  const admin = await currentAdmin();
  if (!admin) throw new Error("Not signed in.");
  return admin;
}

function refresh(id?: string) {
  revalidatePath("/admin/menu");
  if (id) revalidatePath(`/admin/menu/${id}`);
  // The customer site reads the same rows.
  revalidatePath("/menu");
  revalidatePath("/");
}

/** A price typed by a person: "1,250" or "1250.50" or "" for none. */
function parsePrice(raw: string): number | null {
  const clean = raw.replace(/[^\d.]/g, "").trim();
  if (!clean) return null;
  const n = Number(clean);
  if (!Number.isFinite(n) || n < 0) throw new Error(`"${raw}" is not a price.`);
  return poundsToPiastres(n);
}

export type SaveResult = { ok: true } | { ok: false; error: string };

// ------------------------------------------------------------- availability

/** The one edit made most often: we have run out of something. */
export async function setProductAvailability(id: string, isAvailable: boolean): Promise<SaveResult> {
  await requireAdmin();
  await db.product.update({ where: { id }, data: { isAvailable } });
  refresh(id);
  return { ok: true };
}

export async function setVariantAvailability(id: string, isAvailable: boolean): Promise<SaveResult> {
  await requireAdmin();
  const v = await db.productVariant.update({ where: { id }, data: { isAvailable } });
  refresh(v.productId);
  return { ok: true };
}

export async function setChoiceAvailability(id: string, isAvailable: boolean): Promise<SaveResult> {
  await requireAdmin();
  const choice = await db.optionChoice.update({
    where: { id },
    data: { isAvailable },
    select: { group: { select: { productId: true } } },
  });
  refresh(choice.group.productId);
  return { ok: true };
}

export async function setFeatured(id: string, isFeatured: boolean): Promise<SaveResult> {
  await requireAdmin();
  await db.product.update({ where: { id }, data: { isFeatured } });
  refresh(id);
  return { ok: true };
}

// -------------------------------------------------------------- the details

export type ProductDetails = {
  nameEn: string;
  descriptionEn: string;
  categoryId: string;
  /** In pounds, as typed. Empty when the dish sells through variants. */
  price: string;
  sellingUnitEn: string;
  unitConfirmed: boolean;
  /** Whether this dish is one that genuinely needs a unit stated. */
  unitRequired: boolean;
  servesMin: string;
  servesMax: string;
  minQuantity: string;
  quantityStep: string;
  reviewNote: string;
};

export async function saveProduct(id: string, input: ProductDetails): Promise<SaveResult> {
  await requireAdmin();

  if (!input.nameEn.trim()) return { ok: false, error: "A dish needs a name." };

  const product = await db.product.findUnique({
    where: { id },
    select: { id: true, variants: { select: { id: true } } },
  });
  if (!product) return { ok: false, error: "That dish no longer exists." };

  let price: number | null;
  try {
    price = parsePrice(input.price);
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "That is not a price." };
  }

  // The catalogue's own rule, enforced here too: a price OR variants, never both.
  if (price !== null && product.variants.length > 0) {
    return { ok: false, error: "This dish is priced by its choices. Clear the price, or remove the choices." };
  }
  if (price === null && product.variants.length === 0) {
    return { ok: false, error: "A dish needs a price, or priced choices." };
  }

  const int = (v: string, fallback: number) => {
    const n = Number(v.replace(/[^\d]/g, ""));
    return Number.isFinite(n) && n > 0 ? n : fallback;
  };

  await db.product.update({
    where: { id },
    data: {
      nameEn: input.nameEn.trim(),
      descriptionEn: input.descriptionEn.trim() || null,
      categoryId: input.categoryId,
      basePrice: price,
      sellingUnitEn: input.sellingUnitEn.trim() || null,
      // Confirmed only means something once there is something to confirm.
      unitConfirmed: input.unitConfirmed && input.sellingUnitEn.trim() !== "",
      unitRequired: input.unitRequired,
      servesMin: input.servesMin.trim() ? int(input.servesMin, 1) : null,
      servesMax: input.servesMax.trim() ? int(input.servesMax, 1) : null,
      minQuantity: int(input.minQuantity, 1),
      quantityStep: int(input.quantityStep, 1),
      reviewNote: input.reviewNote.trim() || null,
    },
  });
  refresh(id);
  return { ok: true };
}

// ----------------------------------------------------------------- variants

export async function saveVariant(
  productId: string,
  variantId: string | null,
  nameEn: string,
  price: string,
): Promise<SaveResult> {
  await requireAdmin();
  if (!nameEn.trim()) return { ok: false, error: "A choice needs a name." };

  let amount: number | null;
  try {
    amount = parsePrice(price);
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "That is not a price." };
  }
  if (amount === null) return { ok: false, error: "A priced choice needs a price." };

  if (variantId) {
    await db.productVariant.update({
      where: { id: variantId },
      data: { nameEn: nameEn.trim(), price: amount },
    });
  } else {
    const product = await db.product.findUnique({
      where: { id: productId },
      select: { basePrice: true, _count: { select: { variants: true } } },
    });
    if (!product) return { ok: false, error: "That dish no longer exists." };

    await db.$transaction([
      // Adding the first priced choice takes the single price off the dish.
      db.product.update({ where: { id: productId }, data: { basePrice: null } }),
      db.productVariant.create({
        data: {
          productId, nameEn: nameEn.trim(), price: amount,
          sortOrder: product._count.variants,
        },
      }),
    ]);
  }
  refresh(productId);
  return { ok: true };
}

/**
 * Removing a priced choice.
 *
 * Only ever when no order points at it. One that has been ordered is switched
 * off instead, so the order keeps its link to what was actually bought.
 */
export async function removeVariant(variantId: string): Promise<SaveResult> {
  await requireAdmin();
  const variant = await db.productVariant.findUnique({
    where: { id: variantId },
    select: { productId: true, _count: { select: { orderItems: true } } },
  });
  if (!variant) return { ok: false, error: "That choice no longer exists." };

  if (variant._count.orderItems > 0) {
    return {
      ok: false,
      error: "This choice has been ordered before, so it cannot be removed. Switch it off instead.",
    };
  }

  await db.productVariant.delete({ where: { id: variantId } });
  refresh(variant.productId);
  return { ok: true };
}

// ---------------------------------------------------------------- allergens

export async function setAllergen(
  productId: string,
  allergenId: string,
  present: boolean,
): Promise<SaveResult> {
  await requireAdmin();
  if (present) {
    await db.productAllergen.upsert({
      where: { productId_allergenId: { productId, allergenId } },
      update: {},
      // Added by hand here, so it is reviewed by definition.
      create: { productId, allergenId, reviewed: true },
    });
  } else {
    await db.productAllergen.deleteMany({ where: { productId, allergenId } });
  }
  refresh(productId);
  return { ok: true };
}

/** Someone has actually checked this dish's allergens against the recipe. */
export async function markAllergensReviewed(productId: string): Promise<SaveResult> {
  await requireAdmin();
  await db.productAllergen.updateMany({ where: { productId }, data: { reviewed: true } });
  refresh(productId);
  return { ok: true };
}

// ------------------------------------------------------------ event pricing

export async function setEventPricingEnabled(id: string, enabled: boolean): Promise<SaveResult> {
  await requireAdmin();
  await db.product.update({ where: { id }, data: { eventPricingEnabled: enabled } });
  refresh(id);
  return { ok: true };
}

export async function saveEventPricingNote(id: string, note: string): Promise<SaveResult> {
  await requireAdmin();
  await db.product.update({ where: { id }, data: { eventPricingNote: note.trim() || null } });
  refresh(id);
  return { ok: true };
}

/**
 * A dish's own guest bands.
 *
 * They REPLACE the shared ladder for that dish rather than merging with it, so
 * they are saved as a set: either the dish follows the shared ladder, or it
 * carries a complete ladder of its own.
 */
export async function saveProductTiers(
  productId: string,
  tiers: { minGuests: string; maxGuests: string; multiplier: string; price: string }[],
): Promise<SaveResult> {
  await requireAdmin();

  const rows: { minGuests: number; maxGuests: number; multiplierBp: number | null; fixedPrice: number | null }[] = [];

  for (const t of tiers) {
    const min = Number(t.minGuests), max = Number(t.maxGuests);
    if (!Number.isInteger(min) || !Number.isInteger(max) || min < 1 || max < min) {
      return { ok: false, error: `"${t.minGuests}–${t.maxGuests}" is not a guest range.` };
    }

    const hasMultiplier = t.multiplier.trim() !== "";
    const hasPrice = t.price.trim() !== "";
    if (hasMultiplier && hasPrice) {
      return { ok: false, error: `${min}–${max}: give a multiplier or a price, not both.` };
    }
    if (!hasMultiplier && !hasPrice) {
      return { ok: false, error: `${min}–${max}: give a multiplier or a price.` };
    }

    const multiplier = Number(t.multiplier);
    if (hasMultiplier && (!Number.isFinite(multiplier) || multiplier <= 0)) {
      return { ok: false, error: `"${t.multiplier}" is not a multiplier.` };
    }

    let fixed: number | null = null;
    if (hasPrice) {
      try {
        fixed = parsePrice(t.price);
      } catch {
        return { ok: false, error: `"${t.price}" is not a price.` };
      }
    }

    rows.push({
      minGuests: min, maxGuests: max,
      multiplierBp: hasMultiplier ? Math.round(multiplier * MULTIPLIER_SCALE) : null,
      fixedPrice: fixed,
    });
  }

  // Overlapping bands would make the price depend on which row was read first.
  const sorted = [...rows].sort((a, b) => a.minGuests - b.minGuests);
  for (let i = 1; i < sorted.length; i++) {
    if (sorted[i].minGuests <= sorted[i - 1].maxGuests) {
      return { ok: false, error: "Two bands overlap. Each guest count belongs to one band only." };
    }
  }

  await db.$transaction([
    db.productEventTier.deleteMany({ where: { productId } }),
    ...sorted.map((r, i) =>
      db.productEventTier.create({ data: { productId, ...r, sortOrder: i } }),
    ),
  ]);
  refresh(productId);
  return { ok: true };
}

/** Back to the shared ladder. */
export async function clearProductTiers(productId: string): Promise<SaveResult> {
  await requireAdmin();
  await db.productEventTier.deleteMany({ where: { productId } });
  refresh(productId);
  return { ok: true };
}

// ------------------------------------------------------- adding and retiring

export async function createProduct(input: {
  nameEn: string; categoryId: string; price: string; descriptionEn: string;
}): Promise<{ ok: true; id: string } | { ok: false; error: string }> {
  await requireAdmin();
  if (!input.nameEn.trim()) return { ok: false, error: "A dish needs a name." };
  if (!input.categoryId) return { ok: false, error: "Choose which part of the menu it belongs to." };

  let price: number | null;
  try {
    price = parsePrice(input.price);
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "That is not a price." };
  }
  if (price === null) return { ok: false, error: "A dish needs a price. Priced choices can be added afterwards." };

  const slug = input.nameEn.trim().toLowerCase()
    .replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 60);
  if (!slug) return { ok: false, error: "That name cannot be turned into a web address." };

  const clash = await db.product.findUnique({ where: { slug }, select: { id: true } });
  if (clash) return { ok: false, error: "A dish with that name already exists." };

  const last = await db.product.findFirst({
    where: { categoryId: input.categoryId },
    orderBy: { sortOrder: "desc" },
    select: { sortOrder: true },
  });

  const created = await db.product.create({
    data: {
      slug, nameEn: input.nameEn.trim(),
      descriptionEn: input.descriptionEn.trim() || null,
      categoryId: input.categoryId,
      basePrice: price,
      sortOrder: (last?.sortOrder ?? -1) + 1,
      // Never invented: the unit is filled in when the business knows it.
      sellingUnitEn: null, unitConfirmed: false,
    },
    select: { id: true },
  });
  refresh(created.id);
  return { ok: true, id: created.id };
}

/**
 * Taking a dish off the menu.
 *
 * Archived, never deleted: every order that ever contained it keeps its link,
 * and the dish can be brought back exactly as it was.
 */
export async function archiveProduct(id: string): Promise<SaveResult> {
  await requireAdmin();
  await db.product.update({ where: { id }, data: { archivedAt: new Date(), isAvailable: false } });
  refresh(id);
  return { ok: true };
}

export async function restoreProduct(id: string): Promise<SaveResult> {
  await requireAdmin();
  await db.product.update({ where: { id }, data: { archivedAt: null } });
  refresh(id);
  return { ok: true };
}

/** Moves a dish within its own part of the menu. */
export async function moveProduct(id: string, direction: "up" | "down"): Promise<SaveResult> {
  await requireAdmin();
  const product = await db.product.findUnique({
    where: { id },
    select: { id: true, categoryId: true, sortOrder: true },
  });
  if (!product) return { ok: false, error: "That dish no longer exists." };

  const neighbour = await db.product.findFirst({
    where: {
      categoryId: product.categoryId,
      archivedAt: null,
      sortOrder: direction === "up" ? { lt: product.sortOrder } : { gt: product.sortOrder },
    },
    orderBy: { sortOrder: direction === "up" ? "desc" : "asc" },
    select: { id: true, sortOrder: true },
  });
  if (!neighbour) return { ok: true };

  await db.$transaction([
    db.product.update({ where: { id: product.id }, data: { sortOrder: neighbour.sortOrder } }),
    db.product.update({ where: { id: neighbour.id }, data: { sortOrder: product.sortOrder } }),
  ]);
  refresh(id);
  return { ok: true };
}

// --------------------------------------------------------------- categories

export async function saveCategory(
  id: string,
  nameEn: string,
  descriptionEn: string,
  isActive: boolean,
): Promise<SaveResult> {
  await requireAdmin();
  if (!nameEn.trim()) return { ok: false, error: "A course needs a name." };
  await db.category.update({
    where: { id },
    data: { nameEn: nameEn.trim(), descriptionEn: descriptionEn.trim() || null, isActive },
  });
  refresh();
  revalidatePath("/admin/menu/categories");
  return { ok: true };
}

export async function moveCategory(id: string, direction: "up" | "down"): Promise<SaveResult> {
  await requireAdmin();
  const cat = await db.category.findUnique({ where: { id }, select: { id: true, sortOrder: true } });
  if (!cat) return { ok: false, error: "That course no longer exists." };

  const neighbour = await db.category.findFirst({
    where: { sortOrder: direction === "up" ? { lt: cat.sortOrder } : { gt: cat.sortOrder } },
    orderBy: { sortOrder: direction === "up" ? "desc" : "asc" },
    select: { id: true, sortOrder: true },
  });
  if (!neighbour) return { ok: true };

  await db.$transaction([
    db.category.update({ where: { id: cat.id }, data: { sortOrder: neighbour.sortOrder } }),
    db.category.update({ where: { id: neighbour.id }, data: { sortOrder: cat.sortOrder } }),
  ]);
  refresh();
  revalidatePath("/admin/menu/categories");
  return { ok: true };
}

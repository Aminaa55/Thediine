/**
 * Sets up a DEPLOYED database.
 *
 * This runs on every deployment, so it is built around one rule: it only ever
 * ADDS what is missing. It never updates, never deletes, and never overwrites.
 *
 * That makes a redeploy a no-op on a database that is already set up — the menu
 * cannot be duplicated, a price or a setting edited in admin cannot be reverted,
 * and no real order can be touched. It is the difference between this and the
 * development seed, which deliberately syncs a local database to the catalogue
 * file and would replace rows a real order still points at.
 *
 * It creates no orders, no customers and no payments. There is no test data in
 * a deployed database, ever.
 */
import { PrismaClient } from "@prisma/client";
import { ALLERGENS, CATALOGUE } from "./catalogue";
import { SETTINGS } from "./settings";
import { GALLERY } from "./gallery-seed";
import { poundsToPiastres } from "../src/lib/money";
import { DEFAULT_EVENT_TIERS, MULTIPLIER_SCALE } from "../src/lib/event-pricing";

const prisma = new PrismaClient();

/** What this run actually did, so the deployment log says so plainly. */
const added = {
  allergens: 0, settings: 0, eventTiers: 0, categories: 0,
  products: 0, variants: 0, optionChoices: 0, allergenTags: 0, gallery: 0,
  paymentOptions: 0, servingOptions: 0, menuGroups: 0,
};

async function main() {
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL is not set. The database cannot be set up without it.");
  }

  console.log("\nSetting up the database for The Diine.");
  console.log("Only missing data is added. Nothing existing is changed or removed.\n");

  // --- allergens -----------------------------------------------------------
  for (const a of ALLERGENS) {
    const exists = await prisma.allergen.findUnique({ where: { slug: a.slug } });
    if (exists) continue;
    await prisma.allergen.create({ data: { slug: a.slug, nameEn: a.name } });
    added.allergens++;
  }

  // --- settings ------------------------------------------------------------
  // Create-only. A value the owner has since edited is left exactly as it is.
  for (const [key, value] of Object.entries(SETTINGS)) {
    const exists = await prisma.setting.findUnique({ where: { key } });
    if (exists) continue;
    await prisma.setting.create({ data: { key, value } });
    added.settings++;
  }

  // --- how customers may pay, and how the food is served -------------------
  // The built-in rows, created once. Anything the business adds later is its
  // own, and nothing here ever overwrites a row that exists.
  const PAYMENTS = [
    { builtIn: "CASH", nameEn: "Cash", kind: "MANUAL" as const,
      isEnabled: true, verifyBeforeDelivery: false, sortOrder: 0,
      instructionsEn: null },
    { builtIn: "INSTAPAY", nameEn: "InstaPay", kind: "MANUAL" as const,
      isEnabled: true, verifyBeforeDelivery: true, sortOrder: 1,
      instructionsEn: null },
    { builtIn: "CARD", nameEn: "Card payment", kind: "INTEGRATED" as const,
      isEnabled: false, verifyBeforeDelivery: false, sortOrder: 2,
      instructionsEn: null },
  ];
  for (const p of PAYMENTS) {
    const exists = await prisma.paymentOption.findUnique({ where: { builtIn: p.builtIn } });
    if (exists) continue;
    await prisma.paymentOption.create({ data: p });
    added.paymentOptions++;
  }

  const SERVINGS = [
    { builtIn: "RETURNABLE", nameEn: "Returnable dishes", sortOrder: 0,
      descriptionEn: "Served in our own dishes, which we collect afterwards." },
    { builtIn: "DISPOSABLE", nameEn: "Disposable dishes", sortOrder: 1,
      descriptionEn: "Served in disposable containers \u2014 nothing to return." },
  ];
  for (const o of SERVINGS) {
    const exists = await prisma.servingOption.findUnique({ where: { builtIn: o.builtIn } });
    if (exists) continue;
    await prisma.servingOption.create({ data: o });
    added.servingOptions++;
  }

  // --- the shared event pricing ladder -------------------------------------
  for (const [i, t] of DEFAULT_EVENT_TIERS.entries()) {
    const exists = await prisma.eventPriceTier.findUnique({
      where: { minGuests_maxGuests: { minGuests: t.minGuests, maxGuests: t.maxGuests } },
    });
    if (exists) continue;
    await prisma.eventPriceTier.create({
      data: {
        minGuests: t.minGuests,
        maxGuests: t.maxGuests,
        multiplierBp: t.multiplierBp ?? MULTIPLIER_SCALE,
        sortOrder: i,
      },
    });
    added.eventTiers++;
  }

  // --- the menu ------------------------------------------------------------
  const allergenIds = new Map(
    (await prisma.allergen.findMany()).map((a) => [a.slug, a.id]),
  );

  for (const [catIndex, cat] of CATALOGUE.entries()) {
    let category = await prisma.category.findUnique({ where: { slug: cat.slug } });
    if (!category) {
      category = await prisma.category.create({
        data: {
          slug: cat.slug, nameEn: cat.name, sortOrder: catIndex,
          groupsEn: cat.groups ?? [],
        },
      });
      added.categories++;
    } else if (category.groupsEn.length === 0 && (cat.groups?.length ?? 0) > 0) {
      // Same rule as a product: a blank is filled once, and never touched again.
      category = await prisma.category.update({
        where: { id: category.id },
        data: { groupsEn: cat.groups! },
      });
    }

    for (const [pIndex, p] of cat.products.entries()) {
      // The same two rules the catalogue is written under, checked before the
      // database is touched rather than after.
      if (p.price === undefined && !p.variants?.length) {
        throw new Error(`${p.slug}: needs either a price or variants`);
      }
      if (p.price !== undefined && p.variants?.length) {
        throw new Error(`${p.slug}: cannot have both a price and variants`);
      }

      // A product that already exists is left completely alone — its price, its
      // variants and its options may have been edited since, and this must not
      // undo that.
      //
      // The ONE exception is a field that is still empty on it. A new field —
      // menu sections, when Main Courses was first divided into Meat, Poultry
      // and Seafood — arrives after the dishes already exist, so it would
      // otherwise stay blank on a database set up before it existed. Filling a
      // blank is not overwriting: the moment the field holds anything, whether
      // seeded here or chosen in admin, this leaves it alone for good.
      const existing = await prisma.product.findUnique({
        where: { slug: p.slug },
        select: { id: true, menuGroups: true },
      });
      if (existing) {
        if (existing.menuGroups.length === 0 && (p.groups?.length ?? 0) > 0) {
          await prisma.product.update({
            where: { id: existing.id },
            data: { menuGroups: p.groups! },
          });
          added.menuGroups++;
        }
        continue;
      }

      const product = await prisma.product.create({
        data: {
          slug: p.slug,
          nameEn: p.name,
          descriptionEn: p.description ?? null,
          categoryId: category.id,
          basePrice: p.price !== undefined ? poundsToPiastres(p.price) : null,
          // The portion, as the business supplied it. Confirmed by that fact.
          sellingUnitEn: p.unit ?? null,
          menuGroups: p.groups ?? [],
          unitConfirmed: p.unit !== undefined,
          reviewNote: p.note ?? null,
          sortOrder: pIndex,
          // Every dish follows the shared ladder unless the catalogue says
          // otherwise. No multiplier is written onto a product.
          eventPricingEnabled: p.eventPricing?.enabled ?? true,
          eventPricingNote: p.eventPricing?.note ?? null,
          variants: {
            create: (p.variants ?? []).map((v, i) => ({
              nameEn: v.name,
              price: poundsToPiastres(v.price),
              sortOrder: i,
            })),
          },
          optionGroups: {
            create: (p.options ?? []).map((g, gi) => ({
              nameEn: g.name,
              type: "SINGLE" as const,
              isRequired: true,
              minSelect: 1,
              maxSelect: 1,
              sortOrder: gi,
              choices: {
                // Confirmed: included accompaniments add nothing.
                create: g.choices.map((choice, ci) => ({
                  nameEn: choice, priceDelta: 0, sortOrder: ci,
                })),
              },
            })),
          },
          eventTiers: {
            create: (p.eventPricing?.tiers ?? []).map((t, i) => ({
              minGuests: t.minGuests,
              maxGuests: t.maxGuests,
              multiplierBp:
                t.multiplier !== undefined ? Math.round(t.multiplier * MULTIPLIER_SCALE) : null,
              fixedPrice: t.price !== undefined ? poundsToPiastres(t.price) : null,
              sortOrder: i,
            })),
          },
        },
        select: { id: true, _count: { select: { variants: true } } },
      });
      added.products++;
      added.variants += product._count.variants;
      added.optionChoices += (p.options ?? []).reduce((n, g) => n + g.choices.length, 0);

      // Allergens, pre-tagged from the menu text and all unreviewed.
      for (const slug of p.allergens ?? []) {
        const allergenId = allergenIds.get(slug);
        if (!allergenId) throw new Error(`${p.slug}: unknown allergen "${slug}"`);
        await prisma.productAllergen.create({
          data: { productId: product.id, allergenId, reviewed: false },
        });
        added.allergenTags++;
      }
    }
  }

  // --- the photographs -----------------------------------------------------
  // The image files themselves ship with the site, in public/gallery. These are
  // the rows that place them, with their alt text, captions and order.
  for (const [i, g] of GALLERY.entries()) {
    const exists = await prisma.galleryImage.findUnique({ where: { id: g.id } });
    if (exists) continue;
    await prisma.galleryImage.create({
      data: {
        id: g.id, imageUrl: g.imageUrl, altEn: g.alt, captionEn: g.caption,
        placement: "BOTH", sortOrder: i,
      },
    });
    added.gallery++;
  }

  // --- what is now there ---------------------------------------------------
  const [categories, products, tiers, gallery, settings, orders, customers] = await Promise.all([
    prisma.category.count(),
    prisma.product.count(),
    prisma.eventPriceTier.count(),
    prisma.galleryImage.count(),
    prisma.setting.count(),
    prisma.order.count(),
    prisma.customer.count(),
  ]);

  const changed = Object.values(added).reduce((n, x) => n + x, 0);
  if (changed === 0) {
    console.log("Nothing to do — the database is already set up.\n");
  } else {
    console.log("Added:");
    if (added.categories) console.log(`  categories       ${added.categories}`);
    if (added.products) console.log(`  products         ${added.products}`);
    if (added.variants) console.log(`  priced variants  ${added.variants}`);
    if (added.optionChoices) console.log(`  option choices   ${added.optionChoices}`);
    if (added.allergenTags) console.log(`  allergen tags    ${added.allergenTags}`);
    if (added.allergens) console.log(`  allergens        ${added.allergens}`);
    if (added.eventTiers) console.log(`  event tiers      ${added.eventTiers}`);
    if (added.settings) console.log(`  settings         ${added.settings}`);
    if (added.gallery) console.log(`  gallery images   ${added.gallery}`);
    if (added.paymentOptions) console.log(`  payment methods  ${added.paymentOptions}`);
    if (added.servingOptions) console.log(`  serving options  ${added.servingOptions}`);
    if (added.menuGroups) console.log(`  menu sections    ${added.menuGroups} dishes labelled`);
    console.log("");
  }

  console.log("The database now holds:");
  console.log(`  ${categories} categories, ${products} products`);
  console.log(`  ${tiers} event pricing tiers, ${settings} settings, ${gallery} photographs`);
  console.log(`  ${orders} orders, ${customers} customers — untouched by this step\n`);

  if (orders > 0) {
    console.log("Real orders are present. Nothing above changed, removed or re-linked any of them.\n");
  }
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error("\nThe database could not be set up:\n");
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });

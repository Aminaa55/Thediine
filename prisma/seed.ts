/**
 * The DEVELOPMENT seed.
 *
 * Syncs a database to `catalogue.ts`: products are matched on slug and updated,
 * and their variants, options and allergens are replaced wholesale so a local
 * database always matches the file exactly.
 *
 * That last part is why this is not what a deployment runs. Replacing a
 * product's variants gives them new ids, which would unpick the link from any
 * real order that referenced one. A deployed database is set up by
 * `bootstrap.ts` instead, which only ever adds what is missing.
 *
 * Settings left as an empty string are values the business has not yet
 * supplied. They are NOT given invented defaults, and are never overwritten.
 */
import { PrismaClient } from "@prisma/client";
import { ALLERGENS, CATALOGUE } from "./catalogue";
import { SETTINGS } from "./settings";
import { GALLERY } from "./gallery-seed";
import { poundsToPiastres } from "../src/lib/money";
import { DEFAULT_EVENT_TIERS, MULTIPLIER_SCALE } from "../src/lib/event-pricing";

const prisma = new PrismaClient();

async function main() {
  console.log("Seeding The Diine…\n");

  // --- allergens -----------------------------------------------------------
  for (const a of ALLERGENS) {
    await prisma.allergen.upsert({
      where: { slug: a.slug },
      update: { nameEn: a.name },
      create: { slug: a.slug, nameEn: a.name },
    });
  }
  console.log(`  allergens        ${ALLERGENS.length}`);

  // --- settings ------------------------------------------------------------
  for (const [key, value] of Object.entries(SETTINGS)) {
    await prisma.setting.upsert({
      where: { key },
      update: {},           // never overwrite a value the owner has since edited
      create: { key, value },
    });
  }
  console.log(`  settings         ${Object.keys(SETTINGS).length}`);

  // --- event pricing ladder ------------------------------------------------
  // The shared guest-count ladder, exactly as the business supplied it. It is
  // NOT copied into any product: dishes follow it unless they carry their own
  // bands. Editable from admin, so a re-run never overwrites a change.
  for (const [i, t] of DEFAULT_EVENT_TIERS.entries()) {
    await prisma.eventPriceTier.upsert({
      where: { minGuests_maxGuests: { minGuests: t.minGuests, maxGuests: t.maxGuests } },
      update: {},
      create: {
        minGuests: t.minGuests,
        maxGuests: t.maxGuests,
        multiplierBp: t.multiplierBp ?? MULTIPLIER_SCALE,
        sortOrder: i,
      },
    });
  }
  console.log(`  event tiers      ${DEFAULT_EVENT_TIERS.length}`);

  // --- gallery -------------------------------------------------------------
  // Real photographs supplied by the business. Ordering, captions and
  // placement are all editable from admin.
  for (const [i, g] of GALLERY.entries()) {
    await prisma.galleryImage.upsert({
      where: { id: g.id },
      update: { imageUrl: g.imageUrl, altEn: g.alt, captionEn: g.caption, sortOrder: i },
      create: {
        id: g.id, imageUrl: g.imageUrl, altEn: g.alt, captionEn: g.caption,
        placement: "BOTH", sortOrder: i,
      },
    });
  }
  console.log(`  gallery images   ${GALLERY.length}`);

  // --- catalogue -----------------------------------------------------------
  const allergenIds = new Map(
    (await prisma.allergen.findMany()).map((a) => [a.slug, a.id]),
  );

  let productCount = 0;
  let variantCount = 0;
  let choiceCount = 0;
  let unitsMissing = 0;

  for (const [catIndex, cat] of CATALOGUE.entries()) {
    const category = await prisma.category.upsert({
      where: { slug: cat.slug },
      update: { nameEn: cat.name, sortOrder: catIndex },
      create: { slug: cat.slug, nameEn: cat.name, sortOrder: catIndex },
    });

    for (const [pIndex, p] of cat.products.entries()) {
      if (p.price === undefined && !p.variants?.length) {
        throw new Error(`${p.slug}: needs either a price or variants`);
      }
      if (p.price !== undefined && p.variants?.length) {
        throw new Error(`${p.slug}: cannot have both a price and variants`);
      }

      const data = {
        nameEn: p.name,
        descriptionEn: p.description ?? null,
        categoryId: category.id,
        basePrice: p.price !== undefined ? poundsToPiastres(p.price) : null,
        // Selling units were not supplied — left empty, flagged for admin.
        sellingUnitEn: null,
        unitConfirmed: false,
        reviewNote: p.note ?? null,
        sortOrder: pIndex,
        // Every dish follows the shared ladder unless the catalogue says
        // otherwise. No multiplier is written onto a product here.
        eventPricingEnabled: p.eventPricing?.enabled ?? true,
        eventPricingNote: p.eventPricing?.note ?? null,
      };

      const product = await prisma.product.upsert({
        where: { slug: p.slug },
        update: data,
        create: { slug: p.slug, ...data },
      });
      productCount++;
      unitsMissing++;

      // A dish's own bands replace the shared ladder for that dish. None are
      // supplied yet: the business has not given per-dish scaling.
      await prisma.productEventTier.deleteMany({ where: { productId: product.id } });
      for (const [tIndex, t] of (p.eventPricing?.tiers ?? []).entries()) {
        await prisma.productEventTier.create({
          data: {
            productId: product.id,
            minGuests: t.minGuests,
            maxGuests: t.maxGuests,
            multiplierBp: t.multiplier !== undefined
              ? Math.round(t.multiplier * MULTIPLIER_SCALE) : null,
            fixedPrice: t.price !== undefined ? poundsToPiastres(t.price) : null,
            sortOrder: tIndex,
          },
        });
      }

      // Replace variants and options wholesale so re-seeding stays clean.
      await prisma.productVariant.deleteMany({ where: { productId: product.id } });
      for (const [vIndex, v] of (p.variants ?? []).entries()) {
        await prisma.productVariant.create({
          data: {
            productId: product.id,
            nameEn: v.name,
            price: poundsToPiastres(v.price),
            sortOrder: vIndex,
          },
        });
        variantCount++;
      }

      await prisma.optionGroup.deleteMany({ where: { productId: product.id } });
      for (const [gIndex, g] of (p.options ?? []).entries()) {
        const group = await prisma.optionGroup.create({
          data: {
            productId: product.id,
            nameEn: g.name,
            type: "SINGLE",
            isRequired: true,
            minSelect: 1,
            maxSelect: 1,
            sortOrder: gIndex,
          },
        });
        for (const [cIndex, choice] of g.choices.entries()) {
          await prisma.optionChoice.create({
            data: {
              groupId: group.id,
              nameEn: choice,
              priceDelta: 0, // confirmed: included accompaniments add nothing
              sortOrder: cIndex,
            },
          });
          choiceCount++;
        }
      }

      // Allergens: pre-tagged from the menu text, all unreviewed.
      await prisma.productAllergen.deleteMany({ where: { productId: product.id } });
      for (const slug of p.allergens ?? []) {
        const allergenId = allergenIds.get(slug);
        if (!allergenId) throw new Error(`${p.slug}: unknown allergen "${slug}"`);
        await prisma.productAllergen.create({
          data: { productId: product.id, allergenId, reviewed: false },
        });
      }
    }
  }

  console.log(`  categories       ${CATALOGUE.length}`);
  console.log(`  products         ${productCount}`);
  console.log(`  priced variants  ${variantCount}`);
  console.log(`  option choices   ${choiceCount}`);

  const scaling = await prisma.product.count({ where: { eventPricingEnabled: true } });
  const exceptions = await prisma.productEventTier.groupBy({ by: ["productId"] });
  console.log(`  event pricing    ${scaling} dishes scale by guest count, ` +
    `${exceptions.length} with their own bands`);
  console.log(`\n  ${unitsMissing} products have no selling unit yet — expected.`);
  console.log("  All allergen tags are unreviewed and need checking before launch.\n");
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });

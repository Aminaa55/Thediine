/**
 * Seeds the catalogue, the allergen list and the business-rule settings.
 *
 * Idempotent: safe to run repeatedly. Products are matched on slug, so a
 * re-run updates rather than duplicates.
 *
 * Settings left as an empty string are values the business has not yet
 * supplied. They are NOT given invented defaults.
 */
import { PrismaClient } from "@prisma/client";
import { ALLERGENS, CATALOGUE } from "./catalogue";
import { GALLERY } from "./gallery-seed";
import { poundsToPiastres } from "../src/lib/money";
import { DEFAULT_EVENT_TIERS, MULTIPLIER_SCALE } from "../src/lib/event-pricing";

const prisma = new PrismaClient();

/** Confirmed business rules. Everything here is editable from admin. */
const SETTINGS: Record<string, string> = {
  currency: "EGP",
  timezone: "Africa/Cairo",

  // Normal orders
  normal_notice_hours: "48",
  normal_cutoff_time: "", // TO CONFIRM — no default invented
  normal_daily_capacity: "3",
  pickup_counts_toward_capacity: "true",
  minimum_order_value_piastres: "0", // confirmed: no minimum

  // Event orders
  event_notice_days: "5",
  event_max_guests: "100", // hard ceiling, enforced server-side
  event_default_capacity_mode: "BLOCK_DAY",

  // Cancellation
  normal_free_cancellation_hours: "24",
  event_free_cancellation_hours: "48",
  late_cancellation_percent: "20",
  customer_self_cancel_enabled: "false", // confirmed: admin cancels only

  // Payment
  payment_cash_enabled: "true",
  payment_instapay_enabled: "true",
  // The owner's switch. Card is offered only when this is not "false" AND a
  // payment provider is configured in the environment; configuring the provider
  // is the deliberate act that turns card on.
  payment_card_enabled: "true",
  instapay_account_details: "", // TO CONFIRM

  // Contact
  whatsapp_number: "+201123030107",

  // Serving setup — the choice is live, the policy text is not yet written.
  serving_setup_policy_en: "", // TO CONFIRM
  serving_setup_policy_ar: "",
};

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

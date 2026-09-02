/**
 * Brings an EXISTING database up to date with `prisma/catalogue.ts`.
 *
 * A fresh database gets everything from the catalogue directly, through
 * `prisma/bootstrap.ts`. This script exists for a database that already has
 * products in it — it applies a price and portion revision without disturbing
 * anything a real order depends on.
 *
 * What it does, and deliberately does NOT do:
 *
 *  - Products are matched BY SLUG, so a dish keeps the id it already has and
 *    every order pointing at it still reads correctly.
 *  - Variants are matched BY NAME. A price changes in place; a new size is
 *    added; a variant that is no longer offered is marked UNAVAILABLE rather
 *    than deleted, because an order line may point at it.
 *  - A dish that has left the menu is ARCHIVED, never deleted — the same safe
 *    retirement admin uses.
 *  - Options, choices and allergens on an existing dish are left ALONE. The
 *    revision changed prices and portions, not accompaniments, and the
 *    allergen review is still outstanding.
 *  - No order, order line, customer or payment is touched. Orders carry their
 *    own copies of names and prices, so none of this rewrites history.
 *
 * Safe to run twice: the second run reports no changes.
 */
import { PrismaClient } from "@prisma/client";
import { CATALOGUE } from "../prisma/catalogue";
import { poundsToPiastres } from "../src/lib/money";

const db = new PrismaClient();

const changed: string[] = [];
const added: string[] = [];
const archived: string[] = [];

function note(list: string[], line: string) {
  list.push(line);
}

async function main() {
  if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is not set.");

  const allergenIds = new Map(
    (await db.allergen.findMany()).map((a) => [a.slug, a.id]),
  );

  const seen = new Set<string>();

  for (const [catIndex, cat] of CATALOGUE.entries()) {
    const category = await db.category.upsert({
      where: { slug: cat.slug },
      update: {},
      create: { slug: cat.slug, nameEn: cat.name, sortOrder: catIndex },
    });

    for (const [pIndex, p] of cat.products.entries()) {
      seen.add(p.slug);

      const wantsVariants = (p.variants?.length ?? 0) > 0;
      const basePrice = p.price !== undefined ? poundsToPiastres(p.price) : null;

      const existing = await db.product.findUnique({
        where: { slug: p.slug },
        include: { variants: true },
      });

      // ---------------------------------------------------------- new dish
      if (!existing) {
        const created = await db.product.create({
          data: {
            slug: p.slug,
            nameEn: p.name,
            descriptionEn: p.description ?? null,
            categoryId: category.id,
            basePrice,
            sellingUnitEn: p.unit ?? null,
            unitConfirmed: p.unit !== undefined,
            reviewNote: p.note ?? null,
            sortOrder: pIndex,
            variants: {
              create: (p.variants ?? []).map((v, i) => ({
                nameEn: v.name, price: poundsToPiastres(v.price), sortOrder: i,
              })),
            },
            optionGroups: {
              create: (p.options ?? []).map((g, gi) => ({
                nameEn: g.name, type: "SINGLE" as const, isRequired: true,
                minSelect: 1, maxSelect: 1, sortOrder: gi,
                choices: {
                  create: g.choices.map((c, ci) => ({
                    nameEn: c, priceDelta: 0, sortOrder: ci,
                  })),
                },
              })),
            },
          },
        });
        for (const slug of p.allergens ?? []) {
          const allergenId = allergenIds.get(slug);
          if (!allergenId) throw new Error(`${p.slug}: unknown allergen "${slug}"`);
          await db.productAllergen.create({
            data: { productId: created.id, allergenId, reviewed: false },
          });
        }
        note(added, `${p.name} — ${p.unit ?? ""} ${basePrice !== null ? `EGP ${p.price}` : ""}`.trim());
        continue;
      }

      // ------------------------------------------------------ existing dish
      const before = {
        price: existing.basePrice,
        unit: existing.sellingUnitEn,
      };

      await db.product.update({
        where: { id: existing.id },
        data: {
          nameEn: p.name,
          descriptionEn: p.description ?? null,
          categoryId: category.id,
          // A dish that now sells by size has no single price of its own.
          basePrice: wantsVariants ? null : basePrice,
          sellingUnitEn: p.unit ?? null,
          unitConfirmed: p.unit !== undefined,
          // Cleared: the portion is stated once, in the words the business
          // used. Printing a number as well gives "1 kg / serves 5 · Serves 5-5".
          servesMin: null,
          servesMax: null,
          reviewNote: p.note ?? null,
          sortOrder: pIndex,
        },
      });

      const moves: string[] = [];
      if (!wantsVariants && before.price !== basePrice) {
        moves.push(`EGP ${money(before.price)} → ${money(basePrice)}`);
      }
      if (before.unit !== (p.unit ?? null)) {
        moves.push(`portion ${before.unit ? `"${before.unit}"` : "—"} → "${p.unit ?? "—"}"`);
      }

      // ---------------------------------------------------------- variants
      for (const [vIndex, v] of (p.variants ?? []).entries()) {
        const price = poundsToPiastres(v.price);
        const match = existing.variants.find((x) => x.nameEn === v.name);
        if (!match) {
          await db.productVariant.create({
            data: { productId: existing.id, nameEn: v.name, price, sortOrder: vIndex },
          });
          moves.push(`+ size "${v.name}" EGP ${v.price}`);
          continue;
        }
        if (match.price !== price || match.sortOrder !== vIndex || !match.isAvailable) {
          await db.productVariant.update({
            where: { id: match.id },
            data: { price, sortOrder: vIndex, isAvailable: true },
          });
          if (match.price !== price) {
            moves.push(`"${v.name}" EGP ${money(match.price)} → ${v.price}`);
          }
        }
      }

      // A size no longer offered is hidden, never deleted: an order line may
      // still point at it, and that line must keep reading correctly.
      const keep = new Set((p.variants ?? []).map((v) => v.name));
      for (const v of existing.variants) {
        if (!keep.has(v.nameEn) && v.isAvailable) {
          await db.productVariant.update({ where: { id: v.id }, data: { isAvailable: false } });
          moves.push(`- size "${v.nameEn}" hidden`);
        }
      }

      if (moves.length) note(changed, `${p.name} — ${moves.join(", ")}`);
    }
  }

  // ------------------------------------------------- dishes off the menu
  const strays = await db.product.findMany({
    where: { archivedAt: null, slug: { notIn: [...seen] } },
    select: { id: true, nameEn: true },
  });
  for (const s of strays) {
    await db.product.update({
      where: { id: s.id },
      data: { archivedAt: new Date(), isAvailable: false },
    });
    note(archived, s.nameEn);
  }

  report();
}

function money(p: number | null) {
  return p === null ? "—" : String(p / 100);
}

function report() {
  const section = (title: string, lines: string[]) => {
    console.log(`\n${title} (${lines.length})`);
    if (!lines.length) console.log("  nothing");
    for (const l of lines) console.log(`  ${l}`);
  };
  section("UPDATED", changed);
  section("ADDED", added);
  section("ARCHIVED", archived);
  console.log("\nNo order, order line, customer or payment was touched.\n");
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => db.$disconnect());

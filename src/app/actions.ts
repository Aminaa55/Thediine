"use server";

import { db } from "@/lib/db";
import type { CartLine } from "@/lib/cart";

/**
 * Resolves cart references against the database.
 *
 * The browser sends only ids and quantities; every name and price comes from
 * here. Anything that has since been archived, made unavailable or deleted
 * comes back flagged so the cart can tell the customer rather than silently
 * dropping it.
 */

export type ResolvedOption = { groupName: string; choiceName: string; priceDelta: number };

export type ResolvedLine = {
  key: string;
  productId: string;
  slug: string;
  productName: string;
  variantName: string | null;
  options: ResolvedOption[];
  instructions: string;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
  minQuantity: number;
  quantityStep: number;
  unavailable: boolean;
  problem: string | null;
};

export type ResolvedCart = { lines: ResolvedLine[]; subtotal: number };

export async function resolveCart(lines: CartLine[]): Promise<ResolvedCart> {
  if (lines.length === 0) return { lines: [], subtotal: 0 };

  const products = await db.product.findMany({
    where: { id: { in: [...new Set(lines.map((l) => l.productId))] } },
    select: {
      id: true,
      slug: true,
      nameEn: true,
      basePrice: true,
      isAvailable: true,
      archivedAt: true,
      minQuantity: true,
      quantityStep: true,
      variants: { select: { id: true, nameEn: true, price: true, isAvailable: true } },
      optionGroups: {
        select: {
          id: true,
          nameEn: true,
          choices: { select: { id: true, nameEn: true, priceDelta: true, isAvailable: true } },
        },
      },
    },
  });

  const byId = new Map(products.map((p) => [p.id, p]));
  const resolved: ResolvedLine[] = [];

  for (const line of lines) {
    const product = byId.get(line.productId);
    if (!product || product.archivedAt) {
      resolved.push(missing(line, "This dish is no longer on the menu."));
      continue;
    }

    const variant = line.variantId
      ? product.variants.find((v) => v.id === line.variantId)
      : null;
    if (line.variantId && !variant) {
      resolved.push(missing(line, "That choice is no longer offered.", product.nameEn, product.slug));
      continue;
    }

    const base = variant ? variant.price : product.basePrice;
    if (base === null) {
      resolved.push(missing(line, "This dish needs to be chosen again.", product.nameEn, product.slug));
      continue;
    }

    const options: ResolvedOption[] = [];
    let delta = 0;
    for (const group of product.optionGroups) {
      const choice = group.choices.find((c) => line.choiceIds.includes(c.id));
      if (!choice) continue;
      options.push({
        groupName: group.nameEn,
        choiceName: choice.nameEn,
        priceDelta: choice.priceDelta,
      });
      delta += choice.priceDelta;
    }

    const unitPrice = base + delta;
    const unavailable =
      !product.isAvailable || (variant ? !variant.isAvailable : false);

    resolved.push({
      key: line.key,
      productId: product.id,
      slug: product.slug,
      productName: product.nameEn,
      variantName: variant?.nameEn ?? null,
      options,
      instructions: line.instructions,
      quantity: line.quantity,
      unitPrice,
      lineTotal: unitPrice * line.quantity,
      minQuantity: product.minQuantity,
      quantityStep: product.quantityStep,
      unavailable,
      problem: unavailable ? "Currently unavailable." : null,
    });
  }

  // Unavailable lines stay visible but are excluded from the subtotal.
  const subtotal = resolved
    .filter((l) => !l.unavailable && !l.problem)
    .reduce((sum, l) => sum + l.lineTotal, 0);

  return { lines: resolved, subtotal };
}

function missing(
  line: CartLine,
  problem: string,
  name = "Unavailable dish",
  slug = "",
): ResolvedLine {
  return {
    key: line.key,
    productId: line.productId,
    slug,
    productName: name,
    variantName: null,
    options: [],
    instructions: line.instructions,
    quantity: line.quantity,
    unitPrice: 0,
    lineTotal: 0,
    minQuantity: 1,
    quantityStep: 1,
    unavailable: true,
    problem,
  };
}

/**
 * Server-side validation of an event request.
 *
 * The 100-guest ceiling is a business rule, not a message on a form: a request
 * over the limit is rejected here even if the browser is bypassed entirely.
 * The ceiling is read from the `event_max_guests` setting so it can be changed
 * from admin without a deploy.
 */
export async function validateEventRequest(input: {
  eventType: string | null;
  eventTypeOther: string;
  date: string;
  time: string;
  guestCount: string;
  venue: string;
}): Promise<{ ok: boolean; errors: Record<string, string> }> {
  const { validateEvent, EVENT_GUESTS, parseGuests } = await import("@/lib/ordering");

  const result = validateEvent(input);

  const setting = await db.setting.findUnique({ where: { key: "event_max_guests" } });
  const max = setting ? Number(setting.value) : EVENT_GUESTS.max;
  const guests = parseGuests(input.guestCount);

  if (Number.isFinite(max) && guests !== null && guests > max) {
    return {
      ok: false,
      errors: { ...result.errors, guestCount: `We currently cater events for up to ${max} guests.` },
    };
  }
  return result;
}

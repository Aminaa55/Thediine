"use server";

import { db } from "@/lib/db";
import type { CartLine } from "@/lib/cart";
import { eventUnitPrice, type EventTier } from "@/lib/event-pricing";
import { getEventTiers } from "@/lib/catalog";
import { parseGuests } from "@/lib/ordering";

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
  /** What is actually charged: the event price for an event, otherwise the menu price. */
  unitPrice: number;
  /** The normal menu price, kept so an event line can show what it scaled from. */
  normalUnitPrice: number;
  /** The guest band applied to this line, or null when nothing scaled it. */
  eventTier: EventTier | null;
  lineTotal: number;
  minQuantity: number;
  quantityStep: number;
  unavailable: boolean;
  problem: string | null;
};

export type ResolvedCart = {
  lines: ResolvedLine[];
  subtotal: number;
  /** The guest count the event prices were worked out from. */
  guestCount: number | null;
};

/**
 * Resolving an EVENT cart needs the guest count, because event food is priced
 * by guest band. Passing none resolves at normal menu prices.
 *
 * This is the authoritative price. The browser recalculates the same numbers so
 * the menu updates instantly when the guest count changes, but what a customer
 * is charged is always what comes back from here.
 */
export type ResolveOptions = { guestCount?: string | null };

export async function resolveCart(
  lines: CartLine[],
  options: ResolveOptions = {},
): Promise<ResolvedCart> {
  const guests = options.guestCount ? parseGuests(options.guestCount) : null;
  if (lines.length === 0) return { lines: [], subtotal: 0, guestCount: guests };

  const sharedTiers = guests === null ? [] : await getEventTiers();

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
      eventPricingEnabled: true,
      eventTiers: {
        orderBy: { minGuests: "asc" },
        select: { minGuests: true, maxGuests: true, multiplierBp: true, fixedPrice: true },
      },
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

    /**
     * Event scaling applies to the dish price. Option choices are added at face
     * value afterwards: an accompaniment is a choice, not a quantity, and every
     * one of them is +0 EGP today.
     */
    const priced = eventUnitPrice(
      base,
      guests,
      { eventPricingEnabled: product.eventPricingEnabled, tiers: product.eventTiers },
      sharedTiers,
    );

    const unitPrice = priced.amount + delta;
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
      normalUnitPrice: priced.base + delta,
      eventTier: priced.scaled ? priced.tier : null,
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

  return { lines: resolved, subtotal, guestCount: guests };
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
    normalUnitPrice: 0,
    eventTier: null,
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
 * The guest ceiling and the notice period are business rules, not messages on
 * a form: a request over the limit, or too close to the day, is rejected here
 * even if the browser is bypassed entirely. Both are read from settings, so
 * changing them in admin changes what the server enforces without a deploy.
 */
export async function validateEventRequest(input: {
  eventType: string | null;
  eventTypeOther: string;
  date: string;
  time: string;
  guestCount: string;
  venue: string;
}): Promise<{ ok: boolean; errors: Record<string, string> }> {
  const { validateEvent, toDateInput } = await import("@/lib/ordering");
  const { getRules, earliestEventFrom } = await import("@/lib/settings");

  const rules = await getRules();
  return validateEvent(input, {
    eventEarliest: toDateInput(earliestEventFrom(rules)),
    eventNoticeLabel: rules.eventNoticeLabel,
    maxGuests: rules.maxGuests,
  });
}

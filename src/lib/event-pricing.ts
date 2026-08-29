/**
 * Event food pricing.
 *
 * A normal order and an event order are NOT the same dish at the same price.
 * For an event the same dish is cooked in a much larger quantity, so its price
 * scales with the guest count. Normal orders are never touched by anything in
 * this file: they always use the stored menu price.
 *
 * Two things are deliberately kept apart:
 *
 *   1. The LADDER — which guest counts map to which multiplier. There is one
 *      shared default ladder (below, and seeded into `EventPriceTier` so it is
 *      editable from admin), and any product may carry its own ladder instead.
 *   2. The PRODUCT — each dish decides whether event pricing applies to it at
 *      all, and may override the ladder because its ingredient cost or serving
 *      size scales differently.
 *
 * Nothing here is written into a product row. A dish with no ladder of its own
 * follows the shared one, so changing the shared ladder changes every dish that
 * has not been given an exception.
 */

/** Multipliers are integers: 10000 = 1x, 15000 = 1.5x. Never a float. */
export const MULTIPLIER_SCALE = 10_000;

export type EventTier = {
  minGuests: number;
  /** Inclusive. */
  maxGuests: number;
  /** Multiplier on the base price, in units of MULTIPLIER_SCALE. */
  multiplierBp: number | null;
  /** A flat price in piastres for this band, used instead of the multiplier. */
  fixedPrice: number | null;
};

/**
 * The starting ladder, as supplied by the business.
 *
 * Every step is half a multiple per ten guests. It is the DEFAULT, not a rule
 * baked into each dish: a dish that scales differently gets its own rows.
 */
export const DEFAULT_EVENT_TIERS: EventTier[] = [
  { minGuests: 1, maxGuests: 10, multiplierBp: 10_000, fixedPrice: null }, // 1x
  { minGuests: 11, maxGuests: 20, multiplierBp: 15_000, fixedPrice: null }, // 1.5x
  { minGuests: 21, maxGuests: 30, multiplierBp: 20_000, fixedPrice: null }, // 2x
  { minGuests: 31, maxGuests: 40, multiplierBp: 25_000, fixedPrice: null }, // 2.5x
  { minGuests: 41, maxGuests: 50, multiplierBp: 30_000, fixedPrice: null }, // 3x
  { minGuests: 51, maxGuests: 60, multiplierBp: 35_000, fixedPrice: null }, // 3.5x
  { minGuests: 61, maxGuests: 70, multiplierBp: 40_000, fixedPrice: null }, // 4x
  { minGuests: 71, maxGuests: 80, multiplierBp: 45_000, fixedPrice: null }, // 4.5x
  { minGuests: 81, maxGuests: 90, multiplierBp: 50_000, fixedPrice: null }, // 5x
  { minGuests: 91, maxGuests: 100, multiplierBp: 55_000, fixedPrice: null }, // 5.5x
];

/**
 * What a single product does for events.
 *
 * `tiers` empty means "use the shared ladder". A product that supplies its own
 * tiers replaces the shared ladder entirely for that dish, rather than merging
 * with it — a partial ladder would leave silent gaps.
 */
export type ProductEventPricing = {
  eventPricingEnabled: boolean;
  tiers: EventTier[];
};

export const NORMAL_PRICING: ProductEventPricing = {
  eventPricingEnabled: false,
  tiers: [],
};

/** The ladder that actually applies to a dish. */
export function ladderFor(
  product: ProductEventPricing,
  shared: EventTier[] = DEFAULT_EVENT_TIERS,
): EventTier[] {
  return product.tiers.length > 0 ? product.tiers : shared;
}

/**
 * The band a guest count falls in.
 *
 * A count above the top band clamps to it rather than falling back to the base
 * price. The 100-guest ceiling is enforced elsewhere, so this cannot happen in
 * the normal flow; if it ever does, charging the top band is the safe failure
 * and charging 1x is not.
 */
export function tierFor(guests: number, tiers: EventTier[]): EventTier | null {
  if (tiers.length === 0 || !Number.isFinite(guests) || guests < 1) return null;
  const sorted = [...tiers].sort((a, b) => a.minGuests - b.minGuests);
  const hit = sorted.find((t) => guests >= t.minGuests && guests <= t.maxGuests);
  if (hit) return hit;
  const top = sorted[sorted.length - 1];
  return guests > top.maxGuests ? top : null;
}

export type EventPrice = {
  /** What the customer pays per unit for this event, in piastres. */
  amount: number;
  /** The normal menu price, in piastres — kept so the two can be shown together. */
  base: number;
  /** The band applied, or null when event pricing did not apply. */
  tier: EventTier | null;
  /** True when the price differs from the normal menu price. */
  scaled: boolean;
};

/**
 * The event price of one unit of a dish.
 *
 * Integer arithmetic throughout, rounded half up to the nearest piastre. With
 * whole-pound menu prices and the supplied half-step ladder the result is exact;
 * the rounding only guards against a future multiplier that is not a half step.
 *
 * Falls back to the base price — unchanged, never a guess — when the dish has
 * event pricing switched off, when no guest count has been given yet, or when
 * no band matches.
 */
export function eventUnitPrice(
  base: number,
  guests: number | null,
  product: ProductEventPricing,
  shared: EventTier[] = DEFAULT_EVENT_TIERS,
): EventPrice {
  if (!product.eventPricingEnabled || guests === null) {
    return { amount: base, base, tier: null, scaled: false };
  }

  const tier = tierFor(guests, ladderFor(product, shared));
  if (!tier) return { amount: base, base, tier: null, scaled: false };

  if (tier.fixedPrice !== null) {
    return { amount: tier.fixedPrice, base, tier, scaled: tier.fixedPrice !== base };
  }
  if (tier.multiplierBp === null) {
    return { amount: base, base, tier, scaled: false };
  }

  const amount = Math.round((base * tier.multiplierBp) / MULTIPLIER_SCALE);
  return { amount, base, tier, scaled: amount !== base };
}

/** "2.5x" — for showing the customer why an event price differs. */
export function formatMultiplier(multiplierBp: number): string {
  const x = multiplierBp / MULTIPLIER_SCALE;
  return `${Number.isInteger(x) ? x : x.toFixed(1)}×`;
}

/** "41–50 guests" — the band label. */
export function formatTierRange(tier: EventTier): string {
  return `${tier.minGuests}–${tier.maxGuests} guests`;
}

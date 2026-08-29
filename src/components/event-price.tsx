"use client";

import { useCart } from "@/lib/cart";
import { parseGuests } from "@/lib/ordering";
import { formatEGP } from "@/lib/money";
import {
  eventUnitPrice,
  formatMultiplier,
  formatTierRange,
  tierFor,
  type EventTier,
  type ProductEventPricing,
} from "@/lib/event-pricing";

/**
 * Event prices on the menu.
 *
 * The guest count lives in the customer's event draft, in the browser, so the
 * price on a dish is worked out here rather than baked into the page. Change the
 * guest count and every event price on the site follows immediately.
 *
 * The server recalculates the same figures when the cart is resolved, and that
 * is what a customer is actually charged; this is the display of it.
 */

/** The guest count from the event in progress, or null before one is given. */
export function useEventGuests(): number | null {
  const { event, ready } = useCart();
  if (!ready) return null;
  return parseGuests(event.guestCount);
}

export type PricingProps = {
  pricing: ProductEventPricing;
  tiers: EventTier[];
};

/**
 * A price on a menu card or a product page.
 *
 * Outside the event journey this is simply the menu price. Inside it, the event
 * price leads and the normal price is shown struck through beside it, so the
 * customer can see the scaling rather than wondering why a number changed.
 */
export function Price({
  amount,
  from = false,
  forEvent,
  pricing,
  tiers,
  size = "card",
}: {
  amount: number;
  from?: boolean;
  forEvent: boolean;
  pricing: ProductEventPricing;
  tiers: EventTier[];
  size?: "card" | "page";
}) {
  const guests = useEventGuests();
  const priced = eventUnitPrice(amount, forEvent ? guests : null, pricing, tiers);
  const big = size === "page";

  return (
    <span className="block">
      <span
        className={`font-display font-semibold tabular-nums text-ink ${
          big ? "text-[27px]" : "text-[18px]"
        }`}
      >
        {from && (
          <span
            className={`me-1.5 font-body font-normal text-ink-faint ${
              big ? "text-[15px]" : "text-[12px]"
            }`}
          >
            from
          </span>
        )}
        {formatEGP(priced.amount)}
      </span>

      {/*
        Not struck through: the regular price has not been reduced, it has been
        scaled up for an event portion. Struck-through text reads as a discount.
      */}
      {priced.scaled && (
        <span className={`ms-2 font-body text-ink-faint ${big ? "text-[15px]" : "text-[12.5px]"}`}>
          {priced.tier?.multiplierBp != null && (
            <span className="tabular-nums">{formatMultiplier(priced.tier.multiplierBp)} </span>
          )}
          regular <span className="tabular-nums">{formatEGP(priced.base)}</span>
        </span>
      )}
    </span>
  );
}

/**
 * The one-line explanation of why event prices differ, shown where they are.
 *
 * It names the band rather than only the multiplier, so a customer near the top
 * of a band can see what moving up would mean before it happens.
 */
export function EventPricingNote({
  tiers,
  className = "",
}: {
  tiers: EventTier[];
  className?: string;
}) {
  const guests = useEventGuests();
  const tier = guests === null ? null : tierFor(guests, tiers);

  if (guests === null || !tier || tier.multiplierBp === null) return null;

  return (
    <p className={`text-[14px] leading-relaxed text-ink-soft ${className}`}>
      Event prices are shown for <strong className="font-semibold text-ink">{guests} guests</strong> —
      dishes are cooked for the whole table, so they are priced at{" "}
      {formatMultiplier(tier.multiplierBp)} the regular price for {formatTierRange(tier)}. Change the
      guest count and every price here updates.
    </p>
  );
}

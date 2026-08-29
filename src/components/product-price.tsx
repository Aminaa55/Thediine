"use client";

import { useSearchParams } from "next/navigation";
import { useCart } from "@/lib/cart";
import { Price, useEventGuests } from "./event-price";
import { formatEGP } from "@/lib/money";
import {
  eventUnitPrice,
  formatMultiplier,
  type EventTier,
  type ProductEventPricing,
} from "@/lib/event-pricing";

/**
 * The headline price on a dish.
 *
 * Inside the event journey it is the event price for the guest count already
 * given, with the regular price shown underneath so nothing looks like a
 * surprise. Reached any other way it is simply the menu price.
 */
export function ProductPrice({
  amount,
  from,
  pricing,
  tiers,
}: {
  amount: number;
  from: boolean;
  pricing: ProductEventPricing;
  tiers: EventTier[];
}) {
  const forEvent = useSearchParams().get("for") === "event";
  const guests = useEventGuests();
  const { ready } = useCart();
  const priced = eventUnitPrice(amount, forEvent ? guests : null, pricing, tiers);

  return (
    <div>
      <Price amount={amount} from={from} forEvent={forEvent} pricing={pricing} tiers={tiers} size="page" />

      {ready && forEvent && (
        <p className="mt-2 text-[14px] leading-relaxed text-ink-soft">
          {priced.scaled && priced.tier?.multiplierBp != null ? (
            <>
              Event price for {guests} guests — {formatMultiplier(priced.tier.multiplierBp)} the
              regular {formatEGP(priced.base)}, because an event portion is cooked for the whole table.
            </>
          ) : pricing.eventPricingEnabled ? null : (
            <>This dish is the same price for an event as it is for a regular order.</>
          )}
        </p>
      )}
    </div>
  );
}

"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useCart, EVENT_TYPE_LABELS } from "@/lib/cart";
import { EventPricingNote } from "./event-price";
import { DEFAULT_EVENT_TIERS, type EventTier } from "@/lib/event-pricing";

/**
 * Shown in the menu header ONLY while browsing inside the event journey —
 * that is, when the link carried `?for=event`. Reaching the menu any other way
 * is a neutral context, and dishes go to the normal order.
 */
export function EventContextBar({ tiers = DEFAULT_EVENT_TIERS }: { tiers?: EventTier[] }) {
  const { event, hasEvent, ready } = useCart();
  const params = useSearchParams();
  const forEvent = params.get("for") === "event";

  if (!ready || !forEvent || !hasEvent) return null;

  const occasion =
    event.eventType === "OTHER"
      ? event.eventTypeOther || "event"
      : event.eventType
        ? EVENT_TYPE_LABELS[event.eventType]
        : "event";

  const bits = [
    event.guestCount ? `${event.guestCount} guests` : null,
    event.date ? shortDate(event.date) : null,
  ].filter(Boolean);

  return (
    <div className="mt-8 rounded-sm border border-gold/35 bg-gold-pale/35 px-5 py-4">
      <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
        <span aria-hidden="true" className="h-2 w-2 flex-none rounded-full bg-gold" />
        <p className="text-[16px] text-ink">
          Choosing dishes for your <strong className="font-semibold">{occasion}</strong>
          {bits.length > 0 && <span className="text-ink-soft"> &middot; {bits.join(" · ")}</span>}
        </p>
        <Link href="/cart" className="link-sweep ms-auto text-[14.5px]">
          Edit event details
        </Link>
      </div>

      {/* Why the prices on this menu differ from the regular menu. */}
      <EventPricingNote tiers={tiers} className="mt-3 border-t border-gold/25 pt-3" />
    </div>
  );
}

function shortDate(iso: string) {
  const d = new Date(iso + "T00:00:00");
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "long" });
}

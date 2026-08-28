"use client";

import Link from "next/link";
import { useCart, EVENT_TYPE_LABELS } from "@/lib/cart";

/**
 * Shown in the MENU HEADER while an event request is open.
 *
 * Deliberately quiet — a warm inline note, not a dark ribbon across the page.
 * The event itself lives in the cart; this only reminds the customer which
 * occasion they are choosing dishes for.
 */
export function EventContextBar() {
  const { mode, event, ready } = useCart();
  if (!ready || mode !== "event") return null;

  const occasion =
    event.eventType === "OTHER"
      ? event.eventTypeOther || "event"
      : event.eventType
        ? EVENT_TYPE_LABELS[event.eventType]
        : "event";

  const bits = [
    event.guestCount ? `${event.guestCount} guests` : null,
    event.date ? formatDate(event.date) : null,
  ].filter(Boolean);

  return (
    <div className="mt-8 flex flex-wrap items-center gap-x-5 gap-y-2 rounded-sm border border-gold/35 bg-gold-pale/35 px-5 py-4">
      <span
        aria-hidden="true"
        className="h-2 w-2 flex-none rounded-full bg-gold"
      />
      <p className="text-[16px] text-ink">
        Choosing dishes for your{" "}
        <strong className="font-semibold">{occasion}</strong>
        {bits.length > 0 && (
          <span className="text-ink-soft"> &middot; {bits.join(" · ")}</span>
        )}
      </p>
      <Link href="/cart" className="link-sweep ms-auto text-[14.5px]">
        Edit event details
      </Link>
    </div>
  );
}

function formatDate(iso: string) {
  const d = new Date(iso + "T00:00:00");
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "long" });
}

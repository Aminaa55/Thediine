"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCart } from "@/lib/cart";

/**
 * Continuing an existing request and starting a new one are different actions.
 *
 * "Plan an Event" from the main navigation always lands here, and starting
 * fresh clears the previous draft — so the site never forces someone back into
 * an occasion they picked days ago.
 */
export function EventEntry({ compact = false }: { compact?: boolean }) {
  const router = useRouter();
  const { hasEvent, ready, startNewEvent, event } = useCart();

  if (!ready || !hasEvent) {
    return (
      <Link href="/events/start" className={compact ? "btn-primary mt-8" : "btn-primary mt-11"}>
        Start an event request
      </Link>
    );
  }

  const occasion = event.eventType
    ? event.eventType.charAt(0) + event.eventType.slice(1).toLowerCase()
    : "event";

  return (
    <div className={compact ? "mt-8" : "mt-11"}>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <Link href="/cart" className="btn-primary">
          Continue your {occasion.toLowerCase()} request
        </Link>
        <button
          type="button"
          onClick={() => { startNewEvent(); router.push("/events/start"); }}
          className="btn-outline"
        >
          Start a new request
        </button>
      </div>
      <p className={`mt-4 text-[14px] ${compact ? "text-ink-soft" : "text-ink-soft"}`}>
        Starting a new request clears the one in progress.
      </p>
    </div>
  );
}

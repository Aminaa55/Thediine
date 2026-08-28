"use client";

import { useRouter } from "next/navigation";
import { useCart, EVENT_TYPE_LABELS, type EventType } from "@/lib/cart";
import { EventHeader, EventNotice } from "./event-steps";

/**
 * Step one: the occasion.
 *
 * This page ALWAYS shows the picker. It never skips ahead because a type was
 * chosen earlier — coming back here to change the occasion has to work, and
 * "Plan an Event" from the main navigation has to start at the beginning.
 */
export function EventOccasionForm() {
  const router = useRouter();
  const { event, updateEvent, ready } = useCart();

  function choose(t: EventType) {
    updateEvent({ eventType: t, ...(t === "OTHER" ? {} : { eventTypeOther: "" }) });
    if (t !== "OTHER") router.push("/events/details");
  }

  const canContinue =
    !!event.eventType && (event.eventType !== "OTHER" || event.eventTypeOther.trim() !== "");

  return (
    <>
      <EventHeader current="type" />

      <div className="mx-auto max-w-2xl px-5 py-12 sm:px-8 sm:py-16">
        <p className="eyebrow">Step one</p>
        <h1 className="mt-3 font-display text-[32px] font-semibold leading-tight text-ink sm:text-[40px]">
          What are we celebrating?
        </h1>

        <div className="mt-10 grid gap-3 sm:grid-cols-2">
          {(Object.keys(EVENT_TYPE_LABELS) as EventType[]).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => choose(t)}
              aria-pressed={ready && event.eventType === t}
              className={`rounded-sm border px-6 py-7 text-start transition-colors ${
                ready && event.eventType === t
                  ? "border-gold bg-gold-pale/40"
                  : "border-line bg-cream-warm hover:border-gold"
              }`}
            >
              <span className="hair" aria-hidden="true" />
              <span className="mt-4 block font-display text-[22px] text-ink">
                {EVENT_TYPE_LABELS[t]}
              </span>
            </button>
          ))}
        </div>

        {ready && event.eventType === "OTHER" && (
          <div className="mt-8">
            <label htmlFor="other" className="eyebrow mb-3 block">Tell us the occasion</label>
            <input
              id="other"
              value={event.eventTypeOther}
              onChange={(e) => updateEvent({ eventTypeOther: e.target.value })}
              placeholder="Graduation, baby shower, corporate lunch…"
              className="w-full rounded-sm border border-line bg-cream-warm px-4 py-3 text-[16px] text-ink placeholder:text-ink-faint focus:border-gold focus:outline-none"
            />
          </div>
        )}

        <button
          type="button"
          onClick={() => router.push("/events/details")}
          disabled={!canContinue}
          className="btn-primary mt-10 disabled:cursor-not-allowed disabled:bg-ink/25"
        >
          Continue
        </button>

        <EventNotice className="mt-8" />
      </div>
    </>
  );
}

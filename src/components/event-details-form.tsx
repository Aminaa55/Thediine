"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCart } from "@/lib/cart";
import { EventHeader, EventNotice } from "./event-steps";
import { formatDay, validateEvent } from "@/lib/ordering";
import { useRules } from "./rules-provider";
import { GuestInput } from "./event-request-panel";
import { EventExtras } from "./event-extras";

/** Step two: the day itself. The date field enforces the notice period. */
export function EventDetailsForm() {
  const router = useRouter();
  const { event, updateEvent, ready } = useCart();
  const [touched, setTouched] = useState(false);

  const rules = useRules();
  const min = rules.eventEarliest;
  const check = validateEvent(event, rules);

  if (ready && !event.eventType) {
    return (
      <>
        <EventHeader current="details" />
        <div className="mx-auto max-w-2xl px-5 py-16 text-center sm:px-8">
          <p className="font-display text-[22px] text-ink">Let us start with the occasion</p>
          <Link href="/events/start" className="btn-primary mt-6">Choose the occasion</Link>
        </div>
      </>
    );
  }

  function toDishes() {
    setTouched(true);
    if (!check.ok) return;
    router.push("/menu?for=event");
  }

  return (
    <>
      <EventHeader current="details" />

      <div className="mx-auto max-w-2xl px-5 py-12 sm:px-8 sm:py-16">
        <p className="eyebrow">Step two</p>
        <h1 className="mt-3 font-display text-[32px] font-semibold leading-tight text-ink sm:text-[40px]">
          Tell us about the day
        </h1>

        <div className="mt-10 grid gap-6 sm:grid-cols-2">
          <Field label="Event date" htmlFor="date" hint={`Earliest available: ${formatDay(min)}`}>
            <input
              id="date" type="date" value={event.date} min={min}
              onChange={(e) => updateEvent({ date: e.target.value })}
              className={input(touched && !!check.errors.date)}
            />
          </Field>

          <Field label="Event time" htmlFor="time">
            <input
              id="time" type="time" value={event.time}
              onChange={(e) => updateEvent({ time: e.target.value })}
              className={input(touched && !!check.errors.time)}
            />
          </Field>

          <Field
            label="Number of guests"
            htmlFor="guests"
            hint={`We cater events for up to ${rules.maxGuests} guests`}
          >
            <GuestInput />
          </Field>

          <Field label="Venue or address" htmlFor="venue" full>
            <input
              id="venue" value={event.venue}
              onChange={(e) => updateEvent({ venue: e.target.value })}
              placeholder="Where should we bring the food?"
              className={input(touched && !!check.errors.venue)}
            />
          </Field>
        </div>

        {/* Planned here, with the rest of the day — not discovered from the cart. */}
        <EventExtras />

        {(touched || event.date) && !check.ok && (
          <p className="mt-5 rounded-sm border border-[#A6391C]/30 bg-[#A6391C]/[0.07] px-5 py-4 text-[15px] text-[#A6391C]">
            {Object.values(check.errors)[0]}
          </p>
        )}

        <button type="button" onClick={toDishes} className="btn-primary mt-10">
          Choose your dishes
        </button>

        <EventNotice className="mt-8" />
      </div>
    </>
  );
}

function input(invalid: boolean) {
  return `w-full rounded-sm border bg-cream-warm px-4 py-3 text-[16px] text-ink placeholder:text-ink-faint focus:outline-none ${
    invalid ? "border-[#A6391C]/60 focus:border-[#A6391C]" : "border-line focus:border-gold"
  }`;
}

function Field({
  label, htmlFor, hint, full = false, children,
}: { label: string; htmlFor: string; hint?: string; full?: boolean; children: React.ReactNode }) {
  return (
    <div className={full ? "sm:col-span-2" : undefined}>
      <label htmlFor={htmlFor} className="eyebrow mb-3 block">{label}</label>
      {children}
      {hint && <p className="mt-2 text-[13px] text-ink-faint">{hint}</p>}
    </div>
  );
}

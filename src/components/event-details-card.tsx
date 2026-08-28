"use client";

import { useState } from "react";
import Link from "next/link";
import { useCart, EVENT_TYPE_LABELS, type EventType } from "@/lib/cart";
import {
  EVENT_GUESTS,
  GUEST_LIMIT_MESSAGE,
  earliestEventDate,
  toDateInput,
  validateEvent,
} from "@/lib/ordering";

/**
 * The event IS the order.
 *
 * This card sits at the top of the cart, above the dishes, so the occasion and
 * the food read as one request rather than two things in different places.
 * Everything is editable here, in place — no trip to a separate form.
 */
export function EventDetailsCard() {
  const { event, updateEvent, exitEvent } = useCart();
  const [editing, setEditing] = useState(false);

  const occasion =
    event.eventType === "OTHER"
      ? event.eventTypeOther || "Other"
      : event.eventType
        ? EVENT_TYPE_LABELS[event.eventType]
        : null;

  const extras = [
    event.decorRequested && "Table décor",
    event.setupRequested && "Event setup",
    event.servingStaffRequested && "Serving staff",
  ].filter(Boolean) as string[];

  const check = validateEvent(event);

  return (
    <section className="relative overflow-hidden rounded-sm border border-gold/40 bg-gold-pale/25">
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-gold/25 px-6 py-4">
        <h2 className="label-rule !max-w-none">Event details</h2>
        <button
          type="button"
          onClick={() => setEditing((v) => !v)}
          className="link-sweep text-[14.5px]"
        >
          {editing ? "Close" : "Edit"}
        </button>
      </div>

      {editing ? (
        <EditForm onDone={() => setEditing(false)} />
      ) : (
        <>
          <dl className="grid gap-x-8 gap-y-5 px-6 py-6 sm:grid-cols-2">
            <Row label="Occasion" value={occasion} />
            <Row label="Guests" value={event.guestCount ? `${event.guestCount} people` : null} />
            <Row label="Date" value={event.date ? longDate(event.date) : null} />
            <Row label="Time" value={event.time} />
            <Row label="Venue" value={event.venue} full />
          </dl>

          <div className="border-t border-gold/25 px-6 py-5">
            <p className="text-[11px] uppercase tracking-widest text-ink-faint">Extras requested</p>
            {extras.length === 0 ? (
              <p className="mt-2 text-[15px] text-ink-soft">
                None yet.{" "}
                <Link href="/events/extras" className="link-sweep">
                  Add table décor, setup or staff
                </Link>
              </p>
            ) : (
              <>
                <ul className="mt-3 flex flex-wrap gap-2">
                  {extras.map((x) => (
                    <li
                      key={x}
                      className="rounded-full border border-gold/45 bg-cream-warm px-4 py-1.5 text-[14px] text-ink"
                    >
                      {x}
                    </li>
                  ))}
                </ul>
                <p className="mt-3 text-[13.5px] text-ink-soft">
                  Quoted separately when we confirm — not part of the total below.{" "}
                  <Link href="/events/extras" className="link-sweep">Change</Link>
                </p>
              </>
            )}
            {event.extrasNotes && (
              <p className="mt-4 border-t border-gold/20 pt-4 text-[14.5px] italic text-ink-soft">
                {event.extrasNotes}
              </p>
            )}
          </div>
        </>
      )}

      {!check.ok && !editing && (
        <p className="border-t border-[#A6391C]/25 bg-[#A6391C]/[0.06] px-6 py-4 text-[14.5px] text-[#A6391C]">
          {Object.values(check.errors)[0]}
        </p>
      )}

      {!editing && (
        <div className="border-t border-gold/25 px-6 py-4">
          <button
            type="button"
            onClick={exitEvent}
            className="text-[13.5px] text-ink-faint underline underline-offset-4 hover:text-ink"
          >
            Cancel this event request
          </button>
        </div>
      )}
    </section>
  );
}

function EditForm({ onDone }: { onDone: () => void }) {
  const { event, updateEvent } = useCart();
  const min = toDateInput(earliestEventDate());
  const check = validateEvent(event);

  return (
    <div className="px-6 py-6">
      <div className="grid gap-5 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <span className="mb-3 block text-[11px] uppercase tracking-widest text-ink-faint">
            Occasion
          </span>
          <div className="flex flex-wrap gap-2">
            {(Object.keys(EVENT_TYPE_LABELS) as EventType[]).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => updateEvent({ eventType: t })}
                aria-pressed={event.eventType === t}
                className={`rounded-full border px-5 py-2 text-[14.5px] transition-colors ${
                  event.eventType === t
                    ? "border-ink bg-ink text-cream"
                    : "border-line bg-cream-warm text-ink-soft hover:border-gold"
                }`}
              >
                {EVENT_TYPE_LABELS[t]}
              </button>
            ))}
          </div>
          {event.eventType === "OTHER" && (
            <input
              value={event.eventTypeOther}
              onChange={(e) => updateEvent({ eventTypeOther: e.target.value })}
              placeholder="Tell us the occasion"
              className={field(!!check.errors.eventTypeOther)}
              style={{ marginTop: 12 }}
            />
          )}
        </div>

        <Labelled label="Date" hint={`Earliest: ${min}`}>
          <input
            type="date"
            min={min}
            value={event.date}
            onChange={(e) => updateEvent({ date: e.target.value })}
            className={field(!!check.errors.date)}
          />
        </Labelled>

        <Labelled label="Time">
          <input
            type="time"
            value={event.time}
            onChange={(e) => updateEvent({ time: e.target.value })}
            className={field(!!check.errors.time)}
          />
        </Labelled>

        <Labelled label="Guests" hint={`Up to ${EVENT_GUESTS.max}`}>
          <GuestInput />
        </Labelled>

        <Labelled label="Venue or address" full>
          <input
            value={event.venue}
            onChange={(e) => updateEvent({ venue: e.target.value })}
            placeholder="Where should we bring the food?"
            className={field(!!check.errors.venue)}
          />
        </Labelled>
      </div>

      {!check.ok && (
        <p className="mt-5 text-[14.5px] text-[#A6391C]">{Object.values(check.errors)[0]}</p>
      )}

      <button type="button" onClick={onDone} className="btn-primary mt-6">
        Done
      </button>
    </div>
  );
}

/**
 * Guests is a TEXT field, digits only.
 *
 * A number input's stepper reacts to arrow keys and stray mouse-wheel scrolls,
 * which silently turned a typed 153 into 152. This cannot.
 */
export function GuestInput({ className = "" }: { className?: string }) {
  const { event, updateEvent } = useCart();
  const over =
    /^\d+$/.test(event.guestCount) && Number(event.guestCount) > EVENT_GUESTS.max;

  return (
    <>
      <input
        type="text"
        inputMode="numeric"
        autoComplete="off"
        value={event.guestCount}
        onChange={(e) => {
          const digits = e.target.value.replace(/[^\d]/g, "").slice(0, 4);
          updateEvent({ guestCount: digits });
        }}
        onKeyDown={(e) => {
          // Arrow keys must never change the value.
          if (e.key === "ArrowUp" || e.key === "ArrowDown") e.preventDefault();
        }}
        onWheel={(e) => e.currentTarget.blur()}
        placeholder="40"
        aria-invalid={over}
        className={`${field(over)} ${className}`}
      />
      {over && <p className="mt-2 text-[14px] text-[#A6391C]">{GUEST_LIMIT_MESSAGE}</p>}
    </>
  );
}

function field(invalid: boolean) {
  return `w-full rounded-sm border bg-cream-warm px-4 py-3 text-[16px] text-ink placeholder:text-ink-faint focus:outline-none ${
    invalid ? "border-[#A6391C]/60 focus:border-[#A6391C]" : "border-line focus:border-gold"
  }`;
}

function Labelled({
  label, hint, full = false, children,
}: { label: string; hint?: string; full?: boolean; children: React.ReactNode }) {
  return (
    <div className={full ? "sm:col-span-2" : undefined}>
      <span className="mb-3 block text-[11px] uppercase tracking-widest text-ink-faint">
        {label}
      </span>
      {children}
      {hint && <p className="mt-2 text-[13px] text-ink-faint">{hint}</p>}
    </div>
  );
}

function Row({ label, value, full = false }: { label: string; value: string | null; full?: boolean }) {
  return (
    <div className={full ? "sm:col-span-2" : undefined}>
      <dt className="text-[11px] uppercase tracking-widest text-ink-faint">{label}</dt>
      <dd className="mt-1.5 text-[16px] text-ink">
        {value || <span className="text-ink-faint">Not given</span>}
      </dd>
    </div>
  );
}

function longDate(iso: string) {
  const d = new Date(iso + "T00:00:00");
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });
}

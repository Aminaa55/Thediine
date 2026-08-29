"use client";

import Link from "next/link";
import { useState } from "react";
import { useCart, EVENT_TYPE_LABELS, type EventType } from "@/lib/cart";
import {
  EVENT_GUESTS,
  GUEST_LIMIT_MESSAGE,
  earliestEventDate,
  toDateInput,
  validateEvent,
} from "@/lib/ordering";
import { formatEGP } from "@/lib/money";
import { formatMultiplier } from "@/lib/event-pricing";
import { EventExtras, chosenExtras } from "./event-extras";
import type { ResolvedCart } from "@/app/actions";

/**
 * ONE event request.
 *
 * The occasion, the dishes and the extras are three sections of a single
 * panel — not an event card sitting on top of a separate shopping cart.
 * Everything is editable in place.
 */
export function EventRequestSection({
  cart,
  pending,
  onQuantity,
  onRemove,
}: {
  cart: ResolvedCart;
  pending: boolean;
  onQuantity: (key: string, q: number) => void;
  onRemove: (key: string) => void;
}) {
  const { event, cancelEvent } = useCart();
  const [editing, setEditing] = useState(false);
  const check = validateEvent(event);

  const occasion =
    event.eventType === "OTHER"
      ? event.eventTypeOther || "Other"
      : event.eventType
        ? EVENT_TYPE_LABELS[event.eventType]
        : null;

  const extras = chosenExtras(event);

  /**
   * The band the event food was priced at, taken from the resolved lines rather
   * than recomputed here: the server is the authority on what is charged.
   */
  const scaledTier = cart.lines.find((l) => l.eventTier)?.eventTier ?? null;

  return (
    <section className="overflow-hidden rounded-sm border border-gold/45 bg-cream-warm">
      <header className="flex flex-wrap items-baseline justify-between gap-4 border-b border-gold/25 bg-gold-pale/45 px-6 py-5 sm:px-8">
        <div>
          <p className="text-[11px] uppercase tracking-widest text-gold">Event request</p>
          <h2 className="mt-1.5 font-display text-[24px] font-semibold leading-tight text-ink">
            {occasion ?? "Your event"}
            {event.date && (
              <span className="font-body text-[16px] font-normal text-ink-soft">
                {" "}&middot; {longDate(event.date)}
              </span>
            )}
          </h2>
        </div>
        <button type="button" onClick={() => setEditing((v) => !v)} className="link-sweep text-[14.5px]">
          {editing ? "Close" : "Edit details"}
        </button>
      </header>

      {/* 1 — the occasion */}
      {editing ? (
        <EditDetails onDone={() => setEditing(false)} />
      ) : (
        <dl className="grid gap-x-8 gap-y-5 border-b border-line px-6 py-6 sm:grid-cols-3 sm:px-8">
          <Row label="Date" value={event.date ? longDate(event.date) : null} />
          <Row label="Time" value={event.time} />
          <Row label="Guests" value={event.guestCount ? `${event.guestCount} people` : null} />
          <Row label="Venue" value={event.venue} span />
        </dl>
      )}

      {!check.ok && !editing && (
        <p className="border-b border-[#A6391C]/25 bg-[#A6391C]/[0.06] px-6 py-4 text-[14.5px] text-[#A6391C] sm:px-8">
          {Object.values(check.errors)[0]}
        </p>
      )}

      {/* 2 — the dishes */}
      <div className="border-b border-line px-6 py-7 sm:px-8">
        <h3 className="text-[11px] uppercase tracking-widest text-ink-faint">
          Dishes for your event
        </h3>

        {cart.lines.length === 0 ? (
          <div className="mt-4">
            <p className="text-[16px] text-ink-soft">No dishes chosen yet.</p>
            <Link href="/menu?for=event" className="btn-primary mt-5">Choose dishes for this event</Link>
          </div>
        ) : (
          <>
            <ul className={`mt-4 ${pending ? "opacity-60 transition-opacity" : "transition-opacity"}`}>
              {cart.lines.map((line) => (
                <li key={line.key} className="border-b border-line-soft py-5 last:border-0">
                  <div className="flex items-start justify-between gap-5">
                    <div className="min-w-0">
                      <h4 className="font-display text-[18px] font-semibold leading-snug text-ink">
                        <Link href={`/product/${line.slug}`} className="hover:text-gold">
                          {line.productName}
                        </Link>
                      </h4>
                      {line.variantName && (
                        <p className="mt-1 text-[14.5px] text-ink-soft">{line.variantName}</p>
                      )}
                      {line.options.map((o) => (
                        <p key={o.groupName} className="text-[14px] text-ink-soft">
                          <span className="text-ink-faint">{o.groupName}:</span> {o.choiceName}
                        </p>
                      ))}
                      {line.instructions && (
                        <p className="mt-1.5 border-s-2 border-line ps-3 text-[13.5px] italic text-ink-soft">
                          {line.instructions}
                        </p>
                      )}
                      {line.problem && (
                        <p className="mt-1.5 text-[14px] text-[#A6391C]">{line.problem}</p>
                      )}
                    </div>
                    <p className="whitespace-nowrap font-display text-[17px] font-semibold tabular-nums text-ink">
                      {formatEGP(line.lineTotal)}
                    </p>
                  </div>

                  <div className="mt-3.5 flex items-center gap-4">
                    <div className="flex items-center rounded-full border border-line bg-cream">
                      <button
                        type="button"
                        onClick={() => onQuantity(line.key, line.quantity - line.quantityStep)}
                        aria-label={`Reduce quantity of ${line.productName}`}
                        className="px-3.5 py-1.5 text-ink-soft"
                      >
                        &minus;
                      </button>
                      <span className="min-w-[2rem] text-center text-[15px] tabular-nums">
                        {line.quantity}
                      </span>
                      <button
                        type="button"
                        onClick={() => onQuantity(line.key, line.quantity + line.quantityStep)}
                        aria-label={`Increase quantity of ${line.productName}`}
                        className="px-3.5 py-1.5 text-ink-soft"
                      >
                        +
                      </button>
                    </div>
                    <button
                      type="button"
                      onClick={() => onRemove(line.key)}
                      className="text-[14px] text-ink-faint underline underline-offset-4 hover:text-ink"
                    >
                      Remove
                    </button>
                    <span className="ms-auto text-[13.5px] tabular-nums text-ink-faint">
                      {/* Event portions are scaled; show what from and by how much. */}
                      {line.eventTier?.multiplierBp != null && (
                        <span className="me-2">
                          {formatMultiplier(line.eventTier.multiplierBp)} regular{" "}
                          {formatEGP(line.normalUnitPrice)} &middot;
                        </span>
                      )}
                      {formatEGP(line.unitPrice)} each
                    </span>
                  </div>
                </li>
              ))}
            </ul>
            <Link href="/menu?for=event" className="link-sweep mt-5 inline-block text-[14.5px]">
              Add more dishes to this event
            </Link>
          </>
        )}
      </div>

      {/* 3 — the extras */}
      <div className="px-6 py-7 sm:px-8">
        <h3 className="text-[11px] uppercase tracking-widest text-ink-faint">
          Anything else for the day?
        </h3>
        {extras.length === 0 ? (
          <p className="mt-3 text-[16px] text-ink-soft">
            Nothing requested.{" "}
            <button type="button" onClick={() => setEditing(true)} className="link-sweep">
              Add table décor, setup or staff
            </button>
          </p>
        ) : (
          <>
            <ul className="mt-4 flex flex-wrap gap-2">
              {extras.map((x) => (
                <li
                  key={x}
                  className="rounded-full border border-gold/45 bg-gold-pale/40 px-4 py-1.5 text-[14.5px] text-ink"
                >
                  {x}
                </li>
              ))}
            </ul>
            <p className="mt-3.5 text-[14px] text-ink-soft">
              We will quote each one when we confirm your event. Nothing here is added to
              your total.{" "}
              <button type="button" onClick={() => setEditing(true)} className="link-sweep">
                Change
              </button>
            </p>
          </>
        )}
        {event.extrasNotes && (
          <p className="mt-4 border-t border-line-soft pt-4 text-[15px] italic text-ink-soft">
            {event.extrasNotes}
          </p>
        )}

        <div className="mt-7 flex flex-wrap items-baseline justify-between gap-4 border-t border-line pt-6">
          <span className="font-display text-[19px] font-semibold text-ink">Food subtotal</span>
          <span className="font-display text-[22px] font-semibold tabular-nums text-ink">
            {formatEGP(cart.subtotal)}
          </span>
        </div>
        {/*
          The food subtotal is the event price of the dishes at this guest count.
          Décor, setup and staff are quoted separately and are not in it.
        */}
        {scaledTier?.multiplierBp != null && cart.guestCount !== null && (
          <p className="mt-1.5 text-[14px] leading-relaxed text-ink-soft">
            Priced for{" "}
            <strong className="font-semibold text-ink">{cart.guestCount} guests</strong> at{" "}
            {formatMultiplier(scaledTier.multiplierBp)} the regular menu price. Change the guest
            count above and this recalculates.
          </p>
        )}
        <p className="mt-1.5 text-[14px] text-ink-faint">Extras are quoted separately.</p>

        <button
          type="button"
          disabled
          className="btn-primary mt-6 w-full disabled:bg-ink/25 sm:w-auto"
        >
          Send this event request
        </button>
        <p className="mt-4 text-[14px] leading-relaxed text-ink-soft">
          Events need at least{" "}
          <strong className="font-semibold text-ink">5 days&rsquo; notice</strong> and are
          confirmed by us personally before they are booked.
        </p>

        <button
          type="button"
          onClick={cancelEvent}
          className="mt-6 block text-[13.5px] text-ink-faint underline underline-offset-4 hover:text-ink"
        >
          Cancel this event request
        </button>
      </div>
    </section>
  );
}

function EditDetails({ onDone }: { onDone: () => void }) {
  const { event, updateEvent } = useCart();
  const min = toDateInput(earliestEventDate());
  const check = validateEvent(event);

  return (
    <div className="border-b border-line px-6 py-7 sm:px-8">
      <div className="grid gap-5 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <Lab>Occasion</Lab>
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
                    : "border-line bg-cream text-ink-soft hover:border-gold"
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
              className={`${field(!!check.errors.eventTypeOther)} mt-3`}
            />
          )}
        </div>

        <div>
          <Lab>Date</Lab>
          <input
            type="date" min={min} value={event.date}
            onChange={(e) => updateEvent({ date: e.target.value })}
            className={field(!!check.errors.date)}
          />
        </div>
        <div>
          <Lab>Time</Lab>
          <input
            type="time" value={event.time}
            onChange={(e) => updateEvent({ time: e.target.value })}
            className={field(!!check.errors.time)}
          />
        </div>
        <div>
          <Lab>Guests</Lab>
          {/* A distinct id: this editor and the details step can both be on screen. */}
          <GuestInput id="ev-guests" />
          <p className="mt-2 text-[13px] text-ink-faint">Up to {EVENT_GUESTS.max}</p>
        </div>
        <div className="sm:col-span-2">
          <Lab>Venue or address</Lab>
          <input
            value={event.venue}
            onChange={(e) => updateEvent({ venue: e.target.value })}
            placeholder="Where should we bring the food?"
            className={field(!!check.errors.venue)}
          />
        </div>
      </div>

      <div className="mt-10 border-t border-line pt-8">
        <EventExtras compact />
      </div>

      {!check.ok && (
        <p className="mt-5 text-[14.5px] text-[#A6391C]">{Object.values(check.errors)[0]}</p>
      )}
      <button type="button" onClick={onDone} className="btn-primary mt-6">Done</button>
    </div>
  );
}

/**
 * Guests is a TEXT field, digits only. A number input's stepper responds to
 * arrow keys and stray wheel scrolls, which silently turned 153 into 152.
 */
export function GuestInput({ id = "guests" }: { id?: string }) {
  const { event, updateEvent } = useCart();
  const over = /^\d+$/.test(event.guestCount) && Number(event.guestCount) > EVENT_GUESTS.max;

  return (
    <>
      <input
        id={id}
        type="text"
        inputMode="numeric"
        autoComplete="off"
        value={event.guestCount}
        onChange={(e) => updateEvent({ guestCount: e.target.value.replace(/[^\d]/g, "").slice(0, 4) })}
        onKeyDown={(e) => {
          if (e.key === "ArrowUp" || e.key === "ArrowDown") e.preventDefault();
        }}
        onWheel={(e) => e.currentTarget.blur()}
        placeholder="40"
        aria-invalid={over}
        className={field(over)}
      />
      {over && <p className="mt-2 text-[14px] text-[#A6391C]">{GUEST_LIMIT_MESSAGE}</p>}
    </>
  );
}

function field(invalid: boolean) {
  return `w-full rounded-sm border bg-cream px-4 py-3 text-[16px] text-ink placeholder:text-ink-faint focus:outline-none ${
    invalid ? "border-[#A6391C]/60 focus:border-[#A6391C]" : "border-line focus:border-gold"
  }`;
}

function Lab({ children }: { children: React.ReactNode }) {
  return (
    <span className="mb-3 block text-[11px] uppercase tracking-widest text-ink-faint">
      {children}
    </span>
  );
}

function Row({ label, value, span = false }: { label: string; value: string | null; span?: boolean }) {
  return (
    <div className={span ? "sm:col-span-3" : undefined}>
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

"use client";

import Link from "next/link";
import { useEffect, useState, useTransition } from "react";
import { useCart, EVENT_TYPE_LABELS } from "@/lib/cart";
import { resolveCart, type ResolvedCart } from "@/app/actions";
import { formatEGP } from "@/lib/money";
import { EventProgress, EventNotice } from "./event-steps";

/**
 * Step five: everything the customer has told us, in one place, before sending.
 *
 * Dish prices come from the database as always. The extras appear with no
 * price, because they are quoted rather than sold.
 */
export function EventReview() {
  const { lines, event, mode, ready, exitEvent } = useCart();
  const [cart, setCart] = useState<ResolvedCart | null>(null);
  const [, startTransition] = useTransition();

  useEffect(() => {
    if (!ready) return;
    startTransition(async () => setCart(await resolveCart(lines)));
  }, [lines, ready]);

  if (!ready) return <p className="py-24 text-center text-[15px] text-ink-faint">Loading…</p>;

  if (mode !== "event") {
    return (
      <div className="mx-auto max-w-md px-5 py-24 text-center">
        <p className="font-display text-[24px] text-ink">No event request in progress</p>
        <Link href="/events/start" className="btn-primary mt-8">Start an event request</Link>
      </div>
    );
  }

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

  return (
    <>
      <EventProgress current="review" />

      <div className="mx-auto max-w-3xl px-5 py-12 sm:px-8 sm:py-16">
        <p className="eyebrow">Step five</p>
        <h1 className="mt-3 font-display text-[32px] font-semibold leading-tight text-ink sm:text-[40px]">
          Your event request
        </h1>

        <section className="mt-10 rounded-sm border border-line bg-cream-warm">
          <Header title="The occasion" href="/events/start" />
          <dl className="grid gap-x-8 gap-y-4 px-6 py-6 sm:grid-cols-2">
            <Row label="Occasion" value={occasion} />
            <Row label="Guests" value={event.guestCount ? `${event.guestCount} people` : null} />
            <Row label="Date" value={event.date} />
            <Row label="Time" value={event.time} />
            <Row label="Venue" value={event.venue} full />
          </dl>
        </section>

        <section className="mt-5 rounded-sm border border-line bg-cream-warm">
          <Header title="The food" href="/menu" linkLabel="Add more dishes" />
          {!cart || cart.lines.length === 0 ? (
            <div className="px-6 py-8">
              <p className="text-[16px] text-ink-soft">No dishes chosen yet.</p>
              <Link href="/menu" className="btn-primary mt-5">Browse the menu</Link>
            </div>
          ) : (
            <>
              <ul className="px-6">
                {cart.lines.map((l) => (
                  <li key={l.key} className="flex justify-between gap-5 border-b border-line-soft py-4 last:border-0">
                    <div className="min-w-0">
                      <p className="font-display text-[17px] text-ink">
                        {l.quantity} &times; {l.productName}
                      </p>
                      {l.variantName && (
                        <p className="mt-0.5 text-[14.5px] text-ink-soft">{l.variantName}</p>
                      )}
                      {l.options.map((o) => (
                        <p key={o.groupName} className="text-[14px] text-ink-soft">
                          <span className="text-ink-faint">{o.groupName}:</span> {o.choiceName}
                        </p>
                      ))}
                      {l.instructions && (
                        <p className="mt-1 text-[13.5px] italic text-ink-soft">{l.instructions}</p>
                      )}
                    </div>
                    <p className="whitespace-nowrap font-display text-[16px] tabular-nums text-ink">
                      {formatEGP(l.lineTotal)}
                    </p>
                  </li>
                ))}
              </ul>
              <div className="flex items-baseline justify-between gap-4 border-t border-line px-6 py-5">
                <span className="font-display text-[18px] font-semibold text-ink">Food subtotal</span>
                <span className="font-display text-[20px] font-semibold tabular-nums text-ink">
                  {formatEGP(cart.subtotal)}
                </span>
              </div>
            </>
          )}
        </section>

        <section className="mt-5 rounded-sm border border-line bg-cream-warm">
          <Header title="Extras" href="/events/extras" />
          <div className="px-6 py-6">
            {extras.length === 0 ? (
              <p className="text-[16px] text-ink-soft">None requested.</p>
            ) : (
              <>
                <ul className="flex flex-wrap gap-2">
                  {extras.map((x) => (
                    <li key={x} className="rounded-full border border-gold/40 bg-gold-pale/40 px-4 py-1.5 text-[14.5px] text-ink">
                      {x}
                    </li>
                  ))}
                </ul>
                <p className="mt-4 text-[14px] text-ink-soft">
                  Quoted separately when we confirm your event — not included in the subtotal above.
                </p>
              </>
            )}
            {event.extrasNotes && (
              <p className="mt-4 border-t border-line-soft pt-4 text-[15px] italic text-ink-soft">
                {event.extrasNotes}
              </p>
            )}
          </div>
        </section>

        <div className="mt-10 rounded-sm border border-line bg-cream-deep px-6 py-7">
          <EventNotice />
          <button type="button" disabled className="btn-primary mt-6 w-full disabled:bg-ink/25">
            Send event request
          </button>
          <p className="mt-3 text-center text-[13.5px] text-ink-faint">
            Your contact details and how you would like to pay come next.
          </p>
        </div>

        <button
          type="button"
          onClick={exitEvent}
          className="mt-8 text-[14.5px] text-ink-faint underline underline-offset-4 hover:text-ink"
        >
          Cancel this event request
        </button>
      </div>
    </>
  );
}

function Header({ title, href, linkLabel = "Edit" }: { title: string; href: string; linkLabel?: string }) {
  return (
    <div className="flex items-center justify-between gap-4 border-b border-line px-6 py-4">
      <h2 className="eyebrow">{title}</h2>
      <Link href={href} className="text-[14px] text-gold hover:underline">{linkLabel}</Link>
    </div>
  );
}

function Row({ label, value, full = false }: { label: string; value: string | null; full?: boolean }) {
  return (
    <div className={full ? "sm:col-span-2" : undefined}>
      <dt className="text-[13px] uppercase tracking-[0.14em] text-ink-faint">{label}</dt>
      <dd className="mt-1 text-[16px] text-ink">{value || <span className="text-ink-faint">Not given</span>}</dd>
    </div>
  );
}

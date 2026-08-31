"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCart, EVENT_TYPE_LABELS } from "@/lib/cart";
import { resolveCart, type ResolvedCart } from "@/app/actions";
import { submitEventRequest, type CheckoutContext } from "@/app/checkout-actions";
import { formatEGP } from "@/lib/money";
import { formatMultiplier } from "@/lib/event-pricing";
import { EMPTY_CUSTOMER, validateEventSubmission, type CustomerDetails, type Errors } from "@/lib/checkout";
import { chosenExtras } from "./event-extras";
import { EventHeader } from "./event-steps";
import {
  CustomerFields, Field, Money, PaymentChoice, ReviewRow, SectionHeading,
  ServingSetupChoice, input,
} from "./checkout-fields";

/**
 * Sending an EVENT REQUEST.
 *
 * This is a request, not a booking: it is recorded as REQUESTED and stays there
 * until the business confirms it personally. Nothing here reserves a date.
 *
 * It is also entirely separate from a normal order. A customer with both sends
 * two things and gets two order numbers; neither one touches the other.
 */
export function EventCheckoutForm({ ctx }: { ctx: CheckoutContext }) {
  const router = useRouter();
  const { eventLines, event, hasEvent, ready, clearEvent } = useCart();

  const [form, setForm] = useState<CustomerDetails>(EMPTY_CUSTOMER);
  const [cart, setCart] = useState<ResolvedCart | null>(null);
  const [touched, setTouched] = useState(false);
  const [serverErrors, setServerErrors] = useState<Errors>({});
  const [sending, setSending] = useState(false);

  const set = (patch: Partial<CustomerDetails>) => {
    setForm((f) => ({ ...f, ...patch }));
    setServerErrors({});
  };

  // Event food is priced by guest band, so the guest count goes with the cart.
  useEffect(() => {
    if (!ready) return;
    resolveCart(eventLines, { guestCount: event.guestCount }).then(setCart);
  }, [eventLines, event.guestCount, ready]);

  const check = validateEventSubmission(form, event, {
    methods: ctx.methods,
    lineCount: eventLines.length,
  });
  const errors: Errors = { ...(touched ? check.errors : {}), ...serverErrors };

  if (ready && !hasEvent) {
    return (
      <>
        <EventHeader current="review" />
        <div className="mx-auto max-w-2xl px-5 py-16 text-center sm:px-8">
          <p className="font-display text-[24px] text-ink">No event request in progress</p>
          <Link href="/events/start" className="btn-primary mt-8">Start an event request</Link>
        </div>
      </>
    );
  }

  if (!ready || !cart) {
    return <p className="py-20 text-center text-[15px] text-ink-faint">Loading your request…</p>;
  }

  const occasion =
    event.eventType === "OTHER"
      ? event.eventTypeOther || "Other"
      : event.eventType
        ? EVENT_TYPE_LABELS[event.eventType]
        : "Your event";

  const extras = chosenExtras(event);
  const tier = cart.lines.find((l) => l.eventTier)?.eventTier ?? null;

  async function send() {
    setTouched(true);
    if (!check.ok || sending) return;
    setSending(true);
    const result = await submitEventRequest(form, event, eventLines);
    if (result.ok) {
      // A card payment finishes on the provider's own hosted page.
      if (result.payAt) {
        window.location.href = result.payAt;
        return;
      }
      clearEvent();
      router.push(`/order/${result.token}`);
      return;
    }
    setServerErrors(result.errors);
    setSending(false);
  }

  return (
    <>
      <EventHeader current="review" />

      <div className="mx-auto max-w-content px-5 py-12 sm:px-8 sm:py-14">
        <p className="eyebrow">Last step</p>
        <h1 className="mt-3 font-display text-[32px] font-semibold leading-tight text-ink sm:text-[40px]">
          Everything for your {occasion.toLowerCase()}
        </h1>
        <p className="mt-4 max-w-xl text-[16.5px] leading-relaxed text-ink-soft">
          Check it over, tell us who you are, and send it. We come back to you personally to
          confirm before anything is booked.
        </p>

        <div className="mt-12 grid gap-12 lg:grid-cols-[minmax(0,1fr)_380px] lg:gap-16">
          <div>
            {/* how it is served */}
            <section>
              <SectionHeading step="Step one" title="How should it be served?" />
              <ServingSetupChoice
                value={form.servingSetup}
                onChange={(v) => set({ servingSetup: v })}
                policy={ctx.servingSetupPolicy}
                offered={ctx.servingSetups}
              />
            </section>

            <Rule />

            <section>
              <SectionHeading step="Step two" title="Who should we speak to?" />
              <CustomerFields value={form} onChange={set} errors={errors} />
              <div className="mt-6">
                <Field label="Anything we should know" htmlFor="notes" optional>
                  <textarea
                    id="notes" rows={3} value={form.notes}
                    onChange={(e) => set({ notes: e.target.value })}
                    className={input()}
                  />
                </Field>
              </div>
            </section>

            <Rule />

            <section>
              <SectionHeading step="Step three" title="How would you like to pay?" />
              <PaymentChoice
                ctx={ctx}
                fulfilment="DELIVERY"
                value={form.paymentMethod}
                reference={form.paymentReference}
                onChange={(m) => set({ paymentMethod: m })}
                onReference={(r) => set({ paymentReference: r })}
                errors={errors}
              />
              <p className="mt-4 text-[14px] leading-relaxed text-ink-soft">
                Nothing is taken now. We agree the payment with you when we confirm the event.
              </p>
            </section>
          </div>

          {/* the review */}
          <aside className="lg:sticky lg:top-24 lg:self-start">
            <div className="overflow-hidden rounded-sm border border-gold/45 bg-cream-warm">
              <header className="border-b border-gold/25 bg-gold-pale/45 px-6 py-5">
                <p className="text-[11px] uppercase tracking-widest text-gold">Event request</p>
                <h2 className="mt-1.5 font-display text-[22px] font-semibold text-ink">{occasion}</h2>
              </header>

              <div className="px-6 py-5">
                <dl>
                  <ReviewRow label="Date" value={event.date ? longDate(event.date) : "—"} />
                  <ReviewRow label="Time" value={event.time || "—"} />
                  <ReviewRow label="Guests" value={event.guestCount ? `${event.guestCount} people` : "—"} />
                  <ReviewRow label="Venue" value={event.venue || "—"} />
                </dl>
              </div>

              <div className="border-t border-line px-6 py-5">
                <h3 className="text-[11px] uppercase tracking-widest text-ink-faint">Dishes</h3>
                <ul className="mt-3">
                  {cart.lines.map((l) => (
                    <li key={l.key} className="flex items-start justify-between gap-4 border-b border-line-soft py-3 last:border-0">
                      <span className="min-w-0 text-[15px] text-ink">
                        <span className="tabular-nums text-ink-faint">{l.quantity}&times;</span>{" "}
                        {l.productName}
                        {l.variantName && <span className="text-ink-soft"> · {l.variantName}</span>}
                      </span>
                      <span className="whitespace-nowrap text-[15px] tabular-nums text-ink">
                        {formatEGP(l.lineTotal)}
                      </span>
                    </li>
                  ))}
                </ul>

                <div className="mt-4 flex items-baseline justify-between gap-4 border-t border-line pt-4">
                  <span className="font-display text-[18px] font-semibold text-ink">Food subtotal</span>
                  <span className="font-display text-[21px] font-semibold tabular-nums text-ink">
                    <Money amount={cart.subtotal} />
                  </span>
                </div>
                {tier?.multiplierBp != null && cart.guestCount !== null && (
                  <p className="mt-1.5 text-[13.5px] leading-relaxed text-ink-soft">
                    Priced for {cart.guestCount} guests at {formatMultiplier(tier.multiplierBp)} the
                    regular menu price.
                  </p>
                )}
              </div>

              {/* Quote-only, and deliberately outside the subtotal above. */}
              <div className="border-t border-line px-6 py-5">
                <h3 className="text-[11px] uppercase tracking-widest text-ink-faint">
                  Anything else for the day?
                </h3>
                {extras.length === 0 ? (
                  <p className="mt-3 text-[15px] text-ink-soft">Nothing requested.</p>
                ) : (
                  <>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {extras.map((x) => (
                        <span
                          key={x}
                          className="rounded-full border border-gold/45 bg-cream px-3.5 py-1.5 text-[13.5px] text-ink"
                        >
                          {x}
                        </span>
                      ))}
                    </div>
                    <p className="mt-3 text-[13.5px] leading-relaxed text-ink-soft">
                      Quoted separately when we confirm the event. Not included in the food subtotal.
                    </p>
                  </>
                )}
                {event.extrasNotes && (
                  <p className="mt-3 border-t border-line-soft pt-3 text-[14px] italic text-ink-soft">
                    {event.extrasNotes}
                  </p>
                )}
                <Link href="/cart" className="link-sweep mt-4 inline-block text-[14px]">
                  Change anything above
                </Link>
              </div>

              <div className="border-t border-line px-6 py-6">
                {Object.keys(errors).length > 0 && touched && (
                  <p className="mb-4 rounded-sm border border-[#A6391C]/30 bg-[#A6391C]/[0.07] px-4 py-3 text-[14px] text-[#A6391C]">
                    {Object.values(errors)[0]}
                  </p>
                )}
                <button
                  type="button"
                  onClick={send}
                  disabled={sending}
                  className="btn-primary w-full disabled:bg-ink/25"
                >
                  {sending ? "Sending your request…" : "Send this event request"}
                </button>
                <p className="mt-4 text-[13.5px] leading-relaxed text-ink-soft">
                  This is a <strong className="font-semibold text-ink">request</strong>, not a
                  booking. Nothing is reserved until we confirm it with you.
                </p>
              </div>
            </div>
          </aside>
        </div>
      </div>
    </>
  );
}

function Rule() {
  return <div className="my-12 border-t border-line-soft" />;
}

function longDate(iso: string) {
  const d = new Date(iso + "T00:00:00");
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
}

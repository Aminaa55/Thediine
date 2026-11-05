"use client";

import { useCart, type EventDraft } from "@/lib/cart";

export const EXTRAS = [
  {
    key: "decorRequested" as const,
    title: "Table décor",
    body: "Dressing the table — linen, flowers, the finishing details.",
  },
  {
    key: "setupRequested" as const,
    title: "Event setup",
    body: "We arrive early and set everything out ready for your guests.",
  },
  {
    key: "servingStaffRequested" as const,
    title: "Serving staff",
    body: "Our team stays to serve through the event.",
  },
  {
    key: "candyBarRequested" as const,
    title: "Candy bar",
    body: "Fondant cakes, cupcakes, cake pops and biscuits, or buttercream cakes.",
  },
];

export function chosenExtras(event: EventDraft): string[] {
  return EXTRAS.filter((x) => event[x.key]).map((x) => x.title);
}

/**
 * "Request a quotation" — asked while the event is being planned, not
 * discovered later from the cart.
 *
 * All four are request-and-quote. Nothing here carries a price or touches any
 * total; pricing has not been defined, so none is implied. They are kept in
 * their own framed panel, apart from the food, headed as quotations and with
 * one "Request a quote" action: a Yes/No toggle beside a dish list reads as an
 * included option, and none of these is included.
 */
export function EventExtras({ compact = false }: { compact?: boolean }) {
  const { event, updateEvent } = useCart();

  return (
    <section
      aria-labelledby="quotes-heading"
      className={`rounded-sm border-2 border-dashed border-gold/50 bg-cream px-6 py-7 sm:px-8 ${compact ? "" : "mt-14"}`}
    >
      <p className="eyebrow">Priced separately · not part of your food order</p>
      <h2
        id="quotes-heading"
        className={
          compact
            ? "mt-2 font-display text-[21px] font-semibold text-ink"
            : "mt-2 font-display text-[26px] font-semibold text-ink sm:text-[30px]"
        }
      >
        Request a quotation
      </h2>
      <p className="mt-3 max-w-xl text-[16px] leading-relaxed text-ink-soft">
        These have no set price and are not in your food total. Ask for a quote on any of them
        and we send you the price when we confirm your event.
      </p>

      <div className="mt-7 grid gap-3">
        {EXTRAS.map((x) => {
          const on = event[x.key];
          return (
            <div
              key={x.key}
              className={`rounded-sm border px-6 py-5 transition-colors ${
                on ? "border-gold bg-gold-pale/40" : "border-line bg-cream-warm"
              }`}
            >
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="min-w-0">
                  <h3 className="font-display text-[20px] font-semibold text-ink">{x.title}</h3>
                  <p className="mt-1.5 text-[15px] leading-relaxed text-ink-soft">{x.body}</p>
                  <p className="mt-2 text-[13px] uppercase tracking-widest text-ink-faint">
                    No set price · quoted on request
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => updateEvent({ [x.key]: !on })}
                  aria-pressed={on}
                  className={`whitespace-nowrap rounded-full border px-5 py-2 text-[14.5px] transition-colors ${
                    on
                      ? "border-ink bg-ink text-cream"
                      : "border-ink/40 bg-cream text-ink hover:border-gold"
                  }`}
                >
                  {on ? "Quote requested ✓" : "Request a quote"}
                </button>
              </div>
              {on && (
                <p className="mt-4 border-t border-gold/25 pt-3 text-[13.5px] text-ink-soft">
                  We will send you a quotation for this with your event confirmation. It is not
                  added to your food total.
                </p>
              )}
            </div>
          );
        })}
      </div>

      <div className="mt-7">
        <label htmlFor="extras-notes" className="eyebrow mb-3 block">
          Anything we should know{" "}
          <span className="normal-case tracking-normal text-ink-faint">optional</span>
        </label>
        <textarea
          id="extras-notes"
          rows={3}
          value={event.extrasNotes}
          onChange={(e) => updateEvent({ extrasNotes: e.target.value })}
          placeholder="Colours, timings, dietary needs, anything at all."
          className="w-full rounded-sm border border-line bg-cream-warm px-4 py-3 text-[16px] text-ink placeholder:text-ink-faint focus:border-gold focus:outline-none"
        />
      </div>
    </section>
  );
}

/**
 * Said on the card itself, not only in the paragraph above the list: the label
 * travels with each extra wherever it is shown, so none of them can look free.
 */
export function QuotedBadge({ className = "" }: { className?: string }) {
  return (
    <span
      className={`inline-block rounded-full border border-ink/15 bg-cream px-2.5 py-0.5 text-[11px] uppercase tracking-widest text-ink-soft ${className}`}
    >
      Quotation
    </span>
  );
}

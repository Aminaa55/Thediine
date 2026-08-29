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
];

export function chosenExtras(event: EventDraft): string[] {
  return EXTRAS.filter((x) => event[x.key]).map((x) => x.title);
}

/**
 * "Anything else for the day?" — asked while the event is being planned, not
 * discovered later from the cart.
 *
 * All three are request-and-quote. Nothing here carries a price or touches any
 * total; pricing has not been defined, so none is implied.
 */
export function EventExtras({ compact = false }: { compact?: boolean }) {
  const { event, updateEvent } = useCart();

  return (
    <section className={compact ? "" : "mt-14"}>
      <h2
        className={
          compact
            ? "font-display text-[21px] font-semibold text-ink"
            : "font-display text-[26px] font-semibold text-ink sm:text-[30px]"
        }
      >
        Anything else for the day?
      </h2>
      <p className="mt-3 max-w-xl text-[16px] leading-relaxed text-ink-soft">
        Tell us what you would like and we will quote each one when we confirm your event.
        Nothing here is added to your total.
      </p>

      <div className="mt-7 grid gap-3">
        {EXTRAS.map((x) => {
          const on = event[x.key];
          return (
            <div
              key={x.key}
              className={`rounded-sm border px-6 py-6 transition-colors ${
                on ? "border-gold bg-gold-pale/40" : "border-line bg-cream-warm"
              }`}
            >
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="min-w-0">
                  <h3 className="font-display text-[20px] font-semibold text-ink">{x.title}</h3>
                  <p className="mt-2 text-[15px] leading-relaxed text-ink-soft">{x.body}</p>
                </div>
                <div className="flex gap-2" role="group" aria-label={x.title}>
                  <Toggle on={on} onClick={() => updateEvent({ [x.key]: true })} label="Yes" />
                  <Toggle on={!on} onClick={() => updateEvent({ [x.key]: false })} label="No" />
                </div>
              </div>
              {on && (
                <p className="mt-4 border-t border-gold/25 pt-3 text-[13.5px] text-ink-soft">
                  We will quote this when we confirm your event.
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

function Toggle({ on, onClick, label }: { on: boolean; onClick: () => void; label: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={on}
      className={`rounded-full border px-5 py-2 text-[14.5px] transition-colors ${
        on ? "border-ink bg-ink text-cream" : "border-line bg-cream-warm text-ink-soft hover:border-gold"
      }`}
    >
      {label}
    </button>
  );
}

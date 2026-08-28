"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCart } from "@/lib/cart";
import { EventProgress } from "./event-steps";

/**
 * Step four: the extras.
 *
 * All three are request-and-quote. Nothing here carries a price or touches the
 * order total — pricing has not been defined, so none is implied.
 */
const EXTRAS = [
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

export function EventExtrasForm() {
  const router = useRouter();
  const { event, updateEvent, mode } = useCart();

  if (mode !== "event") return <NotInEvent />;

  return (
    <>
      <EventProgress current="extras" />

      <div className="mx-auto max-w-2xl px-5 py-12 sm:px-8 sm:py-16">
        <p className="eyebrow">Step four</p>
        <h1 className="mt-3 font-display text-[32px] font-semibold leading-tight text-ink sm:text-[40px]">
          Anything else for the day?
        </h1>
        <p className="mt-5 text-[17px] leading-relaxed text-ink-soft">
          Tell us what you would like and we will quote each one when we confirm your
          event. Nothing here is added to your total.
        </p>

        <div className="mt-10 grid gap-3">
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
                    <h2 className="font-display text-[21px] font-semibold text-ink">{x.title}</h2>
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

        <div className="mt-8">
          <label htmlFor="extras-notes" className="eyebrow mb-3 block">
            Anything we should know <span className="normal-case tracking-normal text-ink-faint">optional</span>
          </label>
          <textarea
            id="extras-notes"
            rows={4}
            value={event.extrasNotes}
            onChange={(e) => updateEvent({ extrasNotes: e.target.value })}
            placeholder="Colours, timings, dietary needs, anything at all."
            className="w-full rounded-sm border border-line bg-cream-warm px-4 py-3 text-[16px] text-ink placeholder:text-ink-faint focus:border-gold focus:outline-none"
          />
        </div>

        <div className="mt-10 flex flex-wrap items-center gap-4">
          <button type="button" onClick={() => router.push("/cart")} className="btn-primary">
            Back to your request
          </button>
          <Link href="/menu" className="text-[15px] text-ink-soft underline underline-offset-4 hover:text-ink">
            Back to the menu
          </Link>
        </div>
      </div>
    </>
  );
}

function Toggle({ on, onClick, label }: { on: boolean; onClick: () => void; label: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={on}
      className={`rounded-full border px-5 py-2 text-[14.5px] transition-colors ${
        on ? "border-ink bg-ink text-cream" : "border-line bg-cream-warm text-ink-soft hover:border-ink/40"
      }`}
    >
      {label}
    </button>
  );
}

function NotInEvent() {
  return (
    <div className="mx-auto max-w-md px-5 py-24 text-center">
      <p className="font-display text-[24px] text-ink">No event request in progress</p>
      <p className="mt-3 text-[16px] text-ink-soft">Start one and we will take it from the top.</p>
      <Link href="/events/start" className="btn-primary mt-8">Start an event request</Link>
    </div>
  );
}

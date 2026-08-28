"use client";

import Link from "next/link";
import { useEffect, useState, useTransition } from "react";
import { useCart } from "@/lib/cart";
import { resolveCart, type ResolvedCart } from "@/app/actions";
import { formatEGP } from "@/lib/money";
import { RULES } from "@/lib/ordering";
import { EventDetailsCard } from "./event-details-card";

export function CartView() {
  const { lines, ready, mode, setQuantity, removeLine } = useCart();
  const [resolved, setResolved] = useState<ResolvedCart | null>(null);
  const [pending, startTransition] = useTransition();

  // Prices always come from the database, never from what the browser stored.
  useEffect(() => {
    if (!ready) return;
    startTransition(async () => setResolved(await resolveCart(lines)));
  }, [lines, ready]);

  if (!ready || (!resolved && lines.length > 0)) {
    return <p className="py-20 text-center text-[15px] text-ink-faint">Loading your cart…</p>;
  }

  const isEvent = mode === "event";

  if (lines.length === 0) {
    return (
      <div className="mx-auto max-w-2xl">
        {isEvent && <EventDetailsCard />}
        <div className="py-16 text-center">
          <p className="font-display text-[24px] text-ink">
            {isEvent ? "No dishes chosen yet" : "Nothing here yet"}
          </p>
          <p className="mx-auto mt-3 max-w-sm text-[16px] text-ink-soft">
            Browse the menu and add the dishes you would like.
          </p>
          <Link href="/menu" className="btn-primary mt-8">Browse the menu</Link>
        </div>
      </div>
    );
  }

  const cart = resolved!;
  const hasProblems = cart.lines.some((l) => l.problem);

  return (
    <div className="grid gap-12 lg:grid-cols-[1.6fr_1fr] lg:gap-16">
      <div>
        {isEvent && (
          <div className="mb-10">
            <EventDetailsCard />
          </div>
        )}

        {isEvent && (
          <h2 className="mb-5 font-display text-[22px] font-semibold text-ink">
            Dishes for your event
          </h2>
        )}

        <ul className={pending ? "opacity-60 transition-opacity" : "transition-opacity"}>
        {cart.lines.map((line) => (
          <li key={line.key} className="border-b border-line py-6 first:pt-0">
            <div className="flex items-start justify-between gap-5">
              <div className="min-w-0">
                <h2 className="font-display text-[19px] font-semibold leading-snug text-ink">
                  {line.slug ? (
                    <Link href={`/product/${line.slug}`} className="hover:text-gold">
                      {line.productName}
                    </Link>
                  ) : (
                    line.productName
                  )}
                </h2>

                {line.variantName && (
                  <p className="mt-1 text-[15px] text-ink-soft">{line.variantName}</p>
                )}

                {line.options.length > 0 && (
                  <ul className="mt-2 space-y-0.5">
                    {line.options.map((o) => (
                      <li key={o.groupName} className="text-[14.5px] text-ink-soft">
                        <span className="text-ink-faint">{o.groupName}:</span> {o.choiceName}
                      </li>
                    ))}
                  </ul>
                )}

                {line.instructions && (
                  <p className="mt-2 border-s-2 border-line ps-3 text-[14px] italic text-ink-soft">
                    {line.instructions}
                  </p>
                )}

                {line.problem && (
                  <p className="mt-2 text-[14px] text-[#A6391C]">{line.problem}</p>
                )}
              </div>

              <p className="whitespace-nowrap font-display text-[18px] font-semibold tabular-nums text-ink">
                {formatEGP(line.lineTotal)}
              </p>
            </div>

            <div className="mt-4 flex items-center gap-4">
              <div className="flex items-center rounded-full border border-line bg-cream-warm">
                <button
                  type="button"
                  onClick={() => setQuantity(line.key, line.quantity - line.quantityStep)}
                  aria-label={`Reduce quantity of ${line.productName}`}
                  className="px-3.5 py-2 text-ink-soft"
                >
                  &minus;
                </button>
                <span className="min-w-[2rem] text-center text-[15px] tabular-nums">{line.quantity}</span>
                <button
                  type="button"
                  onClick={() => setQuantity(line.key, line.quantity + line.quantityStep)}
                  aria-label={`Increase quantity of ${line.productName}`}
                  className="px-3.5 py-2 text-ink-soft"
                >
                  +
                </button>
              </div>

              <button
                type="button"
                onClick={() => removeLine(line.key)}
                className="text-[14px] text-ink-faint underline underline-offset-4 hover:text-ink"
              >
                Remove
              </button>

              {!line.problem && (
                <span className="ms-auto text-[13.5px] tabular-nums text-ink-faint">
                  {formatEGP(line.unitPrice)} each
                </span>
              )}
            </div>
          </li>
        ))}
        </ul>
      </div>

      <aside className="lg:sticky lg:top-28 lg:self-start">
        <div className="rounded-sm border border-line bg-cream-warm p-6">
          <h2 className="font-display text-[21px] font-semibold text-ink">
            {isEvent ? "Your event so far" : "Order summary"}
          </h2>

          <dl className="mt-6 space-y-3 text-[15.5px]">
            <div className="flex items-baseline justify-between gap-4">
              <dt className="text-ink-soft">Food subtotal</dt>
              <dd className="font-medium tabular-nums">{formatEGP(cart.subtotal)}</dd>
            </div>
            {!isEvent && (
              <div className="flex items-baseline justify-between gap-4">
                <dt className="text-ink-soft">Delivery</dt>
                <dd className="text-[14.5px] text-ink-faint">Calculated at checkout</dd>
              </div>
            )}
          </dl>

          <div className="mt-5 flex items-baseline justify-between gap-4 border-t border-line pt-5">
            <span className="font-display text-[19px] font-semibold text-ink">Total so far</span>
            <span className="font-display text-[21px] font-semibold tabular-nums text-ink">
              {formatEGP(cart.subtotal)}
            </span>
          </div>

          {hasProblems && (
            <p className="mt-5 text-[14px] text-[#A6391C]">
              Please remove the unavailable items before continuing.
            </p>
          )}

          {isEvent ? (
            <>
              <Link href="/events/extras" className="btn-primary mt-6 w-full">
                Continue to event extras
              </Link>
              <p className="mt-3 text-center text-[13.5px] text-ink-faint">
                Table décor, setup and serving staff come next.
              </p>
            </>
          ) : (
            <>
              <button type="button" disabled className="btn-primary mt-6 w-full disabled:bg-ink/25">
                Continue to checkout
              </button>
              <p className="mt-3 text-center text-[13.5px] text-ink-faint">
                Delivery or pickup, your date and payment come next.
              </p>
            </>
          )}

          <Link href="/menu" className="mt-5 block text-center text-[14.5px] text-gold underline underline-offset-4">
            Keep browsing the menu
          </Link>
        </div>

        {/* Notice periods appear here, in context — never both at once, and
            never on the homepage. */}
        <div className="mt-5 rounded-sm border border-line bg-cream-deep px-5 py-4">
          {isEvent ? (
            <p className="text-[14px] leading-relaxed text-ink-soft">
              Events need at least{" "}
              <strong className="font-semibold text-ink">{RULES.event.noticeLabel}&rsquo; notice</strong>.
              Your request is confirmed by us personally before it is booked.
            </p>
          ) : (
            <p className="text-[14px] leading-relaxed text-ink-soft">
              Orders need at least{" "}
              <strong className="font-semibold text-ink">{RULES.normal.noticeLabel}&rsquo; notice</strong>.
              You will choose your date at checkout, and only available dates can be picked.
            </p>
          )}
        </div>
      </aside>
    </div>
  );
}

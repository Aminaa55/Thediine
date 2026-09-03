"use client";

import Link from "next/link";
import { useEffect, useState, useTransition } from "react";
import { useCart, type CartLine } from "@/lib/cart";
import { resolveCart, type ResolvedCart, type ResolvedLine } from "@/app/actions";
import { formatEGP } from "@/lib/money";
import { useRules } from "./rules-provider";
import { formatMultiplier } from "@/lib/event-pricing";
import { EventRequestSection } from "./event-request-panel";

/**
 * One cart, two order types.
 *
 * A normal order and an event request can exist side by side. They are shown as
 * separate sections, edited independently, and stay separate all the way to
 * checkout, where each follows its own rules.
 */
export function CartView() {
  const { normalLines, eventLines, event: draft, hasEvent, ready, setQuantity, removeLine } = useCart();
  const [normal, setNormal] = useState<ResolvedCart | null>(null);
  const [event, setEvent] = useState<ResolvedCart | null>(null);
  const [pending, startTransition] = useTransition();

  const guestCount = draft.guestCount;

  /**
   * Prices always come from the database, never from what the browser stored.
   *
   * The event lines are resolved WITH the guest count, because event food is
   * priced by guest band. Changing the guest count re-runs this, so every event
   * price and the food subtotal follow it — and the normal order, resolved
   * without it, is untouched.
   */
  useEffect(() => {
    if (!ready) return;
    startTransition(async () => {
      const [n, e] = await Promise.all([
        resolveCart(normalLines),
        resolveCart(eventLines, { guestCount }),
      ]);
      setNormal(n);
      setEvent(e);
    });
  }, [normalLines, eventLines, guestCount, ready]);

  if (!ready || !normal || !event) {
    return <p className="py-20 text-center text-[15px] text-ink-faint">Loading your cart…</p>;
  }

  if (normalLines.length === 0 && !hasEvent) {
    return (
      <div className="py-16 text-center">
        <p className="font-display text-[24px] text-ink">Nothing here yet</p>
        <p className="mx-auto mt-3 max-w-sm text-[16px] text-ink-soft">
          Browse the menu and add the dishes you would like.
        </p>
        <Link href="/menu" className="btn-primary mt-8">Browse the menu</Link>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-14">
      {normalLines.length > 0 && (
        <NormalOrderSection
          cart={normal}
          pending={pending}
          soleOrder={!hasEvent}
          onQuantity={(k, q) => setQuantity("normal", k, q)}
          onRemove={(k) => removeLine("normal", k)}
        />
      )}

      {hasEvent && (
        <EventRequestSection
          cart={event}
          pending={pending}
          onQuantity={(k, q) => setQuantity("event", k, q)}
          onRemove={(k) => removeLine("event", k)}
        />
      )}

      {normalLines.length === 0 && hasEvent && (
        <p className="text-[15px] text-ink-soft">
          Nothing in your regular order.{" "}
          <Link href="/menu" className="link-sweep">Browse the menu</Link> to add dishes to one.
        </p>
      )}
    </div>
  );
}

function NormalOrderSection({
  cart, pending, soleOrder, onQuantity, onRemove,
}: {
  cart: ResolvedCart;
  pending: boolean;
  /**
   * True when there is no event request alongside this in the cart — nothing
   * to distinguish it from, so it is simply "your order" rather than the
   * "normal order" half of a pair.
   */
  soleOrder: boolean;
  onQuantity: (key: string, q: number) => void;
  onRemove: (key: string) => void;
}) {
  const { normalNoticeLabel: noticeLabel } = useRules();
  return (
    <section className="overflow-hidden rounded-sm border border-line bg-cream-warm">
      <header className="flex flex-wrap items-baseline justify-between gap-4 border-b border-line bg-cream-deep px-6 py-5 sm:px-8">
        <div>
          {!soleOrder && <p className="text-[11px] uppercase tracking-widest text-ink-faint">Normal order</p>}
          <h2 className={`font-display text-[24px] font-semibold leading-tight text-ink ${soleOrder ? "" : "mt-1.5"}`}>
            {soleOrder ? "Your order" : "Your regular order"}
          </h2>
        </div>
        <Link href="/menu" className="link-sweep text-[14.5px]">Add more dishes</Link>
      </header>

      <div className="px-6 py-6 sm:px-8">
        <ul className={pending ? "opacity-60 transition-opacity" : "transition-opacity"}>
          {cart.lines.map((line) => (
            <CartRow key={line.key} line={line} onQuantity={onQuantity} onRemove={onRemove} />
          ))}
        </ul>

        <div className="mt-7 flex flex-wrap items-baseline justify-between gap-4 border-t border-line pt-6">
          <span className="font-display text-[19px] font-semibold text-ink">Subtotal</span>
          <span className="font-display text-[22px] font-semibold tabular-nums text-ink">
            {formatEGP(cart.subtotal)}
          </span>
        </div>
        <p className="mt-1.5 text-[14px] text-ink-faint">Delivery calculated at checkout.</p>

        <Link href="/checkout" className="btn-primary mt-6 w-full sm:w-auto">
          Check out this order
        </Link>
        <p className="mt-4 text-[14px] leading-relaxed text-ink-soft">
          Regular orders need at least{" "}
          <strong className="font-semibold text-ink">{noticeLabel}&rsquo; notice</strong>,
          with delivery or pickup and your date chosen at checkout.
        </p>
      </div>
    </section>
  );
}

export function CartRow({
  line, onQuantity, onRemove,
}: {
  line: ResolvedLine;
  onQuantity: (key: string, q: number) => void;
  onRemove: (key: string) => void;
}) {
  return (
    <li className="border-b border-line-soft py-5 first:pt-0 last:border-0">
      <div className="flex items-start justify-between gap-5">
        <div className="min-w-0">
          <h3 className="font-display text-[18px] font-semibold leading-snug text-ink">
            {line.slug ? (
              <Link href={`/product/${line.slug}`} className="hover:text-gold">
                {line.productName}
              </Link>
            ) : (
              line.productName
            )}
          </h3>
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
          {line.problem && <p className="mt-1.5 text-[14px] text-[#A6391C]">{line.problem}</p>}
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
          <span className="min-w-[2rem] text-center text-[15px] tabular-nums">{line.quantity}</span>
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
        {!line.problem && (
          <span className="ms-auto text-[13.5px] tabular-nums text-ink-faint">
            {/* An event line says what it scaled from, so the figure is never a mystery. */}
            {line.eventTier?.multiplierBp != null && (
              <span className="me-2">
                {formatMultiplier(line.eventTier.multiplierBp)} regular{" "}
                {formatEGP(line.normalUnitPrice)} &middot;
              </span>
            )}
            {formatEGP(line.unitPrice)} each
          </span>
        )}
      </div>
    </li>
  );
}

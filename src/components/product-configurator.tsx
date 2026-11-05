"use client";

import { useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { formatEGP } from "@/lib/money";
import { useCart, EVENT_TYPE_LABELS, type OrderScope } from "@/lib/cart";
import { useEventGuests } from "./event-price";
import {
  eventUnitPrice,
  formatMultiplier,
  type EventTier,
  type ProductEventPricing,
} from "@/lib/event-pricing";

type Choice = { id: string; nameEn: string; priceDelta: number };
type Group = {
  id: string;
  nameEn: string;
  type: "SINGLE" | "MULTI";
  isRequired: boolean;
  /** How many choices the group asks for. 1 and 1 is the ordinary single choice. */
  minSelect: number;
  maxSelect: number;
  choices: Choice[];
};

/** "Choose two", "Choose up to three", "Choose two to four". */
function pickLabel(g: Group): string {
  if (g.maxSelect <= 1) return "";
  const n = (k: number) => ["one", "two", "three", "four", "five", "six"][k - 1] ?? String(k);
  if (g.minSelect === g.maxSelect) return `Choose ${n(g.maxSelect)}`;
  if (g.minSelect <= 0) return `Choose up to ${n(g.maxSelect)}`;
  return `Choose ${n(g.minSelect)} to ${n(g.maxSelect)}`;
}

/** What is still missing on a group, in the customer's words, or null when nothing is. */
function shortfall(g: Group, picked: number): string | null {
  if (g.maxSelect <= 1) return g.isRequired && picked === 0 ? g.nameEn.toLowerCase() : null;
  if (!g.isRequired || picked >= g.minSelect) return null;
  const left = g.minSelect - picked;
  return `${left} more from ${g.nameEn.toLowerCase()}`;
}
type Variant = { id: string; nameEn: string; price: number };

/**
 * Required choices must be answered before Add to Cart unlocks, and the price
 * updates live. Variants carry their own price; option choices add their delta
 * (currently zero on every accompaniment, by instruction).
 *
 * A group is either one choice — "Served with", a radio — or a set: a finger
 * food package asks for "two buns" from a list, which is checkboxes that stop
 * taking ticks at the limit. The server applies the same limits again when the
 * cart is resolved.
 */
export function ProductConfigurator({
  productId,
  basePrice,
  variants,
  groups,
  minQuantity,
  quantityStep,
  isAvailable,
  pricing,
  tiers,
}: {
  productId: string;
  basePrice: number | null;
  variants: Variant[];
  groups: Group[];
  minQuantity: number;
  quantityStep: number;
  isAvailable: boolean;
  /** How this dish prices for an event. */
  pricing: ProductEventPricing;
  /** The shared guest-count ladder. */
  tiers: EventTier[];
}) {
  const router = useRouter();
  const params = useSearchParams();
  const { addLine, event, hasEvent, ready } = useCart();

  /**
   * Where does this dish go?
   *
   * The journey decides, not a global mode. A link carrying `?for=event` means
   * the customer is choosing dishes for their event. From a neutral menu with
   * an event already open we do not guess — we ask.
   */
  const forcedScope: OrderScope | null = params.get("for") === "event" ? "event" : null;
  const mustAsk = ready && hasEvent && forcedScope === null;
  const [chosen, setChosen] = useState<OrderScope | null>(null);
  const scope: OrderScope = forcedScope ?? (mustAsk ? (chosen ?? "normal") : "normal");

  const occasion =
    event.eventType === "OTHER"
      ? event.eventTypeOther || "event"
      : event.eventType
        ? EVENT_TYPE_LABELS[event.eventType]
        : "event";

  const [variantId, setVariantId] = useState<string | null>(variants[0]?.id ?? null);
  /** Chosen choice ids per group — one for a single choice, several for a set. */
  const [selected, setSelected] = useState<Record<string, string[]>>({});
  const [quantity, setQuantity] = useState(minQuantity);
  const [instructions, setInstructions] = useState("");
  const [added, setAdded] = useState(false);

  const picked = (g: Group) => selected[g.id] ?? [];
  const missing = groups
    .map((g) => shortfall(g, picked(g).length))
    .filter((m): m is string => m !== null);
  const canAdd = isAvailable && missing.length === 0;

  function choose(group: Group, choiceId: string) {
    setSelected((s) => {
      const current = s[group.id] ?? [];
      if (group.maxSelect <= 1) return { ...s, [group.id]: [choiceId] };
      if (current.includes(choiceId)) {
        return { ...s, [group.id]: current.filter((id) => id !== choiceId) };
      }
      // At the limit, a further tick does nothing — the box is disabled too.
      if (current.length >= group.maxSelect) return s;
      return { ...s, [group.id]: [...current, choiceId] };
    });
    setAdded(false);
  }

  const guests = useEventGuests();

  /**
   * Two prices, because the same dish costs differently in the two orders.
   *
   * The normal price is the menu price. The event price scales it by the guest
   * count, so when the customer is asked WHERE a dish should go, each button
   * shows what that dish would actually cost there.
   */
  const { normalPrice, eventPrice, eventTier } = useMemo(() => {
    const base = variantId
      ? (variants.find((v) => v.id === variantId)?.price ?? 0)
      : (basePrice ?? 0);
    const delta = groups.reduce((sum, g) => {
      const ids = selected[g.id] ?? [];
      return sum + g.choices.filter((c) => ids.includes(c.id)).reduce((n, c) => n + c.priceDelta, 0);
    }, 0);
    const priced = eventUnitPrice(base, guests, pricing, tiers);
    return {
      normalPrice: base + delta,
      eventPrice: priced.amount + delta,
      eventTier: priced.scaled ? priced.tier : null,
    };
  }, [variantId, variants, basePrice, groups, selected, guests, pricing, tiers]);

  const unitPrice = scope === "event" ? eventPrice : normalPrice;

  function handleAdd(target: OrderScope) {
    if (!canAdd) return;
    addLine(target, {
      productId,
      variantId,
      choiceIds: Object.values(selected).flat(),
      quantity,
      instructions: instructions.trim(),
    });
    setAdded(true);
    setChosen(target);
    router.refresh();
  }

  return (
    <div className="mt-8">
      {variants.length > 0 && (
        <fieldset className="mb-8">
          <legend className="eyebrow mb-3">Choose one</legend>
          <div className="flex flex-wrap gap-2.5">
            {variants.map((v) => (
              <button
                key={v.id}
                type="button"
                onClick={() => { setVariantId(v.id); setAdded(false); }}
                aria-pressed={variantId === v.id}
                className={`rounded-full border px-5 py-2.5 text-[14.5px] transition-colors ${
                  variantId === v.id
                    ? "border-ink bg-ink text-cream"
                    : "border-line bg-cream-warm text-ink-soft hover:border-ink/40"
                }`}
              >
                {v.nameEn}
                {/* Priced for whichever order this dish is heading into. */}
                <span className="ms-2 tabular-nums opacity-70">
                  {formatEGP(
                    scope === "event"
                      ? eventUnitPrice(v.price, guests, pricing, tiers).amount
                      : v.price,
                  )}
                </span>
              </button>
            ))}
          </div>
        </fieldset>
      )}

      {groups.map((group) => {
        const set = group.maxSelect > 1;
        const chosenIds = picked(group);
        const full = set && chosenIds.length >= group.maxSelect;
        return (
        <fieldset key={group.id} className="mb-8">
          <legend className="eyebrow mb-3">
            {group.nameEn}
            {set ? (
              <span className="ms-2 normal-case tracking-normal text-ink-faint">
                {pickLabel(group)}
                <span className="tabular-nums"> · {chosenIds.length} of {group.maxSelect}</span>
              </span>
            ) : (
              group.isRequired && <span className="ms-2 normal-case tracking-normal text-ink-faint">required</span>
            )}
          </legend>
          <div className="flex flex-col gap-2">
            {group.choices.map((choice) => {
              const active = chosenIds.includes(choice.id);
              const blocked = full && !active;
              return (
                <label
                  key={choice.id}
                  className={`flex items-center gap-3 rounded-sm border px-4 py-3 text-[15px] transition-colors ${
                    active
                      ? "cursor-pointer border-gold bg-gold/[0.07]"
                      : blocked
                        ? "cursor-not-allowed border-line bg-cream-warm opacity-45"
                        : "cursor-pointer border-line bg-cream-warm hover:border-ink/30"
                  }`}
                >
                  <input
                    type={set ? "checkbox" : "radio"}
                    name={group.id}
                    value={choice.id}
                    checked={active}
                    disabled={blocked}
                    onChange={() => choose(group, choice.id)}
                    className="sr-only"
                  />
                  <span
                    aria-hidden="true"
                    className={`flex h-4 w-4 flex-none items-center justify-center border ${
                      set ? "rounded-[3px]" : "rounded-full"
                    } ${active ? "border-gold" : "border-ink/30"}`}
                  >
                    {active &&
                      (set ? (
                        <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                          <path d="M2 5.2l2.2 2.2L8 3" stroke="#B8902E" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      ) : (
                        <span className="h-2 w-2 rounded-full bg-gold" />
                      ))}
                  </span>
                  <span className="text-ink">{choice.nameEn}</span>
                  {choice.priceDelta !== 0 && (
                    <span className="ms-auto text-[14px] text-ink-soft tabular-nums">
                      +{formatEGP(choice.priceDelta)}
                    </span>
                  )}
                </label>
              );
            })}
          </div>
        </fieldset>
        );
      })}

      <div className="mb-8">
        <label htmlFor="instructions" className="eyebrow mb-3 block">
          Special instructions <span className="normal-case tracking-normal text-ink-faint">optional</span>
        </label>
        <textarea
          id="instructions"
          rows={3}
          value={instructions}
          onChange={(e) => { setInstructions(e.target.value); setAdded(false); }}
          placeholder="Anything we should know about this dish?"
          className="w-full rounded-sm border border-line bg-cream-warm px-4 py-3 text-[15px] text-ink placeholder:text-ink-faint focus:border-gold focus:outline-none"
        />
      </div>

      <div className="flex flex-wrap items-center gap-4">
        <div className="flex items-center rounded-full border border-line bg-cream-warm">
          <button
            type="button"
            onClick={() => setQuantity((q) => Math.max(minQuantity, q - quantityStep))}
            disabled={quantity <= minQuantity}
            aria-label="Reduce quantity"
            className="px-4 py-3 text-ink-soft disabled:opacity-30"
          >
            &minus;
          </button>
          <span className="min-w-[2.5rem] text-center text-[16px] tabular-nums" aria-live="polite">
            {quantity}
          </span>
          <button
            type="button"
            onClick={() => setQuantity((q) => q + quantityStep)}
            aria-label="Increase quantity"
            className="px-4 py-3 text-ink-soft"
          >
            +
          </button>
        </div>

        {mustAsk ? (
          <div className="flex-1">
            <p className="mb-3 text-[14px] text-ink-soft">Add this to</p>
            <div className="flex flex-col gap-2 sm:flex-row">
              <button
                type="button"
                onClick={() => handleAdd("normal")}
                disabled={!canAdd}
                className="btn-primary flex-1 disabled:cursor-not-allowed disabled:bg-ink/25"
              >
                Your normal order
                <span className="tabular-nums">{formatEGP(normalPrice * quantity)}</span>
              </button>
              <button
                type="button"
                onClick={() => handleAdd("event")}
                disabled={!canAdd}
                className="btn-outline flex-1 disabled:cursor-not-allowed disabled:opacity-40"
              >
                {occasion}
                {event.date ? ` · ${shortDate(event.date)}` : ""}
                <span className="tabular-nums">{formatEGP(eventPrice * quantity)}</span>
              </button>
            </div>
            {/* The two prices differ on purpose; say why rather than leave it odd. */}
            {eventTier?.multiplierBp != null && (
              <p className="mt-3 text-[13.5px] leading-relaxed text-ink-faint">
                Event portions are cooked for {guests} guests, so they are priced at{" "}
                {formatMultiplier(eventTier.multiplierBp)} the regular price.
              </p>
            )}
          </div>
        ) : (
          <button
            type="button"
            onClick={() => handleAdd(scope)}
            disabled={!canAdd}
            className="btn-primary flex-1 disabled:cursor-not-allowed disabled:bg-ink/25"
          >
            {added ? "Added" : forcedScope === "event" ? "Add to your event" : "Add to cart"}
            <span className="tabular-nums">{formatEGP(unitPrice * quantity)}</span>
          </button>
        )}
      </div>

      {!isAvailable ? (
        <p className="mt-4 text-[14px] text-ink-soft">
          This dish is currently unavailable.
        </p>
      ) : (
        missing.length > 0 && (
          <p className="mt-4 text-[14px] text-ink-soft">
            Choose {missing.join(" and ")} to continue.
          </p>
        )
      )}

      {/* Inside the event journey, what the scaling did to this dish. */}
      {forcedScope === "event" && eventTier?.multiplierBp != null && (
        <p className="mt-4 text-[14px] leading-relaxed text-ink-soft">
          Priced for {guests} guests at {formatMultiplier(eventTier.multiplierBp)} the regular
          price. Change the guest count and this updates.
        </p>
      )}

      {added && (
        <p className="mt-6 rounded-sm border border-gold/35 bg-gold-pale/35 px-5 py-4 text-[15px] text-ink">
          Added to your {chosen === "event" || forcedScope === "event" ? occasion.toLowerCase() : "order"}.
        </p>
      )}
    </div>
  );
}

function shortDate(iso: string) {
  const d = new Date(iso + "T00:00:00");
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "short" });
}

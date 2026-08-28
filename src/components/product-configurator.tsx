"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { formatEGP } from "@/lib/money";
import { useCart } from "@/lib/cart";

type Choice = { id: string; nameEn: string; priceDelta: number };
type Group = { id: string; nameEn: string; isRequired: boolean; choices: Choice[] };
type Variant = { id: string; nameEn: string; price: number };

/**
 * Required choices must be answered before Add to Cart unlocks, and the price
 * updates live. Variants carry their own price; option choices add their delta
 * (currently zero on every accompaniment, by instruction).
 */
export function ProductConfigurator({
  productId,
  basePrice,
  variants,
  groups,
  minQuantity,
  quantityStep,
  isAvailable,
  categorySlug,
  categoryName,
}: {
  productId: string;
  basePrice: number | null;
  variants: Variant[];
  groups: Group[];
  minQuantity: number;
  quantityStep: number;
  isAvailable: boolean;
  categorySlug: string;
  categoryName: string;
}) {
  const router = useRouter();
  const { addLine } = useCart();

  const [variantId, setVariantId] = useState<string | null>(variants[0]?.id ?? null);
  const [selected, setSelected] = useState<Record<string, string>>({});
  const [quantity, setQuantity] = useState(minQuantity);
  const [instructions, setInstructions] = useState("");
  const [added, setAdded] = useState(false);

  const missingGroups = groups.filter((g) => g.isRequired && !selected[g.id]);
  const canAdd = isAvailable && missingGroups.length === 0;

  const unitPrice = useMemo(() => {
    const base = variantId
      ? (variants.find((v) => v.id === variantId)?.price ?? 0)
      : (basePrice ?? 0);
    const delta = groups.reduce((sum, g) => {
      const choice = g.choices.find((c) => c.id === selected[g.id]);
      return sum + (choice?.priceDelta ?? 0);
    }, 0);
    return base + delta;
  }, [variantId, variants, basePrice, groups, selected]);

  function handleAdd() {
    if (!canAdd) return;
    addLine({
      productId,
      variantId,
      choiceIds: Object.values(selected),
      quantity,
      instructions: instructions.trim(),
    });
    setAdded(true);
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
                <span className="ms-2 tabular-nums opacity-70">{formatEGP(v.price)}</span>
              </button>
            ))}
          </div>
        </fieldset>
      )}

      {groups.map((group) => (
        <fieldset key={group.id} className="mb-8">
          <legend className="eyebrow mb-3">
            {group.nameEn}
            {group.isRequired && <span className="ms-2 normal-case tracking-normal text-ink-faint">required</span>}
          </legend>
          <div className="flex flex-col gap-2">
            {group.choices.map((choice) => {
              const active = selected[group.id] === choice.id;
              return (
                <label
                  key={choice.id}
                  className={`flex cursor-pointer items-center gap-3 rounded-sm border px-4 py-3 text-[15px] transition-colors ${
                    active ? "border-gold bg-gold/[0.07]" : "border-line bg-cream-warm hover:border-ink/30"
                  }`}
                >
                  <input
                    type="radio"
                    name={group.id}
                    value={choice.id}
                    checked={active}
                    onChange={() => {
                      setSelected((s) => ({ ...s, [group.id]: choice.id }));
                      setAdded(false);
                    }}
                    className="sr-only"
                  />
                  <span
                    aria-hidden="true"
                    className={`flex h-4 w-4 flex-none items-center justify-center rounded-full border ${
                      active ? "border-gold" : "border-ink/30"
                    }`}
                  >
                    {active && <span className="h-2 w-2 rounded-full bg-gold" />}
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
      ))}

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

        <button
          type="button"
          onClick={handleAdd}
          disabled={!canAdd}
          className="btn-primary flex-1 disabled:cursor-not-allowed disabled:bg-ink/25"
        >
          {added ? "Added to cart" : "Add to cart"}
          <span className="tabular-nums">{formatEGP(unitPrice * quantity)}</span>
        </button>
      </div>

      {!isAvailable ? (
        <p className="mt-4 text-[14px] text-ink-soft">
          This dish is currently unavailable.
        </p>
      ) : (
        missingGroups.length > 0 && (
          <p className="mt-4 text-[14px] text-ink-soft">
            Choose {missingGroups.map((g) => g.nameEn.toLowerCase()).join(" and ")} to continue.
          </p>
        )
      )}

      {/* After adding, the three things a customer actually wants to do next. */}
      {added && (
        <div className="mt-6 rounded-sm border border-gold/35 bg-gold-pale/35 px-5 py-5">
          <p className="text-[15px] text-ink">Added to your order.</p>
          <div className="mt-4 flex flex-wrap gap-x-6 gap-y-3">
            <Link href={`/menu/${categorySlug}`} className="link-sweep text-[15px]">
              &larr; Back to {categoryName}
            </Link>
            <Link href="/menu" className="link-sweep text-[15px]">
              Keep browsing
            </Link>
            <Link href="/cart" className="link-sweep text-[15px]">
              Go to cart &rarr;
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}

"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCart } from "@/lib/cart";
import { resolveCart, type ResolvedCart } from "@/app/actions";
import { placeNormalOrder, type CheckoutContext } from "@/app/checkout-actions";
import { formatEGP } from "@/lib/money";
import { RULES } from "@/lib/ordering";
import {
  EMPTY_NORMAL, validateNormal,
  type DayStatus, type Errors, type NormalCheckout, type PaymentMethodId,
} from "@/lib/checkout";
import {
  CustomerFields, Field, Money, PaymentChoice, ReviewRow, SectionHeading,
  ServingSetupChoice, input,
} from "./checkout-fields";

/**
 * Checking out a NORMAL order.
 *
 * The 48-hour notice and the three-orders-a-day limit are enforced here as you
 * type, and again in the server action that writes the order — the browser copy
 * is a convenience, not the rule.
 *
 * The event request, if there is one, is untouched by any of this. It is a
 * separate record with its own number and its own checkout.
 */
export function CheckoutForm({ ctx, day }: { ctx: CheckoutContext; day: DayStatus }) {
  const router = useRouter();
  const { normalLines, hasEvent, ready, clearNormal } = useCart();

  const [form, setForm] = useState<NormalCheckout>(EMPTY_NORMAL);
  const [cart, setCart] = useState<ResolvedCart | null>(null);
  const [touched, setTouched] = useState(false);
  const [serverErrors, setServerErrors] = useState<Errors>({});
  const [sending, setSending] = useState(false);

  const set = (patch: Partial<NormalCheckout>) => {
    setForm((f) => ({ ...f, ...patch }));
    setServerErrors({});
  };

  useEffect(() => {
    if (!ready) return;
    resolveCart(normalLines).then(setCart);
  }, [normalLines, ready]);

  const check = validateNormal(form, {
    methods: ctx.methods,
    day,
    hasAreas: ctx.areas.length > 0,
  });
  const errors: Errors = { ...(touched ? check.errors : {}), ...serverErrors };

  const area = useMemo(
    () => ctx.areas.find((a) => a.id === form.areaId) ?? null,
    [ctx.areas, form.areaId],
  );
  // Unknown until the areas and fees are supplied — shown as unknown, not as zero.
  const deliveryFee = form.fulfilment === "DELIVERY" ? (area ? area.fee : null) : 0;
  const subtotal = cart?.subtotal ?? 0;

  if (ready && normalLines.length === 0) {
    return (
      <div className="py-16 text-center">
        <p className="font-display text-[24px] text-ink">There is nothing to check out</p>
        <p className="mx-auto mt-3 max-w-sm text-[16px] text-ink-soft">
          Your regular order is empty.
        </p>
        <Link href="/menu" className="btn-primary mt-8">Browse the menu</Link>
      </div>
    );
  }

  if (!ready || !cart) {
    return <p className="py-20 text-center text-[15px] text-ink-faint">Loading your order…</p>;
  }

  async function submit() {
    setTouched(true);
    if (!check.ok || sending) return;
    setSending(true);
    const result = await placeNormalOrder(form, normalLines);
    if (result.ok) {
      clearNormal();
      router.push(`/order/${result.token}`);
      return;
    }
    setServerErrors(result.errors);
    setSending(false);
  }

  return (
    <div className="grid gap-12 lg:grid-cols-[minmax(0,1fr)_360px] lg:gap-16">
      <div>
        {/* 1 — delivery or pickup */}
        <section>
          <SectionHeading step="Step one" title="How would you like it?" />
          <div className="grid gap-3 sm:grid-cols-2">
            <Choice
              on={form.fulfilment === "DELIVERY"}
              onClick={() => set({ fulfilment: "DELIVERY" })}
              title="Delivery"
              body="We bring it to you."
            />
            <Choice
              on={form.fulfilment === "PICKUP"}
              onClick={() => set({ fulfilment: "PICKUP", areaId: null })}
              title="Pickup"
              body="You collect it from us."
            />
          </div>

          {form.fulfilment === "DELIVERY" && (
            <div className="mt-6 grid gap-6 sm:grid-cols-2">
              {/* The area sets the fee, so it is asked first — but only once the
                  business has actually supplied its areas. */}
              {ctx.areas.length > 0 && (
                <Field label="Area" htmlFor="area" full error={errors.areaId}>
                  <select
                    id="area"
                    value={form.areaId ?? ""}
                    onChange={(e) => set({ areaId: e.target.value || null })}
                    className={input(!!errors.areaId)}
                  >
                    <option value="">Choose your area</option>
                    {ctx.areas.map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.name} — {formatEGP(a.fee)}
                      </option>
                    ))}
                  </select>
                </Field>
              )}

              <Field label="Address" htmlFor="address" full error={errors.addressLine}>
                <input
                  id="address" value={form.addressLine} autoComplete="street-address"
                  placeholder="Street, building, floor, flat"
                  onChange={(e) => set({ addressLine: e.target.value })}
                  className={input(!!errors.addressLine)}
                />
              </Field>

              <Field label="Landmark or directions" htmlFor="details" optional full>
                <input
                  id="details" value={form.addressDetails}
                  onChange={(e) => set({ addressDetails: e.target.value })}
                  className={input()}
                />
              </Field>

              {/* No areas supplied yet, so the fee is not known — and not guessed. */}
              {ctx.areas.length === 0 && (
                <p className="sm:col-span-2 rounded-sm border border-line bg-cream px-5 py-4 text-[14.5px] leading-relaxed text-ink-soft">
                  <strong className="font-semibold text-ink">Delivery fee</strong> — confirmed with
                  you when we call about this order, and added then. It is not in the total below.
                </p>
              )}
            </div>
          )}
        </section>

        <Rule />

        {/* 2 — when */}
        <section>
          <SectionHeading step="Step two" title="When do you need it?" />
          <div className="grid gap-6 sm:grid-cols-2">
            <Field
              label="Date" htmlFor="date" error={errors.date}
              hint={`Earliest available: ${day.earliest}`}
            >
              <input
                id="date" type="date" value={form.date} min={day.earliest}
                onChange={(e) => set({ date: e.target.value })}
                className={input(!!errors.date)}
              />
            </Field>

            {ctx.slots.length > 0 ? (
              <Field label="Time" htmlFor="time" error={errors.time}>
                <select
                  id="time" value={form.time}
                  onChange={(e) => set({ time: e.target.value })}
                  className={input(!!errors.time)}
                >
                  <option value="">Choose a time</option>
                  {ctx.slots.map((t) => (
                    <option key={t.id} value={t.id}>{t.label}</option>
                  ))}
                </select>
              </Field>
            ) : (
              <Field label="Time" htmlFor="time" error={errors.time} hint="We confirm the exact time with you.">
                <input
                  id="time" type="time" value={form.time}
                  onChange={(e) => set({ time: e.target.value })}
                  className={input(!!errors.time)}
                />
              </Field>
            )}
          </div>

          <p className="mt-5 text-[14px] leading-relaxed text-ink-soft">
            Regular orders need at least{" "}
            <strong className="font-semibold text-ink">{RULES.normal.noticeLabel}&rsquo; notice</strong>,
            and we cook {RULES.normal.dailyCapacity} orders a day — pickup included. Full days
            cannot be chosen.
          </p>
        </section>

        <Rule />

        {/* 3 — how it is served */}
        <section>
          <SectionHeading step="Step three" title="How should it be served?" />
          <ServingSetupChoice
            value={form.servingSetup}
            onChange={(v) => set({ servingSetup: v })}
            policy={ctx.servingSetupPolicy}
          />
        </section>

        <Rule />

        {/* 4 — who you are */}
        <section>
          <SectionHeading step="Step four" title="Who is it for?" />
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

        {/* 5 — payment */}
        <section>
          <SectionHeading step="Step five" title="How would you like to pay?" />
          <PaymentChoice
            ctx={ctx}
            fulfilment={form.fulfilment}
            value={form.paymentMethod}
            reference={form.paymentReference}
            onChange={(m: PaymentMethodId) => set({ paymentMethod: m })}
            onReference={(r) => set({ paymentReference: r })}
            errors={errors}
          />
        </section>
      </div>

      {/* The review, beside the form on a wide screen and beneath it on a phone. */}
      <aside className="lg:sticky lg:top-24 lg:self-start">
        <div className="rounded-sm border border-line bg-cream-warm px-6 py-7">
          <h2 className="font-display text-[21px] font-semibold text-ink">Your order</h2>

          <ul className="mt-5">
            {cart.lines.map((l) => (
              <li key={l.key} className="flex items-start justify-between gap-4 border-b border-line-soft py-3 last:border-0">
                <span className="min-w-0 text-[15px] text-ink">
                  <span className="tabular-nums text-ink-faint">{l.quantity}&times;</span>{" "}
                  {l.productName}
                  {l.variantName && <span className="text-ink-soft"> · {l.variantName}</span>}
                  {l.problem && <span className="block text-[13.5px] text-[#A6391C]">{l.problem}</span>}
                </span>
                <span className="whitespace-nowrap text-[15px] tabular-nums text-ink">
                  {formatEGP(l.lineTotal)}
                </span>
              </li>
            ))}
          </ul>

          <dl className="mt-5 border-t border-line pt-4">
            <ReviewRow label="Subtotal" value={<Money amount={subtotal} />} />
            <ReviewRow
              label={form.fulfilment === "PICKUP" ? "Pickup" : "Delivery"}
              value={
                form.fulfilment === "PICKUP"
                  ? "No charge"
                  : deliveryFee === null
                    ? <span className="text-ink-soft">Confirmed with you</span>
                    : <Money amount={deliveryFee} />
              }
            />
          </dl>

          <div className="mt-4 flex items-baseline justify-between gap-4 border-t border-line pt-4">
            <span className="font-display text-[19px] font-semibold text-ink">Total</span>
            <span className="font-display text-[22px] font-semibold tabular-nums text-ink">
              {formatEGP(subtotal + (deliveryFee ?? 0))}
            </span>
          </div>
          {deliveryFee === null && (
            <p className="mt-1.5 text-[13.5px] text-ink-faint">Before the delivery fee.</p>
          )}

          {Object.keys(errors).length > 0 && touched && (
            <p className="mt-5 rounded-sm border border-[#A6391C]/30 bg-[#A6391C]/[0.07] px-4 py-3 text-[14px] text-[#A6391C]">
              {Object.values(errors)[0]}
            </p>
          )}

          <button
            type="button"
            onClick={submit}
            disabled={sending}
            className="btn-primary mt-6 w-full disabled:bg-ink/25"
          >
            {sending ? "Placing your order…" : "Place this order"}
          </button>

          <p className="mt-4 text-[13.5px] leading-relaxed text-ink-soft">
            Nothing is charged now. We confirm every order with you personally before we cook.
          </p>

          {hasEvent && (
            <p className="mt-5 border-t border-line pt-4 text-[13.5px] leading-relaxed text-ink-soft">
              Your event request is separate and is not part of this order. You can send it from{" "}
              <Link href="/cart" className="link-sweep">your cart</Link> afterwards.
            </p>
          )}
        </div>
      </aside>
    </div>
  );
}

function Rule() {
  return <div className="my-12 border-t border-line-soft" />;
}

function Choice({
  on, onClick, title, body,
}: { on: boolean; onClick: () => void; title: string; body: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={on}
      className={`rounded-sm border px-5 py-5 text-start transition-colors ${
        on ? "border-gold bg-gold-pale/40" : "border-line bg-cream-warm hover:border-gold"
      }`}
    >
      <span className="block font-display text-[18px] font-semibold text-ink">{title}</span>
      <span className="mt-1.5 block text-[14.5px] text-ink-soft">{body}</span>
    </button>
  );
}

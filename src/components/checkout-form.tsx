"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCart } from "@/lib/cart";
import { resolveCart, type ResolvedCart } from "@/app/actions";
import { placeNormalOrder, type CheckoutContext } from "@/app/checkout-actions";
import { formatEGP } from "@/lib/money";
import { formatDay, formatDayShort, weekdayNames } from "@/lib/ordering";
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
  const { normalLines, hasEvent, ready, clearNormal, removeLine } = useCart();

  // Delivery is priced by area, so it is only on offer once the business has
  // supplied its areas. Until then the form opens on pickup instead.
  const deliveryOffered = ctx.areas.length > 0;
  const [form, setForm] = useState<NormalCheckout>(() =>
    firstServing(
      { ...EMPTY_NORMAL, fulfilment: deliveryOffered || !ctx.pickupEnabled ? "DELIVERY" : "PICKUP" },
      ctx,
    ),
  );
  const [cart, setCart] = useState<ResolvedCart | null>(null);
  const [touched, setTouched] = useState(false);
  /**
   * Fields answered so far.
   *
   * A date or a time is checked the moment it is chosen — being told on the
   * last click that a day is full, after typing an address, is the worst
   * possible moment to hear it. Everything else waits until Place is pressed,
   * so the form does not scold someone halfway through typing their name.
   */
  const [answered, setAnswered] = useState<Record<string, boolean>>({});
  const [serverErrors, setServerErrors] = useState<Errors>({});
  const [sending, setSending] = useState(false);

  const set = (patch: Partial<NormalCheckout>) => {
    setForm((f) => ({ ...f, ...patch }));
    setServerErrors({});
  };
  const answer = (field: string) => setAnswered((a) => ({ ...a, [field]: true }));

  useEffect(() => {
    if (!ready) return;
    resolveCart(normalLines).then(setCart);
  }, [normalLines, ready]);

  const check = validateNormal(form, {
    methods: ctx.methods,
    day,
    hasAreas: ctx.areas.length > 0,
    limits: ctx.limits,
    subtotal: cart?.subtotal,
  });

  // Shown at once for what has been answered; the rest waits for Place.
  const live: Errors = {};
  for (const [field, message] of Object.entries(check.errors)) {
    if (answered[field]) live[field] = message;
  }
  const errors: Errors = { ...(touched ? check.errors : live), ...serverErrors };

  const area = useMemo(
    () => ctx.areas.find((a) => a.id === form.areaId) ?? null,
    [ctx.areas, form.areaId],
  );
  // Null only while no area has been chosen yet; the order cannot be placed then.
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
      // A card payment finishes on the provider's own hosted page.
      if (result.payAt) {
        window.location.href = result.payAt;
        return;
      }
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
          <div className={`grid gap-3 ${ctx.pickupEnabled ? "sm:grid-cols-2" : ""}`}>
            {/* Delivery is only offered once there are areas to price it by.
                The option stays visible so a customer knows it exists, but it
                cannot be chosen — an order with an unknown fee is never taken. */}
            <Choice
              on={form.fulfilment === "DELIVERY"}
              disabled={!deliveryOffered}
              onClick={() => set({ fulfilment: "DELIVERY" })}
              title="Delivery"
              body={deliveryOffered ? "We bring it to you." : "Not available online yet."}
            />
            {/* Only offered while the business is offering it. */}
            {ctx.pickupEnabled && (
              <Choice
                on={form.fulfilment === "PICKUP"}
                onClick={() => set({ fulfilment: "PICKUP", areaId: null })}
                title="Pickup"
                body="You collect it from us."
              />
            )}
          </div>

          {/* Neither way is open: said plainly, with a way to reach the business. */}
          {!deliveryOffered && !ctx.pickupEnabled && (
            <p className="mt-6 rounded-sm border border-[#A6391C]/30 bg-[#A6391C]/[0.06] px-5 py-4 text-[14.5px] leading-relaxed text-[#A6391C]">
              We are not taking orders online at the moment. Please message us on WhatsApp and we will
              arrange it with you.
            </p>
          )}
          {errors.fulfilment && (
            <p className="mt-3 text-[13.5px] text-[#A6391C]">{errors.fulfilment}</p>
          )}

          {form.fulfilment === "DELIVERY" && deliveryOffered && (
            <div className="mt-6 grid gap-6 sm:grid-cols-2">
              {/* The area sets the fee, so it is asked first. */}
              <Field
                label="Area" htmlFor="area" full error={errors.areaId}
                hint={area ? `Delivery to ${area.name} is ${formatEGP(area.fee)}, added to your total.` : "Choose your area to see the delivery fee."}
              >
                <select
                  id="area"
                  value={form.areaId ?? ""}
                  onChange={(e) => { set({ areaId: e.target.value || null }); answer("areaId"); }}
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

              <Field
                label="Address" htmlFor="address" full error={errors.addressLine}
                hint="Street, building, floor and flat — the area above sets the fee, this tells the driver where to go."
              >
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
              hint={`Earliest we can cook: ${formatDay(day.earliest)}`}
            >
              <input
                id="date" type="date" value={form.date} min={day.earliest}
                onChange={(e) => { set({ date: e.target.value }); answer("date"); }}
                onBlur={() => answer("date")}
                className={input(!!errors.date)}
              />
            </Field>

            {/* A time inside the hours the business goes out in. */}
            <Field
              label="Time" htmlFor="time" error={errors.time}
              hint={
                ctx.limits.timeFrom && ctx.limits.timeUntil
                  ? `We go out between ${ctx.limits.timeFrom} and ${ctx.limits.timeUntil}.`
                  : "We confirm the exact time with you."
              }
            >
              <input
                id="time" type="time" value={form.time}
                min={ctx.limits.timeFrom ?? undefined}
                max={ctx.limits.timeUntil ?? undefined}
                onChange={(e) => { set({ time: e.target.value }); answer("time"); }}
                onBlur={() => answer("time")}
                className={input(!!errors.time)}
              />
            </Field>
          </div>

          <DayNotes day={day} onPick={(d) => { set({ date: d }); answer("date"); }} />

          <p className="mt-4 text-[14px] leading-relaxed text-ink-soft">
            Regular orders need at least{" "}
            <strong className="font-semibold text-ink">{ctx.limits.normalNoticeLabel}&rsquo; notice</strong>.
          </p>
        </section>

        <Rule />

        {/* 3 — how it is served */}
        <section>
          <SectionHeading step="Step three" title="How should it be served?" />
          <ServingSetupChoice
            options={ctx.servings}
            value={form.servingOptionId}
            onChange={(o) => set({ servingOptionId: o.id, servingSetup: o.setup })}
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
            value={form.paymentOptionId}
            reference={form.paymentReference}
            onChange={(o) => set({ paymentOptionId: o.id, paymentMethod: o.method })}
            onReference={(r) => set({ paymentReference: r })}
            errors={errors}
          />
        </section>
      </div>

      {/* The review, beside the form on a wide screen and beneath it on a phone. */}
      {/*
        The summary follows the form down the page on a wide screen — the header
        is sticky, so it sits below it — and scrolls inside itself if the order
        is long. On a phone it is simply the last thing on the page, which is
        where it belongs.
      */}
      <aside className="lg:sticky lg:top-24 lg:max-h-[calc(100vh-7rem)] lg:self-start lg:overflow-y-auto">
        <div className="rounded-sm border border-line bg-cream-warm px-6 py-7">
          <h2 className="font-display text-[21px] font-semibold text-ink">Your order</h2>

          <ul className="mt-5">
            {cart.lines.map((l) => {
              const out = l.unavailable || !!l.problem;
              return (
                <li
                  key={l.key}
                  className={`flex items-start justify-between gap-4 border-b border-line-soft py-3 last:border-0 ${
                    out ? "-mx-3 rounded-sm border-b-0 bg-[#A6391C]/[0.06] px-3" : ""
                  }`}
                >
                  <span className="min-w-0 text-[15px] text-ink">
                    <span className="tabular-nums text-ink-faint">{l.quantity}&times;</span>{" "}
                    <span className={out ? "text-ink-soft line-through" : undefined}>
                      {l.productName}
                    </span>
                    {l.variantName && <span className="text-ink-soft"> · {l.variantName}</span>}
                    {/* Never dropped quietly: said plainly, and removable here. */}
                    {out && (
                      <span className="mt-1 block text-[13.5px] leading-relaxed text-[#A6391C]">
                        {l.productName} is currently unavailable and will not be included in this
                        order.{" "}
                        <button
                          type="button"
                          onClick={() => removeLine("normal", l.key)}
                          className="underline underline-offset-4 hover:text-ink"
                        >
                          Remove it
                        </button>
                      </span>
                    )}
                  </span>
                  <span
                    className={`whitespace-nowrap text-[15px] tabular-nums ${
                      out ? "text-ink-faint line-through" : "text-ink"
                    }`}
                  >
                    {formatEGP(l.lineTotal)}
                  </span>
                </li>
              );
            })}
          </ul>

          <dl className="mt-5 border-t border-line pt-4">
            <ReviewRow label="Subtotal" value={<Money amount={subtotal} />} />
            <ReviewRow
              label={form.fulfilment === "PICKUP" ? "Pickup" : area ? `Delivery · ${area.name}` : "Delivery"}
              value={
                form.fulfilment === "PICKUP"
                  ? "No charge"
                  : deliveryFee === null
                    ? <span className="text-ink-soft">Choose your area</span>
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
            <p className="mt-1.5 text-[13.5px] text-ink-faint">
              The delivery fee is added once you choose your area.
            </p>
          )}
          {ctx.limits.minimumOrder > 0 && (
            <p className="mt-1.5 text-[13.5px] text-ink-faint">
              Orders start at {formatEGP(ctx.limits.minimumOrder)}.
            </p>
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
  on, disabled = false, onClick, title, body,
}: { on: boolean; disabled?: boolean; onClick: () => void; title: string; body: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-pressed={disabled ? undefined : on}
      className={`rounded-sm border px-5 py-5 text-start transition-colors ${
        disabled
          ? "cursor-not-allowed border-line-soft bg-cream opacity-60"
          : on
            ? "border-gold bg-gold-pale/40"
            : "border-line bg-cream-warm hover:border-gold"
      }`}
    >
      <span className="block font-display text-[18px] font-semibold text-ink">{title}</span>
      <span className="mt-1.5 block text-[14.5px] text-ink-soft">{body}</span>
    </button>
  );
}

/**
 * The serving option a form opens on: the first one being offered, so a
 * customer never has to choose something before they can read the page.
 */
/**
 * Which days are out, in one line, and the next few that are not.
 *
 * Deliberately a sentence and three chips rather than a calendar: the customer
 * needs to know why a day is refused before they pick it, not to browse a month.
 */
function DayNotes({ day, onPick }: { day: DayStatus; onPick: (date: string) => void }) {
  const parts: string[] = [];
  if (day.closedWeekdays.length > 0 && day.closedWeekdays.length < 7) {
    parts.push(`Closed ${weekdayNames(day.closedWeekdays)}`);
  }
  if (day.fullSoon.length > 0) {
    parts.push(`Fully booked: ${day.fullSoon.map(formatDayShort).join(", ")}`);
  }
  if (day.closedSoon.length > 0) {
    parts.push(`Not cooking: ${day.closedSoon.map(formatDayShort).join(", ")}`);
  }

  if (parts.length === 0 && day.nextAvailable.length === 0) return null;

  return (
    <div className="mt-5">
      {parts.length > 0 && (
        <p className="text-[14px] leading-relaxed text-ink-soft">{parts.join(" · ")}</p>
      )}
      {day.nextAvailable.length > 0 && (
        <div className="mt-2.5 flex flex-wrap items-center gap-2">
          <span className="text-[13.5px] text-ink-faint">Soonest we can cook:</span>
          {day.nextAvailable.map((d) => (
            <button
              key={d}
              type="button"
              onClick={() => onPick(d)}
              className="rounded-full border border-line bg-cream-warm px-3.5 py-1.5 text-[13.5px] text-ink-soft transition-colors hover:border-gold hover:text-ink"
            >
              {formatDayShort(d)}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function firstServing<T extends { servingSetup: "RETURNABLE" | "DISPOSABLE" | "OTHER"; servingOptionId: string }>(
  base: T,
  ctx: { servings: { id: string; setup: "RETURNABLE" | "DISPOSABLE" | "OTHER" }[] },
): T {
  const first = ctx.servings[0];
  if (!first) return base;
  return { ...base, servingSetup: first.setup, servingOptionId: first.id };
}

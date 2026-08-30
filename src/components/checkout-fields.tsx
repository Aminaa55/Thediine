"use client";

import { formatEGP } from "@/lib/money";
import {
  SERVING_SETUPS,
  type CustomerDetails,
  type Errors,
  type Fulfilment,
  type PaymentMethodId,
} from "@/lib/checkout";
import type { CheckoutContext } from "@/app/checkout-actions";

/**
 * The parts of checkout that are the same for a normal order and an event
 * request: who you are, how the food is served, and how you would like to pay.
 *
 * Everything that differs — dates, capacity, delivery, guests — stays in the
 * two separate forms, because the two orders follow different rules.
 */

export function Field({
  label, htmlFor, hint, error, optional = false, full = false, children,
}: {
  label: string;
  htmlFor?: string;
  hint?: string;
  error?: string;
  optional?: boolean;
  full?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className={full ? "sm:col-span-2" : undefined}>
      <label htmlFor={htmlFor} className="eyebrow mb-3 block">
        {label}
        {optional && <span className="ms-2 normal-case tracking-normal text-ink-faint">optional</span>}
      </label>
      {children}
      {error ? (
        <p className="mt-2 text-[13.5px] text-[#A6391C]">{error}</p>
      ) : (
        hint && <p className="mt-2 text-[13px] text-ink-faint">{hint}</p>
      )}
    </div>
  );
}

export function input(invalid = false) {
  return `w-full rounded-sm border bg-cream-warm px-4 py-3 text-[16px] text-ink placeholder:text-ink-faint focus:outline-none ${
    invalid ? "border-[#A6391C]/60 focus:border-[#A6391C]" : "border-line focus:border-gold"
  }`;
}

export function SectionHeading({ step, title }: { step: string; title: string }) {
  return (
    <div className="mb-7">
      <p className="eyebrow">{step}</p>
      <h2 className="mt-2 font-display text-[24px] font-semibold text-ink sm:text-[27px]">{title}</h2>
    </div>
  );
}

/** Name, mobile, optional email. */
export function CustomerFields({
  value, onChange, errors,
}: {
  value: CustomerDetails;
  onChange: (patch: Partial<CustomerDetails>) => void;
  errors: Errors;
}) {
  return (
    <div className="grid gap-6 sm:grid-cols-2">
      <Field label="Your name" htmlFor="name" error={errors.name}>
        <input
          id="name" value={value.name} autoComplete="name"
          onChange={(e) => onChange({ name: e.target.value })}
          className={input(!!errors.name)}
        />
      </Field>

      <Field
        label="Mobile number" htmlFor="mobile" error={errors.mobile}
        hint="We confirm every order on WhatsApp."
      >
        <input
          id="mobile" value={value.mobile} inputMode="tel" autoComplete="tel"
          placeholder="01x xxxx xxxx"
          onChange={(e) => onChange({ mobile: e.target.value })}
          className={input(!!errors.mobile)}
        />
      </Field>

      <Field label="Email" htmlFor="email" optional full error={errors.email}>
        <input
          id="email" value={value.email} type="email" autoComplete="email"
          onChange={(e) => onChange({ email: e.target.value })}
          className={input(!!errors.email)}
        />
      </Field>
    </div>
  );
}

/** Returnable or disposable — asked on every order. */
export function ServingSetupChoice({
  value, onChange, policy,
}: {
  value: CustomerDetails["servingSetup"];
  onChange: (v: CustomerDetails["servingSetup"]) => void;
  policy?: string;
}) {
  return (
    <div>
      <div className="grid gap-3 sm:grid-cols-2">
        {SERVING_SETUPS.map((s) => (
          <button
            key={s.id}
            type="button"
            onClick={() => onChange(s.id)}
            aria-pressed={value === s.id}
            className={`rounded-sm border px-5 py-5 text-start transition-colors ${
              value === s.id ? "border-gold bg-gold-pale/40" : "border-line bg-cream-warm hover:border-gold"
            }`}
          >
            <span className="block font-display text-[18px] font-semibold text-ink">{s.title}</span>
            <span className="mt-1.5 block text-[14.5px] leading-relaxed text-ink-soft">{s.body}</span>
          </button>
        ))}
      </div>
      {/* Only shown once the business has written the policy. */}
      {policy && <p className="mt-3 text-[13.5px] leading-relaxed text-ink-soft">{policy}</p>}
    </div>
  );
}

/**
 * How you would like to pay.
 *
 * Cash reads differently for delivery and pickup. InstaPay shows the transfer
 * details and says plainly that choosing it does not mean the payment has been
 * received. Card is present in the structure but never presented as working —
 * no card details are collected anywhere on this site.
 */
export function PaymentChoice({
  ctx, fulfilment, value, reference, onChange, onReference, errors,
}: {
  ctx: CheckoutContext;
  fulfilment: Fulfilment;
  value: PaymentMethodId | null;
  reference: string;
  onChange: (m: PaymentMethodId) => void;
  onReference: (r: string) => void;
  errors: Errors;
}) {
  const cashLabel = fulfilment === "PICKUP" ? "Payment on pickup" : "Cash on delivery";
  const cashBody =
    fulfilment === "PICKUP"
      ? "Pay in cash when you collect your order."
      : "Pay in cash when your order is handed to you.";

  return (
    <div>
      <div className="grid gap-3">
        {ctx.methods.includes("CASH") && (
          <Method
            on={value === "CASH"} onClick={() => onChange("CASH")}
            title={cashLabel} body={cashBody}
          />
        )}

        {ctx.methods.includes("INSTAPAY") && (
          <Method
            on={value === "INSTAPAY"} onClick={() => onChange("INSTAPAY")}
            title="InstaPay"
            body="Transfer to us, and we confirm once we have seen the payment arrive."
          />
        )}

        {/*
          Card appears only when it is actually available. While it is paused it
          is not shown at all — not as "coming soon" either, because a customer
          should not be offered something they cannot use.
        */}
        {ctx.methods.includes("CARD") && (
          <Method
            on={value === "CARD"}
            onClick={() => onChange("CARD")}
            title="Card payment"
            body="You are taken to our payment provider's secure page to pay. We never see or store your card details."
            badge={ctx.cardTestMode ? "Test mode" : undefined}
          />
        )}
      </div>

      {errors.paymentMethod && (
        <p className="mt-3 text-[13.5px] text-[#A6391C]">{errors.paymentMethod}</p>
      )}

      {/*
        Test mode must be unmistakable. A card entered here is a test card, and
        nobody should be able to mistake this for a real payment.
      */}
      {value === "CARD" && ctx.cardTestMode && (
        <div className="mt-5 rounded-sm border border-[#A6391C]/35 bg-[#A6391C]/[0.06] px-5 py-5">
          <p className="text-[11px] uppercase tracking-widest text-[#A6391C]">Test mode</p>
          <p className="mt-3 text-[15.5px] leading-relaxed text-ink">
            Card payments are in <strong className="font-semibold">test mode</strong>. No real money
            moves and no real card will be charged — use a test card only.
          </p>
        </div>
      )}

      {value === "CARD" && !ctx.cardTestMode && (
        <div className="mt-5 rounded-sm border border-gold/40 bg-gold-pale/35 px-5 py-5">
          <p className="text-[15.5px] leading-relaxed text-ink-soft">
            You will be taken to our payment provider&rsquo;s secure page to pay. Your order is
            placed either way; if the payment does not go through it simply stays unpaid and you
            can pay another way.
          </p>
        </div>
      )}

      {value === "INSTAPAY" && (
        <div className="mt-5 rounded-sm border border-gold/40 bg-gold-pale/35 px-5 py-5">
          <p className="eyebrow">Transfer details</p>
          {ctx.instapayNumber ? (
            <p className="mt-3 text-[16px] leading-relaxed text-ink">
              Transfer to{" "}
              <strong className="font-display text-[19px] font-semibold tracking-wide">
                {ctx.instapayNumber}
              </strong>
            </p>
          ) : (
            <p className="mt-3 text-[15.5px] leading-relaxed text-ink-soft">
              We will send you the transfer details on WhatsApp as soon as we have your order.
            </p>
          )}
          {ctx.instapayDetails && (
            <p className="mt-2 whitespace-pre-line text-[15.5px] leading-relaxed text-ink-soft">
              {ctx.instapayDetails}
            </p>
          )}

          <p className="mt-4 border-t border-gold/30 pt-4 text-[14.5px] leading-relaxed text-ink-soft">
            Choosing InstaPay does <strong className="font-semibold text-ink">not</strong> mark your
            order as paid. Your payment shows as{" "}
            <strong className="font-semibold text-ink">awaiting verification</strong> until we have
            checked that the transfer arrived, and we confirm it with you.
          </p>

          <div className="mt-5">
            <label htmlFor="reference" className="eyebrow mb-3 block">
              Transfer reference{" "}
              <span className="normal-case tracking-normal text-ink-faint">
                optional, if you have already sent it
              </span>
            </label>
            <input
              id="reference" value={reference}
              onChange={(e) => onReference(e.target.value)}
              className={input()}
            />
          </div>
        </div>
      )}
    </div>
  );
}

function Method({
  on = false, disabled = false, title, body, badge, onClick,
}: {
  on?: boolean;
  disabled?: boolean;
  title: string;
  body: string;
  /** e.g. "Test mode" — stated on the option itself, not buried below it. */
  badge?: string;
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-pressed={disabled ? undefined : on}
      className={`flex items-start gap-4 rounded-sm border px-5 py-5 text-start transition-colors ${
        disabled
          ? "cursor-not-allowed border-line-soft bg-cream opacity-60"
          : on
            ? "border-gold bg-gold-pale/40"
            : "border-line bg-cream-warm hover:border-gold"
      }`}
    >
      <span
        aria-hidden="true"
        className={`mt-1 flex h-4 w-4 flex-none items-center justify-center rounded-full border ${
          on ? "border-gold" : "border-ink/25"
        }`}
      >
        {on && <span className="h-2 w-2 rounded-full bg-gold" />}
      </span>
      <span className="min-w-0">
        <span className="flex flex-wrap items-center gap-x-3 gap-y-1">
          <span className="font-display text-[18px] font-semibold text-ink">{title}</span>
          {badge && (
            <span className="rounded-full border border-[#A6391C]/40 px-2.5 py-0.5 text-[11px] uppercase tracking-[0.14em] text-[#A6391C]">
              {badge}
            </span>
          )}
        </span>
        <span className="mt-1 block text-[14.5px] leading-relaxed text-ink-soft">{body}</span>
      </span>
    </button>
  );
}

/** One line of the order review. */
export function ReviewRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1 border-b border-line-soft py-3 last:border-0">
      <dt className="text-[13px] uppercase tracking-[0.14em] text-ink-faint">{label}</dt>
      <dd className="text-[15.5px] text-ink">{value}</dd>
    </div>
  );
}

export function Money({ amount }: { amount: number }) {
  return <span className="tabular-nums">{formatEGP(amount)}</span>;
}

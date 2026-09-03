"use client";

import { formatEGP, splitDeposit } from "@/lib/money";
import { NORMAL_ORDER_DEPOSIT_PERCENT } from "@/lib/checkout";
import {
  type CustomerDetails,
  type Errors,
  type Fulfilment,
  type ServingChoice,
  type PaymentChoice as PaymentChoiceOption,
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

/** How the food is served. The options are the business's own. */
export function ServingSetupChoice({
  options, value, onChange, policy,
}: {
  options: ServingChoice[];
  /** The chosen option's id. */
  value: string;
  onChange: (option: ServingChoice) => void;
  policy?: string;
}) {
  return (
    <div>
      <div className="grid gap-3 sm:grid-cols-2">
        {options.map((s) => (
          <button
            key={s.id}
            type="button"
            onClick={() => onChange(s)}
            aria-pressed={value === s.id}
            className={`rounded-sm border px-5 py-5 text-start transition-colors ${
              value === s.id ? "border-gold bg-gold-pale/40" : "border-line bg-cream-warm hover:border-gold"
            }`}
          >
            <span className="block font-display text-[18px] font-semibold text-ink">{s.name}</span>
            {s.description && (
              <span className="mt-1.5 block text-[14.5px] leading-relaxed text-ink-soft">
                {s.description}
              </span>
            )}
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
  ctx, fulfilment, value, reference, onChange, onReference, errors, depositTotal,
}: {
  ctx: CheckoutContext;
  fulfilment: Fulfilment;
  /** The chosen option's id. */
  value: string;
  reference: string;
  onChange: (option: PaymentChoiceOption) => void;
  onReference: (r: string) => void;
  errors: Errors;
  /**
   * A Normal order's own total, so a deposit can be worked out and shown once
   * a method that expects money before delivery is chosen. `null` while the
   * total is not fully known yet (delivery, no area chosen). Left `undefined`
   * entirely on an event request, which never carries a deposit.
   */
  depositTotal?: number | null;
}) {
  const chosen = ctx.payments.find((p) => p.id === value) ?? null;
  const depositEnabled = depositTotal !== undefined;

  // Cash reads differently depending on where the food is going.
  const wording = (p: PaymentChoiceOption): { title: string; body: string } => {
    if (p.method === "CASH") {
      return fulfilment === "PICKUP"
        ? { title: "Payment on pickup", body: "Pay in cash when you collect your order." }
        : { title: "Cash on delivery", body: "Pay in cash when your order is handed to you." };
    }
    if (p.method === "INSTAPAY") {
      return {
        title: p.name,
        body: depositEnabled
          ? "Transfer the deposit, and we confirm your order once we have seen it arrive."
          : "Transfer to us, and we confirm once we have seen the payment arrive.",
      };
    }
    if (p.method === "CARD") {
      return {
        title: p.name,
        body: "You are taken to our payment provider's secure page to pay. We never see or store your card details.",
      };
    }
    return {
      title: p.name,
      body: p.verifyBeforeDelivery
        ? "Send the payment to us, and we confirm once we have seen it arrive."
        : fulfilment === "PICKUP"
          ? "Pay when you collect your order."
          : "Pay when your order is handed to you.",
    };
  };

  return (
    <div>
      <div className="grid gap-3">
        {ctx.payments.map((p) => {
          const w = wording(p);
          return (
            <Method
              key={p.id}
              on={value === p.id}
              onClick={() => onChange(p)}
              title={w.title}
              body={w.body}
              badge={p.method === "CARD" && ctx.cardTestMode ? "Test mode" : undefined}
            />
          );
        })}
      </div>

      {errors.paymentMethod && (
        <p className="mt-3 text-[13.5px] text-[#A6391C]">{errors.paymentMethod}</p>
      )}

      {/*
        Test mode must be unmistakable. A card entered here is a test card, and
        nobody should be able to mistake this for a real payment.
      */}
      {chosen?.method === "CARD" && ctx.cardTestMode && (
        <div className="mt-5 rounded-sm border border-[#A6391C]/35 bg-[#A6391C]/[0.06] px-5 py-5">
          <p className="text-[11px] uppercase tracking-widest text-[#A6391C]">Test mode</p>
          <p className="mt-3 text-[15.5px] leading-relaxed text-ink">
            Card payments are in <strong className="font-semibold">test mode</strong>. No real money
            moves and no real card will be charged — use a test card only.
          </p>
        </div>
      )}

      {chosen?.method === "CARD" && !ctx.cardTestMode && (
        <div className="mt-5 rounded-sm border border-gold/40 bg-gold-pale/35 px-5 py-5">
          <p className="text-[15.5px] leading-relaxed text-ink-soft">
            You will be taken to our payment provider&rsquo;s secure page to pay. Your order is
            placed either way; if the payment does not go through it simply stays unpaid and you
            can pay another way.
          </p>
        </div>
      )}

      {/*
        Anything settled by hand where the money is expected first: the details
        to send to, and a plain statement that choosing it is not paying.
      */}
      {chosen && chosen.verifyBeforeDelivery && (
        <div className="mt-5 rounded-sm border border-gold/40 bg-gold-pale/35 px-5 py-5">
          <p className="eyebrow">{chosen.method === "INSTAPAY" ? "Transfer details" : chosen.name}</p>
          {chosen.instructions ? (
            <p className="mt-3 whitespace-pre-line text-[16px] leading-relaxed text-ink">
              {chosen.method === "INSTAPAY" ? "Transfer to " : ""}
              <strong className="font-display text-[19px] font-semibold tracking-wide">
                {chosen.instructions}
              </strong>
            </p>
          ) : (
            <p className="mt-3 text-[15.5px] leading-relaxed text-ink-soft">
              We will send you the details on WhatsApp as soon as we have your order.
            </p>
          )}

          {/*
            A Normal order paying by a method the money is expected on before
            delivery pays half now and half on receipt. The amount is worked
            out from the order's own total, which by this step is always
            known — Place is refused before it — except while depositTotal is
            explicitly null, which only happens for a split second before an
            area is chosen.
          */}
          {depositEnabled && (
            depositTotal === null ? (
              <p className="mt-4 border-t border-gold/30 pt-4 text-[14.5px] leading-relaxed text-ink-soft">
                We will show your deposit amount once your delivery area is chosen.
              </p>
            ) : (
              <div className="mt-4 border-t border-gold/30 pt-4">
                <p className="text-[15px] leading-relaxed text-ink">
                  A {NORMAL_ORDER_DEPOSIT_PERCENT}% deposit is required to confirm your order. Please
                  transfer the deposit via {chosen.name} after submitting your order. The remaining{" "}
                  {100 - NORMAL_ORDER_DEPOSIT_PERCENT}% is paid when you receive your order.
                </p>
                <dl className="mt-4 grid gap-2">
                  {(() => {
                    const { deposit, remaining } = splitDeposit(depositTotal, NORMAL_ORDER_DEPOSIT_PERCENT);
                    return (
                      <>
                        <DepositRow label="Order total" value={depositTotal} />
                        <DepositRow label="Deposit due now" value={deposit} strong />
                        <DepositRow label="Remaining on receipt" value={remaining} />
                      </>
                    );
                  })()}
                </dl>
              </div>
            )
          )}

          <p className="mt-4 border-t border-gold/30 pt-4 text-[14.5px] leading-relaxed text-ink-soft">
            Choosing this does <strong className="font-semibold text-ink">not</strong> mark your
            order as paid.{" "}
            {depositEnabled ? (
              <>
                Your deposit shows as{" "}
                <strong className="font-semibold text-ink">awaiting verification</strong> until we
                have checked that it arrived, and we confirm your order once it does.
              </>
            ) : (
              <>
                Your payment shows as{" "}
                <strong className="font-semibold text-ink">awaiting verification</strong> until we
                have checked that it arrived, and we confirm it with you.
              </>
            )}
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

/** One line of the deposit breakdown: total, deposit, or remaining. */
function DepositRow({ label, value, strong = false }: { label: string; value: number; strong?: boolean }) {
  return (
    <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-0.5">
      <dt className={`text-[14.5px] ${strong ? "font-semibold text-ink" : "text-ink-soft"}`}>{label}</dt>
      <dd className={`tabular-nums ${strong ? "text-[17px] font-semibold text-ink" : "text-[14.5px] text-ink-soft"}`}>
        {formatEGP(value)}
      </dd>
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

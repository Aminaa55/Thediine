import Link from "next/link";
import { formatEGP } from "@/lib/money";
import { STATUS_LABELS, PAYMENT_LABELS } from "@/lib/admin-orders";
import type { OrderStatus, PaymentStatus } from "@prisma/client";

/**
 * The small pieces admin is built from.
 *
 * Order status and payment status get visibly different treatments, because
 * confusing the two is the mistake this system is designed to prevent.
 */

const STATUS_TONE: Record<OrderStatus, string> = {
  REQUESTED: "border-gold/50 bg-gold-pale/50 text-ink",
  NEW: "border-ink/25 bg-cream-deep text-ink",
  CONFIRMED: "border-ink/40 bg-ink text-cream",
  PREPARING: "border-gold bg-gold/20 text-ink",
  READY: "border-gold bg-gold/30 text-ink",
  OUT_FOR_DELIVERY: "border-gold bg-gold/30 text-ink",
  DELIVERED: "border-line bg-cream text-ink-faint",
  CANCELLED: "border-[#A6391C]/35 bg-[#A6391C]/[0.08] text-[#A6391C]",
};

const PAYMENT_TONE: Record<PaymentStatus, string> = {
  UNPAID: "border-line bg-cream text-ink-soft",
  AWAITING_VERIFICATION: "border-[#A6391C]/35 bg-[#A6391C]/[0.07] text-[#A6391C]",
  PARTIALLY_PAID: "border-gold/50 bg-gold-pale/50 text-ink",
  PAID: "border-[#2E6B45]/35 bg-[#2E6B45]/[0.08] text-[#2E6B45]",
  REFUNDED: "border-line bg-cream text-ink-faint",
};

export function StatusPill({ status }: { status: OrderStatus }) {
  return (
    <span className={`inline-block whitespace-nowrap rounded-full border px-3 py-1 text-[12.5px] ${STATUS_TONE[status]}`}>
      {STATUS_LABELS[status]}
    </span>
  );
}

export function PaymentPill({ status }: { status: PaymentStatus }) {
  return (
    <span className={`inline-block whitespace-nowrap rounded-full border px-3 py-1 text-[12.5px] ${PAYMENT_TONE[status]}`}>
      {PAYMENT_LABELS[status]}
    </span>
  );
}

export function TypePill({ type }: { type: "NORMAL" | "EVENT" }) {
  return (
    <span
      className={`inline-block whitespace-nowrap rounded-full border px-2.5 py-0.5 text-[11px] uppercase tracking-[0.14em] ${
        type === "EVENT" ? "border-gold/50 text-gold" : "border-line text-ink-faint"
      }`}
    >
      {type === "EVENT" ? "Event" : "Order"}
    </span>
  );
}

export function Card({ title, children, right }: {
  title?: string; children: React.ReactNode; right?: React.ReactNode;
}) {
  return (
    <section className="rounded-sm border border-line bg-cream-warm">
      {title && (
        <header className="flex flex-wrap items-baseline justify-between gap-4 border-b border-line px-6 py-4">
          <h2 className="font-display text-[18px] font-semibold text-ink">{title}</h2>
          {right}
        </header>
      )}
      <div className="px-6 py-5">{children}</div>
    </section>
  );
}

export function Stat({ label, value, href, tone = "plain" }: {
  label: string; value: number | string; href?: string; tone?: "plain" | "alert";
}) {
  const inner = (
    <div
      className={`rounded-sm border px-5 py-5 transition-colors ${
        tone === "alert"
          ? "border-[#A6391C]/35 bg-[#A6391C]/[0.06] hover:border-[#A6391C]/60"
          : "border-line bg-cream-warm hover:border-gold"
      }`}
    >
      <p className="text-[11px] uppercase tracking-widest text-ink-faint">{label}</p>
      <p className={`mt-2 font-display text-[28px] font-semibold tabular-nums ${
        tone === "alert" ? "text-[#A6391C]" : "text-ink"
      }`}>
        {value}
      </p>
    </div>
  );
  return href ? <Link href={href}>{inner}</Link> : inner;
}

export function Money({ amount }: { amount: number }) {
  return <span className="tabular-nums">{formatEGP(amount)}</span>;
}

export function longDate(d: Date) {
  return d.toLocaleDateString("en-GB", {
    weekday: "short", day: "numeric", month: "short", year: "numeric", timeZone: "UTC",
  });
}

/** The day in Cairo, not on the server's clock. See cairoDayKey. */
export { cairoDayKey as dayKey } from "@/lib/ordering";

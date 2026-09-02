"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import type { PrepDish } from "@/lib/admin-queries";
import { cairoDayKey } from "@/lib/ordering";

/**
 * The kitchen's day.
 *
 * Two questions answered at once, which is the whole point: how much of each
 * dish to make, and which orders that food is divided between. The total leads;
 * the orders sit underneath it, each one clickable.
 *
 * Special instructions are given real weight rather than a footnote — they are
 * the thing most easily missed while cooking.
 */
export function DayPicker({ date }: { date: string }) {
  const router = useRouter();

  const shift = (days: number) => {
    const d = new Date(date + "T00:00:00.000Z");
    d.setUTCDate(d.getUTCDate() + days);
    return `/admin/kitchen?date=${d.toISOString().slice(0, 10)}`;
  };
  // Cairo's today, not the viewer's device or the server's clock.
  const today = cairoDayKey();

  return (
    <div className="no-print flex flex-wrap items-center gap-3">
      <Link href={shift(-1)} className="rounded-full border border-line bg-cream-warm px-4 py-2 text-[14.5px] text-ink-soft transition-colors hover:border-ink/40">
        &larr; Day before
      </Link>
      <Link href={`/admin/kitchen?date=${today}`} className={`rounded-full border px-4 py-2 text-[14.5px] transition-colors ${
        date === today ? "border-ink bg-ink text-cream" : "border-line bg-cream-warm text-ink-soft hover:border-ink/40"
      }`}>
        Today
      </Link>
      <Link href={shift(1)} className="rounded-full border border-line bg-cream-warm px-4 py-2 text-[14.5px] text-ink-soft transition-colors hover:border-ink/40">
        Day after &rarr;
      </Link>

      <label className="ms-1 flex items-center gap-2 text-[14px] text-ink-faint">
        <span className="sr-only">Jump to a date</span>
        <input
          type="date"
          value={date}
          onChange={(e) => e.target.value && router.push(`/admin/kitchen?date=${e.target.value}`)}
          className="rounded-full border border-line bg-cream-warm px-4 py-2 text-[14.5px] text-ink focus:border-gold focus:outline-none"
        />
      </label>

      <button
        type="button"
        onClick={() => window.print()}
        className="rounded-full border border-gold/50 bg-gold-pale/40 px-4 py-2 text-[14.5px] text-ink transition-colors hover:border-gold"
      >
        Print the prep sheet
      </button>
    </div>
  );
}

/** One dish: the total, how it splits, and every order it belongs to. */
export function PrepDishRow({ dish, mixedDay }: { dish: PrepDish; mixedDay: boolean }) {
  return (
    <li className="break-inside-avoid border-b border-line py-6 first:pt-0 last:border-0 last:pb-0">
      <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-2">
        <h3 className="font-display text-[21px] font-semibold text-ink">{dish.name}</h3>
        <p className="font-display text-[28px] font-semibold tabular-nums text-ink">
          &times;{dish.total}
          <span className="ms-2 font-body text-[12px] font-normal uppercase tracking-[0.16em] text-ink-faint">
            total
          </span>
        </p>
      </div>

      {/* Only worth saying on a day that holds both kinds of order. */}
      {mixedDay && dish.normalTotal > 0 && dish.eventTotal > 0 && (
        <p className="mt-1 text-[13.5px] text-ink-soft">
          <span className="tabular-nums">{dish.normalTotal}</span> for regular orders,{" "}
          <span className="tabular-nums">{dish.eventTotal}</span> for events
        </p>
      )}

      {/* Ordered in more than one form: the kitchen needs each sub-total. */}
      {dish.variations.length > 0 && (
        <ul className="mt-2 flex flex-wrap gap-x-5 gap-y-1">
          {dish.variations.map((v) => (
            <li key={v.label} className="text-[13.5px] text-ink-soft">
              <span className="tabular-nums font-semibold text-ink">&times;{v.quantity}</span>{" "}
              {v.label}
            </li>
          ))}
        </ul>
      )}

      <ul className="mt-4 grid gap-2">
        {dish.lines.map((l, i) => (
          <li
            key={`${l.orderId}-${i}`}
            className="flex flex-wrap items-baseline gap-x-4 gap-y-1 rounded-sm border border-line-soft bg-cream px-4 py-2.5"
          >
            <Link
              href={`/admin/orders/${l.orderId}`}
              className="font-display text-[15px] font-semibold tabular-nums text-ink underline decoration-line underline-offset-4 hover:decoration-gold"
            >
              {l.orderNumber}
            </Link>

            <span className="font-display text-[15px] font-semibold tabular-nums text-ink">
              &times;{l.quantity}
            </span>

            <span
              className={`rounded-full border px-2.5 py-0.5 text-[11px] uppercase tracking-[0.14em] ${
                l.type === "EVENT" ? "border-gold/50 text-gold" : "border-line text-ink-faint"
              }`}
            >
              {l.type === "EVENT" ? "Event" : "Order"}
            </span>

            {(l.variantName || l.options.length > 0) && (
              <span className="text-[13.5px] text-ink-soft">
                {[l.variantName, ...l.options].filter(Boolean).join(" · ")}
              </span>
            )}

            {/* Loud on purpose. This is the thing that gets missed. */}
            {l.instructions && (
              <span className="basis-full pt-1">
                <span className="inline-flex flex-wrap items-baseline gap-2 rounded-sm border border-gold bg-gold-pale/60 px-3 py-1.5">
                  <span className="text-[10.5px] uppercase tracking-[0.16em] text-gold">Note</span>
                  <span className="text-[14px] font-medium text-ink">{l.instructions}</span>
                </span>
              </span>
            )}
          </li>
        ))}
      </ul>
    </li>
  );
}

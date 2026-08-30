"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { setOrderStatus, confirmEvent, cancelOrder, setPaymentStatus } from "@/app/admin/admin-actions";
import { STATUS_ACTIONS, PAYMENT_LABELS } from "@/lib/admin-orders";
import { formatEGP } from "@/lib/money";
import type { OrderStatus, PaymentStatus } from "@prisma/client";

/**
 * The things admin can do to one order.
 *
 * Order status and payment status are two separate panels on purpose. Moving an
 * order along never touches the money, and confirming a payment never moves the
 * order — the interface says so by keeping them apart.
 */

function useAction() {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const run = (fn: () => Promise<unknown>) =>
    start(async () => {
      setError(null);
      try {
        await fn();
        router.refresh();
      } catch (e) {
        setError(e instanceof Error ? e.message : "That did not work.");
      }
    });

  return { pending, error, run };
}

export function StatusActions({
  orderId, next,
}: { orderId: string; next: OrderStatus[] }) {
  const { pending, error, run } = useAction();
  const moves = next.filter((s) => s !== "CANCELLED");

  if (moves.length === 0) {
    return <p className="text-[15px] text-ink-soft">This order has reached the end of its journey.</p>;
  }

  return (
    <div>
      <div className="flex flex-wrap gap-3">
        {moves.map((s) => (
          <button
            key={s}
            type="button"
            disabled={pending}
            onClick={() => run(() => setOrderStatus(orderId, s))}
            className="btn-primary disabled:bg-ink/25"
          >
            {STATUS_ACTIONS[s]}
          </button>
        ))}
      </div>
      {error && <p className="mt-3 text-[14px] text-[#A6391C]">{error}</p>}
    </div>
  );
}

/**
 * Accepting an event request.
 *
 * The day is decided here, because this is the moment the event becomes real:
 * blocking it closes the date to normal orders, keeping it open leaves them
 * taking bookings alongside.
 */
export function ConfirmEvent({ orderId }: { orderId: string }) {
  const { pending, error, run } = useAction();
  const [mode, setMode] = useState<"BLOCK_DAY" | "KEEP_DAY_OPEN">("BLOCK_DAY");

  return (
    <div>
      <p className="text-[15.5px] leading-relaxed text-ink-soft">
        Accepting this turns the request into a confirmed booking. Decide what it does to the day.
      </p>

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <Choice
          on={mode === "BLOCK_DAY"} onClick={() => setMode("BLOCK_DAY")}
          title="Block the day" body="No regular orders can be taken for that date."
        />
        <Choice
          on={mode === "KEEP_DAY_OPEN"} onClick={() => setMode("KEEP_DAY_OPEN")}
          title="Keep the day open" body="Regular orders can still be taken alongside it."
        />
      </div>

      <button
        type="button"
        disabled={pending}
        onClick={() => run(() => confirmEvent(orderId, mode))}
        className="btn-primary mt-5 disabled:bg-ink/25"
      >
        {pending ? "Confirming…" : "Confirm this event"}
      </button>
      {error && <p className="mt-3 text-[14px] text-[#A6391C]">{error}</p>}
    </div>
  );
}

/**
 * Confirming a payment by hand.
 *
 * This is the InstaPay step. Somebody looks at the transfer, sees the money,
 * and says so here. Nothing automatic ever does it.
 */
export function PaymentActions({
  orderId, current, reference, total,
}: { orderId: string; current: PaymentStatus; reference: string | null; total: number }) {
  const { pending, error, run } = useAction();
  const [ref, setRef] = useState(reference ?? "");

  const options: PaymentStatus[] = ["UNPAID", "AWAITING_VERIFICATION", "PAID", "REFUNDED"];

  return (
    <div>
      {current === "AWAITING_VERIFICATION" && (
        <p className="mb-4 rounded-sm border border-[#A6391C]/30 bg-[#A6391C]/[0.06] px-4 py-3 text-[14.5px] leading-relaxed text-[#A6391C]">
          Waiting on you: check that {formatEGP(total)} arrived before marking this paid.
        </p>
      )}

      <label htmlFor="ref" className="eyebrow mb-2 block">
        Transfer reference <span className="normal-case tracking-normal text-ink-faint">optional</span>
      </label>
      <input
        id="ref" value={ref} onChange={(e) => setRef(e.target.value)}
        className="w-full rounded-sm border border-line bg-cream px-4 py-2.5 text-[15px] text-ink focus:border-gold focus:outline-none"
      />

      <div className="mt-4 flex flex-wrap gap-2.5">
        {options.map((s) => (
          <button
            key={s}
            type="button"
            disabled={pending || s === current}
            onClick={() => run(() => setPaymentStatus(orderId, s, ref))}
            className={`rounded-full border px-4 py-2 text-[14px] transition-colors disabled:cursor-not-allowed ${
              s === current
                ? "border-ink bg-ink text-cream opacity-60"
                : s === "PAID"
                  ? "border-[#2E6B45]/50 bg-[#2E6B45]/[0.08] text-[#2E6B45] hover:border-[#2E6B45]"
                  : "border-line bg-cream-warm text-ink-soft hover:border-ink/40"
            }`}
          >
            {s === current ? `${PAYMENT_LABELS[s]} — now` : `Mark ${PAYMENT_LABELS[s].toLowerCase()}`}
          </button>
        ))}
      </div>

      <p className="mt-3 text-[13.5px] leading-relaxed text-ink-faint">
        This changes the payment only. The order stays exactly where it is.
      </p>
      {error && <p className="mt-3 text-[14px] text-[#A6391C]">{error}</p>}
    </div>
  );
}

/** Cancelling, with the terms shown before it happens. */
export function CancelOrder({
  orderId, withinFreeWindow, charge, percent,
}: { orderId: string; withinFreeWindow: boolean; charge: number; percent: number }) {
  const { pending, error, run } = useAction();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="text-[14px] text-ink-faint underline underline-offset-4 hover:text-[#A6391C]"
      >
        Cancel this order
      </button>
    );
  }

  return (
    <div className="rounded-sm border border-[#A6391C]/30 bg-[#A6391C]/[0.05] px-5 py-5">
      <p className="font-display text-[17px] font-semibold text-ink">Cancel this order</p>
      <p className="mt-2 text-[14.5px] leading-relaxed text-ink-soft">
        {withinFreeWindow ? (
          <>This is inside the free cancellation window, so nothing is charged.</>
        ) : (
          <>
            This is outside the free window. A {percent}% charge of{" "}
            <strong className="font-semibold text-ink">{formatEGP(charge)}</strong> will be{" "}
            <strong className="font-semibold text-ink">recorded</strong> — this system does not
            collect it.
          </>
        )}
      </p>

      <label htmlFor="reason" className="eyebrow mb-2 mt-4 block">Reason</label>
      <input
        id="reason" value={reason} onChange={(e) => setReason(e.target.value)}
        placeholder="Why is it being cancelled?"
        className="w-full rounded-sm border border-line bg-cream px-4 py-2.5 text-[15px] text-ink focus:border-gold focus:outline-none"
      />

      <div className="mt-4 flex flex-wrap gap-3">
        <button
          type="button"
          disabled={pending}
          onClick={() => run(() => cancelOrder(orderId, reason))}
          className="rounded-full border border-[#A6391C] bg-[#A6391C] px-5 py-2.5 text-[14.5px] text-cream disabled:opacity-50"
        >
          {pending ? "Cancelling…" : "Yes, cancel it"}
        </button>
        <button type="button" onClick={() => setOpen(false)} className="text-[14px] text-ink-soft underline underline-offset-4">
          Keep it
        </button>
      </div>
      {error && <p className="mt-3 text-[14px] text-[#A6391C]">{error}</p>}
    </div>
  );
}

function Choice({ on, onClick, title, body }: {
  on: boolean; onClick: () => void; title: string; body: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={on}
      className={`rounded-sm border px-5 py-4 text-start transition-colors ${
        on ? "border-gold bg-gold-pale/40" : "border-line bg-cream hover:border-gold"
      }`}
    >
      <span className="block font-display text-[16px] font-semibold text-ink">{title}</span>
      <span className="mt-1 block text-[14px] leading-relaxed text-ink-soft">{body}</span>
    </button>
  );
}

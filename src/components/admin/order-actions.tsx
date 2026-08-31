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
 *
 * Within each panel there is one obvious next step and everything else is
 * quieter. A step that undoes something — refunding, marking a paid order
 * unpaid, cancelling — asks before it happens.
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

function Err({ message }: { message: string | null }) {
  return message ? <p className="mt-3 text-[14px] text-[#A6391C]">{message}</p> : null;
}

/** The one next step, and nothing competing with it. */
export function StatusActions({ orderId, next }: { orderId: string; next: OrderStatus[] }) {
  const { pending, error, run } = useAction();
  const moves = next.filter((s) => s !== "CANCELLED");

  if (moves.length === 0) {
    return <p className="text-[15px] text-ink-soft">This order has reached the end of its journey.</p>;
  }

  return (
    <div>
      {moves.map((s, i) => (
        <button
          key={s}
          type="button"
          disabled={pending}
          onClick={() => run(() => setOrderStatus(orderId, s))}
          className={
            i === 0
              ? "btn-primary w-full justify-center py-4 text-[16px] disabled:bg-ink/25"
              : "mt-3 w-full rounded-full border border-line bg-cream px-5 py-2.5 text-[14.5px] text-ink-soft hover:border-ink/40"
          }
        >
          {STATUS_ACTIONS[s]}
        </button>
      ))}
      <Err message={error} />
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
export function ConfirmEvent({ orderId, defaultMode = "BLOCK_DAY" }: {
  orderId: string;
  /** Which answer is offered first, from Settings. The decision is still made here. */
  defaultMode?: "BLOCK_DAY" | "KEEP_DAY_OPEN";
}) {
  const { pending, error, run } = useAction();
  const [mode, setMode] = useState<"BLOCK_DAY" | "KEEP_DAY_OPEN">(defaultMode);

  return (
    <div>
      <p className="text-[15px] leading-relaxed text-ink-soft">
        Accepting this turns the request into a confirmed booking. Decide what it does to the day.
      </p>

      <div className="mt-4 grid gap-2.5">
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
        className="btn-primary mt-5 w-full justify-center py-4 text-[16px] disabled:bg-ink/25"
      >
        {pending ? "Confirming…" : "Confirm this event"}
      </button>
      <Err message={error} />
    </div>
  );
}

/**
 * The payment, on its own.
 *
 * An InstaPay transfer waiting to be checked gets one obvious action: mark it
 * paid, once you have seen the money. Everything else is a correction, so it
 * sits quietly underneath — and the two that undo something ask first.
 */
export function PaymentActions({
  orderId, method, current, reference, total,
}: {
  orderId: string;
  method: "CASH" | "INSTAPAY" | "CARD";
  current: PaymentStatus;
  reference: string | null;
  total: number;
}) {
  const { pending, error, run } = useAction();
  const [ref, setRef] = useState(reference ?? "");
  const [confirming, setConfirming] = useState<PaymentStatus | null>(null);

  const waiting = current === "AWAITING_VERIFICATION";
  const others = (["UNPAID", "AWAITING_VERIFICATION", "PAID", "REFUNDED"] as PaymentStatus[])
    .filter((s) => s !== current && !(waiting && s === "PAID"));

  // Undoing something asks first; simply recording where a payment has got to
  // does not need a second click.
  const needsConfirming = (s: PaymentStatus) =>
    s === "REFUNDED" || (s === "UNPAID" && current === "PAID");

  const apply = (s: PaymentStatus) => {
    if (needsConfirming(s) && confirming !== s) return setConfirming(s);
    setConfirming(null);
    run(() => setPaymentStatus(orderId, s, ref));
  };

  return (
    <div>
      {waiting && (
        <>
          <p className="rounded-sm border border-[#A6391C]/30 bg-[#A6391C]/[0.06] px-4 py-3 text-[14.5px] leading-relaxed text-[#A6391C]">
            Waiting on you: check that <strong className="font-semibold">{formatEGP(total)}</strong>{" "}
            arrived before marking this paid.
          </p>
          <button
            type="button"
            disabled={pending}
            onClick={() => apply("PAID")}
            className="mt-4 flex w-full items-center justify-center rounded-full border border-[#2E6B45] bg-[#2E6B45] px-6 py-4 text-[16px] text-cream transition-colors hover:bg-[#255739] disabled:opacity-50"
          >
            {pending ? "Marking paid…" : "I have checked it — mark paid"}
          </button>
        </>
      )}

      {/* A transfer reference only exists for a transfer. Cash has none. */}
      {method === "INSTAPAY" && (
        <div className="mt-5">
          <label htmlFor="ref" className="eyebrow mb-2 block">
            Transfer reference <span className="normal-case tracking-normal text-ink-faint">optional</span>
          </label>
          <input
            id="ref" value={ref} onChange={(e) => setRef(e.target.value)}
            className="w-full rounded-sm border border-line bg-cream px-4 py-2.5 text-[15px] text-ink focus:border-gold focus:outline-none"
          />
        </div>
      )}

      <details className="mt-4 group">
        <summary className="cursor-pointer list-none text-[14px] text-ink-faint underline underline-offset-4 hover:text-ink">
          Change the payment status by hand
        </summary>
        <div className="mt-3 flex flex-wrap gap-2">
          {others.map((s) => (
            <button
              key={s}
              type="button"
              disabled={pending}
              onClick={() => apply(s)}
              className={`rounded-full border px-4 py-2 text-[14px] transition-colors disabled:opacity-50 ${
                confirming === s
                  ? "border-[#A6391C] bg-[#A6391C] text-cream"
                  : "border-line bg-cream-warm text-ink-soft hover:border-ink/40"
              }`}
            >
              {confirming === s
                ? `Yes — mark ${PAYMENT_LABELS[s].toLowerCase()}`
                : `Mark ${PAYMENT_LABELS[s].toLowerCase()}`}
            </button>
          ))}
          {confirming && (
            <button
              type="button"
              onClick={() => setConfirming(null)}
              className="text-[14px] text-ink-soft underline underline-offset-4"
            >
              Never mind
            </button>
          )}
        </div>
        {confirming && (
          <p className="mt-2 text-[13.5px] text-[#A6391C]">
            {confirming === "REFUNDED"
              ? "This records the payment as refunded. Click again to confirm."
              : "This takes a paid order back to unpaid. Click again to confirm."}
          </p>
        )}
      </details>

      <p className="mt-3 text-[13.5px] leading-relaxed text-ink-faint">
        This changes the payment only. The order stays exactly where it is.
      </p>
      <Err message={error} />
    </div>
  );
}

/** Cancelling: quiet until asked for, and it shows the terms before it happens. */
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

      <div className="mt-4 flex flex-wrap items-center gap-4">
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
      <Err message={error} />
    </div>
  );
}

/** An address you can put straight into a map or a message. */
export function CopyAddress({ address }: { address: string }) {
  const [copied, setCopied] = useState(false);

  return (
    <button
      type="button"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(address);
          setCopied(true);
          setTimeout(() => setCopied(false), 2000);
        } catch {
          setCopied(false);
        }
      }}
      className="rounded-full border border-line bg-cream px-3.5 py-1 text-[13px] text-ink-soft transition-colors hover:border-gold hover:text-ink"
    >
      {copied ? "Copied" : "Copy"}
    </button>
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
      className={`rounded-sm border px-5 py-3.5 text-start transition-colors ${
        on ? "border-gold bg-gold-pale/40" : "border-line bg-cream hover:border-gold"
      }`}
    >
      <span className="block font-display text-[16px] font-semibold text-ink">{title}</span>
      <span className="mt-1 block text-[14px] leading-relaxed text-ink-soft">{body}</span>
    </button>
  );
}

import type { Prisma } from "@prisma/client";

/**
 * Order numbers.
 *
 * `TD-260829-01` for a normal order, `EV-260829-01` for an event request —
 * the prefix, the day it was placed, and that day's sequence. The two kinds are
 * numbered separately because they are two different pieces of work, and a
 * customer with both gets two distinct numbers to quote.
 *
 * Generated inside the same transaction that writes the order and protected by
 * the unique index on `orderNumber`: if two orders are placed in the same
 * instant, one fails the constraint and is retried rather than sharing a number.
 */
export const ORDER_PREFIX = { NORMAL: "TD", EVENT: "EV" } as const;

function today(now: Date): string {
  // Africa/Cairo, so the day rolls over when the kitchen's day does.
  const cairo = new Date(now.toLocaleString("en-US", { timeZone: "Africa/Cairo" }));
  const y = String(cairo.getFullYear()).slice(2);
  const m = String(cairo.getMonth() + 1).padStart(2, "0");
  const d = String(cairo.getDate()).padStart(2, "0");
  return `${y}${m}${d}`;
}

export async function nextOrderNumber(
  tx: Prisma.TransactionClient,
  type: "NORMAL" | "EVENT",
  now = new Date(),
): Promise<string> {
  const stem = `${ORDER_PREFIX[type]}-${today(now)}-`;
  const last = await tx.order.findFirst({
    where: { orderNumber: { startsWith: stem } },
    orderBy: { orderNumber: "desc" },
    select: { orderNumber: true },
  });
  const n = last ? Number(last.orderNumber.slice(stem.length)) + 1 : 1;
  return stem + String(n).padStart(2, "0");
}

import { db } from "./db";

/**
 * Payment status transitions.
 *
 * SERVER-ONLY, and deliberately NOT a server action: nothing a customer's
 * browser can reach may mark an order paid. The admin dashboard calls these
 * once it exists; until then `npm run payment` does, from the owner's machine.
 *
 * Payment status is independent of order status throughout. Confirming a
 * payment never moves an order along, and delivering an order never marks it
 * paid.
 *
 * The website never sees, handles or stores card details. Card payments will go
 * through a payment provider when one is integrated, and this file will record
 * only the provider's reference.
 */

/** The customer said they have transferred; the money has not been checked yet. */
export async function markAwaitingVerification(orderId: string, reference?: string) {
  return db.order.update({
    where: { id: orderId },
    data: {
      paymentStatus: "AWAITING_VERIFICATION",
      paymentReference: reference?.trim() || undefined,
      paymentVerifiedAt: null,
    },
  });
}

/**
 * The business has seen the DEPOSIT arrive, on a Normal order that requires
 * one. This is what actually unblocks the order — it can now be confirmed and
 * cooked — while the remaining half stays due on receipt.
 */
export async function markDepositReceived(orderId: string, reference?: string) {
  return db.order.update({
    where: { id: orderId },
    data: {
      paymentStatus: "PARTIALLY_PAID",
      paymentReference: reference?.trim() || undefined,
      paymentVerifiedAt: new Date(),
    },
  });
}

/**
 * The business has seen the money arrive. This is the manual confirmation step
 * an InstaPay order waits on — nothing automatic ever sets it.
 */
export async function markPaid(orderId: string, reference?: string) {
  return db.order.update({
    where: { id: orderId },
    data: {
      paymentStatus: "PAID",
      paymentReference: reference?.trim() || undefined,
      paymentVerifiedAt: new Date(),
    },
  });
}

/** The transfer did not arrive, or was not the right amount. */
export async function markUnpaid(orderId: string) {
  return db.order.update({
    where: { id: orderId },
    data: { paymentStatus: "UNPAID", paymentVerifiedAt: null },
  });
}

export async function markRefunded(orderId: string) {
  return db.order.update({
    where: { id: orderId },
    data: { paymentStatus: "REFUNDED" },
  });
}

/**
 * Applying a payment provider's verified callback.
 *
 * The caller MUST have verified the signature first; `signatureValid` is
 * recorded here and an unverified callback changes nothing at all.
 *
 * Three things are checked before an order is marked paid, in this order:
 *   1. the signature was valid;
 *   2. the callback belongs to an order we are expecting to be paid;
 *   3. the amount the provider settled equals the order's own total.
 *
 * An amount that does not match is never accepted, however well signed it is.
 * Nothing in here touches order status — a paid order is not a confirmed one.
 */
export async function applyProviderOutcome(input: {
  provider: string;
  channel: "webhook" | "redirect";
  signatureValid: boolean;
  merchantRef: string;
  transactionId: string;
  amount: number;
  paid: boolean;
  reason: string | null;
}): Promise<{ applied: boolean; note: string; orderNumber?: string }> {
  const order = input.merchantRef
    ? await db.order.findUnique({
        where: { paymentMerchantRef: input.merchantRef },
        select: { id: true, orderNumber: true, total: true, paymentStatus: true },
      })
    : null;

  const record = async (applied: boolean, note: string) => {
    await db.paymentEvent.create({
      data: {
        orderId: order?.id ?? null,
        provider: input.provider,
        channel: input.channel,
        transactionId: input.transactionId || null,
        merchantRef: input.merchantRef || null,
        signatureValid: input.signatureValid,
        applied,
        amount: input.amount || null,
        note,
      },
    });
    return { applied, note, orderNumber: order?.orderNumber };
  };

  if (!input.signatureValid) return record(false, "Signature did not verify. Ignored.");
  if (!order) return record(false, "No order matches that reference.");
  if (!input.paid) return record(false, input.reason ?? "Not a completed payment.");
  if (input.amount !== order.total) {
    return record(false, `Amount ${input.amount} does not match the order total ${order.total}.`);
  }
  if (order.paymentStatus === "PAID") {
    // A repeated callback is normal — Paymob sends the webhook and the redirect.
    return record(false, "Already paid; nothing to change.");
  }

  await db.order.update({
    where: { id: order.id },
    data: {
      paymentStatus: "PAID",
      paymentVerifiedAt: new Date(),
      paymentTransactionId: input.transactionId || undefined,
    },
  });
  return record(true, "Payment verified and marked paid.");
}

/** Every order still waiting on someone to check a transfer. */
export async function awaitingVerification() {
  return db.order.findMany({
    where: { paymentStatus: "AWAITING_VERIFICATION" },
    orderBy: { createdAt: "asc" },
    select: {
      id: true, orderNumber: true, customerName: true, customerMobile: true,
      total: true, paymentReference: true, createdAt: true,
    },
  });
}

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

"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { currentAdmin, signIn, endSession } from "@/lib/admin-auth";
import { cancellationTerms, nextStatuses, depositUnconfirmed } from "@/lib/admin-orders";
import { markPaid, markUnpaid, markRefunded, markAwaitingVerification, markDepositReceived } from "@/lib/payments";
import type { OrderStatus, PaymentStatus } from "@prisma/client";

/**
 * Everything admin can do.
 *
 * Every action starts by asking who is signed in. A server action is a public
 * endpoint — being on a page behind a login proves nothing about the request
 * that reaches here — so the check is repeated in each one rather than assumed.
 */

async function requireAdmin() {
  const admin = await currentAdmin();
  if (!admin) throw new Error("Not signed in.");
  return admin;
}

// ------------------------------------------------------------------ sign in

export async function loginAction(_prev: unknown, form: FormData) {
  const email = String(form.get("email") ?? "");
  const password = String(form.get("password") ?? "");
  if (!email || !password) return { error: "Please give your email and password." };

  const result = await signIn(email, password);
  if (!result.ok) return { error: result.error ?? "That did not work." };
  redirect("/admin");
}

export async function logoutAction() {
  await endSession();
  redirect("/admin/login");
}

// ------------------------------------------------------------ order status

/**
 * Moves an order along.
 *
 * Only along a path the order is actually allowed to take, and every move is
 * written into its history with who made it, so the record is never just the
 * current state.
 */
export async function setOrderStatus(orderId: string, to: OrderStatus, note?: string) {
  const admin = await requireAdmin();
  const order = await db.order.findUnique({
    where: { id: orderId },
    select: {
      id: true, status: true, fulfilmentType: true, type: true,
      paymentStatus: true, depositAmount: true,
    },
  });
  if (!order) throw new Error("That order no longer exists.");

  if (!nextStatuses(order.status, order.fulfilmentType).includes(to)) {
    throw new Error(`An order that is ${order.status} cannot become ${to}.`);
  }
  if (to === "CANCELLED") throw new Error("Use the cancel action, which records the terms.");
  if (depositUnconfirmed(order)) {
    throw new Error("Confirm the deposit has arrived before moving this order along — see Payment.");
  }

  await db.$transaction(async (tx) => {
    await tx.order.update({ where: { id: orderId }, data: { status: to } });
    await tx.orderStatusEvent.create({
      data: {
        orderId, fromStatus: order.status, toStatus: to,
        changedById: admin.id, note: note?.trim() || null,
      },
    });
  });

  revalidatePath("/admin");
  revalidatePath(`/admin/orders/${orderId}`);
  revalidatePath("/admin/orders");
}

/**
 * Accepting an event request.
 *
 * This is the point at which a request becomes a booking, so it is also where
 * the day is decided: BLOCK_DAY closes the date to normal orders, KEEP_DAY_OPEN
 * leaves it available. Nothing else in the system blocks a date.
 */
export async function confirmEvent(orderId: string, capacityMode: "BLOCK_DAY" | "KEEP_DAY_OPEN") {
  const admin = await requireAdmin();
  const order = await db.order.findUnique({
    where: { id: orderId },
    select: { id: true, status: true, type: true, deliveryDate: true, orderNumber: true },
  });
  if (!order || order.type !== "EVENT") throw new Error("That is not an event request.");
  if (order.status !== "REQUESTED") throw new Error("That request has already been answered.");

  await db.$transaction(async (tx) => {
    await tx.order.update({ where: { id: orderId }, data: { status: "CONFIRMED" } });
    await tx.eventDetail.update({
      where: { orderId },
      data: { capacityMode, confirmedAt: new Date() },
    });
    await tx.orderStatusEvent.create({
      data: {
        orderId, fromStatus: "REQUESTED", toStatus: "CONFIRMED", changedById: admin.id,
        note: capacityMode === "BLOCK_DAY" ? "Confirmed; the day is blocked." : "Confirmed; the day stays open.",
      },
    });

    if (capacityMode === "BLOCK_DAY") {
      await tx.dateAvailability.upsert({
        where: { date: order.deliveryDate },
        update: { isClosed: true, blockedByOrderId: orderId },
        create: {
          date: order.deliveryDate, isClosed: true, blockedByOrderId: orderId,
          note: `Catering event ${order.orderNumber}.`,
        },
      });
    }
  });

  revalidatePath("/admin");
  revalidatePath(`/admin/orders/${orderId}`);
  revalidatePath("/admin/orders");
}

/**
 * Cancelling.
 *
 * The late-cancellation charge is calculated from the confirmed terms and
 * recorded on the order. It is not taken: there is no deposit and no card on
 * file, so this is a note for the conversation that follows, not a payment.
 *
 * A day blocked by this event is released.
 */
export async function cancelOrder(orderId: string, reason: string) {
  const admin = await requireAdmin();
  const order = await db.order.findUnique({
    where: { id: orderId },
    select: { id: true, status: true, type: true, deliveryDate: true, total: true },
  });
  if (!order) throw new Error("That order no longer exists.");
  if (order.status === "CANCELLED") throw new Error("That order is already cancelled.");
  if (order.status === "DELIVERED") throw new Error("A delivered order cannot be cancelled.");

  const s = Object.fromEntries((await db.setting.findMany()).map((x) => [x.key, x.value]));
  const terms = cancellationTerms({
    type: order.type,
    deliveryDate: order.deliveryDate,
    total: order.total,
    normalFreeHours: Number(s.normal_free_cancellation_hours ?? 24),
    eventFreeHours: Number(s.event_free_cancellation_hours ?? 48),
    percent: Number(s.late_cancellation_percent ?? 20),
  });

  await db.$transaction(async (tx) => {
    await tx.order.update({
      where: { id: orderId },
      data: {
        status: "CANCELLED",
        cancelledAt: new Date(),
        cancelledById: admin.id,
        cancellationReason: reason.trim() || null,
        cancelledWithinFreeWindow: terms.withinFreeWindow,
        cancellationCharge: terms.charge,
      },
    });
    await tx.orderStatusEvent.create({
      data: {
        orderId, fromStatus: order.status, toStatus: "CANCELLED", changedById: admin.id,
        note: terms.withinFreeWindow
          ? "Cancelled inside the free window."
          : `Cancelled late — ${terms.percent}% recorded.`,
      },
    });
    // A day this event had blocked goes back to being available.
    await tx.dateAvailability.deleteMany({ where: { blockedByOrderId: orderId } });
  });

  revalidatePath("/admin");
  revalidatePath(`/admin/orders/${orderId}`);
  revalidatePath("/admin/orders");
}

/**
 * Destroying a cancelled order, for good.
 *
 * The one place in this system that really deletes an order, and it is
 * deliberately narrow: ONLY an order that has already been cancelled, because
 * cancelling is a decision with its own record and this is merely tidying up
 * after it. A live order cannot be deleted at all — it has to be cancelled
 * first, which states a reason and works out the terms.
 *
 * What goes with it: its dishes and their options, and its history. What does
 * NOT: the customer, who may have other orders, and the payment provider's own
 * event log, which is kept as evidence of what a provider told us and simply
 * stops pointing at an order. A day this event had blocked is released rather
 * than left closed for a reason nobody can look up.
 *
 * There is no undo. It is meant for a test order placed before opening, or a
 * duplicate — not for tidying real history away.
 */
export async function deleteOrder(orderId: string) {
  await requireAdmin();
  const order = await db.order.findUnique({
    where: { id: orderId },
    select: { id: true, status: true, orderNumber: true },
  });
  if (!order) throw new Error("That order no longer exists.");
  if (order.status !== "CANCELLED") {
    throw new Error("Only a cancelled order can be deleted. Cancel it first, which records why.");
  }

  await db.$transaction(async (tx) => {
    // Belt and braces: cancelling already releases a day this order held, but
    // a closure left behind with nothing to explain it would be worse than none.
    await tx.dateAvailability.deleteMany({ where: { blockedByOrderId: orderId } });
    await tx.order.delete({ where: { id: orderId } });
  });

  revalidatePath("/admin");
  revalidatePath("/admin/orders");
}

// ----------------------------------------------------------- payment status

/**
 * Confirming a payment by hand.
 *
 * This is the InstaPay step: someone has looked at the transfer and seen the
 * money arrive. It moves the PAYMENT status only — the order stays exactly
 * where it was.
 */
export async function setPaymentStatus(orderId: string, to: PaymentStatus, reference?: string) {
  await requireAdmin();
  const order = await db.order.findUnique({ where: { id: orderId }, select: { id: true } });
  if (!order) throw new Error("That order no longer exists.");

  if (to === "PAID") await markPaid(orderId, reference);
  else if (to === "PARTIALLY_PAID") await markDepositReceived(orderId, reference);
  else if (to === "AWAITING_VERIFICATION") await markAwaitingVerification(orderId, reference);
  else if (to === "UNPAID") await markUnpaid(orderId);
  else if (to === "REFUNDED") await markRefunded(orderId);

  revalidatePath("/admin");
  revalidatePath(`/admin/orders/${orderId}`);
  revalidatePath("/admin/orders");
}

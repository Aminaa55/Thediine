import type { OrderStatus, OrderType, FulfilmentType } from "@prisma/client";

/**
 * How an order is allowed to move.
 *
 * An event begins as REQUESTED and becomes a real order only when the business
 * accepts it. A normal order arrives as NEW. Nothing skips ahead, and nothing
 * comes back from DELIVERED or CANCELLED.
 *
 * Payment status is not here at all. It moves on its own, and neither one
 * drags the other along: a delivered order can be unpaid, and a paid one can
 * still be waiting to be cooked.
 */
export const STATUS_LABELS: Record<OrderStatus, string> = {
  REQUESTED: "Requested",
  NEW: "New",
  CONFIRMED: "Confirmed",
  PREPARING: "Preparing",
  READY: "Ready",
  OUT_FOR_DELIVERY: "Out for delivery",
  DELIVERED: "Delivered",
  CANCELLED: "Cancelled",
};

export const PAYMENT_LABELS = {
  UNPAID: "Unpaid",
  AWAITING_VERIFICATION: "Awaiting verification",
  PAID: "Paid",
  REFUNDED: "Refunded",
} as const;

/** What this order can become next, given how it is being fulfilled. */
export function nextStatuses(
  status: OrderStatus,
  fulfilment: FulfilmentType,
): OrderStatus[] {
  switch (status) {
    case "REQUESTED":
      return ["CONFIRMED", "CANCELLED"];
    case "NEW":
      return ["CONFIRMED", "CANCELLED"];
    case "CONFIRMED":
      return ["PREPARING", "CANCELLED"];
    case "PREPARING":
      return ["READY", "CANCELLED"];
    case "READY":
      // Pickup never goes out for delivery.
      return fulfilment === "PICKUP" ? ["DELIVERED", "CANCELLED"] : ["OUT_FOR_DELIVERY", "CANCELLED"];
    case "OUT_FOR_DELIVERY":
      return ["DELIVERED", "CANCELLED"];
    default:
      return [];
  }
}

/** The word for the button, so it reads as an action rather than a state. */
export const STATUS_ACTIONS: Record<OrderStatus, string> = {
  REQUESTED: "Move back to requested",
  NEW: "Move back to new",
  CONFIRMED: "Confirm",
  PREPARING: "Start preparing",
  READY: "Mark ready",
  OUT_FOR_DELIVERY: "Send out for delivery",
  DELIVERED: "Mark delivered",
  CANCELLED: "Cancel",
};

/** Orders still to be cooked, in the order the kitchen cares about. */
export const OPEN_STATUSES: OrderStatus[] = [
  "REQUESTED", "NEW", "CONFIRMED", "PREPARING", "READY", "OUT_FOR_DELIVERY",
];

export type CancellationTerms = {
  /** Hours before the order that cancellation is still free. */
  freeWindowHours: number;
  withinFreeWindow: boolean;
  /** Percentage charged outside the free window. */
  percent: number;
  /** In piastres. Calculated and recorded — never collected by this system. */
  charge: number;
};

/**
 * What cancelling this order would mean.
 *
 * The charge is worked out and written down; nothing here takes any money. The
 * business has no deposit and no card on file, so a late-cancellation charge is
 * a record and a conversation, not a transaction.
 */
export function cancellationTerms(input: {
  type: OrderType;
  deliveryDate: Date;
  total: number;
  normalFreeHours: number;
  eventFreeHours: number;
  percent: number;
  now?: Date;
}): CancellationTerms {
  const freeWindowHours = input.type === "EVENT" ? input.eventFreeHours : input.normalFreeHours;
  const now = input.now ?? new Date();
  const hoursUntil = (input.deliveryDate.getTime() - now.getTime()) / 3_600_000;
  const withinFreeWindow = hoursUntil >= freeWindowHours;

  return {
    freeWindowHours,
    withinFreeWindow,
    percent: input.percent,
    charge: withinFreeWindow ? 0 : Math.round((input.total * input.percent) / 100),
  };
}

import { db } from "./db";
import { OPEN_STATUSES } from "./admin-orders";
import type { FulfilmentType, OrderStatus, OrderType, PaymentStatus } from "@prisma/client";

/**
 * What admin reads.
 *
 * Kept apart from what admin writes, so a page that only shows something cannot
 * accidentally change it.
 */

const listSelect = {
  id: true, orderNumber: true, type: true, status: true,
  customerName: true, customerMobile: true,
  fulfilmentType: true, deliveryDate: true, timeSlotLabel: true,
  total: true, paymentMethod: true, paymentStatus: true,
  /// What the customer asked for on the order as a whole, as opposed to on one
  /// dish. The kitchen and whoever delivers both need to see it.
  notes: true,
  createdAt: true,
  eventDetail: { select: { guestCount: true, eventType: true, eventTypeOther: true } },
  _count: { select: { items: true } },
} as const;

export type OrderRow = Awaited<ReturnType<typeof listOrders>>[number];

export type OrderFilters = {
  type?: OrderType;
  status?: OrderStatus;
  paymentStatus?: PaymentStatus;
  fulfilment?: FulfilmentType;
  /** yyyy-mm-dd. A range; either end may stand on its own. */
  dateFrom?: string;
  dateTo?: string;
  /** Free text against the order number, name or mobile. */
  q?: string;
  /** Open orders only: everything not delivered or cancelled. */
  openOnly?: boolean;
};

/** A date range as Prisma wants it, from either or both ends. */
function dateRange(from?: string, to?: string) {
  if (!from && !to) return undefined;
  return {
    ...(from ? { gte: new Date(from + "T00:00:00.000Z") } : {}),
    ...(to ? { lte: new Date(to + "T00:00:00.000Z") } : {}),
  };
}

export async function listOrders(filters: OrderFilters = {}, take = 100) {
  const q = filters.q?.trim();

  return db.order.findMany({
    where: {
      ...(filters.type ? { type: filters.type } : {}),
      ...(filters.status ? { status: filters.status } : {}),
      ...(filters.paymentStatus ? { paymentStatus: filters.paymentStatus } : {}),
      ...(filters.openOnly ? { status: { in: OPEN_STATUSES } } : {}),
      ...(filters.fulfilment ? { fulfilmentType: filters.fulfilment } : {}),
      ...(dateRange(filters.dateFrom, filters.dateTo)
        ? { deliveryDate: dateRange(filters.dateFrom, filters.dateTo) }
        : {}),
      ...(q
        ? {
            OR: [
              { orderNumber: { contains: q, mode: "insensitive" as const } },
              { customerName: { contains: q, mode: "insensitive" as const } },
              { customerMobile: { contains: q.replace(/[^\d]/g, "") } },
            ],
          }
        : {}),
    },
    orderBy: [{ deliveryDate: "asc" }, { createdAt: "asc" }],
    take,
    select: listSelect,
  });
}

export async function getOrder(id: string) {
  return db.order.findUnique({
    where: { id },
    include: {
      items: { include: { options: true } },
      eventDetail: true,
      statusEvents: { orderBy: { createdAt: "asc" }, include: { changedBy: { select: { name: true } } } },
      paymentEvents: { orderBy: { createdAt: "desc" }, take: 10 },
      timeSlot: { select: { labelEn: true } },
    },
  });
}

/** The short list of things somebody has to do something about. */
export async function needsAttention() {
  const [eventRequests, awaitingPayment, newOrders] = await Promise.all([
    db.order.count({ where: { type: "EVENT", status: "REQUESTED" } }),
    db.order.count({ where: { paymentStatus: "AWAITING_VERIFICATION" } }),
    db.order.count({ where: { type: "NORMAL", status: "NEW" } }),
  ]);
  return { eventRequests, awaitingPayment, newOrders };
}

/**
 * The events coming up.
 *
 * Requests first, because they are the ones waiting on an answer, then
 * confirmed events by date. Cancelled and finished events are left out — this
 * is about what is still ahead.
 */
export async function upcomingEvents(take = 6) {
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);

  return db.order.findMany({
    where: {
      type: "EVENT",
      status: { in: ["REQUESTED", "CONFIRMED", "PREPARING", "READY", "OUT_FOR_DELIVERY"] },
      deliveryDate: { gte: today },
    },
    orderBy: [{ deliveryDate: "asc" }],
    take,
    select: listSelect,
  });
}

/** Everything due on one day, whatever state it is in. */
export async function ordersForDay(date: string) {
  return db.order.findMany({
    where: {
      deliveryDate: new Date(date + "T00:00:00.000Z"),
      status: { notIn: ["CANCELLED"] },
    },
    orderBy: [{ type: "asc" }, { createdAt: "asc" }],
    select: listSelect,
  });
}

/** One order's share of a dish. */
export type PrepOrderLine = {
  orderId: string;
  orderNumber: string;
  type: OrderType;
  quantity: number;
  variantName: string | null;
  options: string[];
  instructions: string | null;
};

export type PrepDish = {
  name: string;
  /** Everything to be made, across every order. */
  total: number;
  /** Split by order type, for a day that holds both. */
  normalTotal: number;
  eventTotal: number;
  /** Sub-totals, present only when the dish was ordered in more than one form. */
  variations: { label: string; quantity: number }[];
  /** Which orders it is for, so the total can always be traced back. */
  lines: PrepOrderLine[];
};

/**
 * What the kitchen actually cooks on a day.
 *
 * The same dish ordered by three people is one line with a total, because that
 * is how it is cooked — but every order it came from is listed underneath, so a
 * special instruction is never lost in an aggregate.
 *
 * Cancelled orders are excluded. Event requests that have not been confirmed
 * are excluded too: nothing is cooked for a request the business has not
 * accepted.
 */
export async function prepForDay(date: string): Promise<PrepDish[]> {
  const orders = await db.order.findMany({
    where: {
      deliveryDate: new Date(date + "T00:00:00.000Z"),
      status: { in: ["CONFIRMED", "PREPARING", "READY", "OUT_FOR_DELIVERY"] },
    },
    orderBy: { orderNumber: "asc" },
    select: {
      id: true,
      orderNumber: true,
      type: true,
      items: { include: { options: true } },
    },
  });

  // Grouped by DISH, not by dish-and-variation: the kitchen's first question is
  // how much of a thing to make. The variations and the orders are underneath.
  const dishes = new Map<string, PrepDish>();

  for (const order of orders) {
    for (const item of order.items) {
      const options = item.options.map((o) => `${o.groupName}: ${o.choiceName}`);
      const dish = dishes.get(item.productName) ?? {
        name: item.productName,
        total: 0, normalTotal: 0, eventTotal: 0,
        variations: [], lines: [],
      };

      dish.total += item.quantity;
      if (order.type === "EVENT") dish.eventTotal += item.quantity;
      else dish.normalTotal += item.quantity;

      dish.lines.push({
        orderId: order.id,
        orderNumber: order.orderNumber,
        type: order.type,
        quantity: item.quantity,
        variantName: item.variantName,
        options,
        instructions: item.instructions,
      });

      // A sub-total per form, so a dish ordered two ways is still countable.
      const label = [item.variantName, ...options].filter(Boolean).join(" · ");
      if (label) {
        const found = dish.variations.find((v) => v.label === label);
        if (found) found.quantity += item.quantity;
        else dish.variations.push({ label, quantity: item.quantity });
      }

      dishes.set(item.productName, dish);
    }
  }

  return [...dishes.values()]
    .map((d) => ({
      ...d,
      // One form only is not a variation worth listing separately.
      variations: d.variations.length > 1 ? d.variations : [],
    }))
    .sort((a, b) => a.name.localeCompare(b.name));
}

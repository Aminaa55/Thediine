import { db } from "./db";
import { OPEN_STATUSES } from "./admin-orders";
import type { OrderStatus, OrderType, PaymentStatus } from "@prisma/client";

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
  /** yyyy-mm-dd — the day the food is for. */
  date?: string;
  /** Free text against the order number, name or mobile. */
  q?: string;
  /** Open orders only: everything not delivered or cancelled. */
  openOnly?: boolean;
};

export async function listOrders(filters: OrderFilters = {}, take = 100) {
  const q = filters.q?.trim();

  return db.order.findMany({
    where: {
      ...(filters.type ? { type: filters.type } : {}),
      ...(filters.status ? { status: filters.status } : {}),
      ...(filters.paymentStatus ? { paymentStatus: filters.paymentStatus } : {}),
      ...(filters.openOnly ? { status: { in: OPEN_STATUSES } } : {}),
      ...(filters.date ? { deliveryDate: new Date(filters.date + "T00:00:00.000Z") } : {}),
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

export type PrepLine = {
  key: string;
  productName: string;
  variantName: string | null;
  options: string[];
  quantity: number;
  /** Which orders it is for, so a dish can be traced back. */
  orders: { orderNumber: string; quantity: number; instructions: string | null }[];
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
export async function prepForDay(date: string): Promise<PrepLine[]> {
  const orders = await db.order.findMany({
    where: {
      deliveryDate: new Date(date + "T00:00:00.000Z"),
      status: { in: ["CONFIRMED", "PREPARING", "READY", "OUT_FOR_DELIVERY"] },
    },
    select: {
      orderNumber: true,
      items: { include: { options: true } },
    },
  });

  const lines = new Map<string, PrepLine>();
  for (const order of orders) {
    for (const item of order.items) {
      const options = item.options.map((o) => `${o.groupName}: ${o.choiceName}`).sort();
      const key = [item.productName, item.variantName ?? "", options.join("|")].join("§");
      const line = lines.get(key) ?? {
        key,
        productName: item.productName,
        variantName: item.variantName,
        options,
        quantity: 0,
        orders: [],
      };
      line.quantity += item.quantity;
      line.orders.push({
        orderNumber: order.orderNumber,
        quantity: item.quantity,
        instructions: item.instructions,
      });
      lines.set(key, line);
    }
  }

  return [...lines.values()].sort((a, b) => a.productName.localeCompare(b.productName));
}

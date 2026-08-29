"use server";

import { db } from "@/lib/db";
import type { CartLine, EventDraft } from "@/lib/cart";
import { resolveCart } from "./actions";
import { nextOrderNumber } from "@/lib/order-number";
import { parseGuests, earliestNormalDate, toDateInput, RULES } from "@/lib/ordering";
import { eventUnitPrice, type EventTier } from "@/lib/event-pricing";
import { getEventTiers } from "@/lib/catalog";
import { paymobConfig, createIntention } from "@/lib/paymob";
import {
  validateNormal,
  validateEventSubmission,
  normaliseMobile,
  type CustomerDetails,
  type NormalCheckout,
  type PaymentMethodId,
  type DayStatus,
} from "@/lib/checkout";

/**
 * Placing an order.
 *
 * Nothing the browser sends is trusted: prices are resolved from the database
 * again here, the notice period and the daily capacity are re-checked, and the
 * order is written in one transaction so a half-written order cannot exist.
 *
 * A normal order and an event request are two separate records with two separate
 * numbers. They are never merged, even when one customer sends both.
 */

// ------------------------------------------------------------------ context

export type CheckoutContext = {
  methods: PaymentMethodId[];
  /** InstaPay transfer details, as supplied by the business. Empty until then. */
  instapayDetails: string;
  cardComingSoon: boolean;
  /** Card is only offered when a provider is actually configured to take it. */
  cardTestMode: boolean;
  areas: { id: string; name: string; fee: number }[];
  slots: { id: string; label: string; startTime: string; endTime: string }[];
  whatsapp: string;
  servingSetupPolicy: string;
};

async function settings(): Promise<Record<string, string>> {
  const rows = await db.setting.findMany();
  return Object.fromEntries(rows.map((r) => [r.key, r.value]));
}

export async function getCheckoutContext(): Promise<CheckoutContext> {
  const [s, areas, slots] = await Promise.all([
    settings(),
    db.deliveryArea.findMany({
      where: { isActive: true },
      orderBy: { sortOrder: "asc" },
      select: { id: true, nameEn: true, fee: true },
    }),
    db.timeSlot.findMany({
      where: { isActive: true },
      orderBy: { sortOrder: "asc" },
      select: { id: true, labelEn: true, startTime: true, endTime: true },
    }),
  ]);

  const methods: PaymentMethodId[] = [];
  if (s.payment_cash_enabled !== "false") methods.push("CASH");
  if (s.payment_instapay_enabled !== "false") methods.push("INSTAPAY");

  /**
   * Card is offered only when a payment provider is actually configured AND the
   * owner has not switched it off. Configuring the provider is itself the
   * deliberate act; until then card stays "coming soon", because the interface
   * must never imply card works before it does.
   */
  const paymob = paymobConfig();
  const allowed = s.payment_card_enabled !== "false";
  const cardOn = allowed && paymob.configured;
  if (cardOn) methods.push("CARD");
  if (allowed && !paymob.configured && paymob.problem) {
    console.warn(`[paymob] card is not available: ${paymob.problem}`);
  }

  return {
    methods,
    instapayDetails: s.instapay_account_details ?? "",
    cardComingSoon: !cardOn,
    cardTestMode: cardOn && paymob.mode === "test",
    areas: areas.map((a) => ({ id: a.id, name: a.nameEn, fee: a.fee })),
    slots: slots.map((t) => ({ id: t.id, label: t.labelEn, startTime: t.startTime, endTime: t.endTime })),
    whatsapp: s.whatsapp_number ?? "",
    servingSetupPolicy: s.serving_setup_policy_en ?? "",
  };
}

// ------------------------------------------------------------- availability

function dayKey(d: Date): string {
  return d.toISOString().slice(0, 10);
}

/**
 * Which of the next `days` dates cannot be taken, and why.
 *
 * Three things can close a date: the notice period, an explicit closure or a
 * day blocked by a confirmed event, and the daily capacity — three normal
 * orders a day, pickup included.
 */
export async function getNormalAvailability(days = 90): Promise<DayStatus> {
  const s = await settings();
  const cap = Number(s.normal_daily_capacity ?? RULES.normal.dailyCapacity) || RULES.normal.dailyCapacity;

  const earliestDate = earliestNormalDate();
  const earliest = toDateInput(earliestDate);
  const until = new Date(earliestDate);
  until.setDate(until.getDate() + days);

  const [counts, overrides] = await Promise.all([
    db.order.groupBy({
      by: ["deliveryDate"],
      where: {
        type: "NORMAL",
        status: { not: "CANCELLED" },
        deliveryDate: { gte: earliestDate, lte: until },
      },
      _count: { _all: true },
    }),
    db.dateAvailability.findMany({
      where: { date: { gte: earliestDate, lte: until } },
      select: { date: true, isClosed: true, maxOrders: true, note: true, blockedByOrderId: true },
    }),
  ]);

  const unavailable: Record<string, string> = {};
  const overrideBy = new Map(overrides.map((o) => [dayKey(o.date), o]));

  for (const o of overrides) {
    if (o.isClosed) {
      unavailable[dayKey(o.date)] = o.blockedByOrderId
        ? "We are catering an event that day."
        : o.note || "We are not taking orders that day.";
    }
  }

  for (const c of counts) {
    const key = dayKey(c.deliveryDate);
    const limit = overrideBy.get(key)?.maxOrders ?? cap;
    if (c._count._all >= limit && !unavailable[key]) {
      unavailable[key] = `We are fully booked that day — we take ${limit} orders a day.`;
    }
  }

  return { unavailable, earliest };
}

// -------------------------------------------------------------- placing one

export type PlacedOrder = {
  ok: true;
  orderNumber: string;
  token: string;
  /** Set for a card payment: the provider's hosted checkout to send them to. */
  payAt?: string;
} | {
  ok: false;
  errors: Record<string, string>;
};

/**
 * Hands a written order to the card provider.
 *
 * The order already exists and is UNPAID; this only starts the payment. If the
 * provider cannot be reached the order stands, and the customer is told to pay
 * another way rather than losing what they just placed.
 */
async function startCardPayment(order: {
  id: string;
  orderNumber: string;
  publicToken: string;
  total: number;
}, customer: CustomerDetails, address: string | null): Promise<string | null> {
  const cfg = paymobConfig();
  if (!cfg.configured) return null;

  // Unique per attempt: a provider rejects a reference it has already seen.
  const merchantRef = `${order.orderNumber}-${Date.now().toString(36)}`;

  const intention = await createIntention({
    amount: order.total,
    merchantReference: merchantRef,
    customer: {
      name: customer.name.trim(),
      mobile: normaliseMobile(customer.mobile),
      email: customer.email.trim() || null,
    },
    address,
    items: [{ name: `Order ${order.orderNumber}`, amount: order.total, quantity: 1 }],
    redirectionUrl: `${cfg.siteUrl}/api/paymob/return`,
    notificationUrl: `${cfg.siteUrl}/api/paymob/webhook`,
  });

  if (!intention.ok) {
    console.error(`[paymob] could not start payment for ${order.orderNumber}: ${intention.error}`);
    return null;
  }

  await db.order.update({
    where: { id: order.id },
    data: {
      paymentProvider: "paymob",
      paymentProviderMode: cfg.mode,
      paymentMerchantRef: merchantRef,
      paymentIntentionId: intention.intentionId || null,
    },
  });
  return intention.checkoutUrl;
}

/** Turns resolved cart lines into the order's own snapshot of them. */
function itemData(lines: Awaited<ReturnType<typeof resolveCart>>["lines"]) {
  return lines
    .filter((l) => !l.unavailable && !l.problem)
    .map((l) => ({
      productId: l.productId,
      productName: l.productName,
      variantName: l.variantName,
      unitPrice: l.unitPrice,
      quantity: l.quantity,
      lineTotal: l.lineTotal,
      instructions: l.instructions || null,
      options: {
        create: l.options.map((o) => ({
          groupName: o.groupName,
          choiceName: o.choiceName,
          priceDelta: o.priceDelta,
        })),
      },
    }));
}

/** One customer record per mobile number, updated but never duplicated. */
async function upsertCustomer(tx: Parameters<Parameters<typeof db.$transaction>[0]>[0], c: CustomerDetails) {
  const mobile = normaliseMobile(c.mobile);
  return tx.customer.upsert({
    where: { mobile },
    update: { name: c.name.trim(), email: c.email.trim() || null },
    create: { mobile, name: c.name.trim(), email: c.email.trim() || null },
  });
}

/**
 * Payment status at the moment an order is placed.
 *
 * Cash is simply unpaid until it is handed over. InstaPay starts awaiting
 * verification — the customer says they will transfer, and someone has to check
 * that the money arrived before it becomes paid. Neither ever touches the order
 * status.
 */
function initialPaymentStatus(method: PaymentMethodId) {
  return method === "INSTAPAY" ? ("AWAITING_VERIFICATION" as const) : ("UNPAID" as const);
}

export async function placeNormalOrder(
  input: NormalCheckout,
  lines: CartLine[],
): Promise<PlacedOrder> {
  const ctx = await getCheckoutContext();
  const day = await getNormalAvailability();
  const check = validateNormal(input, {
    methods: ctx.methods,
    day,
    hasAreas: ctx.areas.length > 0,
  });
  if (!check.ok) return { ok: false, errors: check.errors };

  const cart = await resolveCart(lines);
  const usable = cart.lines.filter((l) => !l.unavailable && !l.problem);
  if (usable.length === 0) {
    return { ok: false, errors: { items: "There is nothing left in this order to place." } };
  }

  const area = input.areaId ? ctx.areas.find((a) => a.id === input.areaId) ?? null : null;
  // Unknown until the business supplies its areas and fees: recorded as unknown,
  // never as zero, and left out of the total rather than guessed at.
  const deliveryFee = input.fulfilment === "DELIVERY" ? (area ? area.fee : null) : 0;
  const subtotal = usable.reduce((n, l) => n + l.lineTotal, 0);
  const slot = ctx.slots.find((t) => t.id === input.time) ?? null;

  const method = input.paymentMethod as PaymentMethodId;

  try {
    const order = await db.$transaction(async (tx) => {
      // Capacity is re-counted inside the transaction, so two orders placed at
      // the same moment cannot both take the last slot of a day.
      const date = new Date(input.date + "T00:00:00.000Z");
      const [taken, override] = await Promise.all([
        tx.order.count({ where: { type: "NORMAL", deliveryDate: date, status: { not: "CANCELLED" } } }),
        tx.dateAvailability.findUnique({ where: { date } }),
      ]);
      const s = await tx.setting.findUnique({ where: { key: "normal_daily_capacity" } });
      const limit = override?.maxOrders ?? Number(s?.value ?? RULES.normal.dailyCapacity);
      if (override?.isClosed) throw new CapacityError("We are not taking orders on that date.");
      if (taken >= limit) {
        throw new CapacityError(`We are fully booked that day — we take ${limit} orders a day.`);
      }

      const customer = await upsertCustomer(tx, input);

      return tx.order.create({
        data: {
          orderNumber: await nextOrderNumber(tx, "NORMAL"),
          type: "NORMAL",
          status: "NEW",
          customerId: customer.id,
          customerName: input.name.trim(),
          customerMobile: normaliseMobile(input.mobile),
          customerEmail: input.email.trim() || null,
          fulfilmentType: input.fulfilment,
          deliveryDate: date,
          timeSlotId: slot ? slot.id : null,
          timeSlotLabel: slot ? slot.label : input.time,
          areaId: area?.id ?? null,
          areaName: area?.name ?? null,
          addressLine: input.fulfilment === "DELIVERY" ? input.addressLine.trim() : null,
          addressDetails: input.fulfilment === "DELIVERY" ? input.addressDetails.trim() || null : null,
          servingSetup: input.servingSetup,
          subtotal,
          deliveryFee,
          total: subtotal + (deliveryFee ?? 0),
          paymentMethod: method,
          paymentStatus: initialPaymentStatus(method),
          paymentReference: method === "INSTAPAY" ? input.paymentReference.trim() || null : null,
          notes: input.notes.trim() || null,
          items: { create: itemData(cart.lines) },
          statusEvents: { create: { toStatus: "NEW", note: "Placed on the website." } },
        },
        select: { id: true, orderNumber: true, publicToken: true, total: true },
      });
    });

    if (method === "CARD") {
      const payAt = await startCardPayment(order, input, input.addressLine.trim() || null);
      return { ok: true, orderNumber: order.orderNumber, token: order.publicToken, payAt: payAt ?? undefined };
    }
    return { ok: true, orderNumber: order.orderNumber, token: order.publicToken };
  } catch (e) {
    if (e instanceof CapacityError) return { ok: false, errors: { date: e.message } };
    throw e;
  }
}

class CapacityError extends Error {}

/**
 * An event REQUEST, not a booking.
 *
 * It is written with status REQUESTED and stays there until the business
 * confirms it personally. Nothing here blocks a date or accepts anything.
 */
export async function submitEventRequest(
  customer: CustomerDetails,
  event: EventDraft,
  lines: CartLine[],
): Promise<PlacedOrder> {
  const ctx = await getCheckoutContext();
  const check = validateEventSubmission(customer, event, {
    methods: ctx.methods,
    lineCount: lines.length,
  });
  if (!check.ok) return { ok: false, errors: check.errors };

  // Event food is priced by guest band; resolved server-side, never trusted
  // from the browser.
  const cart = await resolveCart(lines, { guestCount: event.guestCount });
  const usable = cart.lines.filter((l) => !l.unavailable && !l.problem);
  if (usable.length === 0) {
    return { ok: false, errors: { items: "There are no dishes left in this request." } };
  }

  const guests = parseGuests(event.guestCount) ?? 0;
  const subtotal = usable.reduce((n, l) => n + l.lineTotal, 0);
  const tiers: EventTier[] = await getEventTiers();
  const band = eventUnitPrice(100, guests, { eventPricingEnabled: true, tiers: [] }, tiers).tier;
  const method = customer.paymentMethod as PaymentMethodId;

  const order = await db.$transaction(async (tx) => {
    const record = await upsertCustomer(tx, customer);

    return tx.order.create({
      data: {
        orderNumber: await nextOrderNumber(tx, "EVENT"),
        type: "EVENT",
        // A request. It becomes an accepted order only when the business says so.
        status: "REQUESTED",
        customerId: record.id,
        customerName: customer.name.trim(),
        customerMobile: normaliseMobile(customer.mobile),
        customerEmail: customer.email.trim() || null,
        // An event is catered where the customer is; the venue is the address.
        fulfilmentType: "DELIVERY",
        deliveryDate: new Date(event.date + "T00:00:00.000Z"),
        timeSlotLabel: event.time,
        addressLine: event.venue.trim(),
        servingSetup: customer.servingSetup,
        subtotal,
        // Décor, setup and staff are quoted separately and are NOT in this total.
        deliveryFee: null,
        total: subtotal,
        paymentMethod: method,
        paymentStatus: initialPaymentStatus(method),
        paymentReference: method === "INSTAPAY" ? customer.paymentReference.trim() || null : null,
        notes: customer.notes.trim() || null,
        items: { create: itemData(cart.lines) },
        statusEvents: { create: { toStatus: "REQUESTED", note: "Requested from the website." } },
        eventDetail: {
          create: {
            eventType: event.eventType as "BIRTHDAY" | "ENGAGEMENT" | "WEDDING" | "OTHER",
            eventTypeOther: event.eventType === "OTHER" ? event.eventTypeOther.trim() : null,
            guestCount: guests,
            eventTime: event.time,
            pricingMultiplierBp: band?.multiplierBp ?? null,
            decorRequested: event.decorRequested,
            setupRequested: event.setupRequested,
            servingStaffRequested: event.servingStaffRequested,
            extrasNotes: event.extrasNotes.trim() || null,
            venueName: event.venue.trim(),
          },
        },
      },
      select: { id: true, orderNumber: true, publicToken: true, total: true },
    });
  });

  if (method === "CARD") {
    const payAt = await startCardPayment(order, customer, event.venue.trim() || null);
    return { ok: true, orderNumber: order.orderNumber, token: order.publicToken, payAt: payAt ?? undefined };
  }
  return { ok: true, orderNumber: order.orderNumber, token: order.publicToken };
}

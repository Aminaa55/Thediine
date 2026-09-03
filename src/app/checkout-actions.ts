"use server";

import { db } from "@/lib/db";
import type { CartLine, EventDraft } from "@/lib/cart";
import { resolveCart } from "./actions";
import { nextOrderNumber } from "@/lib/order-number";
import { parseGuests, toDateInput, formatDay, plural, RULES } from "@/lib/ordering";
import {
  getRules, getSettings, getPaymentOptions, getServingOptions,
  earliestNormalFrom, earliestEventFrom, timeWithin, type BusinessRules,
} from "@/lib/settings";
import { eventUnitPrice, type EventTier } from "@/lib/event-pricing";
import { getEventTiers } from "@/lib/catalog";
import { paymobConfig, createIntention, CARD_PAYMENTS_PAUSED } from "@/lib/paymob";
import {
  validateNormal,
  validateEventSubmission,
  normaliseMobile,
  NORMAL_ORDER_DEPOSIT_PERCENT,
  type CustomerDetails,
  type NormalCheckout,
  type PaymentMethodId,
  type DayStatus,
  type CheckoutLimits,
  type ServingSetup,
  type PaymentChoice,
  type ServingChoice,
} from "@/lib/checkout";
import { splitDeposit } from "@/lib/money";

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
  /** Every way to pay that is switched on, in the order the business set. */
  payments: PaymentChoice[];
  /** Every way to be served that is available. */
  servings: ServingChoice[];
  /** The ids of the payment options on offer, which is what is validated. */
  methods: string[];
  /** The InstaPay number to transfer to, as supplied by the business. */
  instapayNumber: string;
  /** Anything further the business wants to say about the transfer. */
  instapayDetails: string;
  /** Card is only offered when a provider is configured AND card is not paused. */
  cardTestMode: boolean;
  areas: { id: string; name: string; fee: number }[];
  whatsapp: string;
  servingSetupPolicy: string;
  /** Whether pickup is being offered at all. */
  pickupEnabled: boolean;
  /** The business's own numbers, so the page says what the server enforces. */
  limits: CheckoutLimits;
};

async function settings(): Promise<Record<string, string>> {
  return getSettings();
}

/** The numbers a checkout page needs, in the shape both sides validate against. */
function limitsFrom(rules: BusinessRules): CheckoutLimits {
  return {
    timeFrom: rules.timeFrom,
    timeUntil: rules.timeUntil,
    normalNoticeLabel: rules.normalNoticeLabel,
    eventNoticeLabel: rules.eventNoticeLabel,
    eventEarliest: toDateInput(earliestEventFrom(rules)),
    maxGuests: rules.maxGuests,
    minimumOrder: rules.minimumOrder,
  };
}

export async function getCheckoutContext(): Promise<CheckoutContext> {
  const [s, rules, areas, payOptions, servOptions] = await Promise.all([
    settings(),
    getRules(),
    db.deliveryArea.findMany({
      where: { isActive: true },
      orderBy: { sortOrder: "asc" },
      select: { id: true, nameEn: true, fee: true },
    }),
    getPaymentOptions(),
    getServingOptions(),
  ]);

  /**
   * Card is paused, so it is not offered at all. When it comes back it is
   * offered only where a provider is actually configured and the owner has not
   * switched it off — the interface must never imply card works before it does.
   */
  const paymob = paymobConfig();
  const cardAllowed = !CARD_PAYMENTS_PAUSED && paymob.configured;
  if (!CARD_PAYMENTS_PAUSED && !paymob.configured && paymob.problem) {
    console.warn(`[paymob] card is not available: ${paymob.problem}`);
  }

  const payments: PaymentChoice[] = payOptions
    .filter((o) => {
      if (!o.isEnabled) return false;
      // An integrated method is only ever offered once it is really wired up.
      if (o.kind === "INTEGRATED") return o.builtIn === "CARD" && cardAllowed;
      return true;
    })
    .map((o) => ({
      id: o.id,
      method: (o.builtIn ?? "OTHER") as PaymentMethodId,
      name: o.nameEn,
      instructions:
        o.builtIn === "INSTAPAY"
          ? [s.instapay_number ?? "", s.instapay_account_details ?? ""].filter(Boolean).join(" — ")
          : o.instructionsEn ?? "",
      verifyBeforeDelivery: o.verifyBeforeDelivery,
    }));

  const servings: ServingChoice[] = servOptions
    .filter((o) => o.isAvailable)
    .map((o) => ({
      id: o.id,
      setup: (o.builtIn ?? "OTHER") as ServingSetup,
      name: o.nameEn,
      description: o.descriptionEn ?? "",
    }));

  return {
    payments,
    servings,
    methods: payments.map((p) => p.id),
    instapayNumber: s.instapay_number ?? "",
    instapayDetails: s.instapay_account_details ?? "",
    cardTestMode:
      cardAllowed && paymob.mode === "test"
      && payments.some((p) => p.method === "CARD"),
    areas: areas.map((a) => ({ id: a.id, name: a.nameEn, fee: a.fee })),
    whatsapp: s.whatsapp_number ?? "",
    servingSetupPolicy: s.serving_setup_policy_en ?? "",
    pickupEnabled: rules.pickupEnabled,
    limits: limitsFrom(rules),
  };
}

// ------------------------------------------------------------- availability

/** Dates are stored at UTC midnight, so the key is just the date part. */
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
  const rules = await getRules();
  const cap = rules.dailyCapacity;

  const earliestDate = earliestNormalFrom(rules);
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
        // A pickup only counts against the day when the business says it does.
        ...(rules.pickupCountsTowardCapacity ? {} : { fulfilmentType: "DELIVERY" as const }),
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

  // Days the business does not work. Every day is a working day until it says
  // otherwise, so this closes nothing unless someone has turned a day off.
  if (rules.workingDays.length < 7) {
    for (let i = 0; i <= days; i++) {
      const d = new Date(earliestDate);
      d.setDate(d.getDate() + i);
      if (!rules.workingDays.includes(d.getDay())) {
        unavailable[dayKey(d)] = "We are closed that day.";
      }
    }
  }

  const closedSoon: string[] = [];
  for (const o of overrides) {
    if (o.isClosed) {
      const key = dayKey(o.date);
      unavailable[key] = o.blockedByOrderId
        ? "We are catering an event that day."
        : o.note || "We are not taking orders that day.";
      closedSoon.push(key);
    }
  }

  const fullSoon: string[] = [];
  for (const c of counts) {
    const key = dayKey(c.deliveryDate);
    const limit = overrideBy.get(key)?.maxOrders ?? cap;
    if (c._count._all >= limit && !unavailable[key]) {
      unavailable[key] = `We are fully booked that day — we take ${plural(limit, "order")} a day.`;
      fullSoon.push(key);
    }
  }

  /**
   * The first few dates that can actually be taken.
   *
   * Worked out here because only the database knows what is full; the checkout
   * offers them so nobody has to hunt through a date picker for an open day.
   */
  const nextAvailable: string[] = [];
  for (let i = 0; i <= days && nextAvailable.length < 3; i++) {
    const d = new Date(earliestDate);
    d.setDate(d.getDate() + i);
    const key = dayKey(d);
    if (!unavailable[key]) nextAvailable.push(key);
  }

  // Only what is close enough to matter: a fortnight of dates a customer might
  // actually be choosing between.
  const soon = (list: string[]) =>
    list
      .filter((k) => {
        const at = (new Date(k + "T00:00:00.000Z").getTime() - earliestDate.getTime()) / 86_400_000;
        return at >= 0 && at <= 14;
      })
      .sort()
      .slice(0, 4);

  return {
    unavailable,
    earliest,
    closedWeekdays: [0, 1, 2, 3, 4, 5, 6].filter((d) => !rules.workingDays.includes(d)),
    fullSoon: soon(fullSoon),
    closedSoon: soon(closedSoon),
    nextAvailable,
  };
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
function initialPaymentStatus(choice: { verifyBeforeDelivery: boolean }) {
  return choice.verifyBeforeDelivery ? ("AWAITING_VERIFICATION" as const) : ("UNPAID" as const);
}

export async function placeNormalOrder(
  input: NormalCheckout,
  lines: CartLine[],
): Promise<PlacedOrder> {
  const ctx = await getCheckoutContext();
  const [day, rules] = await Promise.all([getNormalAvailability(), getRules()]);

  const cart = await resolveCart(lines);
  const usable = cart.lines.filter((l) => !l.unavailable && !l.problem);
  if (usable.length === 0) {
    return { ok: false, errors: { items: "There is nothing left in this order to place." } };
  }
  const food = usable.reduce((n, l) => n + l.lineTotal, 0);

  const check = validateNormal(input, {
    methods: ctx.methods,
    day,
    hasAreas: ctx.areas.length > 0,
    limits: ctx.limits,
    subtotal: food,
  });
  if (!check.ok) return { ok: false, errors: check.errors };

  // Both of these are settings, so they are checked here rather than trusted
  // from a form that was rendered before they were changed.
  if (input.fulfilment === "PICKUP" && !rules.pickupEnabled) {
    return { ok: false, errors: { fulfilment: "Pickup is not available at the moment." } };
  }
  const serving = ctx.servings.find((x) => x.id === input.servingOptionId) ?? null;
  if (!serving) {
    return { ok: false, errors: { servingSetup: "That serving option is not available at the moment." } };
  }

  // Only an area that is switched on right now counts — `ctx.areas` holds
  // nothing else — so an area retired between page load and Place is refused,
  // not silently billed at its old fee.
  const area = input.areaId ? ctx.areas.find((a) => a.id === input.areaId) ?? null : null;
  if (input.fulfilment === "DELIVERY" && !area) {
    return {
      ok: false,
      errors: ctx.areas.length === 0
        ? { fulfilment: "Delivery is not available online at the moment. Please choose pickup, or message us on WhatsApp." }
        : { areaId: "That area is no longer available. Please choose another." },
    };
  }
  // A delivery order always carries the fee it was quoted. Null stays possible
  // in the schema only for orders placed before areas existed.
  const deliveryFee: number = input.fulfilment === "DELIVERY" ? area!.fee : 0;
  const subtotal = food;
  // The customer picks a time inside the business's hours; it is recorded as
  // they gave it. Orders placed under the old named slots keep their own label.
  const timeLabel = input.time.trim();

  const payment = ctx.payments.find((x) => x.id === input.paymentOptionId)!;
  const method = payment.method;

  // A Normal order paid by a method the money is expected on before delivery
  // requires a deposit; everything else — cash, card, pickup or delivery
  // alike — does not. Worked out from the order's own total and frozen onto
  // it, so a later change to the deposit rule never rewrites an order already
  // sitting on it.
  const depositAmount = payment.verifyBeforeDelivery
    ? splitDeposit(subtotal + deliveryFee, NORMAL_ORDER_DEPOSIT_PERCENT).deposit
    : null;

  try {
    const order = await db.$transaction(async (tx) => {
      // Capacity is re-counted inside the transaction, so two orders placed at
      // the same moment cannot both take the last slot of a day.
      const date = new Date(input.date + "T00:00:00.000Z");
      const [taken, override] = await Promise.all([
        tx.order.count({
          where: {
            type: "NORMAL", deliveryDate: date, status: { not: "CANCELLED" },
            ...(rules.pickupCountsTowardCapacity ? {} : { fulfilmentType: "DELIVERY" as const }),
          },
        }),
        tx.dateAvailability.findUnique({ where: { date } }),
      ]);
      const limit = override?.maxOrders ?? rules.dailyCapacity;
      if (override?.isClosed) {
        throw new CapacityError(`We are not taking orders on ${formatDay(input.date)}.`);
      }
      if (rules.workingDays.length < 7 && !rules.workingDays.includes(date.getUTCDay())) {
        throw new CapacityError(`We are closed on ${formatDay(input.date)}.`);
      }
      if (taken >= limit) {
        throw new CapacityError(
          `We are fully booked on ${formatDay(input.date)} — we take ${plural(limit, "order")} a day.`,
        );
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
          timeSlotLabel: timeLabel,
          areaId: area?.id ?? null,
          areaName: area?.name ?? null,
          addressLine: input.fulfilment === "DELIVERY" ? input.addressLine.trim() : null,
          addressDetails: input.fulfilment === "DELIVERY" ? input.addressDetails.trim() || null : null,
          servingSetup: serving.setup,
          servingSetupLabel: serving.name,
          subtotal,
          deliveryFee,
          total: subtotal + deliveryFee,
          depositAmount,
          paymentMethod: method,
          paymentMethodLabel: payment.name,
          paymentInstructions: payment.instructions || null,
          paymentStatus: initialPaymentStatus(payment),
          paymentReference: payment.verifyBeforeDelivery
            ? input.paymentReference.trim() || null
            : null,
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
    limits: ctx.limits,
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
  const payment = ctx.payments.find((x) => x.id === customer.paymentOptionId)!;
  const method = payment.method;
  const serving = ctx.servings.find((x) => x.id === customer.servingOptionId) ?? null;
  if (!serving) {
    return { ok: false, errors: { servingSetup: "That serving option is not available at the moment." } };
  }

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
        servingSetup: serving.setup,
        servingSetupLabel: serving.name,
        subtotal,
        // Décor, setup and staff are quoted separately and are NOT in this total.
        deliveryFee: null,
        total: subtotal,
        paymentMethod: method,
        paymentMethodLabel: payment.name,
        paymentInstructions: payment.instructions || null,
        paymentStatus: initialPaymentStatus(payment),
        paymentReference: payment.verifyBeforeDelivery
          ? customer.paymentReference.trim() || null
          : null,
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

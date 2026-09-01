/**
 * Checkout rules, shared by the browser and the server.
 *
 * Every rule here is enforced twice: once as you type, and once again in the
 * server action that writes the order. The browser copy is a convenience; the
 * server copy is the rule.
 *
 * A normal order and an event request are validated SEPARATELY and never share
 * a form, because they follow different rules and become different records.
 */

import {
  EVENT_GUESTS, RULES, earliestNormalDate, earliestEventDate, parseGuests, toDateInput, formatDay,
} from "./ordering";

export type Fulfilment = "DELIVERY" | "PICKUP";
/** The built-in setups, plus anything the business has added. */
export type ServingSetup = "RETURNABLE" | "DISPOSABLE" | "OTHER";
export type PaymentMethodId = "CASH" | "INSTAPAY" | "CARD" | "OTHER";

/** One way to pay, as offered to a customer. */
export type PaymentChoice = {
  /** The option's own id. Built-in methods carry their name here too. */
  id: string;
  method: PaymentMethodId;
  name: string;
  instructions: string;
  /** Money expected before delivery, so it starts awaiting verification. */
  verifyBeforeDelivery: boolean;
};

/** One way the food can be served. */
export type ServingChoice = {
  id: string;
  setup: ServingSetup;
  name: string;
  description: string;
};

/** What every order needs, whichever kind it is. */
export type CustomerDetails = {
  name: string;
  mobile: string;
  email: string;
  servingSetup: ServingSetup;
  /** Which serving option was chosen, by id. */
  servingOptionId: string;
  paymentMethod: PaymentMethodId | null;
  /** Which payment option was chosen, by id. */
  paymentOptionId: string;
  /** The customer's own InstaPay reference, if they have already transferred. */
  paymentReference: string;
  notes: string;
};

export const EMPTY_CUSTOMER: CustomerDetails = {
  name: "",
  mobile: "",
  email: "",
  servingSetup: "DISPOSABLE",
  servingOptionId: "",
  paymentMethod: null,
  paymentOptionId: "",
  paymentReference: "",
  notes: "",
};

export type NormalCheckout = CustomerDetails & {
  fulfilment: Fulfilment;
  date: string;
  time: string;
  areaId: string | null;
  addressLine: string;
  addressDetails: string;
};

export const EMPTY_NORMAL: NormalCheckout = {
  ...EMPTY_CUSTOMER,
  fulfilment: "DELIVERY",
  date: "",
  time: "",
  areaId: null,
  addressLine: "",
  addressDetails: "",
};

export type Errors = Record<string, string>;
export type Validation = { ok: boolean; errors: Errors };

/**
 * Egyptian mobile numbers: 11 digits beginning 010, 011, 012 or 015.
 *
 * Spaces, dashes and a +20 or 0020 prefix are accepted and normalised away, so
 * a number pasted from a contact card is not rejected on formatting alone.
 */
export function normaliseMobile(raw: string): string {
  const digits = raw.replace(/[^\d]/g, "");
  if (digits.startsWith("0020")) return "0" + digits.slice(4);
  if (digits.startsWith("20") && digits.length === 12) return "0" + digits.slice(2);
  return digits;
}

export function isValidMobile(raw: string): boolean {
  return /^01[0125]\d{8}$/.test(normaliseMobile(raw));
}

/** Deliberately permissive: an email is optional and only shape-checked. */
export function isValidEmail(raw: string): boolean {
  return raw.trim() === "" || /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(raw.trim());
}

/**
 * What the server told us about the day the customer picked.
 *
 * The date rules are not decidable in the browser — how many orders a day
 * already holds, and whether it is closed, are facts only the database has.
 */
export type DayStatus = {
  /** Dates that cannot be taken, as yyyy-mm-dd, with the reason to show. */
  unavailable: Record<string, string>;
  /** The earliest date the notice period allows, as yyyy-mm-dd. */
  earliest: string;
  /** Days of the week the business never works, 0 = Sunday. */
  closedWeekdays: number[];
  /** Dates soon that are already full, so they can be said before they are picked. */
  fullSoon: string[];
  /** Dates soon closed by hand or by an event. */
  closedSoon: string[];
  /** The first few dates that can actually be taken. */
  nextAvailable: string[];
};

/**
 * The business's own numbers, as the server read them from settings.
 *
 * Passed in rather than imported so one edit in admin changes the rule, the
 * message the customer reads and the check the server makes, all at once.
 */
export type CheckoutLimits = {
  /** The hours orders go out in, as "HH:mm". Null means any time. */
  timeFrom: string | null;
  timeUntil: string | null;
  normalNoticeLabel: string;
  eventNoticeLabel: string;
  /** yyyy-mm-dd — the earliest an event can be, under the business's notice. */
  eventEarliest: string;
  maxGuests: number;
  /** Piastres. 0 means no minimum. */
  minimumOrder: number;
};

export function validateCustomer(
  input: CustomerDetails,
  methods: string[],
): Errors {
  const errors: Errors = {};

  if (!input.name.trim()) errors.name = "Please tell us your name.";
  else if (input.name.trim().length < 2) errors.name = "Please give your full name.";

  if (!input.mobile.trim()) errors.mobile = "We need a mobile number to confirm your order.";
  else if (!isValidMobile(input.mobile)) {
    errors.mobile = "That does not look like an Egyptian mobile number.";
  }

  if (!isValidEmail(input.email)) errors.email = "Please check the email address.";

  // Checked by the option's id, so two manual methods are never confused.
  if (!input.paymentOptionId) errors.paymentMethod = "Please choose how you would like to pay.";
  else if (!methods.includes(input.paymentOptionId)) {
    errors.paymentMethod = "That payment method is not available yet.";
  }

  return errors;
}

/**
 * A normal order.
 *
 * `day` carries the server's answer about the chosen date: the notice period is
 * checked here, but a full or closed day can only be known from the database.
 */
export function validateNormal(
  input: NormalCheckout,
  options: {
    methods: string[];
    day?: DayStatus;
    hasAreas: boolean;
    limits?: CheckoutLimits;
    /** The food total, so a minimum order can be checked where one exists. */
    subtotal?: number;
  },
): Validation {
  const errors = validateCustomer(input, options.methods);
  const earliest = options.day?.earliest ?? toDateInput(earliestNormalDate());
  const noticeLabel = options.limits?.normalNoticeLabel ?? RULES.normal.noticeLabel;

  if (!input.date) errors.date = "Please choose a date.";
  else if (input.date < earliest) {
    errors.date = `We need at least ${noticeLabel}. The earliest date we can take is ${formatDay(earliest)}.`;
  } else if (options.day?.unavailable[input.date]) {
    errors.date = options.day.unavailable[input.date];
  }

  // Only a rule where the business has set one. It is 0 — no minimum — today.
  const minimum = options.limits?.minimumOrder ?? 0;
  if (minimum > 0 && options.subtotal !== undefined && options.subtotal < minimum) {
    errors.items = `Orders start at ${(minimum / 100).toLocaleString("en-EG")} EGP.`;
  }

  if (!input.time) errors.time = "Please choose a time.";
  else {
    const from = options.limits?.timeFrom;
    const until = options.limits?.timeUntil;
    if ((from && input.time < from) || (until && input.time > until)) {
      errors.time = `We go out between ${from} and ${until}.`;
    }
  }

  if (input.fulfilment === "DELIVERY") {
    if (!input.addressLine.trim()) errors.addressLine = "Please give the delivery address.";
    // The area only becomes required once areas have actually been set up.
    if (options.hasAreas && !input.areaId) errors.areaId = "Please choose your area.";
  }

  return { ok: Object.keys(errors).length === 0, errors };
}

/** The event request, at the point of sending it. */
export type EventCheckout = CustomerDetails;

export function validateEventSubmission(
  customer: CustomerDetails,
  event: {
    eventType: string | null;
    eventTypeOther: string;
    date: string;
    time: string;
    guestCount: string;
    venue: string;
  },
  options: {
    methods: string[];
    lineCount: number;
    limits?: CheckoutLimits;
  },
): Validation {
  const errors = validateCustomer(customer, options.methods);

  // The event's own details were validated on the way in; re-checked here
  // because an event can be edited from the cart after that.
  if (!event.eventType) errors.eventType = "Please choose the occasion.";
  if (event.eventType === "OTHER" && !event.eventTypeOther.trim()) {
    errors.eventTypeOther = "Please tell us the occasion.";
  }

  const earliest = options.limits?.eventEarliest ?? toDateInput(earliestEventDate());
  const eventNotice = options.limits?.eventNoticeLabel ?? RULES.event.noticeLabel;
  if (!event.date) errors.date = "Please choose a date.";
  else if (event.date < earliest) {
    errors.date = `Events need at least ${eventNotice}. The earliest date we can take is ${formatDay(earliest)}.`;
  }

  if (!event.time) errors.time = "Please choose a time.";
  if (!event.venue.trim()) errors.venue = "Please tell us where we are coming to.";

  const maxGuests = options.limits?.maxGuests ?? EVENT_GUESTS.max;
  const guests = parseGuests(event.guestCount);
  if (guests === null) errors.guestCount = "Please tell us how many guests.";
  else if (guests < EVENT_GUESTS.min) errors.guestCount = "There must be at least one guest.";
  else if (guests > maxGuests) {
    errors.guestCount = `We currently cater events for up to ${maxGuests} guests.`;
  }

  if (options.lineCount === 0) errors.items = "Please choose the dishes for your event.";

  return { ok: Object.keys(errors).length === 0, errors };
}

/**
 * The two the business started with. They are rows in the database now, and
 * these are only the wording used when a row has not been given its own.
 */
export const SERVING_SETUPS: { id: ServingSetup; title: string; body: string }[] = [
  {
    id: "RETURNABLE",
    title: "Returnable dishes",
    body: "Served in our own dishes, which we collect afterwards.",
  },
  {
    id: "DISPOSABLE",
    title: "Disposable dishes",
    body: "Served in disposable containers — nothing to return.",
  },
];

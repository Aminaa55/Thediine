/**
 * Ordering rules, in one place.
 *
 * Notice periods are shown CONTEXTUALLY — never both at once, never on the
 * homepage — and are enforced by the date pickers rather than merely displayed.
 */

/**
 * The four occasions, and how they are written.
 *
 * Kept HERE, not in the cart, because the cart is a client module: a value
 * imported from one into a server component comes back as a client reference
 * rather than the object itself, which is how the occasion silently rendered
 * as an em dash on the confirmation page.
 */
export type EventTypeId = "BIRTHDAY" | "ENGAGEMENT" | "WEDDING" | "OTHER";

export const EVENT_TYPE_LABELS: Record<EventTypeId, string> = {
  BIRTHDAY: "Birthday",
  ENGAGEMENT: "Engagement",
  WEDDING: "Wedding",
  OTHER: "Other",
};

export const RULES = {
  normal: { noticeHours: 48, noticeLabel: "48 hours", dailyCapacity: 3 },
  event: { noticeDays: 5, noticeLabel: "5 days" },
} as const;

/** Event capacity. Mirrors the `event_max_guests` setting the admin can edit. */
export const EVENT_GUESTS = { min: 1, max: 100 } as const;

export function guestLimitMessage(max: number): string {
  return `We currently cater events for up to ${max} guests.`;
}

export const GUEST_LIMIT_MESSAGE = guestLimitMessage(EVENT_GUESTS.max);

export function earliestNormalDate(now = new Date()): Date {
  const d = new Date(now);
  d.setHours(d.getHours() + RULES.normal.noticeHours);
  d.setHours(0, 0, 0, 0);
  return d;
}

export function earliestEventDate(now = new Date()): Date {
  const d = new Date(now);
  d.setDate(d.getDate() + RULES.event.noticeDays);
  d.setHours(0, 0, 0, 0);
  return d;
}

export function toDateInput(d: Date): string {
  return d.toISOString().slice(0, 10);
}

/**
 * Which day it is IN CAIRO, wherever the server happens to be running.
 *
 * The site is hosted abroad and its clock is UTC, but the kitchen's day is
 * Cairo's. Without this, between midnight and 2 or 3 in the morning Cairo
 * time the server still thinks it is yesterday: admin's Today page would show
 * the wrong day's cooking, and the earliest date a customer can order for
 * would be a day early. Everything that decides "what day is it" goes through
 * here.
 */
export function cairoDayKey(d: Date = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Africa/Cairo", year: "numeric", month: "2-digit", day: "2-digit",
  }).format(d);
}

/** Cairo's day, as a Date at UTC midnight — how dates are stored here. */
export function cairoDay(d: Date = new Date()): Date {
  return new Date(cairoDayKey(d) + "T00:00:00.000Z");
}

/**
 * Guest count is kept as the exact string the customer typed and only parsed
 * here. It is never round-tripped through a number input's stepper, which is
 * what silently turned 153 into 152.
 */
export function parseGuests(raw: string): number | null {
  if (!/^\d+$/.test(raw.trim())) return null;
  return Number(raw.trim());
}

export type EventValidation = { ok: boolean; errors: Record<string, string> };

/**
 * The live numbers this validation should use.
 *
 * The notice period and the guest ceiling are settings the business edits, so
 * they are passed in rather than read from a constant. Anything not passed
 * falls back to the rules the business started with, which is what happens if
 * a page somehow renders outside the rules provider.
 */
export type EventLimits = {
  /** Earliest date we can cater, as YYYY-MM-DD. */
  eventEarliest?: string;
  /** How that notice period reads: "5 days". */
  eventNoticeLabel?: string;
  maxGuests?: number;
  /**
   * Dates the kitchen is shut, as yyyy-mm-dd, with the reason to show. Only
   * the database knows these — a day closed by hand in admin, or one already
   * given to another event — so they are passed in rather than worked out here.
   */
  unavailable?: Record<string, string>;
};

/**
 * The single source of truth for whether an event request is valid.
 *
 * Used by the browser AND by the server action, so the guest ceiling and the
 * notice period are real business rules rather than messages on a form. Both
 * come from settings: change them in admin and every message here changes
 * with them, with no deploy.
 */
export function validateEvent(
  input: {
    eventType: string | null;
    eventTypeOther: string;
    date: string;
    time: string;
    guestCount: string;
    venue: string;
  },
  limits: EventLimits = {},
): EventValidation {
  const errors: Record<string, string> = {};

  if (!input.eventType) errors.eventType = "Please choose the occasion.";
  if (input.eventType === "OTHER" && !input.eventTypeOther.trim()) {
    errors.eventTypeOther = "Please tell us the occasion.";
  }

  const min = limits.eventEarliest ?? toDateInput(earliestEventDate());
  const noticeLabel = limits.eventNoticeLabel ?? RULES.event.noticeLabel;
  if (!input.date) errors.date = "Please choose a date.";
  else if (input.date < min) {
    errors.date = `We need at least ${noticeLabel} to prepare an event. The earliest date we can take is ${formatDay(min)}.`;
  } else if (limits.unavailable?.[input.date]) {
    errors.date = limits.unavailable[input.date];
  }

  if (!input.time) errors.time = "Please choose a time.";

  const maxGuests = limits.maxGuests ?? EVENT_GUESTS.max;
  const guests = parseGuests(input.guestCount);
  if (guests === null) errors.guestCount = "Please tell us how many guests.";
  else if (guests < EVENT_GUESTS.min) errors.guestCount = "There must be at least one guest.";
  else if (guests > maxGuests) errors.guestCount = guestLimitMessage(maxGuests);

  if (!input.venue.trim()) errors.venue = "Please tell us where we are coming to.";

  return { ok: Object.keys(errors).length === 0, errors };
}

/**
 * A date as a person reads it: "Friday, 4 September 2026".
 *
 * Every customer-facing date goes through here. A raw 2026-09-04 is a database
 * value, not something to put in front of someone ordering dinner.
 */
export function formatDay(iso: string): string {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(iso)) return iso;
  const d = new Date(iso + "T00:00:00.000Z");
  const weekday = d.toLocaleDateString("en-GB", { weekday: "long", timeZone: "UTC" });
  const rest = d.toLocaleDateString("en-GB", {
    day: "numeric", month: "long", year: "numeric", timeZone: "UTC",
  });
  return `${weekday}, ${rest}`;
}

/** The same date, short, for a list of them: "6 September". */
export function formatDayShort(iso: string): string {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(iso)) return iso;
  return new Date(iso + "T00:00:00.000Z").toLocaleDateString("en-GB", {
    day: "numeric", month: "long", timeZone: "UTC",
  });
}

/** "Mondays", "Mondays and Tuesdays", "Mondays, Tuesdays and Sundays". */
export function weekdayNames(days: number[]): string {
  const names = ["Sundays", "Mondays", "Tuesdays", "Wednesdays", "Thursdays", "Fridays", "Saturdays"];
  const chosen = days.map((d) => names[d]).filter(Boolean);
  if (chosen.length === 0) return "";
  if (chosen.length === 1) return chosen[0];
  return `${chosen.slice(0, -1).join(", ")} and ${chosen[chosen.length - 1]}`;
}

/** "1 order", "3 orders" — a plural that reads like a person wrote it. */
export function plural(n: number, one: string, many = one + "s"): string {
  return `${n} ${n === 1 ? one : many}`;
}

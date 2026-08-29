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

export const GUEST_LIMIT_MESSAGE = `We currently cater events for up to ${EVENT_GUESTS.max} guests.`;

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
 * The single source of truth for whether an event request is valid.
 *
 * Used by the browser AND by the server action, so the 100-guest limit is a
 * real business rule rather than a message on a form.
 */
export function validateEvent(input: {
  eventType: string | null;
  eventTypeOther: string;
  date: string;
  time: string;
  guestCount: string;
  venue: string;
}): EventValidation {
  const errors: Record<string, string> = {};

  if (!input.eventType) errors.eventType = "Please choose the occasion.";
  if (input.eventType === "OTHER" && !input.eventTypeOther.trim()) {
    errors.eventTypeOther = "Please tell us the occasion.";
  }

  const min = toDateInput(earliestEventDate());
  if (!input.date) errors.date = "Please choose a date.";
  else if (input.date < min) {
    errors.date = `We need at least ${RULES.event.noticeLabel} to prepare an event. The earliest date we can take is ${min}.`;
  }

  if (!input.time) errors.time = "Please choose a time.";

  const guests = parseGuests(input.guestCount);
  if (guests === null) errors.guestCount = "Please tell us how many guests.";
  else if (guests < EVENT_GUESTS.min) errors.guestCount = "There must be at least one guest.";
  else if (guests > EVENT_GUESTS.max) errors.guestCount = GUEST_LIMIT_MESSAGE;

  if (!input.venue.trim()) errors.venue = "Please tell us where we are coming to.";

  return { ok: Object.keys(errors).length === 0, errors };
}

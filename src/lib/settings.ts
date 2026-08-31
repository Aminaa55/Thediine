import { cache } from "react";
import { db } from "./db";
import { RULES, EVENT_GUESTS } from "./ordering";
import type { ServingSetup } from "./checkout";

/**
 * The business's own rules, read from the database.
 *
 * Everything here is editable from admin. The constants in `ordering.ts` are
 * kept only as the fallback for a key that has never been written — they are
 * what the business already told us, not an invention.
 *
 * Nothing in this file writes an order. Orders snapshot what they need at the
 * moment they are placed — the fee they were charged, the price of each dish,
 * the cancellation charge that was worked out — so changing a rule here never
 * reaches backwards into an order that already exists.
 */

export type Cancellation = {
  normalFreeHours: number;
  eventFreeHours: number;
  latePercent: number;
  customerSelfCancel: boolean;
};

export type BusinessRules = {
  normalNoticeHours: number;
  normalNoticeLabel: string;
  dailyCapacity: number;
  pickupCountsTowardCapacity: boolean;
  pickupEnabled: boolean;
  /** Piastres. 0 means there is no minimum, which is what the business said. */
  minimumOrder: number;
  /** "HH:mm", or null while the business has not decided one. */
  cutoffTime: string | null;
  eventNoticeDays: number;
  eventNoticeLabel: string;
  maxGuests: number;
  /** Days of the week orders can be taken, 0 = Sunday. Empty means every day. */
  workingDays: number[];
  servingSetups: ServingSetup[];
  cancellation: Cancellation;
};

export const getSettings = cache(async (): Promise<Record<string, string>> => {
  const rows = await db.setting.findMany();
  return Object.fromEntries(rows.map((r) => [r.key, r.value]));
});

/** A number, or the fallback when the value is missing, empty or nonsense. */
export function num(s: Record<string, string>, key: string, fallback: number): number {
  const raw = (s[key] ?? "").trim();
  if (raw === "") return fallback;
  const n = Number(raw);
  return Number.isFinite(n) && n >= 0 ? n : fallback;
}

/** A switch. Anything but the literal "false" is on, so a typo cannot close the shop. */
export function on(s: Record<string, string>, key: string, fallback = true): boolean {
  const raw = (s[key] ?? "").trim();
  if (raw === "") return fallback;
  return raw !== "false";
}

/**
 * Said in hours, always.
 *
 * The business's own words are "48 hours' notice", and the customer site says
 * exactly that. Admin also shows what it is in days, but as a hint beside the
 * field rather than instead of the number.
 */
export function hoursLabel(hours: number): string {
  return hours === 1 ? "1 hour" : `${hours} hours`;
}

export function daysLabel(days: number): string {
  return days === 1 ? "1 day" : `${days} days`;
}

export function parseWorkingDays(raw: string | undefined): number[] {
  if (raw === undefined || raw.trim() === "") return [0, 1, 2, 3, 4, 5, 6];
  const days = raw
    .split(",")
    .map((d) => Number(d.trim()))
    .filter((d) => Number.isInteger(d) && d >= 0 && d <= 6);
  return [...new Set(days)].sort((a, b) => a - b);
}

export function rulesFrom(s: Record<string, string>): BusinessRules {
  const noticeHours = num(s, "normal_notice_hours", RULES.normal.noticeHours);
  const eventDays = num(s, "event_notice_days", RULES.event.noticeDays);
  const setups: ServingSetup[] = [];
  if (on(s, "serving_returnable_enabled")) setups.push("RETURNABLE");
  if (on(s, "serving_disposable_enabled")) setups.push("DISPOSABLE");

  return {
    normalNoticeHours: noticeHours,
    normalNoticeLabel: hoursLabel(noticeHours),
    dailyCapacity: num(s, "normal_daily_capacity", RULES.normal.dailyCapacity),
    pickupCountsTowardCapacity: on(s, "pickup_counts_toward_capacity"),
    pickupEnabled: on(s, "pickup_enabled"),
    minimumOrder: num(s, "minimum_order_value_piastres", 0),
    cutoffTime: (s.normal_cutoff_time ?? "").trim() || null,
    eventNoticeDays: eventDays,
    eventNoticeLabel: daysLabel(eventDays),
    maxGuests: num(s, "event_max_guests", EVENT_GUESTS.max),
    workingDays: parseWorkingDays(s.working_days),
    // Never empty: a customer must be able to choose something.
    servingSetups: setups.length > 0 ? setups : ["DISPOSABLE"],
    cancellation: {
      normalFreeHours: num(s, "normal_free_cancellation_hours", 24),
      eventFreeHours: num(s, "event_free_cancellation_hours", 48),
      latePercent: num(s, "late_cancellation_percent", 20),
      customerSelfCancel: on(s, "customer_self_cancel_enabled", false),
    },
  };
}

export const getRules = cache(async (): Promise<BusinessRules> => rulesFrom(await getSettings()));

/** What the site shows customers when it needs to point at the business. */
export type Contact = { whatsapp: string; instagram: string; email: string };

export const getContact = cache(async (): Promise<Contact> => {
  const s = await getSettings();
  return {
    whatsapp: (s.whatsapp_number ?? "").trim(),
    instagram: (s.contact_instagram ?? "").trim(),
    email: (s.contact_email ?? "").trim(),
  };
});

/** The earliest date a normal order can be for, under the business's own notice. */
export function earliestNormalFrom(rules: BusinessRules, now = new Date()): Date {
  const d = new Date(now);
  d.setHours(d.getHours() + rules.normalNoticeHours);
  d.setHours(0, 0, 0, 0);
  return d;
}

export function earliestEventFrom(rules: BusinessRules, now = new Date()): Date {
  const d = new Date(now);
  d.setDate(d.getDate() + rules.eventNoticeDays);
  d.setHours(0, 0, 0, 0);
  return d;
}

export const DAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

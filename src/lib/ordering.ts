/**
 * Ordering rules, in one place.
 *
 * These mirror the `Setting` rows the admin can edit; they are the defaults the
 * interface falls back to. Notice periods are shown CONTEXTUALLY — never both at
 * once, and never on the homepage — and are enforced by the date pickers, not
 * merely displayed.
 */

export const RULES = {
  normal: {
    noticeHours: 48,
    noticeLabel: "48 hours",
    dailyCapacity: 3,
  },
  event: {
    noticeDays: 5,
    noticeLabel: "5 days",
  },
} as const;

/** Earliest date a normal order can be delivered or collected. */
export function earliestNormalDate(now = new Date()): Date {
  const d = new Date(now);
  d.setHours(d.getHours() + RULES.normal.noticeHours);
  d.setHours(0, 0, 0, 0);
  return d;
}

/** Earliest date an event can be held. */
export function earliestEventDate(now = new Date()): Date {
  const d = new Date(now);
  d.setDate(d.getDate() + RULES.event.noticeDays);
  d.setHours(0, 0, 0, 0);
  return d;
}

export function toDateInput(d: Date): string {
  return d.toISOString().slice(0, 10);
}

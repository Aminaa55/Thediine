import { db } from "./db";
import { getSettings, rulesFrom, DAY_NAMES } from "./settings";

/**
 * Settings, as admin sees them.
 *
 * Two things matter here more than anything else. First, a value nobody has
 * decided is shown as undecided — never filled in with something plausible.
 * Second, nothing on these pages reaches backwards: an order keeps the fee, the
 * prices and the cancellation charge it was placed under, so changing a rule
 * today changes tomorrow's orders and no others.
 */

export type Undecided = {
  key: string;
  title: string;
  detail: string;
  where: string;
};

export async function getSettingsMap() {
  return getSettings();
}

export async function getAreas() {
  return db.deliveryArea.findMany({
    orderBy: { sortOrder: "asc" },
    include: { _count: { select: { addresses: true } } },
  });
}

export async function getSlots() {
  return db.timeSlot.findMany({
    orderBy: { sortOrder: "asc" },
    include: { _count: { select: { orders: true } } },
  });
}

/** Today onwards: a closed day is only interesting while it is still ahead. */
export async function getBlockedDates() {
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);
  return db.dateAvailability.findMany({
    where: { date: { gte: today } },
    orderBy: { date: "asc" },
    include: {
      blockedByOrder: {
        select: { id: true, orderNumber: true, customerName: true },
      },
    },
  });
}

/**
 * The weeks ahead, as the calendar shows them: what is closed, what an event
 * holds, what a day's own capacity is, and how many orders it already has.
 */
export async function getCalendarDays() {
  const start = new Date();
  start.setUTCHours(0, 0, 0, 0);
  start.setUTCDate(start.getUTCDate() - start.getUTCDay());
  const until = new Date(start);
  until.setUTCDate(until.getUTCDate() + 42);

  const [overrides, counts] = await Promise.all([
    db.dateAvailability.findMany({
      where: { date: { gte: start, lte: until } },
      include: { blockedByOrder: { select: { id: true, orderNumber: true } } },
    }),
    db.order.groupBy({
      by: ["deliveryDate"],
      where: { status: { not: "CANCELLED" }, deliveryDate: { gte: start, lte: until } },
      _count: { _all: true },
    }),
  ]);

  const takenBy = new Map(
    counts.map((c) => [c.deliveryDate.toISOString().slice(0, 10), c._count._all]),
  );

  return overrides
    .map((o) => {
      const date = o.date.toISOString().slice(0, 10);
      return {
        date,
        closed: o.isClosed,
        maxOrders: o.maxOrders,
        note: o.note,
        eventOrderId: o.blockedByOrder?.id ?? null,
        eventOrderNumber: o.blockedByOrder?.orderNumber ?? null,
        taken: takenBy.get(date) ?? 0,
      };
    })
    .concat(
      [...takenBy.entries()]
        .filter(([d]) => !overrides.some((o) => o.date.toISOString().slice(0, 10) === d))
        .map(([date, taken]) => ({
          date, closed: false, maxOrders: null, note: null,
          eventOrderId: null, eventOrderNumber: null, taken,
        })),
    );
}

/**
 * Every date closed from today onwards, however far ahead.
 *
 * The calendar grid only reaches six weeks; a holiday closed for next spring
 * would otherwise be invisible the moment it scrolled out of view. Weekly days
 * off are NOT here — those are a pattern, not dates, and they are edited as a
 * pattern above.
 */
export async function getClosedDates() {
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);

  const rows = await db.dateAvailability.findMany({
    where: { isClosed: true, date: { gte: today } },
    include: { blockedByOrder: { select: { id: true, orderNumber: true } } },
    orderBy: { date: "asc" },
  });

  return rows.map((o) => ({
    date: o.date.toISOString().slice(0, 10),
    note: o.note,
    eventOrderId: o.blockedByOrder?.id ?? null,
    eventOrderNumber: o.blockedByOrder?.orderNumber ?? null,
  }));
}

export async function getSharedLadder() {
  return db.eventPriceTier.findMany({ orderBy: { minGuests: "asc" } });
}

export function workingDaysText(days: number[]): string {
  if (days.length === 7) return "Every day";
  if (days.length === 0) return "No days — nothing can be ordered";
  return days.map((d) => DAY_NAMES[d].slice(0, 3)).join(", ");
}

/**
 * What still needs a decision from the business.
 *
 * Each of these is something we have deliberately not chosen on their behalf.
 * They are listed rather than defaulted.
 */
export async function undecided(): Promise<Undecided[]> {
  const [s, areas] = await Promise.all([getSettings(), getAreas()]);
  const out: Undecided[] = [];

  if (areas.length === 0) {
    out.push({
      key: "areas",
      title: "Delivery areas and fees",
      detail:
        "No areas set up, so delivery cannot be chosen at checkout — customers can only pick up.",
      where: "/admin/settings/delivery",
    });
  }
  if (!(s.order_time_from ?? "").trim() || !(s.order_time_until ?? "").trim()) {
    out.push({
      key: "hours",
      title: "The hours orders go out in",
      detail: "Not set, so a customer can ask for any time of day.",
      where: "/admin/settings/delivery",
    });
  }
  if (!(s.serving_setup_policy_en ?? "").trim()) {
    out.push({
      key: "returnable",
      title: "The returnable-dish policy",
      detail: "Customers can choose returnable dishes but are told nothing about returning them.",
      where: "/admin/settings/serving",
    });
  }
  if (!(s.contact_email ?? "").trim()) {
    out.push({
      key: "email",
      title: "A contact email address",
      detail: "None supplied, so the site shows WhatsApp and Instagram only.",
      where: "/admin/settings/business",
    });
  }

  return out;
}

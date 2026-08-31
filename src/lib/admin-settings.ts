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
  const [s, areas, slots] = await Promise.all([getSettings(), getAreas(), getSlots()]);
  const out: Undecided[] = [];

  if (areas.length === 0) {
    out.push({
      key: "areas",
      title: "Delivery areas and fees",
      detail:
        "No areas have been set up, so an order records its delivery fee as unknown rather than as zero, and the customer is not shown a fee.",
      where: "/admin/settings/delivery",
    });
  }
  if (slots.length === 0) {
    out.push({
      key: "slots",
      title: "Delivery and pickup times",
      detail:
        "No time slots exist, so the customer types a time of their own instead of choosing one of yours.",
      where: "/admin/settings/delivery",
    });
  }
  if (!(s.normal_cutoff_time ?? "").trim()) {
    out.push({
      key: "cutoff",
      title: "A daily cut-off time",
      detail:
        "Nothing is set, so only the notice period decides which dates can be chosen. Say what a cut-off should mean and it can be added.",
      where: "/admin/settings/ordering",
    });
  }
  if (!(s.serving_setup_policy_en ?? "").trim()) {
    out.push({
      key: "returnable",
      title: "The returnable-dish policy",
      detail:
        "Customers can choose returnable dishes, but nothing tells them how or when to return them. No deposit, return period or fee has been invented.",
      where: "/admin/settings/serving",
    });
  }
  if (!(s.contact_email ?? "").trim()) {
    out.push({
      key: "email",
      title: "A contact email address",
      detail: "None supplied, so the site shows WhatsApp and Instagram only.",
      where: "/admin/settings/contact",
    });
  }

  return out;
}

/** The one-line summary each section shows on the Settings page. */
export async function sectionSummaries() {
  const [s, areas, slots, blocked] = await Promise.all([
    getSettings(), getAreas(), getSlots(), getBlockedDates(),
  ]);
  const rules = rulesFrom(s);
  const activeAreas = areas.filter((a) => a.isActive).length;
  const activeSlots = slots.filter((t) => t.isActive).length;
  const closures = blocked.filter((b) => b.isClosed).length;

  return {
    ordering: `${rules.normalNoticeLabel} notice, ${rules.dailyCapacity} orders a day`,
    delivery:
      areas.length === 0
        ? "No areas set up yet"
        : `${activeAreas} of ${areas.length} areas, ${activeSlots} of ${slots.length} times`,
    calendar: `${workingDaysText(rules.workingDays)}${closures > 0 ? ` · ${closures} day${closures === 1 ? "" : "s"} closed ahead` : ""}`,
    events: `${rules.eventNoticeLabel} notice, up to ${rules.maxGuests} guests`,
    payment: (() => {
      const on: string[] = [];
      if ((s.payment_cash_enabled ?? "true") !== "false") on.push("Cash");
      if ((s.payment_instapay_enabled ?? "true") !== "false") on.push("InstaPay");
      return on.length ? on.join(" and ") : "No payment method is on";
    })(),
    serving: rules.servingSetups
      .map((x) => (x === "RETURNABLE" ? "Returnable" : "Disposable"))
      .join(" and "),
    contact: (s.whatsapp_number ?? "").trim() || "No WhatsApp number",
  };
}

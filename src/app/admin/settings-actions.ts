"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { currentAdmin } from "@/lib/admin-auth";
import { poundsToPiastres } from "@/lib/money";
import { MULTIPLIER_SCALE } from "@/lib/event-pricing";

/**
 * Changing the business's own rules.
 *
 * Everything here is checked on the server, because a setting is a rule and a
 * form is only a form. Two things are true of all of it:
 *
 * Nothing written here touches an order. An order snapshots the fee it was
 * charged, the price of every dish and the cancellation charge it was given, so
 * a fee changed today leaves yesterday's orders exactly as they were.
 *
 * Nothing invents a value. A field left empty is stored empty and stays listed
 * as undecided; it is never quietly filled in with something plausible.
 */

export type SaveResult = { ok: boolean; error?: string };

async function requireAdmin() {
  const admin = await currentAdmin();
  if (!admin) throw new Error("Not signed in.");
  return admin;
}

function refresh() {
  revalidatePath("/admin/settings", "layout");
  // The customer site reads the same rows: the notice it states, the areas it
  // offers, the number it says to transfer to.
  revalidatePath("/", "layout");
}

// ------------------------------------------------------------- the settings

/**
 * The only keys admin may write, and how each is checked.
 *
 * A key that is not here cannot be set from the interface at all.
 */
type Check = (raw: string) => string | null;

const asWholeNumber =
  (min: number, max: number, what: string): Check =>
  (raw) => {
    const n = Number(raw.trim());
    if (!Number.isInteger(n) || n < min || n > max) {
      return `${what} must be a whole number between ${min} and ${max}.`;
    }
    return null;
  };

const asMoney: Check = (raw) => {
  if (raw.trim() === "") return null;
  const n = Number(raw.replace(/,/g, "").trim());
  return Number.isFinite(n) && n >= 0 ? null : "That is not an amount in EGP.";
};

const asSwitch: Check = (raw) =>
  raw === "true" || raw === "false" ? null : "That switch can only be on or off.";

const anyText: Check = () => null;

const asTimeOrEmpty: Check = (raw) =>
  raw.trim() === "" || /^([01]\d|2[0-3]):[0-5]\d$/.test(raw.trim())
    ? null
    : "A time looks like 18:00.";

const asDays: Check = (raw) => {
  if (raw.trim() === "") return "Choose at least one working day.";
  const days = raw.split(",").map((d) => Number(d.trim()));
  if (days.some((d) => !Number.isInteger(d) || d < 0 || d > 6)) return "That is not a day of the week.";
  return null;
};

const EDITABLE: Record<string, Check> = {
  // Ordering
  normal_notice_hours: asWholeNumber(0, 720, "The notice period"),
  normal_daily_capacity: asWholeNumber(1, 50, "The daily capacity"),
  pickup_counts_toward_capacity: asSwitch,
  normal_cutoff_time: asTimeOrEmpty,
  minimum_order_value_piastres: asMoney,
  normal_free_cancellation_hours: asWholeNumber(0, 720, "The free cancellation window"),
  event_free_cancellation_hours: asWholeNumber(0, 2160, "The free cancellation window"),
  late_cancellation_percent: asWholeNumber(0, 100, "The late-cancellation charge"),
  customer_self_cancel_enabled: asSwitch,

  // Delivery and pickup
  pickup_enabled: asSwitch,

  // Calendar
  working_days: asDays,

  // Events
  event_notice_days: asWholeNumber(0, 365, "The event notice period"),
  event_max_guests: asWholeNumber(1, 1000, "The maximum guest count"),
  event_default_capacity_mode: (raw) =>
    raw === "BLOCK_DAY" || raw === "KEEP_DAY_OPEN" ? null : "That is not a capacity choice.",

  // Payment
  payment_cash_enabled: asSwitch,
  payment_instapay_enabled: asSwitch,
  instapay_number: anyText,
  instapay_account_details: anyText,

  // Serving setup
  serving_returnable_enabled: asSwitch,
  serving_disposable_enabled: asSwitch,
  serving_setup_policy_en: anyText,
  returnable_deposit_piastres: asMoney,
  returnable_return_days: (raw) =>
    raw.trim() === "" || /^\d{1,3}$/.test(raw.trim()) ? null : "That is not a number of days.",
  returnable_late_fee_piastres: asMoney,

  // Contact
  whatsapp_number: anyText,
  contact_instagram: anyText,
  contact_email: (raw) =>
    raw.trim() === "" || /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(raw.trim())
      ? null
      : "That does not look like an email address.",
};

/** Money fields are typed in pounds and stored in piastres, like every price. */
const IN_POUNDS = new Set([
  "minimum_order_value_piastres",
  "returnable_deposit_piastres",
  "returnable_late_fee_piastres",
]);

export async function saveSettings(patch: Record<string, string>): Promise<SaveResult> {
  await requireAdmin();

  const writes: { key: string; value: string }[] = [];

  for (const [key, raw] of Object.entries(patch)) {
    const check = EDITABLE[key];
    if (!check) return { ok: false, error: "That setting cannot be changed here." };
    const problem = check(raw);
    if (problem) return { ok: false, error: problem };

    let value = raw.trim();
    if (IN_POUNDS.has(key)) {
      value = value === "" ? "" : String(poundsToPiastres(Number(value.replace(/,/g, ""))));
    }
    writes.push({ key, value });
  }

  // At least one way to pay, and at least one way to be served, must remain.
  const guard = await guardPairs(writes);
  if (guard) return { ok: false, error: guard };

  await db.$transaction(
    writes.map((w) =>
      db.setting.upsert({ where: { key: w.key }, update: { value: w.value }, create: w }),
    ),
  );
  refresh();
  return { ok: true };
}

/** Some settings only make sense in pairs: both cannot be off at once. */
async function guardPairs(writes: { key: string; value: string }[]): Promise<string | null> {
  const pairs: [string, string, string][] = [
    ["payment_cash_enabled", "payment_instapay_enabled",
     "Customers need at least one way to pay. Turn the other one on first."],
    ["serving_returnable_enabled", "serving_disposable_enabled",
     "Customers need at least one way to be served. Turn the other one on first."],
  ];

  for (const [a, b, message] of pairs) {
    const touching = writes.find((w) => w.key === a || w.key === b);
    if (!touching) continue;
    const other = touching.key === a ? b : a;
    const otherRow = await db.setting.findUnique({ where: { key: other } });
    const otherOn = (otherRow?.value ?? "true") !== "false";
    const alsoWriting = writes.find((w) => w.key === other);
    const otherFinal = alsoWriting ? alsoWriting.value !== "false" : otherOn;
    if (touching.value === "false" && !otherFinal) return message;
  }
  return null;
}

// ------------------------------------------------------------ delivery areas

export async function saveArea(
  id: string | null,
  nameEn: string,
  feeInPounds: string,
): Promise<SaveResult> {
  await requireAdmin();
  const name = nameEn.trim();
  if (!name) return { ok: false, error: "An area needs a name." };

  const clean = feeInPounds.replace(/,/g, "").trim();
  const n = Number(clean);
  if (clean === "" || !Number.isFinite(n) || n < 0) {
    return { ok: false, error: "Give the delivery fee for this area, in EGP." };
  }
  const fee = poundsToPiastres(n);

  if (id) {
    await db.deliveryArea.update({ where: { id }, data: { nameEn: name, fee } });
  } else {
    const last = await db.deliveryArea.findFirst({ orderBy: { sortOrder: "desc" } });
    await db.deliveryArea.create({
      data: { nameEn: name, fee, sortOrder: (last?.sortOrder ?? -1) + 1 },
    });
  }
  refresh();
  return { ok: true };
}

export async function setAreaActive(id: string, active: boolean): Promise<SaveResult> {
  await requireAdmin();
  await db.deliveryArea.update({ where: { id }, data: { isActive: active } });
  refresh();
  return { ok: true };
}

/**
 * An area is only removed while nothing points at it. Otherwise it is switched
 * off, which stops it being offered without touching the addresses that used it.
 */
export async function removeArea(id: string): Promise<SaveResult> {
  await requireAdmin();
  const area = await db.deliveryArea.findUnique({
    where: { id },
    include: { _count: { select: { addresses: true } } },
  });
  if (!area) return { ok: false, error: "That area no longer exists." };
  if (area._count.addresses > 0) {
    return {
      ok: false,
      error: `${area.nameEn} is on a saved address, so it cannot be removed. Switch it off instead.`,
    };
  }
  await db.deliveryArea.delete({ where: { id } });
  refresh();
  return { ok: true };
}

export async function moveArea(id: string, direction: "up" | "down"): Promise<SaveResult> {
  await requireAdmin();
  const all = await db.deliveryArea.findMany({ orderBy: { sortOrder: "asc" } });
  const at = all.findIndex((a) => a.id === id);
  const to = at + (direction === "up" ? -1 : 1);
  if (at < 0 || to < 0 || to >= all.length) return { ok: true };
  await db.$transaction([
    db.deliveryArea.update({ where: { id: all[at].id }, data: { sortOrder: all[to].sortOrder } }),
    db.deliveryArea.update({ where: { id: all[to].id }, data: { sortOrder: all[at].sortOrder } }),
  ]);
  refresh();
  return { ok: true };
}

// --------------------------------------------------------------- time slots

export async function saveSlot(
  id: string | null,
  labelEn: string,
  startTime: string,
  endTime: string,
): Promise<SaveResult> {
  await requireAdmin();
  const label = labelEn.trim();
  const start = startTime.trim();
  const end = endTime.trim();
  const time = /^([01]\d|2[0-3]):[0-5]\d$/;

  if (!label) return { ok: false, error: "A time needs a name, such as Evening." };
  if (!time.test(start) || !time.test(end)) return { ok: false, error: "A time looks like 18:00." };
  if (end <= start) return { ok: false, error: "The end has to be after the start." };

  if (id) {
    await db.timeSlot.update({ where: { id }, data: { labelEn: label, startTime: start, endTime: end } });
  } else {
    const last = await db.timeSlot.findFirst({ orderBy: { sortOrder: "desc" } });
    await db.timeSlot.create({
      data: { labelEn: label, startTime: start, endTime: end, sortOrder: (last?.sortOrder ?? -1) + 1 },
    });
  }
  refresh();
  return { ok: true };
}

export async function setSlotActive(id: string, active: boolean): Promise<SaveResult> {
  await requireAdmin();
  await db.timeSlot.update({ where: { id }, data: { isActive: active } });
  refresh();
  return { ok: true };
}

/** A slot an order was placed for is never deleted — the order points at it. */
export async function removeSlot(id: string): Promise<SaveResult> {
  await requireAdmin();
  const slot = await db.timeSlot.findUnique({
    where: { id },
    include: { _count: { select: { orders: true } } },
  });
  if (!slot) return { ok: false, error: "That time no longer exists." };
  if (slot._count.orders > 0) {
    return {
      ok: false,
      error: `${slot.labelEn} is on ${slot._count.orders} order${slot._count.orders === 1 ? "" : "s"}, so it cannot be removed. Switch it off instead.`,
    };
  }
  await db.timeSlot.delete({ where: { id } });
  refresh();
  return { ok: true };
}

export async function moveSlot(id: string, direction: "up" | "down"): Promise<SaveResult> {
  await requireAdmin();
  const all = await db.timeSlot.findMany({ orderBy: { sortOrder: "asc" } });
  const at = all.findIndex((t) => t.id === id);
  const to = at + (direction === "up" ? -1 : 1);
  if (at < 0 || to < 0 || to >= all.length) return { ok: true };
  await db.$transaction([
    db.timeSlot.update({ where: { id: all[at].id }, data: { sortOrder: all[to].sortOrder } }),
    db.timeSlot.update({ where: { id: all[to].id }, data: { sortOrder: all[at].sortOrder } }),
  ]);
  refresh();
  return { ok: true };
}

// ------------------------------------------------------------- the calendar

function asDate(raw: string): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(raw)) return null;
  const d = new Date(raw + "T00:00:00.000Z");
  return Number.isNaN(d.getTime()) ? null : d;
}

/** Close a day by hand, for anything the system cannot know about. */
export async function blockDate(date: string, note: string): Promise<SaveResult> {
  await requireAdmin();
  const day = asDate(date);
  if (!day) return { ok: false, error: "Choose a date." };

  await db.dateAvailability.upsert({
    where: { date: day },
    update: { isClosed: true, note: note.trim() || null },
    create: { date: day, isClosed: true, note: note.trim() || null },
  });
  refresh();
  return { ok: true };
}

/**
 * Re-open a day.
 *
 * A day an event is booked on is not re-opened from here: the event decides
 * that, and unpicking it silently would let normal orders onto a day the
 * kitchen has already given away.
 */
export async function unblockDate(date: string): Promise<SaveResult> {
  await requireAdmin();
  const day = asDate(date);
  if (!day) return { ok: false, error: "Choose a date." };

  const row = await db.dateAvailability.findUnique({
    where: { date: day },
    include: { blockedByOrder: { select: { orderNumber: true } } },
  });
  if (!row) return { ok: true };
  if (row.blockedByOrderId) {
    return {
      ok: false,
      error: `That day is held by event ${row.blockedByOrder?.orderNumber ?? ""}. Change it on the event itself.`,
    };
  }
  await db.dateAvailability.delete({ where: { date: day } });
  refresh();
  return { ok: true };
}

/** A different number of orders for one day only. Empty clears the override. */
export async function setDateCapacity(date: string, maxOrders: string): Promise<SaveResult> {
  await requireAdmin();
  const day = asDate(date);
  if (!day) return { ok: false, error: "Choose a date." };

  const raw = maxOrders.trim();
  let max: number | null = null;
  if (raw !== "") {
    const n = Number(raw);
    if (!Number.isInteger(n) || n < 0 || n > 50) {
      return { ok: false, error: "A day's capacity is a whole number up to 50." };
    }
    max = n;
  }

  const existing = await db.dateAvailability.findUnique({ where: { date: day } });
  if (!existing && max === null) return { ok: true };
  await db.dateAvailability.upsert({
    where: { date: day },
    update: { maxOrders: max },
    create: { date: day, maxOrders: max },
  });
  refresh();
  return { ok: true };
}

// ------------------------------------------------- the shared event ladder

export type LadderRow = { minGuests: string; maxGuests: string; multiplier: string };

/**
 * The ladder every dish inherits unless it has bands of its own.
 *
 * Changing it changes what a future event is quoted. It cannot change a past
 * one: an event order stores the multiplier it was priced at and the price of
 * every dish on it.
 */
export async function saveSharedLadder(rows: LadderRow[]): Promise<SaveResult> {
  await requireAdmin();

  const parsed = rows.map((r) => ({
    minGuests: Number(r.minGuests),
    maxGuests: Number(r.maxGuests),
    multiplierBp: Math.round(Number(r.multiplier) * MULTIPLIER_SCALE),
  }));

  if (parsed.length === 0) return { ok: false, error: "The ladder needs at least one band." };

  for (const t of parsed) {
    if (!Number.isInteger(t.minGuests) || !Number.isInteger(t.maxGuests) || t.minGuests < 1) {
      return { ok: false, error: "Each band needs a guest count to run from and to." };
    }
    if (t.maxGuests < t.minGuests) return { ok: false, error: "A band cannot end before it starts." };
    if (!Number.isFinite(t.multiplierBp) || t.multiplierBp <= 0) {
      return { ok: false, error: "Each band needs a multiplier, such as 1.5." };
    }
  }

  const sorted = [...parsed].sort((a, b) => a.minGuests - b.minGuests);
  for (let i = 1; i < sorted.length; i++) {
    if (sorted[i].minGuests <= sorted[i - 1].maxGuests) {
      return { ok: false, error: "Those bands overlap. Every guest count can only fall in one band." };
    }
  }

  await db.$transaction([
    db.eventPriceTier.deleteMany({}),
    db.eventPriceTier.createMany({ data: sorted }),
  ]);
  refresh();
  return { ok: true };
}

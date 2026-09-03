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
  minimum_order_value_piastres: asMoney,
  normal_free_cancellation_hours: asWholeNumber(0, 720, "The free cancellation window"),
  event_free_cancellation_hours: asWholeNumber(0, 2160, "The free cancellation window"),
  late_cancellation_percent: asWholeNumber(0, 100, "The late-cancellation charge"),
  customer_self_cancel_enabled: asSwitch,

  // Delivery and pickup
  pickup_enabled: asSwitch,
  order_time_from: asTimeOrEmpty,
  order_time_until: asTimeOrEmpty,

  // Calendar
  working_days: asDays,

  // Events
  event_notice_days: asWholeNumber(0, 365, "The event notice period"),
  event_max_guests: asWholeNumber(1, 1000, "The maximum guest count"),
  event_default_capacity_mode: (raw) =>
    raw === "BLOCK_DAY" || raw === "KEEP_DAY_OPEN" ? null : "That is not a capacity choice.",

  // Payment
  instapay_number: anyText,
  instapay_account_details: anyText,

  // Serving setup
  serving_setup_policy_en: anyText,

  // Events
  event_ladder_reference_piastres: asMoney,

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
  "event_ladder_reference_piastres",
]);

export async function saveSettings(patch: Record<string, string>): Promise<SaveResult> {
  await requireAdmin();

  // The hours orders go out in are one decision, so they are checked together.
  const from = (patch.order_time_from ?? "").trim();
  const until = (patch.order_time_until ?? "").trim();
  if ("order_time_from" in patch || "order_time_until" in patch) {
    if ((from === "") !== (until === "")) {
      return { ok: false, error: "Give both a start and an end, or leave both empty." };
    }
    if (from !== "" && until <= from) {
      return { ok: false, error: "The end has to be after the start." };
    }
  }

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

  await db.$transaction(
    writes.map((w) =>
      db.setting.upsert({ where: { key: w.key }, update: { value: w.value }, create: w }),
    ),
  );
  refresh();
  return { ok: true };
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

/** The longest stretch that can be closed in one go, so a slip cannot shut a year. */
const MAX_RANGE_DAYS = 92;

/**
 * Close every day from one date to another, inclusive.
 *
 * The same closure a single day gets — this only saves clicking fourteen days
 * one at a time. A day already held by a confirmed event is left alone and
 * reported back, because the event owns that date, not this.
 */
export async function blockDateRange(from: string, to: string, note: string): Promise<SaveResult> {
  await requireAdmin();
  const first = asDate(from);
  const last = asDate(to || from);
  if (!first || !last) return { ok: false, error: "Choose both dates." };
  if (last < first) return { ok: false, error: "The last day cannot be before the first." };

  const span = Math.round((last.getTime() - first.getTime()) / 86_400_000) + 1;
  if (span > MAX_RANGE_DAYS) {
    return { ok: false, error: `That is ${span} days. Close up to ${MAX_RANGE_DAYS} at a time.` };
  }

  const dates: Date[] = [];
  for (let i = 0; i < span; i++) {
    const d = new Date(first);
    d.setUTCDate(d.getUTCDate() + i);
    dates.push(d);
  }

  // A day an event holds is skipped rather than overwritten: the event decides
  // that date, and its note must survive.
  const held = new Set(
    (await db.dateAvailability.findMany({
      where: { date: { in: dates }, blockedByOrderId: { not: null } },
      select: { date: true },
    })).map((r) => r.date.toISOString().slice(0, 10)),
  );

  const trimmed = note.trim() || null;
  let closed = 0;
  for (const day of dates) {
    if (held.has(day.toISOString().slice(0, 10))) continue;
    await db.dateAvailability.upsert({
      where: { date: day },
      update: { isClosed: true, note: trimmed },
      create: { date: day, isClosed: true, note: trimmed },
    });
    closed++;
  }

  refresh();
  if (closed === 0) {
    return { ok: false, error: "Every day in that range is already held by an event." };
  }
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

/**
 * A band as the business types it: a guest range and a price in EGP.
 *
 * The price is what a dish that normally costs `referenceInPounds` should cost
 * for that many guests. That is the only way one shared ladder can price 72
 * dishes at different prices: the ratio is what scales, so it is stored as a
 * multiplier and nobody has to think in multipliers to set it.
 */
export type LadderRow = { minGuests: string; maxGuests: string; price: string };

/**
 * The ladder every dish inherits unless it has bands of its own.
 *
 * Changing it changes what a future event is quoted. It cannot change a past
 * one: an event order stores the multiplier it was priced at and the price of
 * every dish on it.
 */
export async function saveSharedLadder(
  rows: LadderRow[],
  referenceInPounds: string,
): Promise<SaveResult> {
  await requireAdmin();

  const reference = Number(referenceInPounds.replace(/,/g, "").trim());
  if (!Number.isFinite(reference) || reference <= 0) {
    return { ok: false, error: "Give the price of a dish to work the ladder out from." };
  }

  const parsed = rows.map((r) => {
    const price = Number(r.price.replace(/,/g, "").trim());
    return {
      minGuests: Number(r.minGuests),
      maxGuests: Number(r.maxGuests),
      // The ratio between the two prices, held as an integer.
      multiplierBp: Math.round((price / reference) * MULTIPLIER_SCALE),
      price,
    };
  });

  if (parsed.length === 0) return { ok: false, error: "The ladder needs at least one band." };

  for (const t of parsed) {
    if (!Number.isInteger(t.minGuests) || !Number.isInteger(t.maxGuests) || t.minGuests < 1) {
      return { ok: false, error: "Each band needs a guest count to run from and to." };
    }
    if (t.maxGuests < t.minGuests) return { ok: false, error: "A band cannot end before it starts." };
    if (!Number.isFinite(t.price) || t.price <= 0) {
      return { ok: false, error: "Each band needs a price in EGP." };
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
    db.eventPriceTier.createMany({
      data: sorted.map((t) => ({
        minGuests: t.minGuests, maxGuests: t.maxGuests, multiplierBp: t.multiplierBp,
      })),
    }),
    // Remembered so the ladder is read back in the same money it was set in.
    db.setting.upsert({
      where: { key: "event_ladder_reference_piastres" },
      update: { value: String(Math.round(reference * 100)) },
      create: { key: "event_ladder_reference_piastres", value: String(Math.round(reference * 100)) },
    }),
  ]);
  refresh();
  return { ok: true };
}

// ------------------------------------------------------- payment methods

/**
 * How customers may pay.
 *
 * A method the business adds is settled by hand: money arrives outside this
 * system and a person confirms it. An integrated one needs a provider built and
 * connected, so it can be described here but never switched on from here.
 */
export async function savePaymentOption(
  id: string | null,
  input: {
    nameEn: string;
    instructionsEn: string;
    kind: "MANUAL" | "INTEGRATED";
    verifyBeforeDelivery: boolean;
  },
): Promise<SaveResult> {
  await requireAdmin();
  const name = input.nameEn.trim();
  if (!name) return { ok: false, error: "A payment method needs a name." };

  if (id) {
    const existing = await db.paymentOption.findUnique({ where: { id } });
    if (!existing) return { ok: false, error: "That payment method no longer exists." };
    await db.paymentOption.update({
      where: { id },
      data: {
        nameEn: name,
        instructionsEn: input.instructionsEn.trim() || null,
        // A built-in method's kind is decided in code, not here.
        kind: existing.builtIn ? existing.kind : input.kind,
        verifyBeforeDelivery: existing.builtIn === "CASH" ? false : input.verifyBeforeDelivery,
      },
    });
  } else {
    const last = await db.paymentOption.findFirst({ orderBy: { sortOrder: "desc" } });
    await db.paymentOption.create({
      data: {
        nameEn: name,
        instructionsEn: input.instructionsEn.trim() || null,
        kind: input.kind,
        verifyBeforeDelivery: input.kind === "MANUAL" ? input.verifyBeforeDelivery : false,
        // Nothing is offered to a customer the moment it is created.
        isEnabled: false,
        sortOrder: (last?.sortOrder ?? -1) + 1,
      },
    });
  }
  refresh();
  return { ok: true };
}

export async function setPaymentOptionEnabled(id: string, enabled: boolean): Promise<SaveResult> {
  await requireAdmin();
  const option = await db.paymentOption.findUnique({ where: { id } });
  if (!option) return { ok: false, error: "That payment method no longer exists." };

  // An integrated method cannot be offered until a provider is actually wired
  // up. Card is built but paused, and paused means paused.
  if (enabled && option.kind === "INTEGRATED") {
    return {
      ok: false,
      error: `${option.nameEn} needs its provider connected before customers can use it.`,
    };
  }

  if (!enabled) {
    const others = await db.paymentOption.count({
      where: { id: { not: id }, isEnabled: true, kind: "MANUAL" },
    });
    if (others === 0) {
      return { ok: false, error: "Customers need at least one way to pay. Turn another on first." };
    }
  }

  await db.paymentOption.update({ where: { id }, data: { isEnabled: enabled } });
  refresh();
  return { ok: true };
}

/** A built-in method is never deleted; one an order used is never deleted. */
export async function removePaymentOption(id: string): Promise<SaveResult> {
  await requireAdmin();
  const option = await db.paymentOption.findUnique({ where: { id } });
  if (!option) return { ok: true };
  if (option.builtIn) {
    return { ok: false, error: `${option.nameEn} is built in. Switch it off instead.` };
  }
  const used = await db.order.count({ where: { paymentMethodLabel: option.nameEn } });
  if (used > 0) {
    return {
      ok: false,
      error: `${option.nameEn} is on ${used} order${used === 1 ? "" : "s"}. Switch it off instead.`,
    };
  }
  await db.paymentOption.delete({ where: { id } });
  refresh();
  return { ok: true };
}

// -------------------------------------------------------- serving options

export async function saveServingOption(
  id: string | null,
  input: { nameEn: string; descriptionEn: string },
): Promise<SaveResult> {
  await requireAdmin();
  const name = input.nameEn.trim();
  if (!name) return { ok: false, error: "A serving option needs a name." };

  if (id) {
    await db.servingOption.update({
      where: { id },
      data: { nameEn: name, descriptionEn: input.descriptionEn.trim() || null },
    });
  } else {
    const last = await db.servingOption.findFirst({ orderBy: { sortOrder: "desc" } });
    await db.servingOption.create({
      data: {
        nameEn: name,
        descriptionEn: input.descriptionEn.trim() || null,
        isAvailable: true,
        sortOrder: (last?.sortOrder ?? -1) + 1,
      },
    });
  }
  refresh();
  return { ok: true };
}

export async function setServingOptionAvailable(id: string, available: boolean): Promise<SaveResult> {
  await requireAdmin();
  if (!available) {
    const others = await db.servingOption.count({ where: { id: { not: id }, isAvailable: true } });
    if (others === 0) {
      return { ok: false, error: "Customers need at least one way to be served. Turn another on first." };
    }
  }
  await db.servingOption.update({ where: { id }, data: { isAvailable: available } });
  refresh();
  return { ok: true };
}

export async function removeServingOption(id: string): Promise<SaveResult> {
  await requireAdmin();
  const option = await db.servingOption.findUnique({ where: { id } });
  if (!option) return { ok: true };
  if (option.builtIn) {
    return { ok: false, error: `${option.nameEn} is built in. Switch it off instead.` };
  }
  const used = await db.order.count({ where: { servingSetupLabel: option.nameEn } });
  if (used > 0) {
    return {
      ok: false,
      error: `${option.nameEn} is on ${used} order${used === 1 ? "" : "s"}. Switch it off instead.`,
    };
  }
  await db.servingOption.delete({ where: { id } });
  refresh();
  return { ok: true };
}

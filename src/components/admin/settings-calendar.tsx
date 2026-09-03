"use client";

import { useState } from "react";
import Link from "next/link";
import { blockDate, blockDateRange, unblockDate, setDateCapacity } from "@/app/admin/settings-actions";
import { SectionHead, SettingCard, rowInput, useSaver, useSettingsForm } from "./settings-bits";
import { cairoDayKey } from "@/lib/ordering";

const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const SHORT = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

/** One date the kitchen is shut, as the list of closures shows it. */
export type ClosedDate = {
  /** yyyy-mm-dd */
  date: string;
  note: string | null;
  eventOrderId: string | null;
  eventOrderNumber: string | null;
};

export type DayState = {
  /** yyyy-mm-dd */
  date: string;
  closed: boolean;
  /** A capacity for this day only. Null means the usual number. */
  maxOrders: number | null;
  note: string | null;
  eventOrderId: string | null;
  eventOrderNumber: string | null;
  /** How many orders the day already holds. */
  taken: number;
};

/**
 * The calendar.
 *
 * Four cards, in the order they are reached for. The days of the week decide
 * the pattern; everything below them is an exception to it — click one day in
 * the grid, close a stretch of them at once, and read back every date that is
 * shut.
 *
 * The list at the bottom is a view of the same rows the grid draws, not a
 * second copy: both come from DateAvailability, so they cannot drift apart.
 * It exists because the grid only reaches six weeks, and a holiday closed for
 * next spring has to be findable.
 */
export function CalendarSettings({ workingDays, capacity, days, closed }: {
  workingDays: number[];
  capacity: number;
  days: DayState[];
  /** Every date closed from today onwards, however far ahead. */
  closed: ClosedDate[];
}) {
  const week = useSettingsForm({ working_days: workingDays.join(",") });
  const state = useSaver();
  const [selected, setSelected] = useState<string | null>(null);

  const chosen = new Set(
    week.values.working_days.split(",").filter((d) => d !== "").map(Number),
  );
  const toggleWeekday = (d: number) => {
    const next = new Set(chosen);
    if (next.has(d)) next.delete(d); else next.add(d);
    week.set({ working_days: [...next].sort((a, b) => a - b).join(",") });
  };

  const byDate = new Map(days.map((d) => [d.date, d]));

  // Six weeks from the start of this week: enough to plan around, small enough
  // to read at a glance.
  const start = new Date();
  start.setUTCHours(0, 0, 0, 0);
  start.setUTCDate(start.getUTCDate() - start.getUTCDay());
  const cells: DayState[] = [];
  for (let i = 0; i < 42; i++) {
    const d = new Date(start);
    d.setUTCDate(d.getUTCDate() + i);
    const key = d.toISOString().slice(0, 10);
    cells.push(byDate.get(key) ?? {
      date: key, closed: false, maxOrders: null, note: null,
      eventOrderId: null, eventOrderNumber: null, taken: 0,
    });
  }
  // Cairo's today, not the viewer's device or the server's clock.
  const today = cairoDayKey();
  // Every day in the grid can be selected, including one with nothing on it.
  const picked = selected ? cells.find((c) => c.date === selected) ?? null : null;

  return (
    <div className="grid max-w-2xl gap-4">
      <SectionHead title="Calendar & capacity" />

      <SettingCard
        title="The days you work"
        note="A day switched off is closed every week. Use the calendar below for a single date."
        state={week.state}
        onSave={() => week.save()}
      >
        <div className="flex flex-wrap gap-1.5">
          {DAYS.map((name, i) => (
            <button
              key={name} type="button" aria-pressed={chosen.has(i)}
              onClick={() => toggleWeekday(i)}
              className={`rounded-full border px-3.5 py-1.5 text-[13.5px] transition-colors ${
                chosen.has(i)
                  ? "border-[#2E6B45]/45 bg-[#2E6B45]/[0.08] text-[#2E6B45]"
                  : "border-line bg-cream text-ink-faint hover:border-ink/30"
              }`}
            >
              {name}
            </button>
          ))}
        </div>
      </SettingCard>

      <SettingCard
        title="The weeks ahead"
        note={`Click a day to close it, or to cook a different number that day. Usually ${capacity} orders a day.`}
        state={state}
      >
        <div className="grid grid-cols-7 gap-1 text-center">
          {SHORT.map((s) => (
            <span key={s} className="pb-1 text-[11px] uppercase tracking-[0.14em] text-ink-faint">
              {s}
            </span>
          ))}
          {cells.map((c) => {
            const weekday = new Date(c.date + "T00:00:00.000Z").getUTCDay();
            const weeklyOff = !chosen.has(weekday);
            const past = c.date < today;
            const held = c.eventOrderNumber !== null;
            const shut = c.closed || weeklyOff;

            return (
              <button
                key={c.date}
                type="button"
                data-date={c.date}
                aria-label={new Date(c.date + "T00:00:00.000Z").toLocaleDateString("en-GB", {
                  weekday: "long", day: "numeric", month: "long", timeZone: "UTC",
                })}
                disabled={past || state.pending}
                onClick={() => setSelected(selected === c.date ? null : c.date)}
                aria-pressed={selected === c.date}
                className={`rounded-sm border px-1 py-1.5 text-[13px] tabular-nums transition-colors ${
                  selected === c.date ? "border-ink bg-cream-deep" : "border-line-soft"
                } ${
                  past
                    ? "cursor-default bg-cream text-ink-faint/50"
                    : held
                      ? "bg-gold-pale/60 text-ink"
                      : shut
                        ? "bg-[#A6391C]/[0.07] text-[#A6391C]"
                        : "bg-cream-warm text-ink hover:border-gold"
                }`}
              >
                <span className="block">{Number(c.date.slice(8, 10))}</span>
                <span className="block text-[10px] leading-tight">
                  {held ? "event" : shut ? "closed" : c.maxOrders !== null ? `max ${c.maxOrders}` : ""}
                </span>
              </button>
            );
          })}
        </div>

        {picked && <DayPanel day={picked} capacity={capacity} state={state} onDone={() => setSelected(null)} />}
        {!picked && (
          <p className="mt-3 text-[13px] text-ink-faint">
            Red is closed, gold is an event you have accepted.
          </p>
        )}
      </SettingCard>

      <CloseARange state={state} today={today} />
      <ClosedList closed={closed} state={state} today={today} />
    </div>
  );
}

/**
 * Closing a stretch of days at once.
 *
 * The same closure clicking a day gives, applied from one date to another —
 * a week away, a holiday — without clicking each one. Leave the second date
 * empty to close only the first.
 */
function CloseARange({ state, today }: { state: ReturnType<typeof useSaver>; today: string }) {
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [note, setNote] = useState("");

  return (
    <SettingCard
      title="Close several days"
      note="From one date to another, for a trip or a holiday. Leave the second date empty to close just the one day."
      state={state}
    >
      <div className="flex flex-wrap items-end gap-2.5">
        <label className="grid gap-1.5">
          <span className="text-[11px] uppercase tracking-widest text-ink-faint">First day</span>
          <input
            type="date" value={from} min={today}
            onChange={(e) => setFrom(e.target.value)}
            className={`${rowInput} py-2`}
          />
        </label>
        <label className="grid gap-1.5">
          <span className="text-[11px] uppercase tracking-widest text-ink-faint">Last day</span>
          <input
            type="date" value={to} min={from || today}
            onChange={(e) => setTo(e.target.value)}
            className={`${rowInput} py-2`}
          />
        </label>
        <label className="grid flex-1 gap-1.5">
          <span className="text-[11px] uppercase tracking-widest text-ink-faint">Why, for you</span>
          <input
            value={note} onChange={(e) => setNote(e.target.value)}
            placeholder="Travelling"
            className={`${rowInput} w-full min-w-0 py-2`}
          />
        </label>
        <button
          type="button"
          disabled={state.pending || !from}
          onClick={() => state.run(async () => {
            const r = await blockDateRange(from, to, note);
            if (r.ok) { setFrom(""); setTo(""); setNote(""); }
            return r;
          })}
          className="rounded-full border border-[#A6391C]/45 bg-[#A6391C]/[0.07] px-4 py-2 text-[13.5px] text-[#A6391C] hover:border-[#A6391C] disabled:opacity-40"
        >
          Close these days
        </button>
      </div>
    </SettingCard>
  );
}

/**
 * Every closure, in one list.
 *
 * The grid above only reaches six weeks; anything further ahead would otherwise
 * be invisible. A day an event holds is listed but not re-openable here — that
 * belongs to the event.
 */
function ClosedList({ closed, state, today }: {
  closed: ClosedDate[];
  state: ReturnType<typeof useSaver>;
  today: string;
}) {
  const upcoming = closed.filter((c) => c.date >= today);

  return (
    <SettingCard
      title="Days you have closed"
      note="Only the dates you closed by hand, and the days an accepted event holds. The weekly days off are set above and are not listed here."
      state={state}
    >
      {upcoming.length === 0 ? (
        <p className="text-[14.5px] text-ink-soft">No dates are closed. The weekly pattern above still applies.</p>
      ) : (
        <ul className="divide-y divide-line-soft">
          {upcoming.map((c) => (
            <li key={c.date} className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1.5 py-2.5">
              <span className="min-w-0">
                <span className="text-[15px] text-ink">
                  {new Date(c.date + "T00:00:00.000Z").toLocaleDateString("en-GB", {
                    weekday: "long", day: "numeric", month: "long", year: "numeric", timeZone: "UTC",
                  })}
                </span>
                {c.eventOrderNumber ? (
                  <span className="ms-2 text-[13.5px] text-gold">
                    held by event{" "}
                    <Link href={`/admin/orders/${c.eventOrderId}`} className="hover:underline">
                      {c.eventOrderNumber}
                    </Link>
                  </span>
                ) : c.note ? (
                  <span className="ms-2 text-[13.5px] text-ink-faint">{c.note}</span>
                ) : null}
              </span>
              {c.eventOrderNumber ? (
                <span className="text-[13px] text-ink-faint">Change it on the event</span>
              ) : (
                <button
                  type="button"
                  disabled={state.pending}
                  onClick={() => state.run(() => unblockDate(c.date))}
                  className="rounded-full border border-line bg-cream-warm px-3.5 py-1.5 text-[13px] text-ink-soft hover:border-gold disabled:opacity-40"
                >
                  Open this day
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
    </SettingCard>
  );
}

function DayPanel({ day, capacity, state, onDone }: {
  day: DayState;
  capacity: number;
  state: ReturnType<typeof useSaver>;
  onDone: () => void;
}) {
  const [max, setMax] = useState(day.maxOrders === null ? "" : String(day.maxOrders));
  const [note, setNote] = useState(day.note ?? "");
  const readable = new Date(day.date + "T00:00:00.000Z").toLocaleDateString("en-GB", {
    weekday: "long", day: "numeric", month: "long", timeZone: "UTC",
  });

  if (day.eventOrderNumber) {
    return (
      <div className="mt-4 rounded-sm border border-gold/50 bg-gold-pale/40 px-4 py-3">
        <p className="text-[14.5px] text-ink">
          <strong className="font-semibold">{readable}</strong> is held by event{" "}
          <Link href={`/admin/orders/${day.eventOrderId}`} className="text-gold hover:underline">
            {day.eventOrderNumber}
          </Link>
          . Change it on the event itself.
        </p>
      </div>
    );
  }

  return (
    <div className="mt-4 rounded-sm border border-line bg-cream px-4 py-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="font-display text-[15.5px] font-semibold text-ink">{readable}</p>
        <span className="text-[13px] text-ink-faint">
          {day.taken} {day.taken === 1 ? "order" : "orders"} booked
        </span>
      </div>

      <div className="mt-3 flex flex-wrap items-end gap-2.5">
        {day.closed ? (
          <button type="button" disabled={state.pending}
            onClick={() => state.run(async () => { const r = await unblockDate(day.date); onDone(); return r; })}
            className="rounded-full border border-line bg-cream-warm px-4 py-2 text-[13.5px] text-ink-soft hover:border-gold">
            Open this day
          </button>
        ) : (
          <>
            <input
              value={note} onChange={(e) => setNote(e.target.value)}
              aria-label="Why it is closed" placeholder="Why, for you"
              className={`${rowInput} w-52 py-2`}
            />
            <button type="button" disabled={state.pending}
              onClick={() => state.run(async () => { const r = await blockDate(day.date, note); onDone(); return r; })}
              className="rounded-full border border-[#A6391C]/45 bg-[#A6391C]/[0.07] px-4 py-2 text-[13.5px] text-[#A6391C] hover:border-[#A6391C]">
              Close this day
            </button>
          </>
        )}
      </div>

      {!day.closed && (
        <div className="mt-3 flex flex-wrap items-end gap-2.5 border-t border-line-soft pt-3">
          <label htmlFor="day-cap" className="text-[13.5px] text-ink-soft">Orders this day</label>
          <input
            id="day-cap" value={max} inputMode="numeric"
            onChange={(e) => setMax(e.target.value)}
            placeholder={String(capacity)}
            className={`${rowInput} w-20 py-2 tabular-nums`}
          />
          <button type="button" disabled={state.pending}
            onClick={() => state.run(async () => { const r = await setDateCapacity(day.date, max); onDone(); return r; })}
            className="rounded-full border border-line bg-cream-warm px-4 py-2 text-[13.5px] text-ink-soft hover:border-gold">
            Save
          </button>
          {day.maxOrders !== null && (
            <button type="button" disabled={state.pending}
              onClick={() => state.run(async () => { const r = await setDateCapacity(day.date, ""); onDone(); return r; })}
              className="text-[13px] text-ink-faint underline underline-offset-4 hover:text-ink">
              Back to {capacity}
            </button>
          )}
        </div>
      )}
    </div>
  );
}

"use client";

import { useState } from "react";
import Link from "next/link";
import { blockDate, unblockDate, setDateCapacity } from "@/app/admin/settings-actions";
import { SectionHead, SettingCard, rowInput, useSaver, useSettingsForm } from "./settings-bits";

const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const SHORT = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

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
 * One grid of the weeks ahead, and one way to close a day: click it. The days
 * of the week decide the pattern; a single date is an exception to it. There is
 * deliberately no second list of closed dates to keep in step with this.
 */
export function CalendarSettings({ workingDays, capacity, days }: {
  workingDays: number[];
  capacity: number;
  days: DayState[];
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
  const today = new Date().toISOString().slice(0, 10);
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
    </div>
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

"use client";

import { useState } from "react";
import Link from "next/link";
import { blockDate, unblockDate, setDateCapacity } from "@/app/admin/settings-actions";
import { SettingCard, Field, rowInput, useSaver, useSettingsForm } from "./settings-bits";

const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

/** Dates read the way they do everywhere else in admin. */
function readable(iso: string): string {
  return new Date(iso + "T00:00:00.000Z").toLocaleDateString("en-GB", {
    weekday: "short", day: "numeric", month: "short", year: "numeric", timeZone: "UTC",
  });
}

export type BlockedDay = {
  date: string;
  isClosed: boolean;
  maxOrders: number | null;
  note: string | null;
  eventOrderId: string | null;
  eventOrderNumber: string | null;
  eventCustomer: string | null;
};

/**
 * The calendar.
 *
 * Three ways a day can be unavailable, and they are deliberately different
 * things: a day of the week you never work, a day you have closed by hand, and
 * a day a confirmed event has taken. Only the first two are decided here.
 */
export function CalendarSettings({ workingDays, capacity, blocked }: {
  workingDays: number[]; capacity: number; blocked: BlockedDay[];
}) {
  const days = useSettingsForm({ working_days: workingDays.join(",") });
  const chosen = new Set(
    days.values.working_days.split(",").filter((d) => d !== "").map(Number),
  );

  const toggle = (d: number) => {
    const next = new Set(chosen);
    if (next.has(d)) next.delete(d); else next.add(d);
    days.set({ working_days: [...next].sort((a, b) => a - b).join(",") });
  };

  return (
    <div className="grid max-w-3xl gap-6">
      <SettingCard
        title="The days you work"
        note="A day switched off cannot be chosen for a regular order at all. Every day is on today, which is how the site behaves now."
        state={days.state}
        onSave={() => days.save()}
      >
        <div className="flex flex-wrap gap-2">
          {DAYS.map((name, i) => (
            <button
              key={name} type="button" aria-pressed={chosen.has(i)}
              onClick={() => toggle(i)}
              className={`rounded-full border px-4 py-2 text-[14px] transition-colors ${
                chosen.has(i)
                  ? "border-[#2E6B45]/45 bg-[#2E6B45]/[0.08] text-[#2E6B45]"
                  : "border-line bg-cream text-ink-faint hover:border-ink/30"
              }`}
            >
              {name}
            </button>
          ))}
        </div>
        <p className="mt-4 text-[13.5px] text-ink-soft">
          {chosen.size === 7
            ? "Open every day."
            : chosen.size === 0
              ? "Nothing can be ordered at all — turn at least one day on."
              : `Closed on ${DAYS.filter((_, i) => !chosen.has(i)).join(", ")}.`}
        </p>
      </SettingCard>

      <ClosuresCard blocked={blocked} capacity={capacity} />
    </div>
  );
}

function ClosuresCard({ blocked, capacity }: { blocked: BlockedDay[]; capacity: number }) {
  const state = useSaver();
  const [date, setDate] = useState("");
  const [note, setNote] = useState("");
  // The cap has its own date and number: it is a different decision from
  // closing a day, and sharing one field between them reads as a bug.
  const [capDate, setCapDate] = useState("");
  const [capMax, setCapMax] = useState("");

  const closures = blocked.filter((b) => b.isClosed);
  const limits = blocked.filter((b) => !b.isClosed && b.maxOrders !== null);

  return (
    <SettingCard
      title="Days you are closed"
      note="For anything the system cannot know about — travelling, a holiday, a day already spoken for."
      state={state}
    >
      {closures.length === 0 && limits.length === 0 ? (
        <p className="text-[14.5px] text-ink-soft">No days are closed or capped from today onwards.</p>
      ) : (
        <ul className="divide-y divide-line-soft">
          {closures.map((b) => (
            <li key={b.date} className="flex flex-wrap items-center gap-x-4 gap-y-1 py-3">
              <span className="font-display text-[16px] font-semibold text-ink">
                {readable(b.date)}
              </span>
              {b.eventOrderNumber ? (
                <>
                  <span className="rounded-full border border-gold/50 px-2.5 py-0.5 text-[11px] uppercase tracking-[0.14em] text-gold">
                    Event
                  </span>
                  <Link href={`/admin/orders/${b.eventOrderId}`} className="text-[14px] text-gold hover:underline">
                    {b.eventOrderNumber} · {b.eventCustomer}
                  </Link>
                  <span className="text-[13.5px] text-ink-faint">
                    Held by the event. Change it on the event itself.
                  </span>
                </>
              ) : (
                <>
                  <span className="flex-1 text-[14.5px] text-ink-soft">
                    {b.note || "Closed."}
                  </span>
                  <button type="button" disabled={state.pending}
                    onClick={() => state.run(() => unblockDate(b.date))}
                    className="text-[13.5px] text-ink-faint underline underline-offset-4 hover:text-ink">
                    Open it again
                  </button>
                </>
              )}
            </li>
          ))}
          {limits.map((b) => (
            <li key={b.date} className="flex flex-wrap items-center gap-x-4 gap-y-1 py-3">
              <span className="font-display text-[16px] font-semibold text-ink">{readable(b.date)}</span>
              <span className="flex-1 text-[14.5px] text-ink-soft">
                {b.maxOrders} order{b.maxOrders === 1 ? "" : "s"} that day, instead of {capacity}.
              </span>
              <button type="button" disabled={state.pending}
                onClick={() => state.run(() => setDateCapacity(b.date, ""))}
                className="text-[13.5px] text-ink-faint underline underline-offset-4 hover:text-ink">
                Back to {capacity}
              </button>
            </li>
          ))}
        </ul>
      )}

      <div className="mt-6 flex flex-wrap items-end gap-3 border-t border-line-soft pt-5">
        <Field label="Date" htmlFor="block-date">
          <input id="block-date" type="date" className={`${rowInput} w-48`}
            value={date} onChange={(e) => setDate(e.target.value)} />
        </Field>
        <Field label="Why" htmlFor="block-note" hint="For you, not the customer.">
          <input id="block-note" className={`${rowInput} w-56`} placeholder="Away that weekend"
            value={note} onChange={(e) => setNote(e.target.value)} />
        </Field>
        <button type="button" disabled={state.pending || !date}
          onClick={() => state.run(async () => {
            const r = await blockDate(date, note);
            if (r.ok) { setDate(""); setNote(""); }
            return r;
          })}
          className="btn-outline mb-[2px] disabled:opacity-40">
          Close that day
        </button>
      </div>

      <div className="mt-5 flex flex-wrap items-end gap-3 border-t border-line-soft pt-5">
        <Field label="Or cook fewer on one day" htmlFor="cap-date">
          <input id="cap-date" type="date" className={`${rowInput} w-48`}
            value={capDate} onChange={(e) => setCapDate(e.target.value)} />
        </Field>
        <Field label="Orders that day" htmlFor="cap-n" hint={`Normally ${capacity}.`}>
          <input id="cap-n" className={`${rowInput} w-28`} inputMode="numeric" placeholder="1"
            value={capMax} onChange={(e) => setCapMax(e.target.value)} />
        </Field>
        <button type="button" disabled={state.pending || !capDate || !/^\d+$/.test(capMax)}
          onClick={() => state.run(async () => {
            const r = await setDateCapacity(capDate, capMax);
            if (r.ok) { setCapDate(""); setCapMax(""); }
            return r;
          })}
          className="btn-outline mb-[2px] disabled:opacity-40">
          Set that day
        </button>
      </div>
    </SettingCard>
  );
}

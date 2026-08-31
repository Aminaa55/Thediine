"use client";

import { useState } from "react";
import { formatEGP } from "@/lib/money";
import { saveSharedLadder } from "@/app/admin/settings-actions";
import { SettingCard, Field, input, rowInput, useSaver, useSettingsForm } from "./settings-bits";

type Row = { minGuests: string; maxGuests: string; multiplier: string };

/**
 * Events.
 *
 * The guest-count ladder is the part with real money in it, so it is shown with
 * an example: a dish at a chosen price, priced through every band. A dish with
 * bands of its own ignores this ladder entirely, which is said here rather than
 * left to be discovered.
 */
export function EventSettings({ values, ladder, dishesWithOwnBands }: {
  values: {
    event_notice_days: string;
    event_max_guests: string;
    event_free_cancellation_hours: string;
    late_cancellation_percent: string;
    event_default_capacity_mode: string;
  };
  ladder: { minGuests: number; maxGuests: number; multiplierBp: number }[];
  dishesWithOwnBands: number;
}) {
  const rules = useSettingsForm({
    event_notice_days: values.event_notice_days,
    event_max_guests: values.event_max_guests,
  });
  const cancel = useSettingsForm({
    event_free_cancellation_hours: values.event_free_cancellation_hours,
    late_cancellation_percent: values.late_cancellation_percent,
  });
  const capacity = useSettingsForm({
    event_default_capacity_mode: values.event_default_capacity_mode,
  });

  return (
    <div className="grid max-w-3xl gap-6">
      <SettingCard
        title="What an event needs"
        note="Checked when the customer asks for a date, and again when the request is written."
        state={rules.state}
        onSave={() => rules.save()}
      >
        <div className="grid gap-5 sm:grid-cols-2">
          <Field label="Notice, in days" htmlFor="ev-notice" hint="The soonest an event can be.">
            <input id="ev-notice" className={input} inputMode="numeric"
              value={rules.values.event_notice_days}
              onChange={(e) => rules.set({ event_notice_days: e.target.value })} />
          </Field>
          <Field label="Most guests" htmlFor="ev-guests" hint="A request for more than this is refused.">
            <input id="ev-guests" className={input} inputMode="numeric"
              value={rules.values.event_max_guests}
              onChange={(e) => rules.set({ event_max_guests: e.target.value })} />
          </Field>
        </div>
      </SettingCard>

      <SettingCard
        title="Cancelling an event"
        note="The same rule as a regular order, with its own window. The charge is worked out and recorded on the order — never taken."
        state={cancel.state}
        onSave={() => cancel.save()}
      >
        <div className="grid gap-5 sm:grid-cols-2">
          <Field label="Free window" htmlFor="ev-free" hint="In hours before the event.">
            <input id="ev-free" className={input} inputMode="numeric"
              value={cancel.values.event_free_cancellation_hours}
              onChange={(e) => cancel.set({ event_free_cancellation_hours: e.target.value })} />
          </Field>
          <Field label="Late cancellation" htmlFor="ev-pct" hint="A percentage of the total.">
            <input id="ev-pct" className={input} inputMode="numeric"
              value={cancel.values.late_cancellation_percent}
              onChange={(e) => cancel.set({ late_cancellation_percent: e.target.value })} />
          </Field>
        </div>
        <p className="mt-4 text-[13.5px] leading-relaxed text-ink-faint">
          This percentage is shared with regular orders — changing it here changes it there too.
        </p>
      </SettingCard>

      <SettingCard
        title="When you accept an event"
        note="What happens to the rest of that day by default. You are still asked each time you confirm one, so this only sets which answer is offered first."
        state={capacity.state}
        onSave={() => capacity.save()}
      >
        <div className="grid gap-3">
          <Choice
            on={capacity.values.event_default_capacity_mode === "BLOCK_DAY"}
            onClick={() => capacity.set({ event_default_capacity_mode: "BLOCK_DAY" })}
            title="Block the whole day"
            body="No regular orders on a day you are catering an event."
          />
          <Choice
            on={capacity.values.event_default_capacity_mode === "KEEP_DAY_OPEN"}
            onClick={() => capacity.set({ event_default_capacity_mode: "KEEP_DAY_OPEN" })}
            title="Keep the day open"
            body="Regular orders keep coming in alongside the event."
          />
        </div>
      </SettingCard>

      <LadderCard ladder={ladder} dishesWithOwnBands={dishesWithOwnBands} />
    </div>
  );
}

function Choice({ on, onClick, title, body }: {
  on: boolean; onClick: () => void; title: string; body: string;
}) {
  return (
    <button
      type="button" onClick={onClick} aria-pressed={on}
      className={`rounded-sm border px-5 py-4 text-start transition-colors ${
        on ? "border-gold bg-gold-pale/40" : "border-line bg-cream hover:border-gold"
      }`}
    >
      <span className="block font-display text-[16.5px] font-semibold text-ink">{title}</span>
      <span className="mt-1 block text-[14px] leading-relaxed text-ink-soft">{body}</span>
    </button>
  );
}

function LadderCard({ ladder, dishesWithOwnBands }: {
  ladder: { minGuests: number; maxGuests: number; multiplierBp: number }[];
  dishesWithOwnBands: number;
}) {
  const state = useSaver();
  const [rows, setRows] = useState<Row[]>(
    ladder.map((t) => ({
      minGuests: String(t.minGuests),
      maxGuests: String(t.maxGuests),
      multiplier: String(t.multiplierBp / 10000),
    })),
  );
  // A worked example, so a multiplier is read as money rather than as maths.
  const [example, setExample] = useState("1000");
  const base = Number(example.replace(/,/g, "")) * 100;

  const set = (i: number, patch: Partial<Row>) =>
    setRows(rows.map((r, j) => (i === j ? { ...r, ...patch } : r)));

  return (
    <SettingCard
      title="The guest-count ladder"
      note="Event food is cooked for the whole guest list, so it is priced by how many are coming. Every dish uses this ladder unless it has bands of its own."
      state={state}
      onSave={() => state.run(() => saveSharedLadder(rows))}
      saveLabel="Save the ladder"
      footer={
        <p className="mt-5 text-[13.5px] leading-relaxed text-ink-faint">
          {dishesWithOwnBands === 0
            ? "No dish has bands of its own, so every dish follows this ladder."
            : `${dishesWithOwnBands} ${dishesWithOwnBands === 1 ? "dish has" : "dishes have"} bands of their own and ignore this ladder. They are set on the dish itself.`}
        </p>
      }
    >
      <div className="mb-5 flex flex-wrap items-end gap-3">
        <Field label="Show it for a dish costing" htmlFor="example" hint="In EGP. Just for reading the ladder.">
          <input id="example" className={`${rowInput} w-32 tabular-nums`} inputMode="decimal"
            value={example} onChange={(e) => setExample(e.target.value)} />
        </Field>
      </div>

      <ul className="grid gap-2">
        {rows.map((r, i) => (
          <li key={i} className="flex flex-wrap items-center gap-2">
            <input value={r.minGuests} inputMode="numeric" aria-label="From guests"
              onChange={(e) => set(i, { minGuests: e.target.value })}
              className={`${rowInput} w-20 tabular-nums`} />
            <span className="text-[14px] text-ink-faint">to</span>
            <input value={r.maxGuests} inputMode="numeric" aria-label="To guests"
              onChange={(e) => set(i, { maxGuests: e.target.value })}
              className={`${rowInput} w-20 tabular-nums`} />
            <span className="text-[14px] text-ink-faint">guests:</span>
            <input value={r.multiplier} inputMode="decimal" aria-label="Multiplier"
              onChange={(e) => set(i, { multiplier: e.target.value })}
              className={`${rowInput} w-24 tabular-nums`} />
            <span className="text-[14px] text-ink-faint">&times;</span>
            {Number.isFinite(base) && base > 0 && r.multiplier !== "" && (
              <span className="text-[14px] font-medium tabular-nums text-ink">
                = {formatEGP(Math.round(base * Number(r.multiplier || 0)))}
              </span>
            )}
            <button type="button"
              onClick={() => setRows(rows.filter((_, j) => j !== i))}
              className="text-[13.5px] text-ink-faint underline underline-offset-4 hover:text-[#A6391C]">
              Remove
            </button>
          </li>
        ))}
      </ul>

      <button type="button"
        onClick={() => setRows([...rows, { minGuests: "", maxGuests: "", multiplier: "" }])}
        className="btn-outline mt-4">
        Add a band
      </button>
    </SettingCard>
  );
}

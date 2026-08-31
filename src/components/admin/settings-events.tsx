"use client";

import { useState } from "react";
import { formatEGP, piastresToPounds } from "@/lib/money";
import { saveSharedLadder } from "@/app/admin/settings-actions";
import {
  SectionHead, SettingCard, Field, input, rowInput, useSaver, useSettingsForm,
} from "./settings-bits";

type Row = { minGuests: string; maxGuests: string; price: string };

/**
 * Events.
 *
 * The ladder is set in money, never in multipliers. One shared ladder has to
 * price seventy dishes at seventy different prices, so what it really holds is
 * a RATIO — but a ratio is not how anyone thinks about food. So the business
 * sets it against one price: "a dish that normally costs 1,000 EGP costs 1,500
 * for 11-20 guests". Every other dish moves in the same proportion, and a dish
 * with bands of its own ignores the ladder entirely.
 */
export function EventSettings({ values, ladder, reference, dishesWithOwnBands, examples }: {
  values: {
    event_notice_days: string;
    event_max_guests: string;
    event_free_cancellation_hours: string;
    late_cancellation_percent: string;
    event_default_capacity_mode: string;
  };
  ladder: { minGuests: number; maxGuests: number; multiplierBp: number }[];
  /** The price the ladder is written against, in piastres. */
  reference: number;
  dishesWithOwnBands: number;
  /** A couple of real dishes, to show the ladder is proportional. */
  examples: { name: string; price: number }[];
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
    <div className="grid max-w-2xl gap-4">
      <SectionHead title="Events" />

      <SettingCard
        title="What an event needs"
        state={rules.state}
        onSave={() => rules.save()}
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Notice, in days" htmlFor="ev-notice">
            <input id="ev-notice" className={input} inputMode="numeric"
              value={rules.values.event_notice_days}
              onChange={(e) => rules.set({ event_notice_days: e.target.value })} />
          </Field>
          <Field label="Most guests" htmlFor="ev-guests" hint="A request for more is refused.">
            <input id="ev-guests" className={input} inputMode="numeric"
              value={rules.values.event_max_guests}
              onChange={(e) => rules.set({ event_max_guests: e.target.value })} />
          </Field>
        </div>
      </SettingCard>

      <SettingCard
        title="Cancelling an event"
        note="The percentage is shared with regular orders."
        state={cancel.state}
        onSave={() => cancel.save()}
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Free window" htmlFor="ev-free" hint="Hours before.">
            <input id="ev-free" className={input} inputMode="numeric"
              value={cancel.values.event_free_cancellation_hours}
              onChange={(e) => cancel.set({ event_free_cancellation_hours: e.target.value })} />
          </Field>
          <Field label="Late cancellation" htmlFor="ev-pct" hint="% of the total.">
            <input id="ev-pct" className={input} inputMode="numeric"
              value={cancel.values.late_cancellation_percent}
              onChange={(e) => cancel.set({ late_cancellation_percent: e.target.value })} />
          </Field>
        </div>
      </SettingCard>

      <SettingCard
        title="When you accept an event"
        note="Which answer is offered first. You are still asked each time."
        state={capacity.state}
        onSave={() => capacity.save()}
      >
        {/*
          These only change what is selected. Nothing submits, navigates or
          reloads until Save is pressed.
        */}
        <div className="flex flex-wrap gap-2">
          <Choice
            on={capacity.values.event_default_capacity_mode === "BLOCK_DAY"}
            onClick={() => capacity.set({ event_default_capacity_mode: "BLOCK_DAY" })}
            title="Block the day"
          />
          <Choice
            on={capacity.values.event_default_capacity_mode === "KEEP_DAY_OPEN"}
            onClick={() => capacity.set({ event_default_capacity_mode: "KEEP_DAY_OPEN" })}
            title="Keep the day open"
          />
        </div>
      </SettingCard>

      <LadderCard
        ladder={ladder} reference={reference}
        dishesWithOwnBands={dishesWithOwnBands} examples={examples}
      />
    </div>
  );
}

function Choice({ on, onClick, title }: { on: boolean; onClick: () => void; title: string }) {
  return (
    <button
      type="button" onClick={onClick} aria-pressed={on}
      className={`rounded-full border px-4 py-2 text-[14px] transition-colors ${
        on ? "border-gold bg-gold-pale/50 font-medium text-ink" : "border-line bg-cream text-ink-soft hover:border-gold"
      }`}
    >
      {title}
    </button>
  );
}

function LadderCard({ ladder, reference, dishesWithOwnBands, examples }: {
  ladder: { minGuests: number; maxGuests: number; multiplierBp: number }[];
  reference: number;
  dishesWithOwnBands: number;
  examples: { name: string; price: number }[];
}) {
  const state = useSaver();
  const [base, setBase] = useState(String(piastresToPounds(reference)));
  const [rows, setRows] = useState<Row[]>(
    ladder.map((t) => ({
      minGuests: String(t.minGuests),
      maxGuests: String(t.maxGuests),
      price: String(piastresToPounds(Math.round((reference * t.multiplierBp) / 10000))),
    })),
  );

  const set = (i: number, patch: Partial<Row>) =>
    setRows(rows.map((r, j) => (i === j ? { ...r, ...patch } : r)));

  const basePiastres = Math.round(Number(base.replace(/,/g, "") || 0) * 100);
  const shown = examples.slice(0, 2);

  return (
    <SettingCard
      title="Event prices by guest count"
      note="Set against one dish price. Every other dish moves in the same proportion, so you never price seventy dishes by hand."
      state={state}
      onSave={() => state.run(() => saveSharedLadder(rows, base))}
      saveLabel="Save these prices"
      footer={
        <p className="mt-4 text-[13px] leading-relaxed text-ink-faint">
          {dishesWithOwnBands === 0
            ? "Every dish follows this. A dish can be given its own prices on the dish itself."
            : `${dishesWithOwnBands} ${dishesWithOwnBands === 1 ? "dish has" : "dishes have"} their own event prices and ignore this.`}
        </p>
      }
    >
      <div className="flex flex-wrap items-end gap-2.5">
        <Field label="For a dish that normally costs" htmlFor="base" hint="In EGP.">
          <input id="base" className={`${rowInput} w-28 tabular-nums`} inputMode="decimal"
            value={base} onChange={(e) => setBase(e.target.value)} />
        </Field>
      </div>

      <ul className="mt-4 grid gap-1.5">
        {rows.map((r, i) => (
          <li key={i} className="flex flex-wrap items-center gap-2">
            <input value={r.minGuests} inputMode="numeric" aria-label="From guests"
              onChange={(e) => set(i, { minGuests: e.target.value })}
              className={`${rowInput} w-16 py-2 tabular-nums`} />
            <span className="text-[13.5px] text-ink-faint">to</span>
            <input value={r.maxGuests} inputMode="numeric" aria-label="To guests"
              onChange={(e) => set(i, { maxGuests: e.target.value })}
              className={`${rowInput} w-16 py-2 tabular-nums`} />
            <span className="text-[13.5px] text-ink-faint">guests</span>
            <input value={r.price} inputMode="decimal" aria-label="Price for this band"
              onChange={(e) => set(i, { price: e.target.value })}
              className={`${rowInput} w-28 py-2 tabular-nums`} />
            <span className="text-[13.5px] text-ink-faint">EGP</span>
            <button type="button"
              onClick={() => setRows(rows.filter((_, j) => j !== i))}
              className="text-[13px] text-ink-faint underline underline-offset-4 hover:text-[#A6391C]">
              Remove
            </button>
          </li>
        ))}
      </ul>

      <button type="button"
        onClick={() => setRows([...rows, { minGuests: "", maxGuests: "", price: "" }])}
        className="mt-3 rounded-full border border-line bg-cream px-4 py-1.5 text-[13.5px] text-ink-soft hover:border-gold">
        Add a band
      </button>

      {/* What it means for real dishes, so the proportion is not abstract. */}
      {shown.length > 0 && basePiastres > 0 && rows.length > 0 && (
        <div className="mt-5 border-t border-line-soft pt-4">
          <p className="eyebrow mb-2">What that means for other dishes</p>
          <ul className="grid gap-1">
            {shown.map((d) => (
              <li key={d.name} className="flex flex-wrap items-baseline gap-x-2 text-[13.5px] tabular-nums text-ink-soft">
                <span className="text-ink">{d.name}</span>
                <span>({formatEGP(d.price)})</span>
                {rows.slice(0, 3).map((r, i) => {
                  const bandPrice = Number(r.price.replace(/,/g, "") || 0) * 100;
                  if (!bandPrice) return null;
                  const scaled = Math.round((d.price * bandPrice) / basePiastres);
                  return (
                    <span key={i}>
                      · {r.minGuests}&ndash;{r.maxGuests}: {formatEGP(scaled)}
                    </span>
                  );
                })}
              </li>
            ))}
          </ul>
        </div>
      )}
    </SettingCard>
  );
}

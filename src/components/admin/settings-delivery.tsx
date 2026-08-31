"use client";

import { useState } from "react";
import { formatEGP, piastresToPounds } from "@/lib/money";
import {
  saveArea, setAreaActive, removeArea, moveArea,
  saveSlot, setSlotActive, removeSlot, moveSlot,
} from "@/app/admin/settings-actions";
import { SettingCard, Field, Switch, ToDecide, input, rowInput, useSaver, useSettingsForm } from "./settings-bits";

type Area = { id: string; nameEn: string; fee: number; isActive: boolean; addresses: number };
type Slot = {
  id: string; labelEn: string; startTime: string; endTime: string;
  isActive: boolean; orders: number;
};

/**
 * Delivery and pickup.
 *
 * Areas carry the fee, so they are the first thing a customer is asked for.
 * Until they exist an order records its fee as unknown rather than as zero,
 * which is why an empty list is called out rather than quietly tolerated.
 */
export function DeliverySettings({ areas, slots, pickupEnabled }: {
  areas: Area[]; slots: Slot[]; pickupEnabled: boolean;
}) {
  const pickup = useSettingsForm({ pickup_enabled: pickupEnabled ? "true" : "false" });

  return (
    <div className="grid max-w-3xl gap-6">
      <AreasCard areas={areas} />

      <SettingCard
        title="Pickup"
        note="Whether customers can collect an order themselves."
        state={pickup.state}
        onSave={() => pickup.save()}
      >
        <Switch
          on={pickup.values.pickup_enabled !== "false"}
          onChange={(v) => pickup.set({ pickup_enabled: v ? "true" : "false" })}
          title="Customers can choose pickup"
          body="Off removes it from checkout, and an order that tries to use it is refused."
        />
      </SettingCard>

      <SlotsCard slots={slots} />
    </div>
  );
}

function AreasCard({ areas }: { areas: Area[] }) {
  const state = useSaver();
  const [adding, setAdding] = useState({ name: "", fee: "" });

  return (
    <SettingCard
      title="Delivery areas and fees"
      note="The area a customer chooses sets the delivery fee on their order. The fee is copied onto the order when it is placed, so changing it here never changes an order that already exists."
      state={state}
    >
      {areas.length === 0 ? (
        <ToDecide>
          No areas yet. Until there are, an order&rsquo;s delivery fee is recorded as unknown rather
          than as zero, and the customer is not shown a fee at checkout. Add the areas you deliver
          to, with what you charge for each.
        </ToDecide>
      ) : (
        <ul className="divide-y divide-line-soft">
          {areas.map((a, i) => (
            <AreaRow key={a.id} area={a} first={i === 0} last={i === areas.length - 1} state={state} />
          ))}
        </ul>
      )}

      <div className="mt-6 flex flex-wrap items-end gap-3 border-t border-line-soft pt-5">
        <Field label="Area" htmlFor="new-area">
          <input id="new-area" className={`${rowInput} w-48`} placeholder="Maadi"
            value={adding.name} onChange={(e) => setAdding((v) => ({ ...v, name: e.target.value }))} />
        </Field>
        <Field label="Fee" htmlFor="new-fee" hint="In EGP.">
          <input id="new-fee" className={`${rowInput} w-32`} inputMode="decimal" placeholder="60"
            value={adding.fee} onChange={(e) => setAdding((v) => ({ ...v, fee: e.target.value }))} />
        </Field>
        <button
          type="button" disabled={state.pending || !adding.name.trim()}
          onClick={() => state.run(async () => {
            const r = await saveArea(null, adding.name, adding.fee);
            if (r.ok) setAdding({ name: "", fee: "" });
            return r;
          })}
          className="btn-outline mb-[2px] disabled:opacity-40"
        >
          Add the area
        </button>
      </div>
    </SettingCard>
  );
}

function AreaRow({ area, first, last, state }: {
  area: Area; first: boolean; last: boolean; state: ReturnType<typeof useSaver>;
}) {
  const [name, setName] = useState(area.nameEn);
  const [fee, setFee] = useState(String(piastresToPounds(area.fee)));

  return (
    <li className="flex flex-wrap items-center gap-3 py-3">
      <span className="flex flex-col gap-0.5">
        <button type="button" disabled={first || state.pending}
          onClick={() => state.run(() => moveArea(area.id, "up"))}
          aria-label={`Move ${area.nameEn} up`}
          className="text-[11px] leading-none text-ink-faint hover:text-ink disabled:opacity-25">
          &#9650;
        </button>
        <button type="button" disabled={last || state.pending}
          onClick={() => state.run(() => moveArea(area.id, "down"))}
          aria-label={`Move ${area.nameEn} down`}
          className="text-[11px] leading-none text-ink-faint hover:text-ink disabled:opacity-25">
          &#9660;
        </button>
      </span>

      <input value={name} onChange={(e) => setName(e.target.value)}
        aria-label={`${area.nameEn} name`} className={`${rowInput} min-w-0 flex-1`} />
      <input value={fee} inputMode="decimal" onChange={(e) => setFee(e.target.value)}
        aria-label={`${area.nameEn} fee`} className={`${rowInput} w-28 tabular-nums`} />

      <button type="button" disabled={state.pending}
        onClick={() => state.run(() => saveArea(area.id, name, fee))}
        className="rounded-full border border-line bg-cream px-4 py-1.5 text-[13.5px] text-ink-soft hover:border-gold">
        Save
      </button>
      <button type="button" disabled={state.pending}
        onClick={() => state.run(() => setAreaActive(area.id, !area.isActive))}
        className={`rounded-full border px-4 py-1.5 text-[13.5px] ${
          area.isActive
            ? "border-[#2E6B45]/40 bg-[#2E6B45]/[0.08] text-[#2E6B45]"
            : "border-[#A6391C]/40 bg-[#A6391C]/[0.07] text-[#A6391C]"
        }`}>
        {area.isActive ? "Delivering" : "Not delivering"}
      </button>
      <button type="button" disabled={state.pending}
        onClick={() => state.run(() => removeArea(area.id))}
        className="text-[13.5px] text-ink-faint underline underline-offset-4 hover:text-[#A6391C]">
        Remove
      </button>
    </li>
  );
}

function SlotsCard({ slots }: { slots: Slot[] }) {
  const state = useSaver();
  const [adding, setAdding] = useState({ label: "", start: "", end: "" });

  return (
    <SettingCard
      title="Delivery and pickup times"
      note="The times a customer can choose from. The one they choose is written onto the order in words, so renaming a time later never changes an order that used it."
      state={state}
    >
      {slots.length === 0 ? (
        <ToDecide>
          No times yet, so a customer types a time of their own at checkout. Add the windows you
          actually deliver in and they will choose from those instead.
        </ToDecide>
      ) : (
        <ul className="divide-y divide-line-soft">
          {slots.map((t, i) => (
            <SlotRow key={t.id} slot={t} first={i === 0} last={i === slots.length - 1} state={state} />
          ))}
        </ul>
      )}

      <div className="mt-6 flex flex-wrap items-end gap-3 border-t border-line-soft pt-5">
        <Field label="Name" htmlFor="new-slot">
          <input id="new-slot" className={`${rowInput} w-40`} placeholder="Evening"
            value={adding.label} onChange={(e) => setAdding((v) => ({ ...v, label: e.target.value }))} />
        </Field>
        <Field label="From" htmlFor="new-start">
          <input id="new-start" type="time" className={`${rowInput} w-32`}
            value={adding.start} onChange={(e) => setAdding((v) => ({ ...v, start: e.target.value }))} />
        </Field>
        <Field label="To" htmlFor="new-end">
          <input id="new-end" type="time" className={`${rowInput} w-32`}
            value={adding.end} onChange={(e) => setAdding((v) => ({ ...v, end: e.target.value }))} />
        </Field>
        <button
          type="button" disabled={state.pending || !adding.label.trim()}
          onClick={() => state.run(async () => {
            const r = await saveSlot(null, adding.label, adding.start, adding.end);
            if (r.ok) setAdding({ label: "", start: "", end: "" });
            return r;
          })}
          className="btn-outline mb-[2px] disabled:opacity-40"
        >
          Add the time
        </button>
      </div>
    </SettingCard>
  );
}

function SlotRow({ slot, first, last, state }: {
  slot: Slot; first: boolean; last: boolean; state: ReturnType<typeof useSaver>;
}) {
  const [label, setLabel] = useState(slot.labelEn);
  const [start, setStart] = useState(slot.startTime);
  const [end, setEnd] = useState(slot.endTime);

  return (
    <li className="flex flex-wrap items-center gap-3 py-3">
      <span className="flex flex-col gap-0.5">
        <button type="button" disabled={first || state.pending}
          onClick={() => state.run(() => moveSlot(slot.id, "up"))}
          aria-label={`Move ${slot.labelEn} up`}
          className="text-[11px] leading-none text-ink-faint hover:text-ink disabled:opacity-25">
          &#9650;
        </button>
        <button type="button" disabled={last || state.pending}
          onClick={() => state.run(() => moveSlot(slot.id, "down"))}
          aria-label={`Move ${slot.labelEn} down`}
          className="text-[11px] leading-none text-ink-faint hover:text-ink disabled:opacity-25">
          &#9660;
        </button>
      </span>

      <input value={label} onChange={(e) => setLabel(e.target.value)}
        aria-label={`${slot.labelEn} name`} className={`${rowInput} min-w-0 flex-1`} />
      <input type="time" value={start} onChange={(e) => setStart(e.target.value)}
        aria-label={`${slot.labelEn} from`} className={`${rowInput} w-32`} />
      <input type="time" value={end} onChange={(e) => setEnd(e.target.value)}
        aria-label={`${slot.labelEn} to`} className={`${rowInput} w-32`} />

      <button type="button" disabled={state.pending}
        onClick={() => state.run(() => saveSlot(slot.id, label, start, end))}
        className="rounded-full border border-line bg-cream px-4 py-1.5 text-[13.5px] text-ink-soft hover:border-gold">
        Save
      </button>
      <button type="button" disabled={state.pending}
        onClick={() => state.run(() => setSlotActive(slot.id, !slot.isActive))}
        className={`rounded-full border px-4 py-1.5 text-[13.5px] ${
          slot.isActive
            ? "border-[#2E6B45]/40 bg-[#2E6B45]/[0.08] text-[#2E6B45]"
            : "border-[#A6391C]/40 bg-[#A6391C]/[0.07] text-[#A6391C]"
        }`}>
        {slot.isActive ? "Offered" : "Not offered"}
      </button>
      <button type="button" disabled={state.pending}
        onClick={() => state.run(() => removeSlot(slot.id))}
        className="text-[13.5px] text-ink-faint underline underline-offset-4 hover:text-[#A6391C]">
        Remove
      </button>
    </li>
  );
}

/** Shown on the settings index so a fee is legible without opening a row. */
export function AreaFee({ fee }: { fee: number }) {
  return <span className="tabular-nums">{formatEGP(fee)}</span>;
}

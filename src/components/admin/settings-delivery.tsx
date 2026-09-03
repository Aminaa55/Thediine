"use client";

import { useState } from "react";
import { piastresToPounds } from "@/lib/money";
import { saveArea, setAreaActive, removeArea, moveArea } from "@/app/admin/settings-actions";
import {
  SectionHead, SettingCard, Field, Switch, Pill, ToDecide,
  input, rowInput, useSaver, useSettingsForm,
} from "./settings-bits";

type Area = { id: string; nameEn: string; fee: number; isActive: boolean; addresses: number };

/**
 * Delivery and pickup.
 *
 * Areas carry the fee, so they come first. The hours are one range rather than
 * named slots: a customer picks a time inside it, and the order records the
 * time they picked.
 */
export function DeliverySettings({ areas, pickupEnabled, timeFrom, timeUntil }: {
  areas: Area[];
  pickupEnabled: boolean;
  timeFrom: string;
  timeUntil: string;
}) {
  const pickup = useSettingsForm({ pickup_enabled: pickupEnabled ? "true" : "false" });
  const hours = useSettingsForm({ order_time_from: timeFrom, order_time_until: timeUntil });

  return (
    <div className="grid max-w-2xl gap-4">
      <SectionHead title="Delivery & pickup" />

      <AreasCard areas={areas} />

      <SettingCard
        title="When orders go out"
        note="Customers choose a time inside this range. Leave both empty to accept any time."
        state={hours.state}
        onSave={() => hours.save()}
      >
        <div className="flex flex-wrap items-end gap-3">
          <Field label="Available from" htmlFor="from">
            <input id="from" type="time" className={`${rowInput} w-32`}
              value={hours.values.order_time_from}
              onChange={(e) => hours.set({ order_time_from: e.target.value })} />
          </Field>
          <Field label="Available until" htmlFor="until">
            <input id="until" type="time" className={`${rowInput} w-32`}
              value={hours.values.order_time_until}
              onChange={(e) => hours.set({ order_time_until: e.target.value })} />
          </Field>
        </div>
        {!timeFrom && !timeUntil && (
          <ToDecide>
            No hours set, so a customer can ask for any time of day.
          </ToDecide>
        )}
      </SettingCard>

      <SettingCard
        title="Pickup"
        state={pickup.state}
        onSave={() => pickup.save()}
      >
        <Switch
          on={pickup.values.pickup_enabled !== "false"}
          onChange={(v) => pickup.set({ pickup_enabled: v ? "true" : "false" })}
          title="Customers can collect an order themselves"
          body="Off removes it from checkout, and an order that tries to use it is refused."
        />
      </SettingCard>
    </div>
  );
}

function AreasCard({ areas }: { areas: Area[] }) {
  const state = useSaver();
  const [adding, setAdding] = useState({ name: "", fee: "" });

  return (
    <SettingCard
      title="Delivery areas and fees"
      note="The fee is copied onto an order when it is placed, so changing it here never changes an order that already exists."
      state={state}
    >
      {areas.length === 0 ? (
        <ToDecide>
          No areas yet, so delivery cannot be chosen at checkout — customers can only pick up.
          Add the first area and delivery opens the moment you save it.
        </ToDecide>
      ) : (
        <ul className="divide-y divide-line-soft">
          {areas.map((a, i) => (
            <AreaRow key={a.id} area={a} first={i === 0} last={i === areas.length - 1} state={state} />
          ))}
        </ul>
      )}

      <div className="mt-4 flex flex-wrap items-end gap-2.5 border-t border-line-soft pt-4">
        <Field label="Area" htmlFor="new-area">
          <input id="new-area" className={`${rowInput} w-44`} placeholder="Maadi"
            value={adding.name} onChange={(e) => setAdding((v) => ({ ...v, name: e.target.value }))} />
        </Field>
        <Field label="Fee" htmlFor="new-fee" hint="EGP.">
          <input id="new-fee" className={`${rowInput} w-24`} inputMode="decimal" placeholder="60"
            value={adding.fee} onChange={(e) => setAdding((v) => ({ ...v, fee: e.target.value }))} />
        </Field>
        <button
          type="button" disabled={state.pending || !adding.name.trim()}
          onClick={() => state.run(async () => {
            const r = await saveArea(null, adding.name, adding.fee);
            if (r.ok) setAdding({ name: "", fee: "" });
            return r;
          })}
          className="mb-[3px] rounded-full border border-line bg-cream px-4 py-2 text-[13.5px] text-ink-soft hover:border-gold disabled:opacity-40"
        >
          Add area
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
    <li className="flex flex-wrap items-center gap-2 py-2.5">
      <span className="flex flex-col gap-0.5">
        <button type="button" disabled={first || state.pending}
          onClick={() => state.run(() => moveArea(area.id, "up"))}
          aria-label={`Move ${area.nameEn} up`}
          className="text-[10px] leading-none text-ink-faint hover:text-ink disabled:opacity-25">
          &#9650;
        </button>
        <button type="button" disabled={last || state.pending}
          onClick={() => state.run(() => moveArea(area.id, "down"))}
          aria-label={`Move ${area.nameEn} down`}
          className="text-[10px] leading-none text-ink-faint hover:text-ink disabled:opacity-25">
          &#9660;
        </button>
      </span>

      <input value={name} onChange={(e) => setName(e.target.value)}
        aria-label={`${area.nameEn} name`} className={`${rowInput} min-w-0 flex-1 py-2`} />
      <input value={fee} inputMode="decimal" onChange={(e) => setFee(e.target.value)}
        aria-label={`${area.nameEn} fee`} className={`${rowInput} w-24 py-2 tabular-nums`} />

      <button type="button" disabled={state.pending}
        onClick={() => state.run(() => saveArea(area.id, name, fee))}
        className="rounded-full border border-line bg-cream px-3.5 py-1.5 text-[13px] text-ink-soft hover:border-gold">
        Save
      </button>
      <Pill
        on={area.isActive} onLabel="Delivering" offLabel="Not delivering" pending={state.pending}
        onClick={() => state.run(() => setAreaActive(area.id, !area.isActive))}
      />
      <button type="button" disabled={state.pending}
        onClick={() => state.run(() => removeArea(area.id))}
        className="text-[13px] text-ink-faint underline underline-offset-4 hover:text-[#A6391C]">
        Remove
      </button>
    </li>
  );
}

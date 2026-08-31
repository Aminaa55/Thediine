"use client";

import { useState } from "react";
import {
  saveServingOption, setServingOptionAvailable, removeServingOption,
} from "@/app/admin/settings-actions";
import {
  SectionHead, SettingCard, Field, Pill, ToDecide, input, rowInput, useSaver, useSettingsForm,
} from "./settings-bits";

export type ServingRow = {
  id: string;
  builtIn: string | null;
  nameEn: string;
  descriptionEn: string;
  isAvailable: boolean;
};

/**
 * Serving setup.
 *
 * The options are the business's own rows, so another can be added without a
 * developer. Nothing here invents terms for returning dishes: the policy is
 * whatever the business writes, and it has not written one.
 */
export function ServingSettings({ options, policy }: { options: ServingRow[]; policy: string }) {
  const state = useSaver();
  const words = useSettingsForm({ serving_setup_policy_en: policy });
  const [adding, setAdding] = useState(false);
  const [draft, setDraft] = useState({ name: "", description: "" });

  return (
    <div className="grid max-w-2xl gap-4">
      <SectionHead title="Serving setup" />

      <SettingCard
        title="How the food can be served"
        note="Asked on every order, regular and event alike."
        state={state}
      >
        <ul className="divide-y divide-line-soft">
          {options.map((o) => (
            <OptionRow key={o.id} option={o} state={state} />
          ))}
        </ul>

        <div className="mt-4 border-t border-line-soft pt-4">
          {!adding ? (
            <button type="button" onClick={() => setAdding(true)}
              className="rounded-full border border-line bg-cream px-4 py-1.5 text-[13.5px] text-ink-soft hover:border-gold">
              Add serving option
            </button>
          ) : (
            <div>
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="Name" htmlFor="so-name" hint="What the customer sees.">
                  <input id="so-name" className={input} placeholder="Chafing dishes"
                    value={draft.name} onChange={(e) => setDraft((d) => ({ ...d, name: e.target.value }))} />
                </Field>
                <Field label="Description" htmlFor="so-desc" hint="One line, for the customer.">
                  <input id="so-desc" className={input} placeholder="Kept warm and collected afterwards"
                    value={draft.description}
                    onChange={(e) => setDraft((d) => ({ ...d, description: e.target.value }))} />
                </Field>
              </div>
              <div className="mt-3 flex flex-wrap items-center gap-3">
                <button type="button" disabled={state.pending || !draft.name.trim()}
                  onClick={() => state.run(async () => {
                    const r = await saveServingOption(null, {
                      nameEn: draft.name, descriptionEn: draft.description,
                    });
                    if (r.ok) { setAdding(false); setDraft({ name: "", description: "" }); }
                    return r;
                  })}
                  className="rounded-full border border-ink bg-ink px-4 py-2 text-[13.5px] text-cream disabled:bg-ink/25">
                  Add it
                </button>
                <button type="button" onClick={() => setAdding(false)}
                  className="text-[13px] text-ink-faint underline underline-offset-4 hover:text-ink">
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>
      </SettingCard>

      <SettingCard
        title="What customers are told about returning dishes"
        state={words.state}
        onSave={() => words.save()}
      >
        <textarea
          id="policy" rows={2} className={input}
          placeholder="Nothing is shown to customers yet"
          value={words.values.serving_setup_policy_en}
          onChange={(e) => words.set({ serving_setup_policy_en: e.target.value })}
        />
        {!policy.trim() && (
          <ToDecide>
            Customers can choose returnable dishes but are told nothing about returning them.
            Nothing has been made up in the meantime.
          </ToDecide>
        )}
      </SettingCard>
    </div>
  );
}

function OptionRow({ option, state }: { option: ServingRow; state: ReturnType<typeof useSaver> }) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState(option.nameEn);
  const [description, setDescription] = useState(option.descriptionEn);

  return (
    <li className="py-3">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
        <span className="min-w-0 flex-1">
          <span className="block text-[15px] font-medium text-ink">{option.nameEn}</span>
          {option.descriptionEn && (
            <span className="mt-0.5 block text-[13px] text-ink-soft">{option.descriptionEn}</span>
          )}
        </span>

        <Pill
          on={option.isAvailable} onLabel="Available" offLabel="Unavailable" pending={state.pending}
          onClick={() => state.run(() => setServingOptionAvailable(option.id, !option.isAvailable))}
        />
        <button type="button" onClick={() => setOpen(!open)}
          className="text-[13px] text-ink-faint underline underline-offset-4 hover:text-ink">
          {open ? "Close" : "Edit"}
        </button>
      </div>

      {open && (
        <div className="mt-3 rounded-sm border border-line bg-cream px-4 py-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Name" htmlFor={`sn-${option.id}`}>
              <input id={`sn-${option.id}`} className={`${rowInput} w-full py-2`}
                value={name} onChange={(e) => setName(e.target.value)} />
            </Field>
            <Field label="Description" htmlFor={`sd-${option.id}`}>
              <input id={`sd-${option.id}`} className={`${rowInput} w-full py-2`}
                value={description} onChange={(e) => setDescription(e.target.value)} />
            </Field>
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-3">
            <button type="button" disabled={state.pending}
              onClick={() => state.run(async () => {
                const r = await saveServingOption(option.id, { nameEn: name, descriptionEn: description });
                if (r.ok) setOpen(false);
                return r;
              })}
              className="rounded-full border border-line bg-cream-warm px-4 py-1.5 text-[13.5px] text-ink-soft hover:border-gold">
              Save
            </button>
            {!option.builtIn && (
              <button type="button" disabled={state.pending}
                onClick={() => state.run(() => removeServingOption(option.id))}
                className="text-[13px] text-ink-faint underline underline-offset-4 hover:text-[#A6391C]">
                Remove
              </button>
            )}
          </div>
        </div>
      )}
    </li>
  );
}

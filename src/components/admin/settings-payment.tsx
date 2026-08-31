"use client";

import { useState } from "react";
import {
  savePaymentOption, setPaymentOptionEnabled, removePaymentOption,
} from "@/app/admin/settings-actions";
import {
  SectionHead, SettingCard, Field, Pill, input, rowInput, useSaver, useSettingsForm,
} from "./settings-bits";

export type PaymentRow = {
  id: string;
  builtIn: string | null;
  nameEn: string;
  instructionsEn: string;
  kind: "MANUAL" | "INTEGRATED";
  isEnabled: boolean;
  verifyBeforeDelivery: boolean;
};

/**
 * Payment.
 *
 * Two kinds, and the difference is not cosmetic. A MANUAL method is money that
 * arrives outside this system and a person confirms — the business can add as
 * many as it likes. An INTEGRATED one needs a provider built and connected, so
 * it can be described here but never switched on from here. Nothing is ever
 * shown to a customer as working before it works.
 */
export function PaymentSettings({ options, instapay }: {
  options: PaymentRow[];
  instapay: { number: string; details: string };
}) {
  const state = useSaver();
  const transfer = useSettingsForm({
    instapay_number: instapay.number,
    instapay_account_details: instapay.details,
  });
  const [adding, setAdding] = useState<null | "MANUAL" | "INTEGRATED">(null);
  const [draft, setDraft] = useState({ name: "", instructions: "", verify: true });

  const instapayRow = options.find((o) => o.builtIn === "INSTAPAY");

  return (
    <div className="grid max-w-2xl gap-4">
      <SectionHead title="Payment" />

      <SettingCard
        title="How customers can pay"
        note="Everything here is settled by hand: someone confirms the money arrived."
        state={state}
      >
        <ul className="divide-y divide-line-soft">
          {options.map((o) => (
            <MethodRow key={o.id} option={o} state={state} />
          ))}
        </ul>

        <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-line-soft pt-4">
          {adding === null ? (
            <>
              <span className="text-[13.5px] text-ink-soft">Add payment method</span>
              <button type="button"
                onClick={() => { setAdding("MANUAL"); setDraft({ name: "", instructions: "", verify: true }); }}
                className="rounded-full border border-line bg-cream px-4 py-1.5 text-[13.5px] text-ink-soft hover:border-gold">
                Manual
              </button>
              <button type="button"
                onClick={() => { setAdding("INTEGRATED"); setDraft({ name: "", instructions: "", verify: false }); }}
                className="rounded-full border border-line bg-cream px-4 py-1.5 text-[13.5px] text-ink-soft hover:border-gold">
                Needs an integration
              </button>
            </>
          ) : (
            <div className="w-full">
              <p className="text-[13.5px] text-ink-soft">
                {adding === "MANUAL"
                  ? "Money that arrives outside this website — a bank transfer, a wallet. You confirm each one by hand."
                  : "A provider that has to be built and connected first. It is recorded here, and stays off to customers until that work is done."}
              </p>
              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                <Field label="Name" htmlFor="pm-name" hint="What the customer sees.">
                  <input id="pm-name" className={input} placeholder="Bank transfer"
                    value={draft.name} onChange={(e) => setDraft((d) => ({ ...d, name: e.target.value }))} />
                </Field>
                <Field label="Details for the customer" htmlFor="pm-inst" hint="Where to send it.">
                  <input id="pm-inst" className={input} placeholder="Account number, name"
                    value={draft.instructions}
                    onChange={(e) => setDraft((d) => ({ ...d, instructions: e.target.value }))} />
                </Field>
              </div>
              {adding === "MANUAL" && (
                <label className="mt-3 flex items-start gap-2.5 text-[14px] text-ink">
                  <input type="checkbox" checked={draft.verify}
                    onChange={(e) => setDraft((d) => ({ ...d, verify: e.target.checked }))}
                    className="mt-0.5 h-4 w-4 accent-[#A87E2E]" />
                  <span>
                    The money comes before delivery
                    <span className="mt-0.5 block text-[13px] text-ink-soft">
                      Those orders arrive awaiting verification. Off means paid on the doorstep.
                    </span>
                  </span>
                </label>
              )}
              <div className="mt-3 flex flex-wrap items-center gap-3">
                <button type="button" disabled={state.pending || !draft.name.trim()}
                  onClick={() => state.run(async () => {
                    const r = await savePaymentOption(null, {
                      nameEn: draft.name,
                      instructionsEn: draft.instructions,
                      kind: adding,
                      verifyBeforeDelivery: draft.verify,
                    });
                    if (r.ok) setAdding(null);
                    return r;
                  })}
                  className="rounded-full border border-ink bg-ink px-4 py-2 text-[13.5px] text-cream disabled:bg-ink/25">
                  Add it
                </button>
                <button type="button" onClick={() => setAdding(null)}
                  className="text-[13px] text-ink-faint underline underline-offset-4 hover:text-ink">
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>
      </SettingCard>

      {instapayRow && (
        <SettingCard
          title="InstaPay details"
          note="Shown at checkout when a customer chooses InstaPay."
          state={transfer.state}
          onSave={() => transfer.save()}
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Transfer to" htmlFor="ipn">
              <input id="ipn" className={input}
                value={transfer.values.instapay_number}
                onChange={(e) => transfer.set({ instapay_number: e.target.value })} />
            </Field>
            <Field label="Anything else to say" htmlFor="ipd">
              <input id="ipd" className={input} placeholder="Nothing extra"
                value={transfer.values.instapay_account_details}
                onChange={(e) => transfer.set({ instapay_account_details: e.target.value })} />
            </Field>
          </div>
        </SettingCard>
      )}
    </div>
  );
}

function MethodRow({ option, state }: { option: PaymentRow; state: ReturnType<typeof useSaver> }) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState(option.nameEn);
  const [instructions, setInstructions] = useState(option.instructionsEn);
  const [verify, setVerify] = useState(option.verifyBeforeDelivery);

  const integrated = option.kind === "INTEGRATED";

  return (
    <li className="py-3">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
        <span className="min-w-0 flex-1">
          <span className="block text-[15px] font-medium text-ink">{option.nameEn}</span>
          <span className="mt-0.5 block text-[13px] text-ink-soft">
            {integrated
              ? "Needs an integration before customers can use it"
              : option.verifyBeforeDelivery
                ? "Paid before delivery — you verify it"
                : "Paid when the food arrives"}
            {option.builtIn && " · built in"}
          </span>
        </span>

        {integrated ? (
          <span className="whitespace-nowrap rounded-full border border-line px-3 py-1 text-[12.5px] text-ink-faint">
            Not available
          </span>
        ) : (
          <Pill
            on={option.isEnabled} onLabel="Offered" offLabel="Not offered" pending={state.pending}
            onClick={() => state.run(() => setPaymentOptionEnabled(option.id, !option.isEnabled))}
          />
        )}

        <button type="button" onClick={() => setOpen(!open)}
          className="text-[13px] text-ink-faint underline underline-offset-4 hover:text-ink">
          {open ? "Close" : "Edit"}
        </button>
      </div>

      {open && (
        <div className="mt-3 rounded-sm border border-line bg-cream px-4 py-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Name" htmlFor={`n-${option.id}`}>
              <input id={`n-${option.id}`} className={rowInput + " w-full py-2"}
                value={name} onChange={(e) => setName(e.target.value)} />
            </Field>
            {option.builtIn !== "INSTAPAY" && (
              <Field label="Details for the customer" htmlFor={`i-${option.id}`}>
                <input id={`i-${option.id}`} className={rowInput + " w-full py-2"}
                  value={instructions} onChange={(e) => setInstructions(e.target.value)} />
              </Field>
            )}
          </div>

          {!integrated && option.builtIn !== "CASH" && (
            <label className="mt-3 flex items-center gap-2.5 text-[14px] text-ink">
              <input type="checkbox" checked={verify} onChange={(e) => setVerify(e.target.checked)}
                className="h-4 w-4 accent-[#A87E2E]" />
              The money comes before delivery
            </label>
          )}

          <div className="mt-3 flex flex-wrap items-center gap-3">
            <button type="button" disabled={state.pending}
              onClick={() => state.run(async () => {
                const r = await savePaymentOption(option.id, {
                  nameEn: name, instructionsEn: instructions,
                  kind: option.kind, verifyBeforeDelivery: verify,
                });
                if (r.ok) setOpen(false);
                return r;
              })}
              className="rounded-full border border-line bg-cream-warm px-4 py-1.5 text-[13.5px] text-ink-soft hover:border-gold">
              Save
            </button>
            {!option.builtIn && (
              <button type="button" disabled={state.pending}
                onClick={() => state.run(() => removePaymentOption(option.id))}
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

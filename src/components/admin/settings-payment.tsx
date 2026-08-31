"use client";

import { SettingCard, Field, Switch, input, useSettingsForm } from "./settings-bits";

/**
 * Payment.
 *
 * Cash and InstaPay, both settled by hand. Card is built but paused, and it is
 * described here honestly rather than shown as a switch that does nothing.
 */
export function PaymentSettings({ values, cardPaused }: {
  values: {
    payment_cash_enabled: string;
    payment_instapay_enabled: string;
    instapay_number: string;
    instapay_account_details: string;
  };
  cardPaused: boolean;
}) {
  const methods = useSettingsForm({
    payment_cash_enabled: values.payment_cash_enabled,
    payment_instapay_enabled: values.payment_instapay_enabled,
  });
  const instapay = useSettingsForm({
    instapay_number: values.instapay_number,
    instapay_account_details: values.instapay_account_details,
  });

  return (
    <div className="grid max-w-3xl gap-6">
      <SettingCard
        title="How customers can pay"
        note="Both are settled by hand: cash when the food arrives, InstaPay when you have seen the transfer."
        state={methods.state}
        onSave={() => methods.save()}
      >
        <div className="grid gap-4">
          <Switch
            on={methods.values.payment_cash_enabled !== "false"}
            onChange={(v) => methods.set({ payment_cash_enabled: v ? "true" : "false" })}
            title="Cash"
            body="Reads as cash on delivery, or payment on pickup, depending on the order."
          />
          <Switch
            on={methods.values.payment_instapay_enabled !== "false"}
            onChange={(v) => methods.set({ payment_instapay_enabled: v ? "true" : "false" })}
            title="InstaPay"
            body="The order arrives awaiting verification. It becomes paid when you say you have seen the money — never automatically."
          />
        </div>
      </SettingCard>

      <SettingCard
        title="Your InstaPay details"
        note="Shown to the customer at checkout when they choose InstaPay, and on their confirmation."
        state={instapay.state}
        onSave={() => instapay.save()}
      >
        <div className="grid gap-5">
          <Field label="Transfer to" htmlFor="ipn" hint="The number or address customers send to.">
            <input id="ipn" className={input}
              value={instapay.values.instapay_number}
              onChange={(e) => instapay.set({ instapay_number: e.target.value })} />
          </Field>
          <Field label="Anything else to say" htmlFor="ipd" hint="Optional. A name to send to, a note about the reference.">
            <input id="ipd" className={input} placeholder="Nothing extra"
              value={instapay.values.instapay_account_details}
              onChange={(e) => instapay.set({ instapay_account_details: e.target.value })} />
          </Field>
        </div>
      </SettingCard>

      <SettingCard title="Card payments" state={instapay.state}>
        <p className="text-[14.5px] leading-relaxed text-ink-soft">
          {cardPaused
            ? "Paused, as agreed. The integration is built and tested against the provider's test mode, but card is not offered to customers and no card details are ever handled by this site."
            : "Card is switched on in code, and is offered only where the provider's keys are set."}
        </p>
        <p className="mt-3 text-[13.5px] leading-relaxed text-ink-faint">
          Turning it back on is a deliberate step: it needs the provider's keys added to the
          deployment, and a decision from you. It is not a switch on this page for that reason.
        </p>
      </SettingCard>
    </div>
  );
}

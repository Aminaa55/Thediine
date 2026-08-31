"use client";

import { SettingCard, Field, Switch, ToDecide, input, useSettingsForm } from "./settings-bits";

/**
 * Serving setup.
 *
 * The choice itself is live: every order says whether it goes out in your own
 * dishes or in disposable ones. The policy behind returnable dishes has not
 * been written, so nothing here invents a deposit, a return period or a fee.
 * The fields exist, empty, so a decision can be recorded the day it is made.
 */
export function ServingSettings({ values }: {
  values: {
    serving_returnable_enabled: string;
    serving_disposable_enabled: string;
    serving_setup_policy_en: string;
    returnable_deposit_piastres: string;
    returnable_return_days: string;
    returnable_late_fee_piastres: string;
  };
}) {
  const offered = useSettingsForm({
    serving_returnable_enabled: values.serving_returnable_enabled,
    serving_disposable_enabled: values.serving_disposable_enabled,
  });
  const policy = useSettingsForm({
    serving_setup_policy_en: values.serving_setup_policy_en,
  });
  const terms = useSettingsForm({
    returnable_deposit_piastres:
      values.returnable_deposit_piastres === "" ? "" : String(Number(values.returnable_deposit_piastres) / 100),
    returnable_return_days: values.returnable_return_days,
    returnable_late_fee_piastres:
      values.returnable_late_fee_piastres === "" ? "" : String(Number(values.returnable_late_fee_piastres) / 100),
  });

  return (
    <div className="grid max-w-3xl gap-6">
      <SettingCard
        title="What customers can choose"
        note="Asked on every order, regular and event alike."
        state={offered.state}
        onSave={() => offered.save()}
      >
        <div className="grid gap-4">
          <Switch
            on={offered.values.serving_returnable_enabled !== "false"}
            onChange={(v) => offered.set({ serving_returnable_enabled: v ? "true" : "false" })}
            title="Returnable dishes"
            body="Served in your own dishes, which you collect afterwards."
          />
          <Switch
            on={offered.values.serving_disposable_enabled !== "false"}
            onChange={(v) => offered.set({ serving_disposable_enabled: v ? "true" : "false" })}
            title="Disposable dishes"
            body="Served in disposable containers — nothing to return."
          />
        </div>
      </SettingCard>

      <SettingCard
        title="What customers are told"
        note="Shown under the choice at checkout. Empty means nothing is said, which is the case today."
        state={policy.state}
        onSave={() => policy.save()}
      >
        <Field label="The returnable-dish policy" htmlFor="policy" full
          hint="In your own words. For example, when you collect the dishes and what happens if one is not ready.">
          <textarea id="policy" rows={3} className={input}
            placeholder="Nothing is shown to customers yet"
            value={policy.values.serving_setup_policy_en}
            onChange={(e) => policy.set({ serving_setup_policy_en: e.target.value })} />
        </Field>
        {!values.serving_setup_policy_en.trim() && (
          <ToDecide>
            Customers can choose returnable dishes but are told nothing about returning them. Write
            a line here whenever you are ready — nothing has been made up in the meantime.
          </ToDecide>
        )}
      </SettingCard>

      <SettingCard
        title="Deposit, return period and late fee"
        note="Not decided, and not invented. Record a decision here when you make one — nothing is charged, shown to a customer or enforced from these until we build them in and you say so."
        state={terms.state}
        onSave={() => terms.save()}
        saveLabel="Record these"
      >
        <div className="grid gap-5 sm:grid-cols-3">
          <Field label="Deposit" htmlFor="dep" hint="In EGP. Empty means none.">
            <input id="dep" className={input} inputMode="decimal" placeholder="Not decided"
              value={terms.values.returnable_deposit_piastres}
              onChange={(e) => terms.set({ returnable_deposit_piastres: e.target.value })} />
          </Field>
          <Field label="Return within" htmlFor="days" hint="In days. Empty means none.">
            <input id="days" className={input} inputMode="numeric" placeholder="Not decided"
              value={terms.values.returnable_return_days}
              onChange={(e) => terms.set({ returnable_return_days: e.target.value })} />
          </Field>
          <Field label="Late fee" htmlFor="late" hint="In EGP. Empty means none.">
            <input id="late" className={input} inputMode="decimal" placeholder="Not decided"
              value={terms.values.returnable_late_fee_piastres}
              onChange={(e) => terms.set({ returnable_late_fee_piastres: e.target.value })} />
          </Field>
        </div>
        <p className="mt-4 text-[13.5px] leading-relaxed text-ink-faint">
          These three are recorded only. Tell me what they should be and how they should work, and
          they become real: shown at checkout, and part of what an order records.
        </p>
      </SettingCard>
    </div>
  );
}

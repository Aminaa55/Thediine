"use client";

import { SectionHead, SettingCard, Field, Switch, input, useSettingsForm } from "./settings-bits";

/**
 * Ordering: how much warning you need, how much you can cook, and what a
 * cancellation costs. Three decisions, saved separately.
 */
export function OrderingSettings({ values }: {
  values: {
    normal_notice_hours: string;
    normal_daily_capacity: string;
    pickup_counts_toward_capacity: string;
    minimum_order_value_piastres: string;
    normal_free_cancellation_hours: string;
    event_free_cancellation_hours: string;
    late_cancellation_percent: string;
    customer_self_cancel_enabled: string;
  };
}) {
  const notice = useSettingsForm({
    normal_notice_hours: values.normal_notice_hours,
    normal_daily_capacity: values.normal_daily_capacity,
    pickup_counts_toward_capacity: values.pickup_counts_toward_capacity,
  });
  const minimum = useSettingsForm({
    minimum_order_value_piastres:
      values.minimum_order_value_piastres === "" || values.minimum_order_value_piastres === "0"
        ? ""
        : String(Number(values.minimum_order_value_piastres) / 100),
  });
  const cancel = useSettingsForm({
    normal_free_cancellation_hours: values.normal_free_cancellation_hours,
    event_free_cancellation_hours: values.event_free_cancellation_hours,
    late_cancellation_percent: values.late_cancellation_percent,
    customer_self_cancel_enabled: values.customer_self_cancel_enabled,
  });

  const hours = Number(notice.values.normal_notice_hours || 0);
  const inDays = hours % 24 === 0 && hours >= 24
    ? `${hours / 24} day${hours === 24 ? "" : "s"}`
    : `${hours} hours`;

  return (
    <div className="grid max-w-2xl gap-4">
      <SectionHead title="Ordering" />

      <SettingCard
        title="Notice and capacity"
        note="Checked when a customer picks a date, and again when the order is written."
        state={notice.state}
        onSave={() => notice.save()}
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Notice, in hours" htmlFor="notice" hint={`That is ${inDays}.`}>
            <input id="notice" className={input} inputMode="numeric"
              value={notice.values.normal_notice_hours}
              onChange={(e) => notice.set({ normal_notice_hours: e.target.value })} />
          </Field>
          <Field label="Orders a day" htmlFor="cap">
            <input id="cap" className={input} inputMode="numeric"
              value={notice.values.normal_daily_capacity}
              onChange={(e) => notice.set({ normal_daily_capacity: e.target.value })} />
          </Field>
        </div>
        <div className="mt-4">
          <Switch
            on={notice.values.pickup_counts_toward_capacity !== "false"}
            onChange={(v) => notice.set({ pickup_counts_toward_capacity: v ? "true" : "false" })}
            title="A pickup counts towards the day"
          />
        </div>
      </SettingCard>

      <SettingCard
        title="Minimum order"
        note="Empty means no minimum, which is what you said."
        state={minimum.state}
        onSave={() => minimum.save()}
      >
        <Field label="Minimum order" htmlFor="min" hint="In EGP.">
          <input id="min" className={`${input} max-w-[10rem]`} inputMode="decimal" placeholder="No minimum"
            value={minimum.values.minimum_order_value_piastres}
            onChange={(e) => minimum.set({ minimum_order_value_piastres: e.target.value })} />
        </Field>
      </SettingCard>

      <SettingCard
        title="Cancelling"
        note="Inside the window costs nothing. Outside it, the charge is recorded on the order and never taken automatically."
        state={cancel.state}
        onSave={() => cancel.save()}
      >
        <div className="grid gap-4 sm:grid-cols-3">
          <Field label="Free window, orders" htmlFor="nfree" hint="Hours before.">
            <input id="nfree" className={input} inputMode="numeric"
              value={cancel.values.normal_free_cancellation_hours}
              onChange={(e) => cancel.set({ normal_free_cancellation_hours: e.target.value })} />
          </Field>
          <Field label="Free window, events" htmlFor="efree" hint="Hours before.">
            <input id="efree" className={input} inputMode="numeric"
              value={cancel.values.event_free_cancellation_hours}
              onChange={(e) => cancel.set({ event_free_cancellation_hours: e.target.value })} />
          </Field>
          <Field label="Late cancellation" htmlFor="pct" hint="% of the total.">
            <input id="pct" className={input} inputMode="numeric"
              value={cancel.values.late_cancellation_percent}
              onChange={(e) => cancel.set({ late_cancellation_percent: e.target.value })} />
          </Field>
        </div>
        <div className="mt-4">
          <Switch
            on={cancel.values.customer_self_cancel_enabled !== "false"}
            onChange={(v) => cancel.set({ customer_self_cancel_enabled: v ? "true" : "false" })}
            title="Customers can cancel their own order"
            body="Off — cancelling is done here, so there is always a conversation."
          />
        </div>
      </SettingCard>
    </div>
  );
}

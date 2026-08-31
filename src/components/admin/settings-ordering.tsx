"use client";

import { SettingCard, Field, Switch, ToDecide, input, useSettingsForm } from "./settings-bits";

/**
 * Ordering.
 *
 * Three separate decisions, saved separately: how much warning you need, how
 * much you can cook in a day, and what happens when someone cancels.
 */
export function OrderingSettings({ values }: {
  values: {
    normal_notice_hours: string;
    normal_daily_capacity: string;
    pickup_counts_toward_capacity: string;
    normal_cutoff_time: string;
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
    // Held in piastres, typed in pounds.
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
  const inDays = hours % 24 === 0 ? `${hours / 24} day${hours === 24 ? "" : "s"}` : `${hours} hours`;

  return (
    <div className="grid max-w-3xl gap-6">
      <SettingCard
        title="How much notice you need"
        note="A regular order cannot be for a date sooner than this. It is checked when the customer picks a date and again when the order is written."
        state={notice.state}
        onSave={() => notice.save()}
      >
        <div className="grid gap-5 sm:grid-cols-2">
          <Field label="Notice, in hours" htmlFor="notice" hint={`That is ${inDays}.`}>
            <input id="notice" className={input} inputMode="numeric"
              value={notice.values.normal_notice_hours}
              onChange={(e) => notice.set({ normal_notice_hours: e.target.value })} />
          </Field>
          <Field label="Orders a day" htmlFor="cap" hint="How many regular orders you will cook in one day.">
            <input id="cap" className={input} inputMode="numeric"
              value={notice.values.normal_daily_capacity}
              onChange={(e) => notice.set({ normal_daily_capacity: e.target.value })} />
          </Field>
        </div>
        <div className="mt-5">
          <Switch
            on={notice.values.pickup_counts_toward_capacity !== "false"}
            onChange={(v) => notice.set({ pickup_counts_toward_capacity: v ? "true" : "false" })}
            title="A pickup counts towards the day"
            body="Off means only deliveries fill the day up."
          />
        </div>
      </SettingCard>

      <SettingCard
        title="A daily cut-off time"
        note="Nothing is set, so only the notice period above decides which dates a customer can choose."
        state={notice.state}
      >
        <p className="text-[14.5px] leading-relaxed text-ink-soft">
          A cut-off can mean two quite different things, and they behave differently for the
          customer:
        </p>
        <ul className="mt-3 grid gap-2 text-[14.5px] leading-relaxed text-ink-soft">
          <li>&bull; Orders stop for the following day once this time passes.</li>
          <li>&bull; Orders stop for the day altogether once this time passes.</li>
        </ul>
        <ToDecide>
          Tell me which of those you mean and I will build it. Until then nothing is set, and the
          notice period is the only rule about dates &mdash; which is how the site behaves today.
        </ToDecide>
      </SettingCard>

      <SettingCard
        title="A minimum order"
        note="The business said there is no minimum. Leave it empty to keep it that way."
        state={minimum.state}
        onSave={() => minimum.save()}
      >
        <div className="grid gap-5 sm:grid-cols-2">
          <Field label="Minimum order" htmlFor="min" hint="In EGP. Empty means no minimum.">
            <input id="min" className={input} inputMode="decimal" placeholder="No minimum"
              value={minimum.values.minimum_order_value_piastres}
              onChange={(e) => minimum.set({ minimum_order_value_piastres: e.target.value })} />
          </Field>
        </div>
      </SettingCard>

      <SettingCard
        title="Cancelling"
        note="A cancellation inside the free window costs nothing. Outside it, the charge is worked out and recorded on the order — it is never taken automatically, because there is no deposit and no card on file."
        state={cancel.state}
        onSave={() => cancel.save()}
      >
        <div className="grid gap-5 sm:grid-cols-2">
          <Field label="Free window, regular orders" htmlFor="nfree" hint="In hours before the date.">
            <input id="nfree" className={input} inputMode="numeric"
              value={cancel.values.normal_free_cancellation_hours}
              onChange={(e) => cancel.set({ normal_free_cancellation_hours: e.target.value })} />
          </Field>
          <Field label="Free window, events" htmlFor="efree" hint="In hours before the date.">
            <input id="efree" className={input} inputMode="numeric"
              value={cancel.values.event_free_cancellation_hours}
              onChange={(e) => cancel.set({ event_free_cancellation_hours: e.target.value })} />
          </Field>
          <Field label="Late cancellation" htmlFor="pct" hint="A percentage of the order total.">
            <input id="pct" className={input} inputMode="numeric"
              value={cancel.values.late_cancellation_percent}
              onChange={(e) => cancel.set({ late_cancellation_percent: e.target.value })} />
          </Field>
        </div>
        <div className="mt-5">
          <Switch
            on={cancel.values.customer_self_cancel_enabled !== "false"}
            onChange={(v) => cancel.set({ customer_self_cancel_enabled: v ? "true" : "false" })}
            title="Customers can cancel their own order"
            body="Off — as agreed. Cancelling is done here, by you, so there is always a conversation."
          />
        </div>
      </SettingCard>
    </div>
  );
}

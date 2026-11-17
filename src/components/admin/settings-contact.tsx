"use client";

import { SectionHead, SettingCard, Field, ToDecide, input, useSettingsForm, useSaver } from "./settings-bits";
import { sendTestNotification } from "@/app/admin/settings-actions";
import type { NotifyConfig } from "@/lib/notify";

/**
 * The details the site shows customers: the footer, the WhatsApp links, the
 * confirmation of every order. A detail left empty is not shown at all.
 *
 * Below it, where the business hears about new orders.
 */
export function ContactSettings({ values, notify }: {
  values: {
    whatsapp_number: string;
    contact_instagram: string;
    contact_email: string;
    order_notification_email: string;
  };
  notify: NotifyConfig;
}) {
  const form = useSettingsForm({
    whatsapp_number: values.whatsapp_number,
    contact_instagram: values.contact_instagram,
    contact_email: values.contact_email,
  });
  const alerts = useSettingsForm({
    order_notification_email: values.order_notification_email,
  });
  const test = useSaver();

  const recipient = values.order_notification_email.trim() || values.contact_email.trim();

  return (
    <div className="grid max-w-2xl gap-4">
      <SectionHead title="Business details" />

      <SettingCard
        title="How customers reach you"
        note="Shown in the footer of every page and on every order's confirmation."
        state={form.state}
        onSave={() => form.save()}
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="WhatsApp number" htmlFor="wa" hint="With the country code.">
            <input id="wa" className={input} value={form.values.whatsapp_number}
              onChange={(e) => form.set({ whatsapp_number: e.target.value })} />
          </Field>
          <Field label="Email" htmlFor="em" hint="Empty removes it from the site.">
            <input id="em" className={input} placeholder="None"
              value={form.values.contact_email}
              onChange={(e) => form.set({ contact_email: e.target.value })} />
          </Field>
          <Field label="Instagram" htmlFor="ig" full hint="The full link.">
            <input id="ig" className={input} value={form.values.contact_instagram}
              onChange={(e) => form.set({ contact_instagram: e.target.value })} />
          </Field>
        </div>

        {!values.contact_email.trim() && (
          <ToDecide>No email supplied, so the site shows WhatsApp and Instagram only.</ToDecide>
        )}
      </SettingCard>

      <SettingCard
        title="New order alerts"
        note="Every order and event request placed on the website is emailed here the moment it arrives."
        state={alerts.state}
        onSave={() => alerts.save()}
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Send alerts to" htmlFor="notify" full
            hint="Empty uses the contact email above.">
            <input id="notify" className={input} type="email" placeholder={values.contact_email.trim() || "None"}
              value={alerts.values.order_notification_email}
              onChange={(e) => alerts.set({ order_notification_email: e.target.value })} />
          </Field>
        </div>

        {!notify.configured && (
          <ToDecide>
            Email sending is not set up on the server yet, so no alerts go out. A developer adds a
            RESEND_API_KEY to the deployment to switch it on.
          </ToDecide>
        )}
        {notify.configured && !recipient && (
          <ToDecide>No address yet, so no alerts go out.</ToDecide>
        )}
        {notify.configured && notify.usingTestSender && (
          <ToDecide>
            Alerts are sent from Resend&rsquo;s test address, which only delivers to the email that
            owns the Resend account. Verify a domain and set ORDER_NOTIFY_FROM to send to any address.
          </ToDecide>
        )}

        {notify.configured && recipient && (
          <div className="mt-4 flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={() => test.run(() => sendTestNotification())}
              disabled={test.pending}
              className="rounded-md border border-neutral-300 px-3 py-1.5 text-sm hover:bg-neutral-50 disabled:opacity-50"
            >
              {test.pending ? "Sending…" : `Send a test email to ${recipient}`}
            </button>
            {test.saved && <span className="text-sm text-green-700">Sent. Check the inbox.</span>}
            {test.error && <span className="text-sm text-red-700">{test.error}</span>}
          </div>
        )}
      </SettingCard>
    </div>
  );
}

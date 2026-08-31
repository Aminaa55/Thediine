"use client";

import { SettingCard, Field, ToDecide, input, useSettingsForm } from "./settings-bits";

/**
 * The details the site shows customers.
 *
 * These are read by the website itself — the footer, the WhatsApp links, the
 * confirmation page — so changing one here changes it everywhere. A detail left
 * empty is simply not shown rather than shown as a blank.
 */
export function ContactSettings({ values }: {
  values: { whatsapp_number: string; contact_instagram: string; contact_email: string };
}) {
  const form = useSettingsForm({
    whatsapp_number: values.whatsapp_number,
    contact_instagram: values.contact_instagram,
    contact_email: values.contact_email,
  });

  return (
    <div className="grid max-w-3xl gap-6">
      <SettingCard
        title="How customers reach you"
        note="Shown in the footer of every page, on the confirmation of every order, and wherever the site offers to start a conversation."
        state={form.state}
        onSave={() => form.save()}
      >
        <div className="grid gap-5">
          <Field label="WhatsApp number" htmlFor="wa" hint="With the country code, as you would write it.">
            <input id="wa" className={input} value={form.values.whatsapp_number}
              onChange={(e) => form.set({ whatsapp_number: e.target.value })} />
          </Field>
          <Field label="Instagram" htmlFor="ig" hint="The full link. Empty removes it from the site.">
            <input id="ig" className={input} value={form.values.contact_instagram}
              onChange={(e) => form.set({ contact_instagram: e.target.value })} />
          </Field>
          <Field label="Email" htmlFor="em" hint="Empty removes it from the site.">
            <input id="em" className={input} placeholder="None"
              value={form.values.contact_email}
              onChange={(e) => form.set({ contact_email: e.target.value })} />
          </Field>
        </div>

        {!values.contact_email.trim() && (
          <ToDecide>
            No email address has been supplied, so the site shows WhatsApp and Instagram only. Add
            one whenever you want it shown.
          </ToDecide>
        )}
      </SettingCard>
    </div>
  );
}

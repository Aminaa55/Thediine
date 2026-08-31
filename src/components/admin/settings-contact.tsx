"use client";

import { SectionHead, SettingCard, Field, ToDecide, input, useSettingsForm } from "./settings-bits";

/**
 * The details the site shows customers: the footer, the WhatsApp links, the
 * confirmation of every order. A detail left empty is not shown at all.
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
    </div>
  );
}

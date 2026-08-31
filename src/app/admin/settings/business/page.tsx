import { getSettingsMap } from "@/lib/admin-settings";
import { ContactSettings } from "@/components/admin/settings-contact";
import { HistoryNote } from "@/components/admin/settings-bits";

export const metadata = { title: "Business details · Settings" };

export default async function BusinessSettingsPage() {
  const s = await getSettingsMap();

  return (
    <div>
      <ContactSettings
        values={{
          whatsapp_number: s.whatsapp_number ?? "",
          contact_instagram: s.contact_instagram ?? "",
          contact_email: s.contact_email ?? "",
        }}
      />
      <HistoryNote>
        An order already placed keeps its own record of the customer&rsquo;s details; nothing here
        touches it.
      </HistoryNote>
    </div>
  );
}

import { requireAdminPage } from "@/lib/admin-auth";
import { getSettingsMap } from "@/lib/admin-settings";
import { SettingsHead } from "../head";
import { ContactSettings } from "@/components/admin/settings-contact";
import { HistoryNote } from "@/components/admin/settings-bits";

export const dynamic = "force-dynamic";
export const metadata = { title: "Business details · Settings" };

export default async function ContactSettingsPage() {
  await requireAdminPage();
  const s = await getSettingsMap();

  return (
    <div>
      <SettingsHead
        title="Business details"
        body="The contact details the website shows customers."
      />
      <ContactSettings
        values={{
          whatsapp_number: s.whatsapp_number ?? "",
          contact_instagram: s.contact_instagram ?? "",
          contact_email: s.contact_email ?? "",
        }}
      />
      <HistoryNote>
        These change what the site shows from now on. An order already placed keeps its own record
        of the customer&rsquo;s details, and nothing here touches it.
      </HistoryNote>
    </div>
  );
}

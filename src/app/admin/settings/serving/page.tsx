import { requireAdminPage } from "@/lib/admin-auth";
import { getSettingsMap } from "@/lib/admin-settings";
import { SettingsHead } from "../head";
import { ServingSettings } from "@/components/admin/settings-serving";
import { HistoryNote } from "@/components/admin/settings-bits";

export const dynamic = "force-dynamic";
export const metadata = { title: "Serving setup · Settings" };

export default async function ServingSettingsPage() {
  await requireAdminPage();
  const s = await getSettingsMap();

  return (
    <div>
      <SettingsHead
        title="Serving setup"
        body="Whether food goes out in your own dishes or disposable ones, and what customers are told about returning them."
      />
      <ServingSettings
        values={{
          serving_returnable_enabled: s.serving_returnable_enabled ?? "true",
          serving_disposable_enabled: s.serving_disposable_enabled ?? "true",
          serving_setup_policy_en: s.serving_setup_policy_en ?? "",
          returnable_deposit_piastres: s.returnable_deposit_piastres ?? "",
          returnable_return_days: s.returnable_return_days ?? "",
          returnable_late_fee_piastres: s.returnable_late_fee_piastres ?? "",
        }}
      />
      <HistoryNote>
        Every order records which setup it was placed with. Switching one off here stops it being
        offered from now on and changes nothing about an order already booked.
      </HistoryNote>
    </div>
  );
}

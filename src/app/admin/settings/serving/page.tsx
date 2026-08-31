import { getSettingsMap } from "@/lib/admin-settings";
import { db } from "@/lib/db";
import { ServingSettings } from "@/components/admin/settings-serving";
import { HistoryNote } from "@/components/admin/settings-bits";

export const metadata = { title: "Serving setup · Settings" };

export default async function ServingSettingsPage() {
  const [s, options] = await Promise.all([
    getSettingsMap(),
    db.servingOption.findMany({ orderBy: { sortOrder: "asc" } }),
  ]);

  return (
    <div>
      <ServingSettings
        options={options.map((o) => ({
          id: o.id, builtIn: o.builtIn, nameEn: o.nameEn,
          descriptionEn: o.descriptionEn ?? "", isAvailable: o.isAvailable,
        }))}
        policy={s.serving_setup_policy_en ?? ""}
      />
      <HistoryNote>
        Every order records which option it was placed with, by name. Renaming or retiring one
        never changes an order already booked.
      </HistoryNote>
    </div>
  );
}

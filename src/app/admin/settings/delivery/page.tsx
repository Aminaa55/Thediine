import { requireAdminPage } from "@/lib/admin-auth";
import { getAreas, getSlots, getSettingsMap } from "@/lib/admin-settings";
import { on } from "@/lib/settings";
import { SettingsHead } from "../head";
import { DeliverySettings } from "@/components/admin/settings-delivery";
import { HistoryNote } from "@/components/admin/settings-bits";

export const dynamic = "force-dynamic";
export const metadata = { title: "Delivery & pickup · Settings" };

export default async function DeliverySettingsPage() {
  await requireAdminPage();
  const [areas, slots, s] = await Promise.all([getAreas(), getSlots(), getSettingsMap()]);

  return (
    <div>
      <SettingsHead
        title="Delivery & pickup"
        body="Where you deliver, what you charge for it, whether people can collect, and the times you offer."
      />
      <DeliverySettings
        areas={areas.map((a) => ({
          id: a.id, nameEn: a.nameEn, fee: a.fee, isActive: a.isActive,
          addresses: a._count.addresses,
        }))}
        slots={slots.map((t) => ({
          id: t.id, labelEn: t.labelEn, startTime: t.startTime, endTime: t.endTime,
          isActive: t.isActive, orders: t._count.orders,
        }))}
        pickupEnabled={on(s, "pickup_enabled")}
      />
      <HistoryNote>
        An order copies the area&rsquo;s name, its fee and the time it chose at the moment it is
        placed. Changing a fee here changes what the next order pays and nothing else. An area or a
        time that an order already used cannot be deleted — it can only be switched off.
      </HistoryNote>
    </div>
  );
}

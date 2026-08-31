import { getAreas, getSettingsMap } from "@/lib/admin-settings";
import { on } from "@/lib/settings";
import { DeliverySettings } from "@/components/admin/settings-delivery";
import { HistoryNote } from "@/components/admin/settings-bits";

export const metadata = { title: "Delivery & pickup · Settings" };

export default async function DeliverySettingsPage() {
  const [areas, s] = await Promise.all([getAreas(), getSettingsMap()]);

  return (
    <div>
      <DeliverySettings
        areas={areas.map((a) => ({
          id: a.id, nameEn: a.nameEn, fee: a.fee, isActive: a.isActive,
          addresses: a._count.addresses,
        }))}
        pickupEnabled={on(s, "pickup_enabled")}
        timeFrom={s.order_time_from ?? ""}
        timeUntil={s.order_time_until ?? ""}
      />
      <HistoryNote>
        An order copies the area&rsquo;s name, its fee and the time it chose when it is placed.
        An area an address already uses cannot be deleted — only switched off.
      </HistoryNote>
    </div>
  );
}

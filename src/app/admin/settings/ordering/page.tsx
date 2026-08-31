import { getSettingsMap } from "@/lib/admin-settings";
import { OrderingSettings } from "@/components/admin/settings-ordering";
import { HistoryNote } from "@/components/admin/settings-bits";

export const metadata = { title: "Ordering · Settings" };

export default async function OrderingSettingsPage() {
  const s = await getSettingsMap();

  return (
    <div>
      <OrderingSettings
        values={{
          normal_notice_hours: s.normal_notice_hours ?? "48",
          normal_daily_capacity: s.normal_daily_capacity ?? "3",
          pickup_counts_toward_capacity: s.pickup_counts_toward_capacity ?? "true",
          minimum_order_value_piastres: s.minimum_order_value_piastres ?? "0",
          normal_free_cancellation_hours: s.normal_free_cancellation_hours ?? "24",
          event_free_cancellation_hours: s.event_free_cancellation_hours ?? "48",
          late_cancellation_percent: s.late_cancellation_percent ?? "20",
          customer_self_cancel_enabled: s.customer_self_cancel_enabled ?? "false",
        }}
      />
      <HistoryNote>
        An order keeps the rules it was placed under, including the cancellation charge, which is
        worked out and written onto the order when it is cancelled.
      </HistoryNote>
    </div>
  );
}

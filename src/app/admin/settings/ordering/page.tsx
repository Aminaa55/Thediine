import { requireAdminPage } from "@/lib/admin-auth";
import { getSettingsMap } from "@/lib/admin-settings";
import { SettingsHead } from "../head";
import { OrderingSettings } from "@/components/admin/settings-ordering";
import { HistoryNote } from "@/components/admin/settings-bits";

export const dynamic = "force-dynamic";
export const metadata = { title: "Ordering · Settings" };

export default async function OrderingSettingsPage() {
  await requireAdminPage();
  const s = await getSettingsMap();

  return (
    <div>
      <SettingsHead
        title="Ordering"
        body="How much warning you need, how much you can cook in a day, and what happens when an order is cancelled."
      />
      <OrderingSettings
        values={{
          normal_notice_hours: s.normal_notice_hours ?? "48",
          normal_daily_capacity: s.normal_daily_capacity ?? "3",
          pickup_counts_toward_capacity: s.pickup_counts_toward_capacity ?? "true",
          normal_cutoff_time: s.normal_cutoff_time ?? "",
          minimum_order_value_piastres: s.minimum_order_value_piastres ?? "0",
          normal_free_cancellation_hours: s.normal_free_cancellation_hours ?? "24",
          event_free_cancellation_hours: s.event_free_cancellation_hours ?? "48",
          late_cancellation_percent: s.late_cancellation_percent ?? "20",
          customer_self_cancel_enabled: s.customer_self_cancel_enabled ?? "false",
        }}
      />
      <HistoryNote>
        Changing any of these changes what can be ordered from now on. An order that has already
        been placed keeps the rules it was placed under — including the cancellation charge, which
        is worked out and written onto the order at the moment it is cancelled.
      </HistoryNote>
    </div>
  );
}

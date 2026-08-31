import { requireAdminPage } from "@/lib/admin-auth";
import { getBlockedDates, getSettingsMap } from "@/lib/admin-settings";
import { rulesFrom } from "@/lib/settings";
import { SettingsHead } from "../head";
import { CalendarSettings } from "@/components/admin/settings-calendar";
import { HistoryNote } from "@/components/admin/settings-bits";

export const dynamic = "force-dynamic";
export const metadata = { title: "Calendar · Settings" };

export default async function CalendarSettingsPage() {
  await requireAdminPage();
  const [s, blocked] = await Promise.all([getSettingsMap(), getBlockedDates()]);
  const rules = rulesFrom(s);

  return (
    <div>
      <SettingsHead
        title="Calendar & capacity"
        body="The days you work, the days you have closed, and how many orders a particular day can take."
      />
      <CalendarSettings
        workingDays={rules.workingDays}
        capacity={rules.dailyCapacity}
        blocked={blocked.map((b) => ({
          date: b.date.toISOString().slice(0, 10),
          isClosed: b.isClosed,
          maxOrders: b.maxOrders,
          note: b.note,
          eventOrderId: b.blockedByOrder?.id ?? null,
          eventOrderNumber: b.blockedByOrder?.orderNumber ?? null,
          eventCustomer: b.blockedByOrder?.customerName ?? null,
        }))}
      />
      <HistoryNote>
        Closing a day stops new orders being placed for it. It does not touch an order that is
        already booked for that day — those stay exactly as they are, and you cancel one deliberately
        if you need to.
      </HistoryNote>
    </div>
  );
}

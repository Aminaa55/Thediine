import { getSettingsMap, getCalendarDays, getClosedDates } from "@/lib/admin-settings";
import { rulesFrom } from "@/lib/settings";
import { CalendarSettings } from "@/components/admin/settings-calendar";
import { HistoryNote } from "@/components/admin/settings-bits";

export const metadata = { title: "Calendar · Settings" };

export default async function CalendarSettingsPage() {
  const [s, days, closed] = await Promise.all([
    getSettingsMap(),
    getCalendarDays(),
    getClosedDates(),
  ]);
  const rules = rulesFrom(s);

  return (
    <div>
      <CalendarSettings
        workingDays={rules.workingDays}
        capacity={rules.dailyCapacity}
        days={days}
        closed={closed}
      />
      <HistoryNote>
        Closing a day stops new orders for it. An order already booked for that day is untouched —
        cancel one deliberately if you need to.
      </HistoryNote>
    </div>
  );
}

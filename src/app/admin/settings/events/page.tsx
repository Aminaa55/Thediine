import { requireAdminPage } from "@/lib/admin-auth";
import { getSettingsMap, getSharedLadder } from "@/lib/admin-settings";
import { db } from "@/lib/db";
import { SettingsHead } from "../head";
import { EventSettings } from "@/components/admin/settings-events";
import { HistoryNote } from "@/components/admin/settings-bits";

export const dynamic = "force-dynamic";
export const metadata = { title: "Events · Settings" };

export default async function EventSettingsPage() {
  await requireAdminPage();
  const [s, ladder, withOwn] = await Promise.all([
    getSettingsMap(),
    getSharedLadder(),
    db.product.count({ where: { archivedAt: null, eventTiers: { some: {} } } }),
  ]);

  return (
    <div>
      <SettingsHead
        title="Events"
        body="What an event request needs, what happens if one is cancelled, and how event food is priced by guest count."
      />
      <EventSettings
        values={{
          event_notice_days: s.event_notice_days ?? "5",
          event_max_guests: s.event_max_guests ?? "100",
          event_free_cancellation_hours: s.event_free_cancellation_hours ?? "48",
          late_cancellation_percent: s.late_cancellation_percent ?? "20",
          event_default_capacity_mode: s.event_default_capacity_mode ?? "BLOCK_DAY",
        }}
        ladder={ladder.map((t) => ({
          minGuests: t.minGuests, maxGuests: t.maxGuests, multiplierBp: t.multiplierBp,
        }))}
        dishesWithOwnBands={withOwn}
      />
      <HistoryNote>
        An event order stores the multiplier it was priced at and the price of every dish on it.
        Changing the ladder changes what the next event is quoted; it cannot change one that has
        already been sent.
      </HistoryNote>
    </div>
  );
}

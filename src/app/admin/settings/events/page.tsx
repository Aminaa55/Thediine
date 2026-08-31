import { getSettingsMap, getSharedLadder } from "@/lib/admin-settings";
import { db } from "@/lib/db";
import { EventSettings } from "@/components/admin/settings-events";
import { HistoryNote } from "@/components/admin/settings-bits";

export const metadata = { title: "Events · Settings" };

export default async function EventSettingsPage() {
  const [s, ladder, withOwn, examples] = await Promise.all([
    getSettingsMap(),
    getSharedLadder(),
    db.product.count({ where: { archivedAt: null, eventTiers: { some: {} } } }),
    db.product.findMany({
      where: { archivedAt: null, isAvailable: true, basePrice: { not: null } },
      orderBy: { basePrice: "desc" },
      take: 2,
      select: { nameEn: true, basePrice: true },
    }),
  ]);

  return (
    <div>
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
        reference={Number(s.event_ladder_reference_piastres ?? "100000") || 100000}
        dishesWithOwnBands={withOwn}
        examples={examples.map((p) => ({ name: p.nameEn, price: p.basePrice ?? 0 }))}
      />
      <HistoryNote>
        An event order stores the price of every dish on it and the band it was priced in. Changing
        these prices changes the next quote, never one already sent.
      </HistoryNote>
    </div>
  );
}

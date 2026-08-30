import Link from "next/link";
import { requireAdminPage } from "@/lib/admin-auth";
import { prepForDay, ordersForDay } from "@/lib/admin-queries";
import { Card, StatusPill, TypePill, dayKey } from "@/components/admin/bits";
import { DayPicker, PrepDishRow } from "@/components/admin/kitchen-view";

export const dynamic = "force-dynamic";
export const metadata = { title: "Kitchen" };

type Props = { searchParams: Promise<{ date?: string }> };

/**
 * The Kitchen Prep View.
 *
 * What to cook on one day, totalled by dish — and directly underneath each
 * total, the orders that total is divided between. Both readings at once: the
 * kitchen needs to know how much to make AND who it is for.
 *
 * Only confirmed work appears. An event request nobody has accepted is not
 * something the kitchen should be cooking.
 */
export default async function KitchenPage({ searchParams }: Props) {
  await requireAdminPage();
  const sp = await searchParams;
  const date = /^\d{4}-\d{2}-\d{2}$/.test(sp.date ?? "") ? sp.date! : dayKey(new Date());

  const [dishes, orders] = await Promise.all([prepForDay(date), ordersForDay(date)]);
  const total = dishes.reduce((n, d) => n + d.total, 0);
  const cooking = orders.filter((o) =>
    ["CONFIRMED", "PREPARING", "READY", "OUT_FOR_DELIVERY"].includes(o.status));
  const mixedDay =
    cooking.some((o) => o.type === "EVENT") && cooking.some((o) => o.type === "NORMAL");

  const long = new Date(date + "T00:00:00.000Z").toLocaleDateString("en-GB", {
    weekday: "long", day: "numeric", month: "long", year: "numeric", timeZone: "UTC",
  });

  return (
    <div>
      <div className="print-head hidden">
        <p className="font-display text-[22px] font-semibold">The Diine — prep sheet</p>
        <p className="text-[15px]">{long}</p>
      </div>

      <div className="no-print">
        <p className="eyebrow">Kitchen</p>
        <h1 className="mt-3 font-display text-[30px] font-semibold text-ink">{long}</h1>
        <p className="mt-3 text-[15.5px] text-ink-soft">
          {dishes.length === 0
            ? "Nothing confirmed to cook."
            : `${dishes.length} ${dishes.length === 1 ? "dish" : "dishes"}, ${total} in total, across ${cooking.length} ${cooking.length === 1 ? "order" : "orders"}.`}
        </p>
        <div className="mt-6">
          <DayPicker date={date} />
        </div>
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-[minmax(0,1fr)_310px] lg:items-start">
        <Card title="To cook">
          {dishes.length === 0 ? (
            <p className="text-[15.5px] leading-relaxed text-ink-soft">
              Nothing to cook for this day. Only confirmed orders appear here — an event request
              that has not been accepted is not counted.
            </p>
          ) : (
            <ul>
              {dishes.map((d) => (
                <PrepDishRow key={d.name} dish={d} mixedDay={mixedDay} />
              ))}
            </ul>
          )}
        </Card>

        <div className="no-print lg:sticky lg:top-8">
          <Card title="Orders that day">
            {orders.length === 0 ? (
              <p className="text-[15px] text-ink-soft">None.</p>
            ) : (
              <ul className="grid gap-3">
                {orders.map((o) => (
                  <li key={o.id}>
                    <Link href={`/admin/orders/${o.id}`} className="block rounded-sm border border-line bg-cream px-4 py-3 transition-colors hover:border-gold">
                      <span className="flex flex-wrap items-center gap-2">
                        <span className="font-display text-[15px] font-semibold text-ink">{o.orderNumber}</span>
                        <TypePill type={o.type} />
                        <span className="ms-auto"><StatusPill status={o.status} /></span>
                      </span>
                      <span className="mt-1.5 block text-[14px] text-ink-soft">
                        {o.customerName} · {o.timeSlotLabel ?? "time to confirm"}
                      </span>
                      <span className="block text-[13px] text-ink-faint">
                        {o.type === "EVENT" && o.eventDetail
                          ? `${o.eventDetail.guestCount} guests`
                          : o.fulfilmentType === "PICKUP" ? "Pickup" : "Delivery"}
                      </span>
                      {o.notes && (
                        <span className="mt-2 block border-s-2 border-gold ps-2.5 text-[13px] italic leading-relaxed text-ink-soft">
                          {o.notes}
                        </span>
                      )}
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}

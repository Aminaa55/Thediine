import Link from "next/link";
import { requireAdminPage } from "@/lib/admin-auth";
import { prepForDay, ordersForDay } from "@/lib/admin-queries";
import { Card, StatusPill, TypePill, dayKey } from "@/components/admin/bits";

export const dynamic = "force-dynamic";
export const metadata = { title: "Kitchen" };

type Props = { searchParams: Promise<{ date?: string }> };

/**
 * The Kitchen Prep View.
 *
 * What to cook on one day, added up. The same dish ordered by three people is
 * one line with a total, because that is how it is cooked — but every order it
 * came from is listed underneath, so a special instruction is never lost inside
 * an aggregate.
 *
 * Only confirmed work appears. An event request nobody has accepted is not
 * something the kitchen should be cooking.
 */
export default async function KitchenPage({ searchParams }: Props) {
  await requireAdminPage();
  const sp = await searchParams;
  const date = /^\d{4}-\d{2}-\d{2}$/.test(sp.date ?? "") ? sp.date! : dayKey(new Date());

  const [lines, orders] = await Promise.all([prepForDay(date), ordersForDay(date)]);
  const total = lines.reduce((n, l) => n + l.quantity, 0);

  const shift = (days: number) => {
    const d = new Date(date + "T00:00:00.000Z");
    d.setUTCDate(d.getUTCDate() + days);
    return `/admin/kitchen?date=${dayKey(d)}`;
  };

  return (
    <div>
      <p className="eyebrow">Kitchen</p>
      <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-3">
        <h1 className="font-display text-[30px] font-semibold text-ink">
          {new Date(date + "T00:00:00.000Z").toLocaleDateString("en-GB", {
            weekday: "long", day: "numeric", month: "long", year: "numeric", timeZone: "UTC",
          })}
        </h1>
        <div className="ms-auto flex items-center gap-4">
          <Link href={shift(-1)} className="text-[14.5px] text-ink-soft hover:text-ink">&larr; Day before</Link>
          <Link href={`/admin/kitchen?date=${dayKey(new Date())}`} className="text-[14.5px] text-gold hover:underline">Today</Link>
          <Link href={shift(1)} className="text-[14.5px] text-ink-soft hover:text-ink">Day after &rarr;</Link>
        </div>
      </div>

      <p className="mt-3 text-[15.5px] text-ink-soft">
        {lines.length === 0
          ? "Nothing confirmed to cook."
          : `${lines.length} ${lines.length === 1 ? "dish" : "dishes"}, ${total} in total, across ${orders.length} ${orders.length === 1 ? "order" : "orders"}.`}
      </p>

      <div className="mt-8 grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        <Card title="To cook">
          {lines.length === 0 ? (
            <p className="text-[15.5px] text-ink-soft">
              Nothing to cook for this day. Only confirmed orders appear here — an event request
              that has not been accepted is not counted.
            </p>
          ) : (
            <ul className="divide-y divide-line">
              {lines.map((l) => (
                <li key={l.key} className="py-5 first:pt-0 last:pb-0">
                  <div className="flex items-baseline justify-between gap-5">
                    <div className="min-w-0">
                      <p className="font-display text-[19px] font-semibold text-ink">{l.productName}</p>
                      {l.variantName && <p className="mt-0.5 text-[14.5px] text-ink-soft">{l.variantName}</p>}
                      {l.options.map((o) => (
                        <p key={o} className="text-[13.5px] text-ink-soft">{o}</p>
                      ))}
                    </div>
                    <p className="whitespace-nowrap font-display text-[26px] font-semibold tabular-nums text-ink">
                      &times;{l.quantity}
                    </p>
                  </div>

                  <ul className="mt-3 flex flex-wrap gap-x-5 gap-y-1">
                    {l.orders.map((o, i) => (
                      <li key={`${o.orderNumber}-${i}`} className="text-[13.5px] text-ink-faint">
                        <span className="tabular-nums">{o.orderNumber}</span>
                        <span className="ms-1.5 tabular-nums">&times;{o.quantity}</span>
                        {o.instructions && (
                          <span className="ms-2 italic text-ink-soft">&ldquo;{o.instructions}&rdquo;</span>
                        )}
                      </li>
                    ))}
                  </ul>
                </li>
              ))}
            </ul>
          )}
        </Card>

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
                    {/* An instruction on the order as a whole, not on one dish. */}
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
  );
}

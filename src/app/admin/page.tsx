import Link from "next/link";
import { requireAdminPage } from "@/lib/admin-auth";
import { needsAttention, ordersForDay } from "@/lib/admin-queries";
import { Card, Money, PaymentPill, Stat, StatusPill, TypePill, dayKey } from "@/components/admin/bits";

export const dynamic = "force-dynamic";
export const metadata = { title: "Today" };

/**
 * The first screen of the day.
 *
 * Two questions, in order: is anything waiting on me, and what is going out
 * today. Everything else is a click away.
 */
export default async function AdminHome() {
  const admin = await requireAdminPage();
  const today = dayKey(new Date());

  const [attention, todays] = await Promise.all([needsAttention(), ordersForDay(today)]);

  return (
    <div>
      <p className="eyebrow">Today</p>
      <h1 className="mt-3 font-display text-[30px] font-semibold text-ink">
        Good to see you, {admin.name.split(" ")[0]}
      </h1>

      <div className="mt-8 grid gap-4 sm:grid-cols-3">
        <Stat
          label="Event requests waiting"
          value={attention.eventRequests}
          href="/admin/orders?type=EVENT&status=REQUESTED"
          tone={attention.eventRequests > 0 ? "alert" : "plain"}
        />
        <Stat
          label="Payments to verify"
          value={attention.awaitingPayment}
          href="/admin/orders?payment=AWAITING_VERIFICATION"
          tone={attention.awaitingPayment > 0 ? "alert" : "plain"}
        />
        <Stat
          label="New orders to confirm"
          value={attention.newOrders}
          href="/admin/orders?type=NORMAL&status=NEW"
          tone={attention.newOrders > 0 ? "alert" : "plain"}
        />
      </div>

      <div className="mt-10">
        <Card
          title="Going out today"
          right={
            <Link href={`/admin/kitchen?date=${today}`} className="text-[14px] text-gold hover:underline">
              Kitchen list &rarr;
            </Link>
          }
        >
          {todays.length === 0 ? (
            <p className="text-[15.5px] text-ink-soft">Nothing is due today.</p>
          ) : (
            <ul className="divide-y divide-line-soft">
              {todays.map((o) => (
                <li key={o.id} className="flex flex-wrap items-center gap-x-5 gap-y-2 py-3.5">
                  <Link href={`/admin/orders/${o.id}`} className="font-display text-[16px] font-semibold text-ink hover:text-gold">
                    {o.orderNumber}
                  </Link>
                  <TypePill type={o.type} />
                  <span className="text-[15px] text-ink">{o.customerName}</span>
                  <span className="text-[14px] text-ink-soft">
                    {o.timeSlotLabel ?? "—"} · {o.fulfilmentType === "PICKUP" ? "Pickup" : "Delivery"}
                  </span>
                  <span className="ms-auto flex items-center gap-3">
                    <StatusPill status={o.status} />
                    <PaymentPill status={o.paymentStatus} />
                    <span className="font-display text-[15px] font-semibold text-ink">
                      <Money amount={o.total} />
                    </span>
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </div>
  );
}

import Link from "next/link";
import { requireAdminPage } from "@/lib/admin-auth";
import { needsAttention, ordersForDay, upcomingEvents } from "@/lib/admin-queries";
import { EVENT_TYPE_LABELS, cairoDay } from "@/lib/ordering";
import { Card, Money, PaymentPill, Stat, StatusPill, TypePill, dayKey, longDate } from "@/components/admin/bits";

export const dynamic = "force-dynamic";
export const metadata = { title: "Today" };

/**
 * The first screen of the day.
 *
 * Three questions, in the order they matter: is anything waiting on me, what is
 * going out today, and what is coming. The two lists sit side by side on a wide
 * screen so the page reads as one view rather than a column with air beside it.
 */
export default async function AdminHome() {
  const admin = await requireAdminPage();
  const today = dayKey(new Date());

  const [attention, todays, events] = await Promise.all([
    needsAttention(),
    ordersForDay(today),
    upcomingEvents(5),
  ]);

  return (
    <div>
      <div className="flex flex-wrap items-baseline justify-between gap-x-8 gap-y-2">
        <div>
          <p className="eyebrow">Today</p>
          <h1 className="mt-2 font-display text-[30px] font-semibold text-ink">
            Good to see you, {admin.name.split(" ")[0]}
          </h1>
        </div>
        <p className="text-[15px] text-ink-soft">
          {new Date().toLocaleDateString("en-GB", {
            weekday: "long", day: "numeric", month: "long", timeZone: "Africa/Cairo",
          })}
        </p>
      </div>

      <div className="mt-7 grid gap-4 sm:grid-cols-3">
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

      <div className="mt-8 grid gap-6 lg:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)] lg:items-start">
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
                <li key={o.id}>
                  {/* Two deliberate lines, so nothing wraps unpredictably as the
                      column narrows: who and what, then when and where it stands. */}
                  <Link
                    href={`/admin/orders/${o.id}`}
                    className="-mx-3 block rounded-sm px-3 py-3.5 transition-colors hover:bg-cream"
                  >
                    <span className="flex items-baseline gap-x-3">
                      <span className="font-display text-[16px] font-semibold tabular-nums text-ink">
                        {o.orderNumber}
                      </span>
                      <TypePill type={o.type} />
                      <span className="truncate text-[15px] text-ink">{o.customerName}</span>
                      <span className="ms-auto whitespace-nowrap font-display text-[15.5px] font-semibold text-ink">
                        <Money amount={o.total} />
                      </span>
                    </span>
                    <span className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1.5">
                      <span className="text-[13.5px] text-ink-faint">
                        {o.timeSlotLabel ?? "time to confirm"} ·{" "}
                        {o.fulfilmentType === "PICKUP" ? "Pickup" : "Delivery"}
                      </span>
                      <span className="ms-auto flex items-center gap-2">
                        <StatusPill status={o.status} />
                        <PaymentPill status={o.paymentStatus} />
                      </span>
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Card>

        {/* What is coming, so an event is never a surprise. */}
        <Card
          title="Upcoming events"
          right={
            <Link href="/admin/orders?type=EVENT" className="text-[14px] text-gold hover:underline">
              All events &rarr;
            </Link>
          }
        >
          {events.length === 0 ? (
            <p className="text-[15.5px] text-ink-soft">No events coming up.</p>
          ) : (
            <ul className="divide-y divide-line-soft">
              {events.map((e) => {
                const occasion = e.eventDetail
                  ? e.eventDetail.eventType === "OTHER"
                    ? e.eventDetail.eventTypeOther || "Other"
                    : EVENT_TYPE_LABELS[e.eventDetail.eventType]
                  : "Event";
                const days = Math.round(
                  (e.deliveryDate.getTime() - cairoDay().getTime()) / 86_400_000,
                );
                return (
                  <li key={e.id}>
                    <Link
                      href={`/admin/orders/${e.id}`}
                      className="-mx-3 block rounded-sm px-3 py-3.5 transition-colors hover:bg-cream"
                    >
                      <span className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                        <span className="font-display text-[16px] font-semibold text-ink">
                          {occasion}
                        </span>
                        <span className="text-[14px] text-ink-soft">
                          {e.eventDetail?.guestCount} guests
                        </span>
                        <span className="ms-auto"><StatusPill status={e.status} /></span>
                      </span>
                      <span className="mt-1 flex flex-wrap items-baseline gap-x-3 text-[13.5px] text-ink-faint">
                        <span>{longDate(e.deliveryDate)}</span>
                        <span className="text-ink-soft">
                          {days === 0 ? "today" : days === 1 ? "tomorrow" : `in ${days} days`}
                        </span>
                        <span className="ms-auto tabular-nums">{e.orderNumber}</span>
                      </span>
                      <span className="mt-0.5 block text-[13.5px] text-ink-soft">
                        {e.customerName}
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </Card>
      </div>
    </div>
  );
}

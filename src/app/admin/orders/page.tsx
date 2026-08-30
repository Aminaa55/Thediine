import Link from "next/link";
import { requireAdminPage } from "@/lib/admin-auth";
import { listOrders } from "@/lib/admin-queries";
import { STATUS_LABELS, PAYMENT_LABELS } from "@/lib/admin-orders";
import { Money, PaymentPill, StatusPill, TypePill, longDate } from "@/components/admin/bits";
import { OrderFilterBar } from "@/components/admin/order-filters";
import type { FulfilmentType, OrderStatus, OrderType, PaymentStatus } from "@prisma/client";

export const dynamic = "force-dynamic";
export const metadata = { title: "Orders" };

type Props = {
  searchParams: Promise<{
    type?: string; status?: string; payment?: string; fulfilment?: string;
    from?: string; to?: string; q?: string; all?: string;
  }>;
};

const isDate = (v?: string) => (/^\d{4}-\d{2}-\d{2}$/.test(v ?? "") ? v : undefined);

/**
 * Every order, filtered.
 *
 * Filters live in the address, so a view can be kept, shared or bookmarked —
 * "the payments I still have to check" is a link, not a sequence of clicks.
 */
export default async function OrdersPage({ searchParams }: Props) {
  await requireAdminPage();
  const sp = await searchParams;

  const filters = {
    type: (["NORMAL", "EVENT"].includes(sp.type ?? "") ? sp.type : undefined) as OrderType | undefined,
    status: (sp.status && sp.status in STATUS_LABELS ? sp.status : undefined) as OrderStatus | undefined,
    paymentStatus: (sp.payment && sp.payment in PAYMENT_LABELS ? sp.payment : undefined) as PaymentStatus | undefined,
    fulfilment: (["DELIVERY", "PICKUP"].includes(sp.fulfilment ?? "") ? sp.fulfilment : undefined) as FulfilmentType | undefined,
    dateFrom: isDate(sp.from),
    dateTo: isDate(sp.to),
    q: sp.q,
    // Open orders by default; the finished ones are one click away.
    openOnly: sp.all !== "1" && !sp.status && !sp.payment,
  };

  const orders = await listOrders(filters);

  return (
    <div>
      <p className="eyebrow">Orders</p>
      <h1 className="mt-3 font-display text-[30px] font-semibold text-ink">
        {filters.openOnly ? "Open orders" : "Orders"}
      </h1>

      <OrderFilterBar shown={orders.length} />

      <div className="mt-5 overflow-hidden rounded-sm border border-line bg-cream-warm">
        {orders.length === 0 ? (
          <p className="px-6 py-10 text-center text-[15.5px] text-ink-soft">Nothing matches that.</p>
        ) : (
          <ul className="divide-y divide-line-soft">
            {orders.map((o) => (
              <li key={o.id}>
                <Link href={`/admin/orders/${o.id}`} className="flex flex-wrap items-center gap-x-5 gap-y-2 px-6 py-4 transition-colors hover:bg-cream">
                  <span className="font-display text-[16px] font-semibold text-ink">{o.orderNumber}</span>
                  <TypePill type={o.type} />
                  <span className="min-w-0">
                    <span className="block text-[15px] text-ink">{o.customerName}</span>
                    <span className="block text-[13.5px] text-ink-faint">{o.customerMobile}</span>
                  </span>
                  <span className="text-[14px] text-ink-soft">
                    {longDate(o.deliveryDate)}
                    {o.timeSlotLabel ? ` · ${o.timeSlotLabel}` : ""}
                    <span className="block text-[13px] text-ink-faint">
                      {o.type === "EVENT" && o.eventDetail
                        ? `${o.eventDetail.guestCount} guests`
                        : o.fulfilmentType === "PICKUP" ? "Pickup" : "Delivery"}
                    </span>
                  </span>
                  <span className="ms-auto flex flex-wrap items-center gap-3">
                    <StatusPill status={o.status} />
                    <PaymentPill status={o.paymentStatus} />
                    <span className="font-display text-[15.5px] font-semibold text-ink">
                      <Money amount={o.total} />
                    </span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>

      {orders.length === 100 && (
        <p className="mt-4 text-[13.5px] text-ink-faint">
          Only the first 100 are shown — narrow the filters to see more.
        </p>
      )}
    </div>
  );
}

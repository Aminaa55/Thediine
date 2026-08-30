import Link from "next/link";
import { requireAdminPage } from "@/lib/admin-auth";
import { listOrders } from "@/lib/admin-queries";
import { STATUS_LABELS, PAYMENT_LABELS } from "@/lib/admin-orders";
import { Money, PaymentPill, StatusPill, TypePill, longDate } from "@/components/admin/bits";
import type { OrderStatus, OrderType, PaymentStatus } from "@prisma/client";

export const dynamic = "force-dynamic";
export const metadata = { title: "Orders" };

type Props = {
  searchParams: Promise<{ type?: string; status?: string; payment?: string; date?: string; q?: string; all?: string }>;
};

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
    date: /^\d{4}-\d{2}-\d{2}$/.test(sp.date ?? "") ? sp.date : undefined,
    q: sp.q,
    // Open orders by default; the finished ones are one click away.
    openOnly: sp.all !== "1" && !sp.status && !sp.payment,
  };

  const orders = await listOrders(filters);
  const link = (patch: Record<string, string | undefined>) => {
    const p = new URLSearchParams();
    const merged = { type: sp.type, status: sp.status, payment: sp.payment, date: sp.date, q: sp.q, all: sp.all, ...patch };
    for (const [k, v] of Object.entries(merged)) if (v) p.set(k, v);
    const s = p.toString();
    return `/admin/orders${s ? `?${s}` : ""}`;
  };

  return (
    <div>
      <p className="eyebrow">Orders</p>
      <h1 className="mt-3 font-display text-[30px] font-semibold text-ink">
        {filters.openOnly ? "Open orders" : "Orders"}
      </h1>

      {/* Filters */}
      <div className="mt-7 flex flex-wrap items-center gap-2">
        <Chip href={link({ type: undefined, status: undefined, payment: undefined, all: undefined })}
              on={!sp.type && !sp.status && !sp.payment && sp.all !== "1"}>Open</Chip>
        <Chip href={link({ all: "1", status: undefined, payment: undefined })} on={sp.all === "1"}>All</Chip>
        <Chip href={link({ type: "NORMAL" })} on={sp.type === "NORMAL"}>Normal</Chip>
        <Chip href={link({ type: "EVENT" })} on={sp.type === "EVENT"}>Events</Chip>
        <Chip href={link({ type: "EVENT", status: "REQUESTED" })} on={sp.status === "REQUESTED"}>Requests</Chip>
        <Chip href={link({ payment: "AWAITING_VERIFICATION" })} on={sp.payment === "AWAITING_VERIFICATION"}>
          To verify
        </Chip>

        <form action="/admin/orders" className="ms-auto flex items-center gap-2">
          <input
            type="search" name="q" defaultValue={sp.q ?? ""} placeholder="Number, name or mobile"
            className="w-56 rounded-full border border-line bg-cream-warm px-4 py-2 text-[14.5px] text-ink placeholder:text-ink-faint focus:border-gold focus:outline-none"
          />
          <button type="submit" className="text-[14px] text-gold hover:underline">Search</button>
        </form>
      </div>

      <div className="mt-6 overflow-hidden rounded-sm border border-line bg-cream-warm">
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

      <p className="mt-4 text-[13.5px] text-ink-faint">
        {orders.length} shown{orders.length === 100 ? " — narrow the filters to see more" : ""}.
      </p>
    </div>
  );
}

function Chip({ href, on, children }: { href: string; on: boolean; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className={`rounded-full border px-4 py-1.5 text-[14px] transition-colors ${
        on ? "border-ink bg-ink text-cream" : "border-line bg-cream-warm text-ink-soft hover:border-ink/40"
      }`}
    >
      {children}
    </Link>
  );
}

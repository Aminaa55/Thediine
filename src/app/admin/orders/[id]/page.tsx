import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAdminPage } from "@/lib/admin-auth";
import { getOrder } from "@/lib/admin-queries";
import { db } from "@/lib/db";
import { nextStatuses, cancellationTerms, STATUS_LABELS } from "@/lib/admin-orders";
import { EVENT_TYPE_LABELS } from "@/lib/ordering";
import { formatMultiplier } from "@/lib/event-pricing";
import { formatEGP } from "@/lib/money";
import { Card, Money, PaymentPill, StatusPill, TypePill, longDate } from "@/components/admin/bits";
import { StatusActions, ConfirmEvent, PaymentActions, CancelOrder } from "@/components/admin/order-actions";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Props) {
  const { id } = await params;
  const order = await db.order.findUnique({ where: { id }, select: { orderNumber: true } });
  return { title: order?.orderNumber ?? "Order" };
}

/** One order, everything about it, and everything that can be done to it. */
export default async function OrderPage({ params }: Props) {
  await requireAdminPage();
  const { id } = await params;
  const order = await getOrder(id);
  if (!order) notFound();

  const s = Object.fromEntries((await db.setting.findMany()).map((x) => [x.key, x.value]));
  const terms = cancellationTerms({
    type: order.type,
    deliveryDate: order.deliveryDate,
    total: order.total,
    normalFreeHours: Number(s.normal_free_cancellation_hours ?? 24),
    eventFreeHours: Number(s.event_free_cancellation_hours ?? 48),
    percent: Number(s.late_cancellation_percent ?? 20),
  });

  const detail = order.eventDetail;
  const isEvent = order.type === "EVENT";
  const occasion = detail
    ? detail.eventType === "OTHER" ? detail.eventTypeOther || "Other" : EVENT_TYPE_LABELS[detail.eventType]
    : null;

  const paymentLabel =
    order.paymentMethod === "CASH"
      ? order.fulfilmentType === "PICKUP" ? "Payment on pickup" : "Cash on delivery"
      : order.paymentMethod === "INSTAPAY" ? "InstaPay" : "Card";

  const extras = [
    detail?.decorRequested && "Table décor",
    detail?.setupRequested && "Event setup",
    detail?.servingStaffRequested && "Serving staff",
  ].filter(Boolean) as string[];

  const finished = order.status === "DELIVERED" || order.status === "CANCELLED";

  return (
    <div>
      <Link href="/admin/orders" className="text-[14px] text-ink-faint hover:text-ink">&larr; All orders</Link>

      <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-3">
        <h1 className="font-display text-[30px] font-semibold tabular-nums text-ink">{order.orderNumber}</h1>
        <TypePill type={order.type} />
        <StatusPill status={order.status} />
        <PaymentPill status={order.paymentStatus} />
        <span className="ms-auto font-display text-[24px] font-semibold text-ink">
          <Money amount={order.total} />
        </span>
      </div>

      {order.status === "CANCELLED" && (
        <p className="mt-5 rounded-sm border border-[#A6391C]/30 bg-[#A6391C]/[0.06] px-5 py-4 text-[15px] leading-relaxed text-[#A6391C]">
          Cancelled{order.cancellationReason ? ` — ${order.cancellationReason}` : ""}.
          {order.cancelledWithinFreeWindow === false && order.cancellationCharge
            ? ` A late-cancellation charge of ${formatEGP(order.cancellationCharge)} was recorded (not collected).`
            : " Inside the free window, so nothing was charged."}
        </p>
      )}

      <div className="mt-8 grid gap-6 lg:grid-cols-[minmax(0,1fr)_380px]">
        <div className="grid gap-6">
          {/* --- the order itself --- */}
          <Card title={isEvent ? "The event" : "The order"}>
            <dl className="grid gap-x-8 gap-y-4 sm:grid-cols-2">
              {isEvent && <Row label="Occasion" value={occasion ?? "—"} />}
              <Row label={isEvent ? "Date" : "Wanted for"} value={longDate(order.deliveryDate)} />
              <Row label="Time" value={order.timeSlotLabel ?? "—"} />
              {isEvent && detail && <Row label="Guests" value={`${detail.guestCount}`} />}
              {!isEvent && (
                <Row label="Fulfilment" value={order.fulfilmentType === "PICKUP" ? "Pickup" : "Delivery"} />
              )}
              <Row label="Serving setup" value={order.servingSetup === "RETURNABLE" ? "Returnable dishes" : "Disposable dishes"} />
              {order.addressLine && (
                <Row
                  label={isEvent ? "Venue" : "Address"}
                  value={order.addressDetails ? `${order.addressLine} — ${order.addressDetails}` : order.addressLine}
                  full
                />
              )}
              {order.areaName && <Row label="Area" value={order.areaName} />}
              <Row label="Placed" value={order.createdAt.toLocaleString("en-GB", { timeZone: "Africa/Cairo" })} />
            </dl>

            {order.notes && (
              <p className="mt-5 border-t border-line-soft pt-4 text-[15px] italic leading-relaxed text-ink-soft">
                &ldquo;{order.notes}&rdquo;
              </p>
            )}
          </Card>

          {/* --- the customer --- */}
          <Card title="Customer">
            <dl className="grid gap-x-8 gap-y-4 sm:grid-cols-2">
              <Row label="Name" value={order.customerName} />
              <Row
                label="Mobile"
                value={
                  <a
                    href={`https://wa.me/${order.customerMobile.replace(/^0/, "20")}`}
                    target="_blank" rel="noreferrer"
                    className="text-gold hover:underline"
                  >
                    {order.customerMobile} &rarr; WhatsApp
                  </a>
                }
              />
              {order.customerEmail && <Row label="Email" value={order.customerEmail} />}
            </dl>
          </Card>

          {/* --- the food --- */}
          <Card title={isEvent ? "Dishes for the event" : "Dishes"}>
            <ul className="divide-y divide-line-soft">
              {order.items.map((i) => (
                <li key={i.id} className="py-3.5 first:pt-0 last:pb-0">
                  <div className="flex items-start justify-between gap-5">
                    <div className="min-w-0">
                      <p className="text-[15.5px] text-ink">
                        <span className="tabular-nums text-ink-faint">{i.quantity}&times;</span>{" "}
                        <span className="font-medium">{i.productName}</span>
                        {i.variantName && <span className="text-ink-soft"> · {i.variantName}</span>}
                      </p>
                      {i.options.map((o) => (
                        <p key={o.id} className="mt-0.5 text-[13.5px] text-ink-soft">
                          <span className="text-ink-faint">{o.groupName}:</span> {o.choiceName}
                        </p>
                      ))}
                      {i.instructions && (
                        <p className="mt-1.5 border-s-2 border-gold ps-3 text-[13.5px] italic text-ink-soft">
                          {i.instructions}
                        </p>
                      )}
                    </div>
                    <p className="whitespace-nowrap text-[15px] tabular-nums text-ink">
                      {formatEGP(i.lineTotal)}
                    </p>
                  </div>
                </li>
              ))}
            </ul>

            <dl className="mt-5 border-t border-line pt-4">
              <Line label={isEvent ? "Food subtotal" : "Subtotal"} value={formatEGP(order.subtotal)} />
              {!isEvent && order.fulfilmentType === "DELIVERY" && (
                <Line
                  label="Delivery"
                  value={order.deliveryFee === null ? "Not set — confirm with the customer" : formatEGP(order.deliveryFee)}
                />
              )}
              <Line label="Total" value={formatEGP(order.total)} strong />
            </dl>

            {isEvent && detail?.pricingMultiplierBp && (
              <p className="mt-2 text-[13.5px] text-ink-soft">
                Priced for {detail.guestCount} guests at {formatMultiplier(detail.pricingMultiplierBp)} the regular menu price.
              </p>
            )}
          </Card>

          {/* --- what was asked for on the day --- */}
          {isEvent && (
            <Card title="Anything else for the day?">
              {extras.length === 0 ? (
                <p className="text-[15px] text-ink-soft">Nothing requested.</p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {extras.map((x) => (
                    <span key={x} className="rounded-full border border-gold/45 bg-cream px-3.5 py-1.5 text-[13.5px] text-ink">
                      {x}
                    </span>
                  ))}
                </div>
              )}
              <p className="mt-3 text-[13.5px] leading-relaxed text-ink-faint">
                Quote each of these separately. None of it is in the total above.
              </p>
              {detail?.extrasNotes && (
                <p className="mt-3 border-t border-line-soft pt-3 text-[14.5px] italic text-ink-soft">
                  &ldquo;{detail.extrasNotes}&rdquo;
                </p>
              )}
            </Card>
          )}

          {/* --- the history --- */}
          <Card title="History">
            <ol className="grid gap-3">
              {order.statusEvents.map((e) => (
                <li key={e.id} className="flex flex-wrap items-baseline gap-x-3 text-[14.5px]">
                  <span className="tabular-nums text-ink-faint">
                    {e.createdAt.toLocaleString("en-GB", { timeZone: "Africa/Cairo" })}
                  </span>
                  <span className="text-ink">
                    {e.fromStatus ? `${STATUS_LABELS[e.fromStatus]} → ` : ""}
                    {STATUS_LABELS[e.toStatus]}
                  </span>
                  {e.changedBy && <span className="text-ink-soft">by {e.changedBy.name}</span>}
                  {e.note && <span className="w-full text-[13.5px] text-ink-soft">{e.note}</span>}
                </li>
              ))}
            </ol>
          </Card>
        </div>

        {/* --- the actions --- */}
        <div className="grid gap-6 lg:sticky lg:top-8 lg:self-start">
          {order.status === "REQUESTED" ? (
            <Card title="This is a request">
              <ConfirmEvent orderId={order.id} />
            </Card>
          ) : (
            <Card title="Order status">
              <p className="mb-4 text-[14.5px] text-ink-soft">
                Now: <strong className="font-semibold text-ink">{STATUS_LABELS[order.status]}</strong>
              </p>
              <StatusActions orderId={order.id} next={nextStatuses(order.status, order.fulfilmentType)} />
            </Card>
          )}

          <Card title="Payment">
            <p className="mb-4 text-[14.5px] text-ink-soft">
              {paymentLabel}
              {order.paymentProviderMode === "test" && " · test mode"}
            </p>
            <PaymentActions
              orderId={order.id}
              current={order.paymentStatus}
              reference={order.paymentReference}
              total={order.total}
            />
            {order.paymentVerifiedAt && (
              <p className="mt-4 border-t border-line-soft pt-3 text-[13.5px] text-ink-faint">
                Verified {order.paymentVerifiedAt.toLocaleString("en-GB", { timeZone: "Africa/Cairo" })}.
              </p>
            )}
          </Card>

          {!finished && (
            <div>
              <CancelOrder
                orderId={order.id}
                withinFreeWindow={terms.withinFreeWindow}
                charge={terms.charge}
                percent={terms.percent}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function Row({ label, value, full = false }: { label: string; value: React.ReactNode; full?: boolean }) {
  return (
    <div className={full ? "sm:col-span-2" : undefined}>
      <dt className="text-[11px] uppercase tracking-widest text-ink-faint">{label}</dt>
      <dd className="mt-1 text-[15.5px] text-ink">{value}</dd>
    </div>
  );
}

function Line({ label, value, strong = false }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className={`flex items-baseline justify-between gap-6 py-1.5 ${strong ? "border-t border-line pt-3 mt-2" : ""}`}>
      <dt className={strong ? "font-display text-[17px] font-semibold text-ink" : "text-[14.5px] text-ink-soft"}>{label}</dt>
      <dd className={strong ? "font-display text-[19px] font-semibold tabular-nums text-ink" : "text-[14.5px] tabular-nums text-ink"}>{value}</dd>
    </div>
  );
}

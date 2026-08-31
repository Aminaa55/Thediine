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
import { StatusActions, ConfirmEvent, PaymentActions, CancelOrder, CopyAddress } from "@/components/admin/order-actions";

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
  // Which answer Settings offers first when an event is accepted. The choice
  // itself is still made here, on the event.
  const defaultCapacityMode =
    s.event_default_capacity_mode === "KEEP_DAY_OPEN" ? "KEEP_DAY_OPEN" as const : "BLOCK_DAY" as const;
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

  // Egyptian mobiles are stored as 01x…; WhatsApp wants the country code.
  const whatsapp = `https://wa.me/${order.customerMobile.replace(/^0/, "20")}`;
  const fullAddress = order.addressDetails
    ? `${order.addressLine} — ${order.addressDetails}`
    : (order.addressLine ?? "");

  // Everything the customer asked for, in one place, because it is the thing
  // most easily missed.
  const dishNotes = order.items
    .filter((i) => i.instructions)
    .map((i) => ({ dish: i.productName, text: i.instructions as string }));

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

      {(order.notes || dishNotes.length > 0) && (
        <section className="mt-6 rounded-sm border border-gold bg-gold-pale/45 px-6 py-5">
          <h2 className="text-[11px] uppercase tracking-widest text-gold">Please note</h2>
          {order.notes && (
            <p className="mt-3 text-[16.5px] leading-relaxed text-ink">{order.notes}</p>
          )}
          {dishNotes.length > 0 && (
            <ul className="mt-3 grid gap-1.5">
              {dishNotes.map((n, i) => (
                <li key={i} className="text-[15.5px] leading-relaxed text-ink">
                  <span className="font-semibold">{n.dish}</span> — {n.text}
                </li>
              ))}
            </ul>
          )}
        </section>
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
              <Row label="Placed" value={order.createdAt.toLocaleString("en-GB", { timeZone: "Africa/Cairo" })} />
            </dl>
          </Card>

          {/* --- the customer --- */}
          <Card title="Customer">
            <dl className="grid gap-x-8 gap-y-4 sm:grid-cols-2">
              <Row label="Name" value={order.customerName} />
              <Row label="Mobile" value={<span className="tabular-nums">{order.customerMobile}</span>} />
              {order.customerEmail && <Row label="Email" value={order.customerEmail} />}
            </dl>

            {/* Every order is confirmed on WhatsApp, so it is an action, not a link. */}
            <a
              href={whatsapp}
              target="_blank"
              rel="noreferrer"
              className="mt-5 inline-flex items-center gap-2.5 rounded-full border border-[#2E6B45] bg-[#2E6B45]/[0.08] px-5 py-2.5 text-[15px] text-[#2E6B45] transition-colors hover:bg-[#2E6B45]/[0.16]"
            >
              <svg width="17" height="17" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                <path d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91c0 1.75.46 3.45 1.32 4.95L2 22l5.25-1.38a9.9 9.9 0 0 0 4.79 1.22h.01c5.46 0 9.91-4.45 9.91-9.91C21.96 6.45 17.5 2 12.04 2Zm0 18.15h-.01a8.2 8.2 0 0 1-4.19-1.15l-.3-.18-3.12.82.83-3.04-.2-.31a8.19 8.19 0 0 1-1.26-4.38c0-4.54 3.7-8.23 8.25-8.23a8.23 8.23 0 0 1 8.24 8.24c0 4.54-3.7 8.23-8.24 8.23Zm4.52-6.16c-.25-.12-1.47-.72-1.69-.81-.23-.08-.39-.12-.56.13-.16.24-.64.8-.78.97-.15.16-.29.18-.53.06-.25-.13-1.05-.39-1.99-1.23-.74-.66-1.23-1.47-1.38-1.72-.14-.25-.01-.38.11-.5.11-.11.25-.29.37-.44.13-.15.17-.25.25-.41.08-.17.04-.31-.02-.44-.06-.12-.56-1.35-.76-1.85-.2-.48-.4-.42-.56-.43h-.48c-.16 0-.43.06-.65.31-.22.25-.86.84-.86 2.05s.88 2.38 1 2.54c.13.17 1.73 2.64 4.19 3.7.58.26 1.04.41 1.4.52.59.19 1.13.16 1.55.1.47-.07 1.47-.6 1.67-1.18.21-.58.21-1.07.15-1.18-.06-.11-.22-.17-.47-.29Z" />
              </svg>
              Message {order.customerName.split(" ")[0]} on WhatsApp
            </a>
          </Card>

          {/* --- where it is going --- */}
          {order.addressLine && (
            <Card title={isEvent ? "Venue" : order.fulfilmentType === "PICKUP" ? "Collection" : "Delivery address"}>
              <p className="font-display text-[19px] leading-snug text-ink">{order.addressLine}</p>
              {order.addressDetails && (
                <p className="mt-1.5 text-[15.5px] leading-relaxed text-ink-soft">{order.addressDetails}</p>
              )}
              {order.areaName && (
                <p className="mt-2 text-[14px] text-ink-faint">Area: {order.areaName}</p>
              )}
              <div className="mt-4 flex flex-wrap items-center gap-3">
                <CopyAddress address={fullAddress} />
                <a
                  href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(fullAddress)}`}
                  target="_blank" rel="noreferrer"
                  className="rounded-full border border-line bg-cream px-3.5 py-1 text-[13px] text-ink-soft transition-colors hover:border-gold hover:text-ink"
                >
                  Open in Maps
                </a>
              </div>
            </Card>
          )}

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

          {/* --- what has happened to it, in order --- */}
          <Card title="History">
            <ol className="relative ms-2 border-s border-line">
              {order.statusEvents.map((e, i) => {
                const last = i === order.statusEvents.length - 1;
                return (
                  <li key={e.id} className="relative ps-6 pb-5 last:pb-0">
                    <span
                      aria-hidden="true"
                      className={`absolute -start-[5px] top-1.5 h-2.5 w-2.5 rounded-full border ${
                        last ? "border-gold bg-gold" : "border-line bg-cream-warm"
                      }`}
                    />
                    <p className="font-display text-[16px] font-semibold text-ink">
                      {STATUS_LABELS[e.toStatus]}
                      {e.fromStatus && (
                        <span className="ms-2 font-body text-[13.5px] font-normal text-ink-faint">
                          from {STATUS_LABELS[e.fromStatus].toLowerCase()}
                        </span>
                      )}
                    </p>
                    <p className="mt-0.5 text-[13.5px] text-ink-soft">
                      <span className="tabular-nums">
                        {e.createdAt.toLocaleString("en-GB", {
                          weekday: "short", day: "numeric", month: "short",
                          hour: "2-digit", minute: "2-digit", timeZone: "Africa/Cairo",
                        })}
                      </span>
                      {" · "}
                      {e.changedBy ? e.changedBy.name : "the customer, on the website"}
                    </p>
                    {e.note && (
                      <p className="mt-1 text-[14px] leading-relaxed text-ink-soft">{e.note}</p>
                    )}
                  </li>
                );
              })}
            </ol>
          </Card>
        </div>

        {/* --- the actions --- */}
        <div className="grid gap-6 lg:sticky lg:top-8 lg:self-start">
          {order.status === "REQUESTED" ? (
            <Card title="This is a request">
              <ConfirmEvent orderId={order.id} defaultMode={defaultCapacityMode} />
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
              method={order.paymentMethod}
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

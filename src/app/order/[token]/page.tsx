import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { formatEGP } from "@/lib/money";
import { formatMultiplier } from "@/lib/event-pricing";
import { EVENT_TYPE_LABELS } from "@/lib/ordering";
import { getRules, getContact } from "@/lib/settings";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Your order" };

/**
 * The confirmation.
 *
 * Reached by an unguessable token rather than the order number, so nobody can
 * read somebody else's order by counting upwards.
 *
 * It states the order status and the payment status SEPARATELY, because they
 * are separate: an order can be confirmed and unpaid, or paid and not yet
 * cooked.
 */
type Props = { params: Promise<{ token: string }> };

const ORDER_STATUS: Record<string, { label: string; body: string }> = {
  REQUESTED: {
    label: "Requested",
    body: "We have your request. Nothing is booked until we confirm it with you personally.",
  },
  NEW: { label: "Received", body: "We have your order and will confirm it with you shortly." },
  CONFIRMED: { label: "Confirmed", body: "Your order is confirmed and in the book." },
  PREPARING: { label: "Being prepared", body: "We are cooking." },
  READY: { label: "Ready", body: "Your order is ready." },
  OUT_FOR_DELIVERY: { label: "On the way", body: "Your order is on its way to you." },
  DELIVERED: { label: "Delivered", body: "Delivered. Thank you." },
  CANCELLED: { label: "Cancelled", body: "This order was cancelled." },
};

const PAYMENT_STATUS: Record<string, { label: string; body: string }> = {
  UNPAID: { label: "Unpaid", body: "Nothing has been charged." },
  AWAITING_VERIFICATION: {
    label: "Awaiting verification",
    body: "We check the transfer and confirm it with you. Until then this is not marked as paid.",
  },
  PARTIALLY_PAID: {
    label: "Deposit received",
    body: "Your deposit is confirmed. The remaining amount is paid when you receive your order.",
  },
  PAID: { label: "Paid", body: "We have received your payment." },
  // Kept for completeness; a card payment that fails simply stays UNPAID.
  REFUNDED: { label: "Refunded", body: "This payment was refunded." },
};

export default async function OrderPage({ params }: Props) {
  const [rules, contact] = await Promise.all([getRules(), getContact()]);
  const whatsapp = contact.whatsapp.replace(/[^0-9]/g, "");
  const { token } = await params;
  const order = await db.order.findUnique({
    where: { publicToken: token },
    include: {
      items: { include: { options: true } },
      eventDetail: true,
    },
  });
  if (!order) notFound();

  const isEvent = order.type === "EVENT";
  const status = ORDER_STATUS[order.status] ?? ORDER_STATUS.NEW;
  const payment = PAYMENT_STATUS[order.paymentStatus] ?? PAYMENT_STATUS.UNPAID;
  const detail = order.eventDetail;
  const occasion = detail
    ? detail.eventType === "OTHER"
      ? detail.eventTypeOther || "Other"
      : EVENT_TYPE_LABELS[detail.eventType]
    : null;

  /**
   * What this order was actually placed with.
   *
   * The name is the one saved onto the order, so a method the business added
   * itself reads as itself, and renaming one later never rewrites this page.
   */
  const methodName =
    order.paymentMethodLabel
    ?? (order.paymentMethod === "CASH" ? "Cash"
      : order.paymentMethod === "INSTAPAY" ? "InstaPay"
      : order.paymentMethod === "CARD" ? "Card" : "Payment");

  const paymentLabel =
    order.paymentMethod === "CASH"
      ? order.fulfilmentType === "PICKUP"
        ? "Payment on pickup"
        : "Cash on delivery"
      : order.paymentMethod === "CARD" && order.paymentProviderMode === "test"
        ? `${methodName} (test mode)`
        : methodName;

  const servingLabel =
    order.servingSetupLabel
    ?? (order.servingSetup === "RETURNABLE" ? "Returnable dishes" : "Disposable dishes");

  /** Money expected before the food is: that is what awaiting verification means. */
  const paidUpFront =
    order.paymentStatus === "AWAITING_VERIFICATION" || !!order.paymentInstructions;

  // A deposit order carries its own snapshot of what was due; everything else
  // — cash, card, an order placed before this existed — has none.
  const remaining = order.depositAmount !== null ? order.total - order.depositAmount : null;
  const depositPending = order.depositAmount !== null && order.paymentStatus === "AWAITING_VERIFICATION";

  // A card payment that did not go through leaves the order placed and unpaid.
  const cardUnpaid = order.paymentMethod === "CARD" && order.paymentStatus === "UNPAID";

  const extras = [
    detail?.decorRequested && "Table décor",
    detail?.setupRequested && "Event setup",
    detail?.servingStaffRequested && "Serving staff",
  ].filter(Boolean) as string[];

  return (
    <div className="mx-auto max-w-2xl px-5 py-12 sm:px-8 sm:py-16">
      <p className="eyebrow">{isEvent ? "Event request sent" : "Order placed"}</p>
      <h1 className="mt-3 font-display text-[32px] font-semibold leading-tight text-ink sm:text-[40px]">
        {isEvent ? "Thank you — we have your request" : "Thank you — we have your order"}
      </h1>

      <div className="mt-8 rounded-sm border border-gold/45 bg-gold-pale/35 px-6 py-6">
        <p className="text-[11px] uppercase tracking-widest text-gold">Your order number</p>
        <p className="mt-2 font-display text-[30px] font-semibold tabular-nums text-ink">
          {order.orderNumber}
        </p>
        <p className="mt-3 text-[15px] leading-relaxed text-ink-soft">
          Keep this to hand — it is how we find your order when you message us.
        </p>
      </div>

      {cardUnpaid && (
        <div className="mt-6 rounded-sm border border-[#A6391C]/30 bg-[#A6391C]/[0.06] px-6 py-5">
          <p className="font-display text-[18px] font-semibold text-ink">
            The card payment did not go through
          </p>
          <p className="mt-2 text-[15px] leading-relaxed text-ink-soft">
            Your order is placed and safe — it is simply still unpaid. We will agree the payment
            with you when we confirm the order.
          </p>
        </div>
      )}

      {/* What they were told to do to pay, as it stood when they ordered. */}
      {order.paymentStatus === "AWAITING_VERIFICATION" && order.paymentInstructions && (
        <div className="mt-6 rounded-sm border border-gold/40 bg-gold-pale/35 px-6 py-5">
          <p className="text-[11px] uppercase tracking-widest text-gold">{methodName}</p>
          <p className="mt-2 whitespace-pre-line text-[16px] leading-relaxed text-ink">
            {order.paymentInstructions}
          </p>

          {depositPending && (
            <>
              <p className="mt-4 border-t border-gold/30 pt-4 text-[15px] leading-relaxed text-ink">
                A 50% deposit is required to confirm your order. Please transfer the deposit via{" "}
                {methodName} — the remaining 50% is paid when you receive your order.
              </p>
              <dl className="mt-4 grid gap-2">
                <DepositRow label="Order total" value={order.total} />
                <DepositRow label="Deposit due now" value={order.depositAmount!} strong />
                <DepositRow label="Remaining on receipt" value={remaining!} />
              </dl>
            </>
          )}

          <p className="mt-4 text-[14px] leading-relaxed text-ink-soft">
            Send us the reference once you have paid and we will confirm it.
          </p>
        </div>
      )}

      {/* Once the deposit is confirmed, the split stays visible — just without
          the call to transfer, since that part is already done. */}
      {order.depositAmount !== null && !depositPending && (
        <div className="mt-6 rounded-sm border border-line bg-cream-warm px-6 py-5">
          <p className="text-[11px] uppercase tracking-widest text-ink-faint">Deposit</p>
          <dl className="mt-3 grid gap-2">
            <DepositRow label="Order total" value={order.total} />
            <DepositRow label="Deposit received" value={order.depositAmount} strong />
            <DepositRow label="Remaining on receipt" value={remaining!} />
          </dl>
        </div>
      )}

      {/* Two statuses, side by side, because they move independently. */}
      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        <div className="rounded-sm border border-line bg-cream-warm px-5 py-5">
          <p className="text-[11px] uppercase tracking-widest text-ink-faint">Order status</p>
          <p className="mt-2 font-display text-[19px] font-semibold text-ink">{status.label}</p>
          <p className="mt-2 text-[14px] leading-relaxed text-ink-soft">{status.body}</p>
        </div>
        <div className="rounded-sm border border-line bg-cream-warm px-5 py-5">
          <p className="text-[11px] uppercase tracking-widest text-ink-faint">Payment status</p>
          <p className="mt-2 font-display text-[19px] font-semibold text-ink">{payment.label}</p>
          <p className="mt-2 text-[14px] leading-relaxed text-ink-soft">{payment.body}</p>
        </div>
      </div>

      <section className="mt-10 rounded-sm border border-line bg-cream-warm px-6 py-6 sm:px-8">
        <h2 className="font-display text-[21px] font-semibold text-ink">
          {isEvent ? "Your event" : "Your order"}
        </h2>

        <dl className="mt-5">
          {isEvent && <Row label="Occasion" value={occasion ?? "—"} />}
          <Row
            label={isEvent ? "Date" : order.fulfilmentType === "PICKUP" ? "Pickup date" : "Delivery date"}
            value={longDate(order.deliveryDate)}
          />
          <Row label="Time" value={order.timeSlotLabel ?? "—"} />
          {isEvent && detail && <Row label="Guests" value={`${detail.guestCount} people`} />}
          {!isEvent && (
            <Row label="Fulfilment" value={order.fulfilmentType === "PICKUP" ? "Pickup" : "Delivery"} />
          )}
          {order.addressLine && (
            <Row label={isEvent ? "Venue" : "Address"} value={
              order.addressDetails ? `${order.addressLine} — ${order.addressDetails}` : order.addressLine
            } />
          )}
          {order.areaName && <Row label="Area" value={order.areaName} />}
          <Row label="Serving setup" value={servingLabel} />
          <Row label="Name" value={order.customerName} />
          <Row label="Mobile" value={order.customerMobile} />
          {order.customerEmail && <Row label="Email" value={order.customerEmail} />}
          <Row label="Payment method" value={paymentLabel} />
          {order.paymentReference && <Row label="Transfer reference" value={order.paymentReference} />}
          {order.paymentTransactionId && (
            <Row label="Payment reference" value={order.paymentTransactionId} />
          )}
        </dl>

        <h3 className="mt-8 text-[11px] uppercase tracking-widest text-ink-faint">Dishes</h3>
        <ul className="mt-3">
          {order.items.map((i) => (
            <li key={i.id} className="border-b border-line-soft py-3 last:border-0">
              <div className="flex items-start justify-between gap-4">
                <span className="min-w-0 text-[15.5px] text-ink">
                  <span className="tabular-nums text-ink-faint">{i.quantity}&times;</span>{" "}
                  {i.productName}
                  {i.variantName && <span className="text-ink-soft"> · {i.variantName}</span>}
                </span>
                <span className="whitespace-nowrap text-[15.5px] tabular-nums text-ink">
                  {formatEGP(i.lineTotal)}
                </span>
              </div>
              {i.options.map((o) => (
                <p key={o.id} className="mt-0.5 text-[13.5px] text-ink-soft">
                  <span className="text-ink-faint">{o.groupName}:</span> {o.choiceName}
                </p>
              ))}
              {i.instructions && (
                <p className="mt-1 border-s-2 border-line ps-3 text-[13.5px] italic text-ink-soft">
                  {i.instructions}
                </p>
              )}
            </li>
          ))}
        </ul>

        <div className="mt-5 border-t border-line pt-4">
          <dl>
            <Row label={isEvent ? "Food subtotal" : "Subtotal"} value={formatEGP(order.subtotal)} />
            {!isEvent && order.fulfilmentType === "DELIVERY" && (
              <Row
                label="Delivery"
                value={order.deliveryFee === null ? "Confirmed with you" : formatEGP(order.deliveryFee)}
              />
            )}
          </dl>
          <div className="mt-3 flex items-baseline justify-between gap-4 border-t border-line pt-4">
            <span className="font-display text-[19px] font-semibold text-ink">Total</span>
            <span className="font-display text-[23px] font-semibold tabular-nums text-ink">
              {formatEGP(order.total)}
            </span>
          </div>
          {order.deliveryFee === null && !isEvent && (
            <p className="mt-1.5 text-[13.5px] text-ink-faint">Before the delivery fee.</p>
          )}
          {isEvent && detail?.pricingMultiplierBp && (
            <p className="mt-1.5 text-[13.5px] leading-relaxed text-ink-soft">
              Priced for {detail.guestCount} guests at {formatMultiplier(detail.pricingMultiplierBp)} the
              regular menu price.
            </p>
          )}
        </div>

        {isEvent && (
          <div className="mt-8 border-t border-line pt-5">
            <h3 className="text-[11px] uppercase tracking-widest text-ink-faint">
              Anything else for the day?
            </h3>
            {extras.length === 0 ? (
              <p className="mt-3 text-[15px] text-ink-soft">Nothing requested.</p>
            ) : (
              <>
                <div className="mt-3 flex flex-wrap gap-2">
                  {extras.map((x) => (
                    <span key={x} className="rounded-full border border-gold/45 bg-cream px-3.5 py-1.5 text-[13.5px] text-ink">
                      {x}
                    </span>
                  ))}
                </div>
                <p className="mt-3 text-[13.5px] leading-relaxed text-ink-soft">
                  We quote each one when we confirm the event. None of it is in the total above.
                </p>
              </>
            )}
            {detail?.extrasNotes && (
              <p className="mt-3 text-[14px] italic text-ink-soft">{detail.extrasNotes}</p>
            )}
          </div>
        )}
      </section>

      <div className="mt-8 rounded-sm border border-line bg-cream-warm px-6 py-6">
        <h2 className="font-display text-[19px] font-semibold text-ink">What happens next</h2>
        <ol className="mt-4 grid gap-3">
          <Next
            n={1}
            body={
              whatsapp ? (
                <>
                  We message you on{" "}
                  <a
                    href={`https://wa.me/${whatsapp}?text=${encodeURIComponent(`Hello, about order ${order.orderNumber}`)}`}
                    target="_blank" rel="noreferrer"
                    className="text-gold underline underline-offset-4 hover:text-ink"
                  >
                    WhatsApp
                  </a>{" "}
                  to confirm everything — you can message us there too.
                </>
              ) : (
                "We message you on WhatsApp to confirm everything."
              )
            }
          />
          {order.paymentMethod === "CARD" ? (
            <Next
              n={2}
              body={
                order.paymentStatus === "PAID"
                  ? "Your card payment went through and is marked as paid."
                  : "Your card payment did not go through, so this order is still unpaid. We will sort the payment out with you when we call."
              }
            />
          ) : order.depositAmount !== null ? (
            <Next
              n={2}
              body={
                depositPending
                  ? `Once your deposit arrives by ${methodName.toLowerCase()} we check it and confirm your order. The remaining ${formatEGP(remaining!)} is paid when you receive it.`
                  : `Your deposit is confirmed. Pay the remaining ${formatEGP(remaining!)} when you receive your order.`
              }
            />
          ) : paidUpFront ? (
            <Next
              n={2}
              body={`Once your ${methodName.toLowerCase()} arrives we check it and mark your payment as paid. Until then it stays as awaiting verification.`}
            />
          ) : order.paymentMethod === "CASH" ? (
            <Next
              n={2}
              body={
                order.fulfilmentType === "PICKUP"
                  ? "You pay in cash when you collect the order."
                  : "You pay in cash when the order reaches you."
              }
            />
          ) : (
            <Next
              n={2}
              body={
                order.fulfilmentType === "PICKUP"
                  ? `You pay by ${methodName.toLowerCase()} when you collect the order.`
                  : `You pay by ${methodName.toLowerCase()} when the order reaches you.`
              }
            />
          )}
          <Next
            n={3}
            body={
              isEvent
                ? "We agree the details, quote anything extra you asked for, and confirm the booking."
                : `We cook it for your chosen time. Regular orders need ${rules.normalNoticeLabel}' notice, which yours has.`
            }
          />
        </ol>
      </div>

      <div className="mt-10 flex flex-wrap gap-4">
        <Link href="/menu" className="btn-primary">Back to the menu</Link>
        <Link href="/cart" className="btn-outline">Your cart</Link>
      </div>
    </div>
  );
}

function DepositRow({ label, value, strong = false }: { label: string; value: number; strong?: boolean }) {
  return (
    <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-0.5">
      <dt className={`text-[14.5px] ${strong ? "font-semibold text-ink" : "text-ink-soft"}`}>{label}</dt>
      <dd className={`tabular-nums ${strong ? "text-[17px] font-semibold text-ink" : "text-[14.5px] text-ink-soft"}`}>
        {formatEGP(value)}
      </dd>
    </div>
  );
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1 border-b border-line-soft py-3 last:border-0">
      <dt className="text-[13px] uppercase tracking-[0.14em] text-ink-faint">{label}</dt>
      <dd className="text-[15.5px] text-ink">{value}</dd>
    </div>
  );
}

function Next({ n, body }: { n: number; body: React.ReactNode }) {
  return (
    <li className="flex gap-4">
      <span className="font-display text-[15px] tabular-nums text-gold">0{n}</span>
      <span className="text-[15px] leading-relaxed text-ink-soft">{body}</span>
    </li>
  );
}

function longDate(d: Date) {
  return d.toLocaleDateString("en-GB", {
    weekday: "long", day: "numeric", month: "long", year: "numeric", timeZone: "UTC",
  });
}

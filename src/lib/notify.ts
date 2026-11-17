import { db } from "./db";
import { getSettings } from "./settings";
import { formatEGP } from "./money";
import { formatDay, EVENT_TYPE_LABELS } from "./ordering";

/**
 * Telling the business about a new order.
 *
 * Every order placed on the website — a normal order or an event request —
 * sends one email to the address set in admin under Settings > Business
 * details. The email is sent through Resend's HTTP API, which needs one key in
 * the environment (RESEND_API_KEY).
 *
 * Two rules:
 *
 *  - The customer is never kept waiting. Sending happens after the order is
 *    written and the confirmation has been returned, and nothing here can
 *    fail the order: a problem is logged and the order stands.
 *  - Nothing is invented. No key or no address means no email, and the
 *    settings page says so rather than pretending otherwise.
 */

const RESEND_ENDPOINT = "https://api.resend.com/emails";

/** Resend's own test sender. It delivers ONLY to the address that owns the Resend account. */
const DEFAULT_FROM = "The Diine <onboarding@resend.dev>";

export type NotifyConfig = {
  /** Whether a sending key is present at all. */
  configured: boolean;
  from: string;
  /** Whether the sender is Resend's test address, which delivers only to the account owner. */
  usingTestSender: boolean;
};

export function notifyConfig(): NotifyConfig {
  const key = (process.env.RESEND_API_KEY ?? "").trim();
  const from = (process.env.ORDER_NOTIFY_FROM ?? "").trim() || DEFAULT_FROM;
  return { configured: key !== "", from, usingTestSender: from === DEFAULT_FROM };
}

/** Where new orders are announced: the notification address, else the contact email. */
export async function notificationRecipient(): Promise<string> {
  const s = await getSettings();
  return (s.order_notification_email ?? "").trim() || (s.contact_email ?? "").trim();
}

export type SendResult = { ok: true } | { ok: false; error: string };

/** One email through Resend. Never throws. */
export async function sendEmail(input: {
  to: string;
  subject: string;
  text: string;
  html: string;
}): Promise<SendResult> {
  const key = (process.env.RESEND_API_KEY ?? "").trim();
  if (!key) return { ok: false, error: "RESEND_API_KEY is not set." };
  if (!input.to) return { ok: false, error: "No address to send to." };

  let response: Response;
  try {
    response = await fetch(RESEND_ENDPOINT, {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: notifyConfig().from,
        to: [input.to],
        subject: input.subject,
        text: input.text,
        html: input.html,
      }),
      cache: "no-store",
    });
  } catch {
    return { ok: false, error: "Could not reach the email service." };
  }

  if (!response.ok) {
    let detail = `${response.status}`;
    try {
      const body = (await response.json()) as { message?: string };
      if (body?.message) detail = body.message;
    } catch {
      // The status is enough.
    }
    return { ok: false, error: `The email service refused the message: ${detail}` };
  }
  return { ok: true };
}

// ------------------------------------------------------------------ the email

const ORDER_SELECT = {
  id: true,
  orderNumber: true,
  type: true,
  customerName: true,
  customerMobile: true,
  customerEmail: true,
  fulfilmentType: true,
  deliveryDate: true,
  timeSlotLabel: true,
  areaName: true,
  addressLine: true,
  addressDetails: true,
  servingSetupLabel: true,
  subtotal: true,
  deliveryFee: true,
  total: true,
  depositAmount: true,
  paymentMethodLabel: true,
  paymentStatus: true,
  paymentReference: true,
  notes: true,
  items: {
    select: {
      productName: true,
      variantName: true,
      quantity: true,
      lineTotal: true,
      instructions: true,
      options: { select: { groupName: true, choiceName: true } },
    },
  },
  eventDetail: {
    select: {
      eventType: true,
      eventTypeOther: true,
      guestCount: true,
      venueName: true,
      decorRequested: true,
      setupRequested: true,
      servingStaffRequested: true,
      extrasNotes: true,
    },
  },
} as const;

type OrderForEmail = NonNullable<
  Awaited<ReturnType<typeof loadOrder>>
>;

async function loadOrder(orderId: string) {
  return db.order.findUnique({ where: { id: orderId }, select: ORDER_SELECT });
}

function siteUrl(): string {
  return (process.env.NEXT_PUBLIC_SITE_URL ?? "").replace(/\/+$/, "");
}

/** Egyptian mobiles are stored as 01x…; WhatsApp wants the country code. */
function whatsappLink(mobile: string): string {
  return `https://wa.me/${mobile.replace(/^0/, "20").replace(/[^0-9]/g, "")}`;
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/**
 * The email, as plain text and as simple HTML. Pure: given an order, returns
 * the message. Exported so it can be checked without sending anything.
 */
export function renderOrderEmail(order: OrderForEmail): { subject: string; text: string; html: string } {
  const isEvent = order.type === "EVENT";
  const day = formatDay(order.deliveryDate.toISOString().slice(0, 10));
  const kind = isEvent ? "New event request" : "New order";
  const subject = `${kind} ${order.orderNumber} — ${order.customerName} — ${formatEGP(order.total)}`;

  // Label/value rows. An empty value is left out, never shown as a blank.
  const rows: [string, string][] = [];
  rows.push(["Customer", order.customerName]);
  rows.push(["Mobile", order.customerMobile]);
  if (order.customerEmail) rows.push(["Email", order.customerEmail]);

  if (isEvent && order.eventDetail) {
    const d = order.eventDetail;
    const type = d.eventType === "OTHER" && d.eventTypeOther
      ? d.eventTypeOther
      : EVENT_TYPE_LABELS[d.eventType] ?? d.eventType;
    rows.push(["Event", type]);
    rows.push(["Guests", String(d.guestCount)]);
    rows.push(["Date", `${day}${order.timeSlotLabel ? `, ${order.timeSlotLabel}` : ""}`]);
    if (d.venueName) rows.push(["Venue", d.venueName]);
    const extras = [
      d.decorRequested ? "décor" : "",
      d.setupRequested ? "setup" : "",
      d.servingStaffRequested ? "serving staff" : "",
    ].filter(Boolean);
    if (extras.length) rows.push(["Also asked for", extras.join(", ") + " (to be quoted)"]);
    if (d.extrasNotes) rows.push(["Extras notes", d.extrasNotes]);
  } else {
    rows.push([
      order.fulfilmentType === "PICKUP" ? "Pickup" : "Delivery",
      `${day}${order.timeSlotLabel ? `, ${order.timeSlotLabel}` : ""}`,
    ]);
    if (order.fulfilmentType === "DELIVERY") {
      const address = [order.addressLine, order.addressDetails, order.areaName].filter(Boolean).join(", ");
      if (address) rows.push(["Address", address]);
    }
  }
  if (order.servingSetupLabel) rows.push(["Serving", order.servingSetupLabel]);

  const itemLines = order.items.map((it) => {
    const name = it.variantName ? `${it.productName} — ${it.variantName}` : it.productName;
    const opts = it.options.map((o) => `${o.groupName}: ${o.choiceName}`).join("; ");
    const notes = it.instructions ? ` [${it.instructions}]` : "";
    return `${it.quantity} × ${name}${opts ? ` (${opts})` : ""}${notes} — ${formatEGP(it.lineTotal)}`;
  });

  const money: [string, string][] = [];
  if (order.deliveryFee !== null && order.deliveryFee !== undefined && order.deliveryFee > 0) {
    money.push(["Food", formatEGP(order.subtotal)]);
    money.push(["Delivery", formatEGP(order.deliveryFee)]);
  }
  money.push([isEvent ? "Food total (décor, setup and staff not included)" : "Total", formatEGP(order.total)]);
  if (order.depositAmount) money.push(["Deposit expected", formatEGP(order.depositAmount)]);
  money.push([
    "Payment",
    `${order.paymentMethodLabel ?? ""} — ${order.paymentStatus.toLowerCase()}${
      order.paymentReference ? ` (ref ${order.paymentReference})` : ""
    }`.trim(),
  ]);

  const base = siteUrl();
  const adminLink = base ? `${base}/admin/orders/${order.id}` : "";
  const wa = whatsappLink(order.customerMobile);

  // --- plain text
  const text = [
    `${kind} ${order.orderNumber}`,
    "",
    ...rows.map(([k, v]) => `${k}: ${v}`),
    "",
    "Dishes:",
    ...itemLines.map((l) => `  - ${l}`),
    "",
    ...money.map(([k, v]) => `${k}: ${v}`),
    ...(order.notes ? ["", `Customer notes: ${order.notes}`] : []),
    "",
    `Message on WhatsApp: ${wa}`,
    ...(adminLink ? [`Open in admin: ${adminLink}`] : []),
  ].join("\n");

  // --- html
  const tr = ([k, v]: [string, string]) =>
    `<tr><td style="padding:4px 12px 4px 0;color:#6b7280;white-space:nowrap;vertical-align:top">${escapeHtml(k)}</td><td style="padding:4px 0">${escapeHtml(v)}</td></tr>`;
  const html = `<!doctype html><html><body style="font-family:-apple-system,Segoe UI,Helvetica,Arial,sans-serif;font-size:15px;color:#111;line-height:1.5;max-width:560px;margin:0 auto;padding:24px 16px">
<h1 style="font-size:20px;margin:0 0 4px">${escapeHtml(kind)} ${escapeHtml(order.orderNumber)}</h1>
<p style="margin:0 0 16px;color:#6b7280">${escapeHtml(order.customerName)} · ${escapeHtml(formatEGP(order.total))}</p>
<table style="border-collapse:collapse;margin-bottom:16px">${rows.map(tr).join("")}</table>
<h2 style="font-size:15px;margin:0 0 6px">Dishes</h2>
<ul style="margin:0 0 16px;padding-left:20px">${itemLines.map((l) => `<li>${escapeHtml(l)}</li>`).join("")}</ul>
<table style="border-collapse:collapse;margin-bottom:16px">${money.map(tr).join("")}</table>
${order.notes ? `<p style="margin:0 0 16px"><strong>Customer notes:</strong> ${escapeHtml(order.notes)}</p>` : ""}
<p style="margin:0 0 8px"><a href="${wa}" style="display:inline-block;background:#111;color:#fff;text-decoration:none;padding:10px 16px;border-radius:6px">Message on WhatsApp</a></p>
${adminLink ? `<p style="margin:0"><a href="${escapeHtml(adminLink)}">Open in admin</a></p>` : ""}
</body></html>`;

  return { subject, text, html };
}

/**
 * Announce an order that has just been placed. Safe to call from anywhere:
 * never throws, and does nothing when sending is not set up.
 */
export async function notifyNewOrder(orderId: string): Promise<void> {
  try {
    if (!notifyConfig().configured) return;
    const to = await notificationRecipient();
    if (!to) {
      console.warn(`[notify] order ${orderId}: no notification email set in admin, nothing sent.`);
      return;
    }
    const order = await loadOrder(orderId);
    if (!order) {
      console.warn(`[notify] order ${orderId} not found, nothing sent.`);
      return;
    }
    const message = renderOrderEmail(order);
    const result = await sendEmail({ to, ...message });
    if (!result.ok) {
      console.error(`[notify] order ${order.orderNumber}: ${result.error}`);
    }
  } catch (e) {
    console.error(`[notify] order ${orderId}: unexpected failure`, e);
  }
}

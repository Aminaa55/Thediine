import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { paymobConfig, verifyHmac, readOutcome, transactionFromQuery } from "@/lib/paymob";
import { applyProviderOutcome } from "@/lib/payments";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * Where Paymob sends the customer after their card payment.
 *
 * This is a convenience, not the authority: the customer's browser is never
 * trusted, so the redirect is verified by exactly the same HMAC as the webhook
 * and applied through exactly the same path. It exists so the confirmation page
 * is right immediately, and so the flow can be tested before the site has a
 * public URL the webhook can reach.
 *
 * Whatever the outcome, the customer lands on their own order page. A failed
 * payment leaves the order exactly as it was: placed, and unpaid.
 */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const cfg = paymobConfig();

  const transaction = transactionFromQuery(url.searchParams);
  const hmac = url.searchParams.get("hmac") ?? "";
  const valid = cfg.configured && verifyHmac(transaction, hmac, cfg.hmacSecret);
  const outcome = readOutcome(transaction);

  const result = await applyProviderOutcome({
    provider: "paymob",
    channel: "redirect",
    signatureValid: valid,
    merchantRef: outcome.merchantReference,
    transactionId: outcome.transactionId,
    amount: outcome.amount,
    paid: outcome.paid,
    reason: outcome.reason,
  });
  console.log(`[paymob] return ${valid ? "verified" : "REJECTED"} — ${result.note}`);

  // Find the order by our own reference, so the customer always lands somewhere.
  const order = outcome.merchantReference
    ? await db.order.findUnique({
        where: { paymentMerchantRef: outcome.merchantReference },
        select: { publicToken: true },
      })
    : null;

  if (!order) return NextResponse.redirect(new URL("/cart", cfg.siteUrl));
  return NextResponse.redirect(new URL(`/order/${order.publicToken}`, cfg.siteUrl));
}

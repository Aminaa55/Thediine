import { NextResponse } from "next/server";
import { paymobConfig, verifyHmac, readOutcome } from "@/lib/paymob";
import { applyProviderOutcome } from "@/lib/payments";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * Paymob's server-to-server callback — the authoritative word on a payment.
 *
 * It is a public URL, so it is treated as hostile until the HMAC proves
 * otherwise: an unsigned or wrongly signed request changes nothing, and is
 * recorded as having been rejected.
 *
 * It always answers 200. Paymob retries anything else, and a retry cannot fix
 * a bad signature or an unknown order — we log it and move on.
 */
export async function POST(request: Request) {
  const cfg = paymobConfig();
  if (!cfg.configured) {
    console.error("[paymob] webhook arrived but Paymob is not configured");
    return NextResponse.json({ received: true }, { status: 200 });
  }

  let payload: { type?: string; obj?: Record<string, unknown> };
  try {
    payload = (await request.json()) as typeof payload;
  } catch {
    return NextResponse.json({ received: true }, { status: 200 });
  }

  // Only transaction callbacks change a payment status.
  if (payload.type !== "TRANSACTION" || !payload.obj) {
    return NextResponse.json({ received: true }, { status: 200 });
  }

  // Paymob sends the signature as a query parameter on the webhook URL.
  const hmac = new URL(request.url).searchParams.get("hmac") ?? "";
  const valid = verifyHmac(payload.obj, hmac, cfg.hmacSecret);
  const outcome = readOutcome(payload.obj);

  const result = await applyProviderOutcome({
    provider: "paymob",
    channel: "webhook",
    signatureValid: valid,
    merchantRef: outcome.merchantReference,
    transactionId: outcome.transactionId,
    amount: outcome.amount,
    paid: outcome.paid,
    reason: outcome.reason,
  });

  // Never log the payload: it carries the masked card and the customer.
  console.log(`[paymob] webhook ${valid ? "verified" : "REJECTED"} — ${result.note}`);
  return NextResponse.json({ received: true }, { status: 200 });
}

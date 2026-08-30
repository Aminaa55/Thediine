import { createHmac, timingSafeEqual } from "node:crypto";

/**
 * Paymob card payments.
 *
 * SERVER-ONLY. Every secret this file reads comes from the environment and
 * none of it may ever reach the browser or the repository.
 *
 * We use Paymob's HOSTED Unified Checkout: the customer is sent to Paymob's own
 * page to enter their card. No card number, expiry or CVV ever touches this
 * site, our server or our database — the only thing we ever store is Paymob's
 * own reference for the transaction.
 *
 * The flow:
 *   1. the order is written first, unpaid;
 *   2. an "intention" is created with Paymob for that order's exact total;
 *   3. the customer is redirected to Paymob's hosted checkout;
 *   4. Paymob tells us the outcome twice — a server-to-server webhook, and a
 *      signed redirect back to us — and BOTH are verified by HMAC before any
 *      payment status changes.
 *
 * Nothing here can move an order's status. Payment status and order status stay
 * separate.
 */

/**
 * Card payments are PAUSED.
 *
 * The whole integration below is intact and tested; it is simply not offered to
 * customers. While this is true, card does not appear at checkout at all — not
 * even as "coming soon" — and no Paymob environment variable is needed for the
 * site to run normally.
 *
 * To bring card back: set this to false and supply the Paymob keys. Nothing
 * else has to change.
 */
export const CARD_PAYMENTS_PAUSED = true;

export type PaymobMode = "test" | "live";

export type PaymobConfig = {
  configured: boolean;
  mode: PaymobMode;
  baseUrl: string;
  publicKey: string;
  secretKey: string;
  hmacSecret: string;
  /** Optional: the numeric Online Card integration id from the dashboard. */
  cardIntegrationId: number | null;
  siteUrl: string;
  /** Why it is not usable, for the server log. Never shown to a customer. */
  problem: string | null;
};

/**
 * Read once, from the environment.
 *
 * Live mode is refused unless PAYMOB_MODE is set to "live" deliberately: an
 * unset or misspelt value can only ever mean test.
 */
export function paymobConfig(): PaymobConfig {
  const mode: PaymobMode = process.env.PAYMOB_MODE === "live" ? "live" : "test";
  const publicKey = (process.env.PAYMOB_PUBLIC_KEY ?? "").trim();
  const secretKey = (process.env.PAYMOB_SECRET_KEY ?? "").trim();
  const hmacSecret = (process.env.PAYMOB_HMAC_SECRET ?? "").trim();
  const baseUrl = (process.env.PAYMOB_BASE_URL ?? "https://accept.paymob.com").replace(/\/+$/, "");
  const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000").replace(/\/+$/, "");
  const rawId = (process.env.PAYMOB_CARD_INTEGRATION_ID ?? "").trim();
  const cardIntegrationId = /^\d+$/.test(rawId) ? Number(rawId) : null;

  const missing = [
    !publicKey && "PAYMOB_PUBLIC_KEY",
    !secretKey && "PAYMOB_SECRET_KEY",
    !hmacSecret && "PAYMOB_HMAC_SECRET",
  ].filter(Boolean) as string[];

  /**
   * A test-mode key is prefixed by Paymob with `..._test_`. If the mode says
   * test and a key does not look like a test key, we refuse to use it rather
   * than risk touching real money.
   */
  const looksLive =
    mode === "test" &&
    ((publicKey && /_live_/.test(publicKey)) || (secretKey && /_live_/.test(secretKey)));

  const problem = missing.length
    ? `Paymob is not configured: ${missing.join(", ")} not set.`
    : looksLive
      ? "Paymob is in test mode but a live key was supplied. Refusing to use it."
      : null;

  return {
    configured: problem === null,
    mode, baseUrl, publicKey, secretKey, hmacSecret, cardIntegrationId, siteUrl,
    problem,
  };
}

// --------------------------------------------------------------- intentions

export type IntentionInput = {
  /** In piastres — the same integer the order stores. */
  amount: number;
  /** Our own reference; comes back as the callback's merchant_order_id. */
  merchantReference: string;
  customer: { name: string; mobile: string; email: string | null };
  address: string | null;
  items: { name: string; amount: number; quantity: number }[];
  /** Where Paymob sends the customer afterwards. */
  redirectionUrl: string;
  /** Where Paymob posts the outcome, server to server. */
  notificationUrl: string;
};

export type IntentionResult =
  | { ok: true; checkoutUrl: string; intentionId: string; clientSecret: string }
  | { ok: false; error: string };

function nameParts(full: string): { first: string; last: string } {
  const bits = full.trim().split(/\s+/);
  return {
    first: bits[0] || "NA",
    last: bits.length > 1 ? bits.slice(1).join(" ") : "NA",
  };
}

/**
 * Creates the payment intention and returns the hosted checkout URL.
 *
 * The amount sent is the order's own total, taken from the order we already
 * wrote — never a figure from the browser.
 */
export async function createIntention(input: IntentionInput): Promise<IntentionResult> {
  const cfg = paymobConfig();
  if (!cfg.configured) return { ok: false, error: cfg.problem ?? "Paymob is not configured." };

  const { first, last } = nameParts(input.customer.name);

  const body = {
    amount: input.amount,
    currency: "EGP",
    // Either the numeric card integration id, or the method by name.
    payment_methods: [cfg.cardIntegrationId ?? "card"],
    special_reference: input.merchantReference,
    notification_url: input.notificationUrl,
    redirection_url: input.redirectionUrl,
    items: input.items.map((i) => ({
      name: i.name.slice(0, 50),
      amount: i.amount,
      quantity: i.quantity,
      description: i.name.slice(0, 50),
    })),
    billing_data: {
      first_name: first,
      last_name: last,
      phone_number: input.customer.mobile,
      email: input.customer.email || "NA",
      street: input.address || "NA",
      building: "NA", floor: "NA", apartment: "NA",
      city: "NA", state: "NA", country: "EG",
      postal_code: "NA", shipping_method: "NA",
    },
    customer: { first_name: first, last_name: last, email: input.customer.email || "NA" },
    extras: { merchant_reference: input.merchantReference },
  };

  let response: Response;
  try {
    response = await fetch(`${cfg.baseUrl}/v1/intention/`, {
      method: "POST",
      headers: {
        // The secret key. Server side only, never sent to a browser.
        Authorization: `Token ${cfg.secretKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
      cache: "no-store",
    });
  } catch {
    return { ok: false, error: "We could not reach the payment provider." };
  }

  const text = await response.text();
  if (!response.ok) {
    // The body can echo request details; log the status only, never the keys.
    console.error(`[paymob] intention failed: HTTP ${response.status}`);
    return { ok: false, error: "The payment provider refused this payment." };
  }

  let parsed: { client_secret?: string; id?: number | string };
  try {
    parsed = JSON.parse(text) as typeof parsed;
  } catch {
    return { ok: false, error: "The payment provider sent an unreadable reply." };
  }
  if (!parsed.client_secret) return { ok: false, error: "The payment provider did not start a payment." };

  return {
    ok: true,
    intentionId: String(parsed.id ?? ""),
    clientSecret: parsed.client_secret,
    checkoutUrl:
      `${cfg.baseUrl}/unifiedcheckout/?publicKey=${encodeURIComponent(cfg.publicKey)}` +
      `&clientSecret=${encodeURIComponent(parsed.client_secret)}`,
  };
}

// -------------------------------------------------------------------- HMAC

/**
 * The fields Paymob signs, in the exact order it concatenates them.
 *
 * Not alphabetical by accident — this is Paymob's documented order, and any
 * other order produces a different digest and rejects every real callback.
 */
export const HMAC_FIELDS = [
  "amount_cents",
  "created_at",
  "currency",
  "error_occured",
  "has_parent_transaction",
  "id",
  "integration_id",
  "is_3d_secure",
  "is_auth",
  "is_capture",
  "is_refunded",
  "is_standalone_payment",
  "is_voided",
  "order.id",
  "owner",
  "pending",
  "source_data.pan",
  "source_data.sub_type",
  "source_data.type",
  "success",
] as const;

type Json = Record<string, unknown>;

function at(source: Json, path: string): unknown {
  return path.split(".").reduce<unknown>(
    (acc, key) => (acc && typeof acc === "object" ? (acc as Json)[key] : undefined),
    source,
  );
}

/** Booleans arrive as real booleans in the webhook and as "true"/"false" in a redirect. */
function asString(value: unknown): string {
  if (value === true) return "true";
  if (value === false) return "false";
  if (value === null || value === undefined) return "";
  return String(value);
}

/** The exact string Paymob signs, built from a transaction object. */
export function hmacPayload(transaction: Json): string {
  return HMAC_FIELDS.map((f) => asString(at(transaction, f))).join("");
}

/**
 * Verifies a callback.
 *
 * Compared in constant time, so a wrong signature cannot be found by measuring
 * how long the comparison takes.
 */
export function verifyHmac(transaction: Json, received: string, secret = paymobConfig().hmacSecret): boolean {
  if (!secret || !received) return false;
  const expected = createHmac("sha512", secret).update(hmacPayload(transaction), "utf8").digest("hex");
  const a = Buffer.from(expected, "utf8");
  const b = Buffer.from(received.trim().toLowerCase(), "utf8");
  return a.length === b.length && timingSafeEqual(a, b);
}

// ------------------------------------------------------------- the outcome

export type PaymobOutcome = {
  transactionId: string;
  merchantReference: string;
  amount: number;
  currency: string;
  /** True only when the money actually moved and nothing undid it. */
  paid: boolean;
  /** Why it is not paid, for our own records. */
  reason: string | null;
};

/**
 * What a transaction actually means.
 *
 * "success" alone is not enough: a transaction can be successful and then
 * voided or refunded, and a pending one has not taken any money yet. Anything
 * short of a clean, settled success leaves the order unpaid.
 */
export function readOutcome(transaction: Json): PaymobOutcome {
  const bool = (k: string) => asString(at(transaction, k)) === "true";
  const success = bool("success");
  const pending = bool("pending");
  const failed = bool("error_occured");
  const voided = bool("is_voided");
  const refunded = bool("is_refunded");

  const reason = failed
    ? "The payment failed."
    : pending
      ? "The payment is still pending."
      : voided
        ? "The payment was voided."
        : refunded
          ? "The payment was refunded."
          : !success
            ? "The payment was not completed."
            : null;

  return {
    transactionId: asString(at(transaction, "id")),
    merchantReference: asString(at(transaction, "order.merchant_order_id")),
    amount: Number(asString(at(transaction, "amount_cents")) || 0),
    currency: asString(at(transaction, "currency")) || "EGP",
    paid: reason === null,
    reason,
  };
}

/**
 * A redirect back from Paymob arrives as flat query parameters
 * (`order`, `source_data.pan`, …) rather than a nested object. This shapes it
 * into the same form the webhook uses, so ONE verification path serves both.
 */
export function transactionFromQuery(params: URLSearchParams): Json {
  const flat: Json = {};
  for (const [k, v] of params.entries()) flat[k] = v;
  return {
    ...flat,
    id: flat.id,
    order: { id: flat.order, merchant_order_id: flat.merchant_order_id },
    source_data: {
      pan: flat["source_data.pan"],
      sub_type: flat["source_data.sub_type"],
      type: flat["source_data.type"],
    },
  };
}

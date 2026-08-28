/**
 * Payment methods.
 *
 * The structure supports all three from day one; `enabled` decides what a
 * customer is actually offered. Card stays disabled until a real gateway is
 * integrated — the interface must never imply it works before then.
 *
 * Payment status is tracked separately from order status throughout, so a
 * delivered order can still be unpaid.
 */

export type PaymentMethodId = "CASH" | "INSTAPAY" | "CARD";

export type PaymentMethod = {
  id: PaymentMethodId;
  /** Cash reads differently for delivery and pickup. */
  label: (fulfilment: "DELIVERY" | "PICKUP") => string;
  description: string;
  enabled: boolean;
  /** Shown instead of the description when the method is not yet available. */
  unavailableNote?: string;
};

export const PAYMENT_METHODS: PaymentMethod[] = [
  {
    id: "CASH",
    label: (f) => (f === "PICKUP" ? "Payment on pickup" : "Cash on delivery"),
    description: "Pay when your order reaches you.",
    enabled: true,
  },
  {
    id: "INSTAPAY",
    label: () => "InstaPay",
    description:
      "Transfer to us and we will confirm once the payment has been received.",
    enabled: true,
  },
  {
    id: "CARD",
    label: () => "Card payment",
    description: "Pay by card.",
    enabled: false,
    unavailableNote: "Coming soon.",
  },
];

export function availableMethods(): PaymentMethod[] {
  return PAYMENT_METHODS.filter((m) => m.enabled);
}

/**
 * Payment status moves independently of order status.
 * InstaPay adds a verification step: the customer says they have transferred,
 * and the business confirms the money actually arrived.
 */
export const PAYMENT_STATUS_LABELS = {
  UNPAID: "Unpaid",
  AWAITING_VERIFICATION: "Awaiting verification",
  PAID: "Paid",
  REFUNDED: "Refunded",
} as const;

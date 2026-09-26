import type { Metadata } from "next";
import { getCheckoutContext, getNormalAvailability } from "@/app/checkout-actions";
import { CheckoutForm } from "@/components/checkout-form";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Checkout" };

export default async function CheckoutPage() {
  const [ctx, day] = await Promise.all([getCheckoutContext(), getNormalAvailability()]);

  return (
    <div className="mx-auto max-w-content px-5 py-12 sm:px-8 sm:py-14">
      <p className="eyebrow">Checkout</p>
      {/* The heading lives in the form, which knows whether there is an event
          request alongside this order to tell it apart from. */}
      <div className="mt-3">
        <CheckoutForm ctx={ctx} day={day} />
      </div>
    </div>
  );
}

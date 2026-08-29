import type { Metadata } from "next";
import { getCheckoutContext } from "@/app/checkout-actions";
import { EventCheckoutForm } from "@/components/event-checkout-form";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Send your event request" };

/**
 * The last part of the event journey — still step four, Review. The event steps
 * stay at four; this is where that step finishes.
 */
export default async function EventCheckoutPage() {
  const ctx = await getCheckoutContext();
  return <EventCheckoutForm ctx={ctx} />;
}

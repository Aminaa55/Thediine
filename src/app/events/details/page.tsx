import type { Metadata } from "next";
import { getEventAvailability } from "@/app/checkout-actions";
import { EventDetailsForm } from "@/components/event-details-form";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Event details" };

export default async function EventDetailsPage() {
  // Which days the kitchen is shut is a fact only the database has, and it
  // changes the moment admin closes one — so it is read per request and handed
  // to the form rather than baked into the page.
  const availability = await getEventAvailability();

  return (
    <EventDetailsForm
      unavailable={availability.unavailable}
      closedSoon={availability.closedSoon}
    />
  );
}

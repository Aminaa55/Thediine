import type { Metadata } from "next";
import { EventDetailsForm } from "@/components/event-details-form";

export const metadata: Metadata = { title: "Event details" };

export default function EventDetailsPage() {
  return <EventDetailsForm />;
}

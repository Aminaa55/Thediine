import type { Metadata } from "next";
import { EventOccasionForm } from "@/components/event-occasion-form";

export const metadata: Metadata = { title: "Plan an Event" };

export default function EventStartPage() {
  return <EventOccasionForm />;
}

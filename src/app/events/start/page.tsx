import type { Metadata } from "next";
import { EventStartForm } from "@/components/event-start-form";

export const metadata: Metadata = { title: "Plan an Event" };

export default function EventStartPage() {
  return <EventStartForm />;
}

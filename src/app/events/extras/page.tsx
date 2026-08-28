import type { Metadata } from "next";
import { EventExtrasForm } from "@/components/event-extras-form";

export const metadata: Metadata = { title: "Event extras" };

export default function EventExtrasPage() {
  return <EventExtrasForm />;
}

import type { Metadata } from "next";
import { EventReview } from "@/components/event-review";

export const metadata: Metadata = { title: "Review your event request" };

export default function EventReviewPage() {
  return <EventReview />;
}

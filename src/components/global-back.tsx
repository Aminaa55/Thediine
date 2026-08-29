"use client";

import { usePathname } from "next/navigation";
import { BackLink } from "./back-link";

/**
 * The pages of the event journey render their own Back beneath the progress
 * bar, so the global one stands down for them. That includes the review, which
 * lives under /checkout but is still step four of the same journey — without
 * this it would show two Back controls, one above the step bar and one below.
 */
const OWN_BACK = ["/events/", "/checkout/event"];

export function GlobalBack() {
  const pathname = usePathname();
  if (OWN_BACK.some((p) => pathname.startsWith(p))) return null;
  return <BackLink />;
}

"use client";

import { usePathname } from "next/navigation";
import { BackLink } from "./back-link";

/** Event steps render their own Back beneath the progress bar. */
export function GlobalBack() {
  const pathname = usePathname();
  if (pathname.startsWith("/events/")) return null;
  return <BackLink />;
}

"use client";

import { usePathname } from "next/navigation";

/**
 * Admin has its own chrome.
 *
 * The customer header, back bar and footer stand down inside /admin, so the
 * business is not looking at a shop front while it works.
 */
export function CustomerChrome({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  if (pathname.startsWith("/admin")) return null;
  return <>{children}</>;
}

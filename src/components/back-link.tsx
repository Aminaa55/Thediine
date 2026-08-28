"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";

/**
 * One back arrow, in the same place, on every inner page.
 *
 * It returns to the ACTUAL previous page via history, so opening a dish while
 * browsing an event menu comes back to that event menu with the event and cart
 * state intact. Nothing is hard-coded to a destination.
 *
 * Hidden on the homepage, and on a first page load with no history to go back
 * to, where it would be a dead control.
 */
export function BackLink() {
  const router = useRouter();
  const pathname = usePathname();
  const [canGoBack, setCanGoBack] = useState(false);

  useEffect(() => {
    setCanGoBack(typeof window !== "undefined" && window.history.length > 1);
  }, [pathname]);

  if (pathname === "/" || !canGoBack) return null;

  return (
    <div className="mx-auto max-w-content px-5 pt-6 sm:px-8">
      <button
        type="button"
        onClick={() => router.back()}
        className="group -ms-1 flex items-center gap-2 rounded-full px-2 py-1 text-[15px] text-ink-soft transition-colors hover:text-ink"
      >
        <span
          aria-hidden="true"
          className="text-[17px] leading-none transition-transform duration-200 group-hover:-translate-x-1"
        >
          &larr;
        </span>
        Back
      </button>
    </div>
  );
}

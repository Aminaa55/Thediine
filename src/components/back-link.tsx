"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";

/**
 * One back control, in the same place, on every inner page.
 *
 * Sticky, so it stays reachable down a long menu without scrolling back up.
 * It returns to the ACTUAL previous page via history, so opening a dish while
 * browsing an event menu comes back to that event menu with everything intact.
 */
export function BackLink({ inFlow = false }: { inFlow?: boolean }) {
  const router = useRouter();
  const pathname = usePathname();
  const [canGoBack, setCanGoBack] = useState(false);

  useEffect(() => {
    setCanGoBack(typeof window !== "undefined" && window.history.length > 1);
  }, [pathname]);

  if (pathname === "/" || !canGoBack) return null;

  return (
    <div
      className={
        inFlow
          ? "border-b border-line-soft bg-cream/95 backdrop-blur"
          : "sticky top-16 z-20 border-b border-line-soft bg-cream/95 backdrop-blur sm:top-20"
      }
    >
      <div className="mx-auto max-w-content px-5 sm:px-8">
        <button
          type="button"
          onClick={() => router.back()}
          className="group -ms-2 flex items-center gap-2 py-2.5 pe-3 ps-2 text-[14.5px] text-ink-soft transition-colors hover:text-ink"
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
    </div>
  );
}

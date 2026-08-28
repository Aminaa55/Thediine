"use client";

import { useCart } from "@/lib/cart";

export function CartHeading() {
  const { mode, ready } = useCart();
  const isEvent = ready && mode === "event";

  return (
    <>
      <p className="eyebrow">{isEvent ? "One request" : "Your order"}</p>
      <h1 className="mt-3 font-display text-[34px] font-semibold leading-tight text-ink sm:text-[44px]">
        {isEvent ? "Your event request" : "Cart"}
      </h1>
      {isEvent && (
        <p className="mt-4 max-w-xl text-[16.5px] leading-relaxed text-ink-soft">
          Your occasion and your dishes together, in one request.
        </p>
      )}
    </>
  );
}

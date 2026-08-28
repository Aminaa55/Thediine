import type { Metadata } from "next";
import { CartView } from "@/components/cart-view";

export const metadata: Metadata = { title: "Your cart" };

export default function CartPage() {
  return (
    <div className="mx-auto max-w-content px-5 py-12 sm:px-8 sm:py-16">
      <p className="eyebrow">Your order</p>
      <h1 className="mt-3 font-display text-[34px] font-semibold leading-tight text-ink sm:text-[42px]">
        Cart
      </h1>
      <div className="mt-12">
        <CartView />
      </div>
    </div>
  );
}

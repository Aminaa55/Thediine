import type { Metadata } from "next";
import { CartHeading } from "@/components/cart-heading";
import { CartView } from "@/components/cart-view";

export const metadata: Metadata = { title: "Your cart" };

export default function CartPage() {
  return (
    <div className="mx-auto max-w-content px-5 py-12 sm:px-8 sm:py-16">
      <CartHeading />
      <div className="mt-12">
        <CartView />
      </div>
    </div>
  );
}

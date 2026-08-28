"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { Wordmark, Emblem } from "./logo";
import { useCart } from "@/lib/cart";

const NAV = [
  { href: "/menu", label: "Menu" },
  { href: "/events", label: "Events" },
  { href: "/#how", label: "How it works" },
];

export function SiteHeader() {
  const { count, ready } = useCart();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  useEffect(() => setOpen(false), [pathname]);

  return (
    <header className="sticky top-0 z-40 border-b border-line-soft bg-cream/90 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-content items-center gap-4 px-5 sm:h-20 sm:px-8">
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          aria-label={open ? "Close menu" : "Open menu"}
          className="-ms-2 p-2 text-ink md:hidden"
        >
          <svg width="20" height="14" viewBox="0 0 20 14" fill="none" aria-hidden="true">
            {open ? (
              <path d="M2 2l16 10M18 2L2 12" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
            ) : (
              <path d="M0 1h20M0 7h20M0 13h14" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
            )}
          </svg>
        </button>

        <Link href="/" className="flex items-center gap-2.5 md:gap-3" aria-label="The Diine, home">
          <Emblem className="hidden h-8 w-8 text-gold sm:block" />
          <Wordmark className="text-[15px] sm:text-[17px]" />
        </Link>

        <nav className="ms-8 hidden items-center gap-8 md:flex">
          {NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="text-[15px] text-ink-soft transition-colors hover:text-ink"
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="ms-auto flex items-center gap-3">
          <Link href="/menu" className="hidden text-[15px] text-ink-soft hover:text-ink lg:block">
            Order Now
          </Link>
          <Link
            href="/cart"
            className="relative flex items-center gap-2 rounded-full border border-ink/20 px-4 py-2 text-[14px] transition-colors hover:border-ink/50"
          >
            <svg width="15" height="16" viewBox="0 0 15 16" fill="none" aria-hidden="true">
              <path
                d="M1 4.5h13l-1.1 9.2a1 1 0 01-1 .8H3.1a1 1 0 01-1-.8L1 4.5zM5 4.5V3a2.5 2.5 0 015 0v1.5"
                stroke="currentColor"
                strokeWidth="1.2"
                strokeLinejoin="round"
              />
            </svg>
            <span className="tabular-nums">{ready ? count : 0}</span>
            <span className="sr-only">items in cart</span>
          </Link>
        </div>
      </div>

      {open && (
        <nav className="border-t border-line-soft bg-cream-warm px-5 py-3 md:hidden">
          {NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="block border-b border-line-soft py-3 text-ink last:border-0"
            >
              {item.label}
            </Link>
          ))}
        </nav>
      )}
    </header>
  );
}

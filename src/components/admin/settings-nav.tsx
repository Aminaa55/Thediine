"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

/**
 * The settings list.
 *
 * Business details first, then the rules in the order they are usually
 * thought about. A gold dot marks a section still holding a decision.
 */
const SECTIONS = [
  { href: "/admin/settings/business", label: "Business details" },
  { href: "/admin/settings/ordering", label: "Ordering" },
  { href: "/admin/settings/delivery", label: "Delivery & pickup" },
  { href: "/admin/settings/calendar", label: "Calendar & capacity" },
  { href: "/admin/settings/events", label: "Events" },
  { href: "/admin/settings/payment", label: "Payment" },
  { href: "/admin/settings/serving", label: "Serving setup" },
];

export function SettingsNav({ undecided }: { undecided: string[] }) {
  const pathname = usePathname();

  return (
    <nav aria-label="Settings sections" className="lg:sticky lg:top-6 lg:self-start">
      <ul className="flex gap-1 overflow-x-auto [scrollbar-width:none] lg:grid lg:gap-0.5 lg:overflow-visible [&::-webkit-scrollbar]:hidden">
        {SECTIONS.map((s) => {
          const on = pathname.startsWith(s.href);
          return (
            <li key={s.href}>
              <Link
                href={s.href}
                aria-current={on ? "page" : undefined}
                className={`flex items-center gap-2 whitespace-nowrap rounded-sm px-3 py-2 text-[14.5px] transition-colors ${
                  on
                    ? "bg-cream-deep font-semibold text-ink"
                    : "text-ink-soft hover:bg-cream-warm hover:text-ink"
                }`}
              >
                {s.label}
                {undecided.includes(s.href) && (
                  <span
                    aria-label="still to decide"
                    className="h-1.5 w-1.5 flex-none rounded-full bg-gold"
                  />
                )}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

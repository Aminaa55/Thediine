"use client";

import Link from "next/link";
import { BackLink } from "./back-link";

/**
 * The five steps, each a real URL — so the browser's own history moves
 * backwards through them one at a time, and the single Back control works
 * without any bespoke step logic.
 */
export const EVENT_STEPS = [
  { key: "type", label: "Occasion", href: "/events/start" },
  { key: "details", label: "Details", href: "/events/details" },
  { key: "dishes", label: "Dishes", href: "/menu?for=event" },
  { key: "extras", label: "Extras", href: "/events/extras" },
  { key: "review", label: "Review", href: "/cart" },
] as const;

export type StepKey = (typeof EVENT_STEPS)[number]["key"];

/**
 * Progress bar, then the Back control beneath it — the order the customer
 * asked for, kept consistent across every event step.
 */
export function EventHeader({ current }: { current: StepKey }) {
  const index = EVENT_STEPS.findIndex((s) => s.key === current);

  return (
    <div className="sticky top-16 z-20 sm:top-20">
      <nav aria-label="Event request progress" className="border-b border-line bg-cream-deep">
        <ol className="mx-auto flex max-w-content gap-1 overflow-x-auto px-5 py-3.5 [scrollbar-width:none] sm:px-8 [&::-webkit-scrollbar]:hidden">
          {EVENT_STEPS.map((step, i) => {
            const state = i < index ? "done" : i === index ? "current" : "todo";
            const body = (
              <span
                className={`flex items-center gap-2.5 whitespace-nowrap rounded-full px-4 py-1.5 text-[13.5px] transition-colors ${
                  state === "current"
                    ? "bg-ink text-cream"
                    : state === "done"
                      ? "text-ink-soft hover:bg-ink/5"
                      : "text-ink-faint"
                }`}
              >
                <span className="font-display tabular-nums text-[12px] opacity-70">0{i + 1}</span>
                {step.label}
              </span>
            );
            return (
              <li key={step.key} aria-current={state === "current" ? "step" : undefined}>
                {state === "done" ? <Link href={step.href}>{body}</Link> : body}
              </li>
            );
          })}
        </ol>
      </nav>
      <BackLink inFlow />
    </div>
  );
}

/** The five-day rule, shown only inside the event journey. */
export function EventNotice({ className = "" }: { className?: string }) {
  return (
    <p className={`text-[14px] text-ink-soft ${className}`}>
      Events need at least <strong className="font-semibold text-ink">5 days&rsquo; notice</strong>,
      and are sent as a request — we confirm every event with you personally before it is booked.
    </p>
  );
}

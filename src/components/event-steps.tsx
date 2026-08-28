"use client";

import Link from "next/link";

export const EVENT_STEPS = [
  { key: "type", label: "Occasion", href: "/events/start" },
  { key: "details", label: "Details", href: "/events/start" },
  { key: "dishes", label: "Dishes", href: "/menu" },
  { key: "extras", label: "Extras", href: "/events/extras" },
  { key: "review", label: "Review", href: "/events/review" },
] as const;

export type StepKey = (typeof EVENT_STEPS)[number]["key"];

/** Shows where the customer is in the event request, and how much is left. */
export function EventProgress({ current }: { current: StepKey }) {
  const index = EVENT_STEPS.findIndex((s) => s.key === current);

  return (
    <nav aria-label="Event request progress" className="border-b border-line bg-cream-deep">
      <ol className="mx-auto flex max-w-content gap-1 overflow-x-auto px-5 py-4 [scrollbar-width:none] sm:px-8 [&::-webkit-scrollbar]:hidden">
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

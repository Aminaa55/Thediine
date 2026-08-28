"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useCart, EVENT_TYPE_LABELS, type EventType } from "@/lib/cart";
import { EventProgress, EventNotice } from "./event-steps";
import { earliestEventDate, toDateInput, RULES } from "@/lib/ordering";

/**
 * Steps one and two of the event request: the occasion, then the details.
 *
 * The date field ENFORCES the five-day rule rather than just describing it —
 * earlier dates cannot be picked, and are rejected if typed.
 */
export function EventStartForm() {
  const router = useRouter();
  const { event, updateEvent, setMode } = useCart();
  const [step, setStep] = useState<"type" | "details">("type");
  const [touched, setTouched] = useState(false);

  const min = toDateInput(earliestEventDate());

  function chooseType(t: EventType) {
    updateEvent({ eventType: t });
    setMode("event");
    if (t !== "OTHER") setStep("details");
  }

  const dateTooSoon = event.date !== "" && event.date < min;
  const guests = Number(event.guestCount);
  const detailsValid =
    event.date !== "" &&
    !dateTooSoon &&
    event.time !== "" &&
    Number.isFinite(guests) &&
    guests > 0 &&
    event.venue.trim() !== "" &&
    (event.eventType !== "OTHER" || event.eventTypeOther.trim() !== "");

  function toDishes() {
    setTouched(true);
    if (!detailsValid) return;
    setMode("event");
    router.push("/menu");
  }

  return (
    <>
      <EventProgress current={step === "type" ? "type" : "details"} />

      <div className="mx-auto max-w-2xl px-5 py-12 sm:px-8 sm:py-16">
        {step === "type" ? (
          <section>
            <p className="eyebrow">Step one</p>
            <h1 className="mt-3 font-display text-[32px] font-semibold leading-tight text-ink sm:text-[40px]">
              What are we celebrating?
            </h1>

            <div className="mt-10 grid gap-3 sm:grid-cols-2">
              {(Object.keys(EVENT_TYPE_LABELS) as EventType[]).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => chooseType(t)}
                  aria-pressed={event.eventType === t}
                  className={`rounded-sm border px-6 py-7 text-start transition-colors ${
                    event.eventType === t
                      ? "border-gold bg-gold-pale/40"
                      : "border-line bg-cream-warm hover:border-ink/35"
                  }`}
                >
                  <span className="hair" aria-hidden="true" />
                  <span className="mt-4 block font-display text-[22px] text-ink">
                    {EVENT_TYPE_LABELS[t]}
                  </span>
                </button>
              ))}
            </div>

            {event.eventType === "OTHER" && (
              <div className="mt-8">
                <label htmlFor="other" className="eyebrow mb-3 block">
                  Tell us the occasion
                </label>
                <input
                  id="other"
                  value={event.eventTypeOther}
                  onChange={(e) => updateEvent({ eventTypeOther: e.target.value })}
                  placeholder="Graduation, baby shower, corporate lunch…"
                  className="w-full rounded-sm border border-line bg-cream-warm px-4 py-3 text-[16px] text-ink placeholder:text-ink-faint focus:border-gold focus:outline-none"
                />
              </div>
            )}

            <div className="mt-10 flex items-center gap-4">
              <button
                type="button"
                onClick={() => setStep("details")}
                disabled={!event.eventType || (event.eventType === "OTHER" && !event.eventTypeOther.trim())}
                className="btn-primary disabled:cursor-not-allowed disabled:bg-ink/25"
              >
                Continue
              </button>
            </div>

            <EventNotice className="mt-8" />
          </section>
        ) : (
          <section>
            <p className="eyebrow">Step two</p>
            <h1 className="mt-3 font-display text-[32px] font-semibold leading-tight text-ink sm:text-[40px]">
              Tell us about the day
            </h1>

            <div className="mt-10 grid gap-6 sm:grid-cols-2">
              <Field label="Event date" htmlFor="date" hint={`Earliest available: ${min}`}>
                <input
                  id="date"
                  type="date"
                  value={event.date}
                  min={min}
                  onChange={(e) => updateEvent({ date: e.target.value })}
                  className={input(touched && (event.date === "" || dateTooSoon))}
                />
              </Field>

              <Field label="Event time" htmlFor="time">
                <input
                  id="time"
                  type="time"
                  value={event.time}
                  onChange={(e) => updateEvent({ time: e.target.value })}
                  className={input(touched && event.time === "")}
                />
              </Field>

              <Field label="Number of guests" htmlFor="guests">
                <input
                  id="guests"
                  type="number"
                  min={1}
                  inputMode="numeric"
                  value={event.guestCount}
                  onChange={(e) => updateEvent({ guestCount: e.target.value })}
                  placeholder="40"
                  className={input(touched && !(guests > 0))}
                />
              </Field>

              <Field label="Venue or address" htmlFor="venue" full>
                <input
                  id="venue"
                  value={event.venue}
                  onChange={(e) => updateEvent({ venue: e.target.value })}
                  placeholder="Where should we bring the food?"
                  className={input(touched && event.venue.trim() === "")}
                />
              </Field>
            </div>

            {dateTooSoon && (
              <p className="mt-5 rounded-sm border border-[#A6391C]/30 bg-[#A6391C]/[0.07] px-5 py-4 text-[15px] text-[#A6391C]">
                We need at least {RULES.event.noticeLabel} to prepare an event. The
                earliest date we can take is {min}.
              </p>
            )}

            <div className="mt-10 flex flex-wrap items-center gap-4">
              <button type="button" onClick={toDishes} className="btn-primary">
                Choose your dishes
              </button>
              <button
                type="button"
                onClick={() => setStep("type")}
                className="text-[15px] text-ink-soft underline underline-offset-4 hover:text-ink"
              >
                Back
              </button>
            </div>

            {touched && !detailsValid && !dateTooSoon && (
              <p className="mt-5 text-[15px] text-ink-soft">
                Please fill in every field so we can plan properly.
              </p>
            )}

            <EventNotice className="mt-8" />
          </section>
        )}
      </div>
    </>
  );
}

function input(invalid: boolean) {
  return `w-full rounded-sm border bg-cream-warm px-4 py-3 text-[16px] text-ink placeholder:text-ink-faint focus:outline-none ${
    invalid ? "border-[#A6391C]/60 focus:border-[#A6391C]" : "border-line focus:border-gold"
  }`;
}

function Field({
  label, htmlFor, hint, full = false, children,
}: {
  label: string; htmlFor: string; hint?: string; full?: boolean; children: React.ReactNode;
}) {
  return (
    <div className={full ? "sm:col-span-2" : undefined}>
      <label htmlFor={htmlFor} className="eyebrow mb-3 block">{label}</label>
      {children}
      {hint && <p className="mt-2 text-[13px] text-ink-faint">{hint}</p>}
    </div>
  );
}

"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useCart, EVENT_TYPE_LABELS, type EventType } from "@/lib/cart";
import { EventProgress, EventNotice } from "./event-steps";
import { earliestEventDate, toDateInput, validateEvent, EVENT_GUESTS } from "@/lib/ordering";
import { GuestInput } from "./event-request-panel";

/**
 * Steps one and two of the event request: the occasion, then the details.
 *
 * The date field ENFORCES the five-day rule rather than just describing it —
 * earlier dates cannot be picked, and are rejected if typed.
 */
export function EventStartForm() {
  const router = useRouter();
  const { event, updateEvent, startEvent, leaveEvent, mode, normalCount, ready } = useCart();
  const [choiceMade, setChoiceMade] = useState(mode === "event");
  const [step, setStep] = useState<"type" | "details">("type");
  const [touched, setTouched] = useState(false);

  const min = toDateInput(earliestEventDate());

  function chooseType(t: EventType) {
    updateEvent({ eventType: t });
    startEvent(); // never touches the normal order
    if (t !== "OTHER") setStep("details");
  }

  // One validator, shared with the server, so the rules cannot drift apart.
  const check = validateEvent(event);
  const detailsValid = check.ok;

  function toDishes() {
    setTouched(true);
    if (!detailsValid) return;
    startEvent();
    router.push("/menu");
  }

  // A normal order already in progress is never silently swallowed by an event.
  if (ready && !choiceMade && mode !== "event" && normalCount > 0) {
    return (
      <div className="mx-auto max-w-2xl px-5 py-16 sm:px-8 sm:py-20">
        <p className="eyebrow">Before we start</p>
        <h1 className="mt-3 font-display text-[30px] font-semibold leading-tight text-ink sm:text-[38px]">
          You already have a regular order
        </h1>
        <p className="mt-5 text-[17px] leading-relaxed text-ink-soft">
          There {normalCount === 1 ? "is" : "are"} {normalCount}{" "}
          {normalCount === 1 ? "dish" : "dishes"} in your regular order. An event request
          is a separate thing — what would you like to do?
        </p>

        <div className="mt-10 grid gap-3">
          <button
            type="button"
            onClick={() => { startEvent(false); setChoiceMade(true); }}
            className="rounded-sm border border-line bg-cream-warm px-6 py-6 text-start transition-colors hover:border-gold"
          >
            <span className="hair" aria-hidden="true" />
            <span className="mt-4 block font-display text-[20px] text-ink">
              Start a fresh event request
            </span>
            <span className="mt-2 block text-[15px] text-ink-soft">
              Your regular order stays exactly as it is, waiting for you.
            </span>
          </button>

          <button
            type="button"
            onClick={() => { startEvent(true); setChoiceMade(true); }}
            className="rounded-sm border border-line bg-cream-warm px-6 py-6 text-start transition-colors hover:border-gold"
          >
            <span className="hair" aria-hidden="true" />
            <span className="mt-4 block font-display text-[20px] text-ink">
              Move those dishes into the event
            </span>
            <span className="mt-2 block text-[15px] text-ink-soft">
              Your regular order is emptied and those {normalCount === 1 ? "dish becomes" : "dishes become"}{" "}
              part of the event request.
            </span>
          </button>
        </div>

        <button
          type="button"
          onClick={() => { leaveEvent(); router.push("/cart"); }}
          className="mt-8 text-[14.5px] text-ink-faint underline underline-offset-4 hover:text-ink"
        >
          Never mind, take me back to my order
        </button>
      </div>
    );
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
                  className={input(touched && !!check.errors.date)}
                />
              </Field>

              <Field label="Event time" htmlFor="time">
                <input
                  id="time"
                  type="time"
                  value={event.time}
                  onChange={(e) => updateEvent({ time: e.target.value })}
                  className={input(touched && !!check.errors.time)}
                />
              </Field>

              <Field
                label="Number of guests"
                htmlFor="guests"
                hint={`We cater events for up to ${EVENT_GUESTS.max} guests`}
              >
                <GuestInput />
              </Field>

              <Field label="Venue or address" htmlFor="venue" full>
                <input
                  id="venue"
                  value={event.venue}
                  onChange={(e) => updateEvent({ venue: e.target.value })}
                  placeholder="Where should we bring the food?"
                  className={input(touched && !!check.errors.venue)}
                />
              </Field>
            </div>

            {(touched || event.date) && !check.ok && (
              <p className="mt-5 rounded-sm border border-[#A6391C]/30 bg-[#A6391C]/[0.07] px-5 py-4 text-[15px] text-[#A6391C]">
                {Object.values(check.errors)[0]}
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

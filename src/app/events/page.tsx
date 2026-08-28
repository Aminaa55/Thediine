import type { Metadata } from "next";
import Link from "next/link";
import { Emblem } from "@/components/logo";

export const metadata: Metadata = { title: "Plan an Event" };

const OCCASIONS = ["Birthdays", "Engagements", "Weddings", "Anything else"];

const HOW = [
  {
    title: "Tell us about the occasion",
    body: "What you are celebrating, the date, and how many people you are feeding.",
  },
  {
    title: "Choose your dishes",
    body: "The same menu, the same dishes — you simply order the quantities an event needs.",
  },
  {
    title: "We confirm personally",
    body: "Event orders are a request, not an instant booking. We come back to you to confirm everything before anything is final.",
  },
];

export default function EventsPage() {
  return (
    <>
      <section className="relative overflow-hidden border-b border-line">
        <div
          aria-hidden="true"
          className="absolute inset-0"
          style={{ background: "radial-gradient(110% 90% at 80% 0%, #FFF8EE 0%, #F7EADA 50%, #EFDFC8 100%)" }}
        />
        <div className="relative mx-auto max-w-content px-5 py-20 sm:px-8 sm:py-28">
          <div className="max-w-2xl">
            <div className="flex items-center gap-3">
              <span className="rule-gold" />
              <p className="eyebrow">Event catering</p>
            </div>
            <h1 className="mt-7 font-display text-[38px] font-semibold leading-[1.06] tracking-tight text-ink sm:text-[54px]">
              For the days that matter most
            </h1>
            <p className="mt-7 max-w-xl text-[17px] leading-relaxed text-ink-soft sm:text-[19px]">
              Larger gatherings need a little more planning, so events work differently
              from an everyday order. We ask for at least five days, and we confirm every
              event personally before it is booked.
            </p>
            <div className="mt-10 flex flex-col gap-3 sm:flex-row sm:gap-4">
              <Link href="/menu" className="btn-primary">Browse the menu</Link>
              <Link href="/#how" className="btn-outline">How ordering works</Link>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-content px-5 py-20 sm:px-8 sm:py-24">
        <div className="grid gap-12 lg:grid-cols-[1fr_1.1fr] lg:gap-20">
          <div>
            <p className="eyebrow">What we cater</p>
            <ul className="mt-6 space-y-4">
              {OCCASIONS.map((o) => (
                <li key={o} className="flex items-center gap-4 border-b border-line pb-4 last:border-0">
                  <Emblem className="h-6 w-6 flex-none text-gold" />
                  <span className="font-display text-[21px] text-ink">{o}</span>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <p className="eyebrow">How an event order works</p>
            <ol className="mt-6 space-y-8">
              {HOW.map((step, i) => (
                <li key={step.title} className="flex gap-5">
                  <span className="font-display text-[15px] font-semibold text-gold tabular-nums">
                    0{i + 1}
                  </span>
                  <div>
                    <h3 className="font-display text-[20px] font-semibold text-ink">{step.title}</h3>
                    <p className="mt-2 text-[15.5px] leading-relaxed text-ink-soft">{step.body}</p>
                  </div>
                </li>
              ))}
            </ol>
          </div>
        </div>
      </section>

      <section className="border-t border-line bg-cream-deep">
        <div className="mx-auto max-w-content px-5 py-16 text-center sm:px-8 sm:py-20">
          <h2 className="mx-auto max-w-lg font-display text-[27px] font-semibold leading-tight text-ink sm:text-[34px]">
            Ready when you are
          </h2>
          <p className="mx-auto mt-4 max-w-md text-[16px] leading-relaxed text-ink-soft">
            Start by choosing your dishes. You will be asked about the occasion, the guest
            count and table décor when you check out.
          </p>
          <Link href="/menu" className="btn-gold mt-8">Browse the menu</Link>
        </div>
      </section>
    </>
  );
}

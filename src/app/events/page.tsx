import type { Metadata } from "next";
import Link from "next/link";
import { getGallery } from "@/lib/gallery";
import { OurWork } from "@/components/our-work";
import { EventEntry } from "@/components/event-entry";
import { Curve, GoldArc } from "@/components/curve";
import { getRules } from "@/lib/settings";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Plan an Event" };

const HOW = [
  { title: "Tell us the occasion", body: "Birthday, engagement, wedding, or something else entirely." },
  { title: "Give us the details", body: "Your date, time, guests and venue — and any décor, setup or staff you need." },
  { title: "Choose your dishes", body: "The same menu, the same dishes, in the quantities an event needs." },
  { title: "Send the request", body: "We come back to you personally to confirm everything before it is booked." },
];

export default async function EventsPage() {
  const [gallery, rules] = await Promise.all([getGallery("EVENTS", 5), getRules()]);

  return (
    <>
      <section className="relative overflow-hidden border-b border-line">
        <div
          aria-hidden="true"
          className="absolute inset-0"
          style={{ background: "radial-gradient(120% 100% at 85% -10%, #FFFDF8 0%, #F8EDDA 45%, #EFDDBE 100%)" }}
        />
        <div className="relative mx-auto max-w-content px-5 pb-28 pt-24 sm:px-8 sm:pb-36 sm:pt-32">
          <div className="max-w-2xl">
            <p className="label-rule">Event catering</p>
            <h1 className="mt-8 font-display text-[44px] font-semibold leading-[1.0] tracking-tight text-ink sm:text-[62px]">
              For the days
              <span className="ms-[0.14em] block italic font-normal text-gold">you will</span>
              <span className="block">remember.</span>
            </h1>
            <p className="mt-8 max-w-xl text-[18px] leading-relaxed text-ink-soft sm:text-[20px]">
              Larger gatherings deserve more than an order form. Tell us about the
              occasion and we will build the table around it.
            </p>
            <EventEntry />
          </div>
        </div>
        <Curve to="cream-warm" />
      </section>

      <section className="bg-cream-warm">
        <div className="mx-auto max-w-content px-5 pb-24 pt-8 sm:px-8 sm:pb-32">
          <p className="label-rule">How it works</p>
          <h2 className="mt-4 font-display text-[32px] font-semibold leading-tight text-ink sm:text-[42px]">
            Four steps, and
            <span className="italic font-normal text-gold"> a conversation</span>
          </h2>

          <ol className="mt-14 grid gap-10 sm:grid-cols-2 lg:grid-cols-4 lg:gap-6">
            {HOW.map((s, i) => (
              <li
                key={s.title}
                className={`rounded-sm border border-line bg-cream px-6 py-8 transition-transform duration-300 hover:-translate-y-1.5 ${
                  i % 2 === 1 ? "lg:mt-8" : ""
                }`}
              >
                <span className="font-display text-[15px] italic tabular-nums text-gold">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <span className="hair mt-3" aria-hidden="true" />
                <h3 className="mt-5 font-display text-[19px] font-semibold text-ink">{s.title}</h3>
                <p className="mt-2.5 text-[15px] leading-relaxed text-ink-soft">{s.body}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <OurWork
        images={gallery}
        heading="Events we have catered"
        title="Some of the tables we have set"
        showLink={false}
      />

      <section className="relative bg-cream-toast">
        <Curve to="cream-toast" flip />
        <div className="mx-auto max-w-content px-5 pb-20 pt-8 text-center sm:px-8 sm:pb-24">
          <GoldArc className="mx-auto h-7 w-16 text-gold/70" />
          <h2 className="mx-auto mt-6 max-w-lg font-display text-[30px] font-semibold leading-tight text-ink sm:text-[38px]">
            Ready when you are
          </h2>
          <p className="mx-auto mt-4 max-w-md text-[16px] leading-relaxed text-ink-soft">
            Events need at least {rules.eventNoticeLabel}&rsquo; notice. Everything you send is a
            request until we confirm it with you.
          </p>
          <EventEntry compact />
        </div>
      </section>
    </>
  );
}

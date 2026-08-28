import type { Metadata } from "next";
import Link from "next/link";
import { getGallery } from "@/lib/gallery";
import { OurWork } from "@/components/our-work";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Plan an Event" };

const HOW = [
  { title: "Tell us the occasion", body: "Birthday, engagement, wedding, or something else entirely." },
  { title: "Give us the details", body: "Your date and time, how many guests, and where we are coming to." },
  { title: "Choose your dishes", body: "The same menu, the same dishes, in the quantities an event needs." },
  { title: "Add what you need", body: "Table décor, setup on the day, serving staff — we quote each one for you." },
  { title: "Send the request", body: "We come back to you personally to confirm everything before it is booked." },
];

export default async function EventsPage() {
  const gallery = await getGallery("EVENTS", 5);

  return (
    <>
      <section className="relative overflow-hidden border-b border-line">
        <div
          aria-hidden="true"
          className="absolute inset-0"
          style={{ background: "radial-gradient(120% 100% at 85% -10%, #FFFDF8 0%, #F8EDDA 45%, #EFDDBE 100%)" }}
        />
        <div className="relative mx-auto max-w-content px-5 py-24 sm:px-8 sm:py-32">
          <div className="max-w-2xl">
            <div className="flex items-center gap-4">
              <span className="h-px w-14 bg-gold/50" aria-hidden="true" />
              <p className="eyebrow">Event catering</p>
            </div>
            <h1 className="mt-8 font-display text-[42px] font-semibold leading-[1.04] tracking-tight text-ink sm:text-[58px]">
              For the days you will remember.
            </h1>
            <p className="mt-8 max-w-xl text-[18px] leading-relaxed text-ink-soft sm:text-[20px]">
              Larger gatherings deserve more than an order form. Tell us about the
              occasion and we will build the table around it.
            </p>
            <Link href="/events/start" className="btn-primary mt-11">
              Start an event request
            </Link>
          </div>
        </div>
      </section>

      <section className="band-dark">
        <div className="mx-auto max-w-content px-5 py-20 sm:px-8 sm:py-24">
          <p className="eyebrow-light">How it works</p>
          <h2 className="mt-3 font-display text-[30px] font-semibold leading-tight text-cream sm:text-[38px]">
            Five steps, and a conversation
          </h2>

          <ol className="mt-12 grid gap-10 sm:grid-cols-2 lg:grid-cols-5 lg:gap-6">
            {HOW.map((s, i) => (
              <li key={s.title}>
                <span className="font-display text-[15px] font-semibold tabular-nums text-gold-bright">
                  0{i + 1}
                </span>
                <div className="mt-3 h-px w-full bg-line-dark" />
                <h3 className="mt-5 font-display text-[19px] font-semibold text-cream">{s.title}</h3>
                <p className="mt-2.5 text-[15px] leading-relaxed text-cream/60">{s.body}</p>
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

      <section className="band-toast border-y border-line">
        <div className="mx-auto max-w-content px-5 py-16 text-center sm:px-8 sm:py-20">
          <h2 className="mx-auto max-w-lg font-display text-[28px] font-semibold leading-tight text-ink sm:text-[36px]">
            Ready when you are
          </h2>
          <p className="mx-auto mt-4 max-w-md text-[16px] leading-relaxed text-ink-soft">
            Events need at least five days&rsquo; notice. Everything you send is a request
            until we confirm it with you.
          </p>
          <Link href="/events/start" className="btn-primary mt-8">Start an event request</Link>
        </div>
      </section>
    </>
  );
}

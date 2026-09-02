import Link from "next/link";
import { getCategories, getFeatured } from "@/lib/catalog";
import { getGallery } from "@/lib/gallery";
import { ProductCard } from "@/components/product-card";
import { OurWork } from "@/components/our-work";
import { Curve, GoldArc, Dots } from "@/components/curve";
import { BRAND } from "@/lib/brand";

export const dynamic = "force-dynamic";

const STEPS = [
  { title: "Choose your dishes", body: "Build your table from the menu, dish by dish." },
  { title: "Tell us when", body: "Your date, and whether we deliver or you collect." },
  { title: "We confirm with you", body: "Personally, before a single pan goes on the heat." },
];

export default async function HomePage() {
  const [categories, featured, gallery] = await Promise.all([
    getCategories(),
    getFeatured(5),
    getGallery("HOME", 5),
  ]);

  const [spotlight, ...rest] = featured;

  return (
    <>
      {/* ------------------------------------------------------------ hero */}
      <section className="relative overflow-hidden">
        <div
          aria-hidden="true"
          className="absolute inset-0"
          style={{
            background:
              "radial-gradient(120% 95% at 8% -15%, #FFFDF8 0%, #FDF5E9 40%, #F4E5CE 100%)",
          }}
        />
        {/* a large, very faint gold arc drifting off the right edge */}
        <svg
          aria-hidden="true"
          viewBox="0 0 600 600"
          className="pointer-events-none absolute -right-40 -top-32 h-[520px] w-[520px] text-gold/[0.13] lg:-right-20"
        >
          <circle cx="300" cy="300" r="280" fill="none" stroke="currentColor" strokeWidth="1" />
          <circle cx="300" cy="300" r="215" fill="none" stroke="currentColor" strokeWidth="1" />
          <circle cx="300" cy="300" r="150" fill="none" stroke="currentColor" strokeWidth="1" />
        </svg>

        <div className="relative mx-auto max-w-content px-5 pb-28 pt-24 sm:px-8 sm:pb-36 sm:pt-32 lg:pb-44 lg:pt-40">
          <div className="animate-rise">
            {/*
              One composition, not three lines of a heading: TABLES sits pale
              and enormous behind, and the sentence crosses it. The giant word
              is drawn in CSS rather than written here, so the heading is still
              just "For the tables that matter most." to a reader, a search
              engine or a link preview. See .hero-slogan in globals.css for how
              the alignments are held.
            */}
            <h1 className="hero-slogan">
              <span className="hs-lead">For the tables</span>
              <span className="hs-l1">
                <span className="hs-that">that</span>
                <span className="hs-matter">matter</span>
              </span>
              <span className="hs-l2">
                <span className="hs-that hs-spacer" aria-hidden="true">that</span>
                <span className="hs-dot" aria-hidden="true" />
                <span className="hs-most">most.</span>
              </span>
            </h1>

            <div className="max-w-3xl">
              <p className="mt-9 max-w-lg text-[18px] leading-relaxed text-ink-soft sm:text-[20px]">
                Dishes made by hand and sent out by the tray — the warmth of food cooked at
                home, for the gatherings you would rather spend with your guests.
              </p>

              <div className="mt-11 flex flex-col gap-3 sm:flex-row sm:gap-4">
                <Link href="/menu" className="btn-primary">Order from The Diine</Link>
                <Link href="/events" className="btn-outline">Plan an Event</Link>
              </div>
            </div>
          </div>
        </div>

        <Curve to="cream-warm" />
      </section>

      {/* ------------------------------------------------- categories, offset */}
      <section className="bg-cream-warm">
        <div className="mx-auto max-w-content px-5 pb-24 pt-8 sm:px-8 sm:pb-32">
          <div className="flex flex-wrap items-end justify-between gap-8">
            <div className="max-w-md">
              <p className="label-rule">The menu</p>
              <h2 className="mt-4 font-display text-[32px] font-semibold leading-[1.1] text-ink sm:text-[42px]">
                Four courses,
                <span className="italic font-normal text-gold"> cooked to order</span>
              </h2>
            </div>
            <Dots className="h-1.5 w-[34px] text-gold" />
          </div>

          {/* Alternating vertical offsets give the row a hand-set rhythm. */}
          <div className="mt-14 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {categories.map((c, i) => (
              <Link
                key={c.slug}
                href={`/menu/${c.slug}`}
                className={`group relative flex flex-col justify-between gap-12 rounded-sm border border-line bg-cream px-6 py-8 transition-all duration-300 hover:-translate-y-1.5 hover:border-gold hover:shadow-[0_18px_36px_-26px_rgba(59,35,16,.6)] ${
                  i % 2 === 1 ? "lg:mt-10" : ""
                }`}
              >
                <span className="font-display text-[15px] italic tabular-nums text-gold">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <div>
                  <h3 className="font-display text-[23px] font-semibold leading-snug text-ink">
                    {c.nameEn}
                  </h3>
                  <p className="mt-2 text-[13.5px] text-ink-faint">{c._count.products} dishes</p>
                  <span
                    aria-hidden="true"
                    className="mt-5 block h-px w-8 bg-gold/40 transition-all duration-300 group-hover:w-16"
                  />
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ---------------------------------------------- featured, editorial */}
      {spotlight && (
        <section className="relative bg-cream-warm">
          <Curve to="cream" flip />
          <div className="bg-cream">
            <div className="mx-auto max-w-content px-5 pb-24 pt-4 sm:px-8 sm:pb-32">
              <div className="flex flex-wrap items-end justify-between gap-6">
                <div>
                  <p className="label-rule">A few favourites</p>
                  <h2 className="mt-4 font-display text-[32px] font-semibold leading-tight text-ink sm:text-[42px]">
                    Where most tables begin
                  </h2>
                </div>
                <Link href="/menu" className="link-sweep text-[15px]">
                  See everything &rarr;
                </Link>
              </div>

              {/* One dish given room, the rest in a tighter column beside it. */}
              <div className="mt-12 grid gap-5 lg:grid-cols-[1.15fr_1fr] lg:items-start">
                <article className="bracket group relative rounded-sm border border-line bg-cream-warm p-9 transition-all duration-300 hover:-translate-y-1 hover:border-gold sm:p-12">
                  <GoldArc className="h-6 w-14 text-gold/70" />
                  <p className="mt-6 text-[11px] uppercase tracking-widest text-ink-faint">
                    {spotlight.category.nameEn}
                  </p>
                  <h3 className="mt-4 font-display text-[30px] font-semibold leading-[1.15] text-ink sm:text-[38px]">
                    {spotlight.nameEn}
                  </h3>
                  {spotlight.descriptionEn && (
                    <p className="mt-5 max-w-md text-[16.5px] leading-relaxed text-ink-soft">
                      {spotlight.descriptionEn}
                    </p>
                  )}
                  <Link
                    href={`/product/${spotlight.slug}`}
                    className="btn-outline mt-9"
                    aria-label={`Choose ${spotlight.nameEn}`}
                  >
                    Choose this dish
                  </Link>
                </article>

                <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
                  {rest.map((p) => <ProductCard key={p.id} product={p} />)}
                </div>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* -------------------------------------------------------- our work */}
      <OurWork
        images={gallery}
        intro="Photographs from real gatherings we have cooked for."
      />

      {/* ------------------------------------------------------ hosting */}
      <section className="relative overflow-hidden bg-cream-toast">
        <Curve to="cream-toast" flip />
        <div className="mx-auto max-w-content px-5 pb-24 pt-10 sm:px-8 sm:pb-32">
          <div className="grid items-center gap-14 lg:grid-cols-[1fr_1.05fr] lg:gap-20">
            <div>
              <p className="label-rule">Hosting &amp; events</p>
              <h2 className="mt-4 font-display text-[32px] font-semibold leading-[1.1] text-ink sm:text-[44px]">
                Birthdays, engagements,
                <span className="italic font-normal text-gold"> weddings</span>
              </h2>
              <p className="mt-6 max-w-md text-[17px] leading-relaxed text-ink-soft">
                Tell us about the occasion, choose your dishes, and let us know if you
                would like the table dressed, the setup handled, or staff on the day.
              </p>
              <Link href="/events" className="btn-primary mt-9">Plan an Event</Link>
            </div>

            {/* Four cards, each nudged a little — a stack, not a grid. */}
            <ul className="grid gap-4 sm:grid-cols-2">
              {["Birthdays", "Engagements", "Weddings", "Every other occasion"].map((o, i) => (
                <li
                  key={o}
                  className={`rounded-sm border border-gold/30 bg-cream-warm px-6 py-8 transition-transform duration-300 hover:-translate-y-1 ${
                    i === 1 ? "sm:translate-y-6" : i === 2 ? "sm:-translate-y-3" : ""
                  }`}
                >
                  <span className="hair" aria-hidden="true" />
                  <p className="mt-4 font-display text-[20px] leading-snug text-ink">{o}</p>
                </li>
              ))}
            </ul>
          </div>
        </div>
        <Curve to="cream" />
      </section>

      {/* --------------------------------------------------- how it works */}
      <section id="how" className="scroll-mt-24 bg-cream">
        <div className="mx-auto max-w-content px-5 pb-24 pt-16 sm:px-8 sm:pb-32">
          <p className="label-rule">How ordering works</p>
          <h2 className="mt-4 font-display text-[32px] font-semibold leading-tight text-ink sm:text-[42px]">
            Three steps
          </h2>

          <ol className="relative mt-14 grid gap-12 sm:grid-cols-3 sm:gap-8">
            {/* a dashed gold thread running behind the numerals */}
            <span
              aria-hidden="true"
              className="absolute inset-x-8 top-3 hidden border-t border-dashed border-gold/35 sm:block"
            />
            {STEPS.map((step, i) => (
              <li key={step.title} className="relative">
                <span className="relative flex h-7 w-7 items-center justify-center rounded-full border border-gold/50 bg-cream font-display text-[13px] tabular-nums text-gold">
                  {i + 1}
                </span>
                <h3 className="mt-6 font-display text-[21px] font-semibold text-ink">
                  {step.title}
                </h3>
                <p className="mt-2.5 text-[15.5px] leading-relaxed text-ink-soft">{step.body}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* ------------------------------------------------------- instagram */}
      <section className="relative bg-cream-deep">
        <Curve to="cream-deep" flip />
        <div className="mx-auto max-w-content px-5 pb-24 pt-10 text-center sm:px-8 sm:pb-28">
          <GoldArc className="mx-auto h-7 w-16 text-gold/70" />
          <h2 className="mx-auto mt-6 max-w-lg font-display text-[30px] font-semibold leading-tight text-ink sm:text-[40px]">
            See what is coming
            <span className="italic font-normal text-gold"> out of the kitchen</span>
          </h2>
          <a href={BRAND.instagram} target="_blank" rel="noreferrer" className="btn-outline mt-9">
            @thediine on Instagram
          </a>
        </div>
      </section>
    </>
  );
}

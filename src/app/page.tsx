import Link from "next/link";
import { getCategories, getFeatured } from "@/lib/catalog";
import { getGallery } from "@/lib/gallery";
import { ProductCard } from "@/components/product-card";
import { OurWork } from "@/components/our-work";
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
    getFeatured(6),
    getGallery("HOME", 5),
  ]);

  return (
    <>
      {/* ---------------------------------------------------------- hero */}
      <section className="relative overflow-hidden border-b border-line">
        <div
          aria-hidden="true"
          className="absolute inset-0"
          style={{
            background:
              "radial-gradient(130% 100% at 12% -10%, #FFFDF8 0%, #FDF5E9 38%, #F3E3C9 100%)",
          }}
        />
        <div className="relative mx-auto max-w-content px-5 py-24 sm:px-8 sm:py-32 lg:py-40">
          <div className="max-w-3xl animate-rise">
            <div className="flex items-center gap-4">
              <span className="h-px w-14 bg-gold/50" aria-hidden="true" />
              <p className="eyebrow">{BRAND.tagline}</p>
            </div>

            <h1 className="mt-8 font-display text-[44px] font-semibold leading-[1.02] tracking-tight text-ink sm:text-[62px] lg:text-[76px]">
              For the tables
              <br />
              that matter.
            </h1>

            <p className="mt-8 max-w-xl text-[18px] leading-relaxed text-ink-soft sm:text-[20px]">
              Dishes made by hand and sent out by the tray — the warmth of food cooked at
              home, prepared for the gatherings you would rather spend with your guests
              than in the kitchen.
            </p>

            <div className="mt-11 flex flex-col gap-3 sm:flex-row sm:gap-4">
              <Link href="/menu" className="btn-primary">Order from The Diine</Link>
              <Link href="/events" className="btn-outline">Plan an Event</Link>
            </div>
          </div>
        </div>
      </section>

      {/* ----------------------------------------------- categories (dark) */}
      <section className="band-dark">
        <div className="mx-auto max-w-content px-5 py-20 sm:px-8 sm:py-28">
          <div className="max-w-2xl">
            <p className="eyebrow-light">The menu</p>
            <h2 className="mt-3 font-display text-[32px] font-semibold leading-tight text-cream sm:text-[42px]">
              Four courses, cooked to order
            </h2>
          </div>

          <div className="mt-12 grid gap-px overflow-hidden rounded-sm border border-line-dark bg-line-dark sm:grid-cols-2 lg:grid-cols-4">
            {categories.map((c, i) => (
              <Link
                key={c.slug}
                href={`/menu/${c.slug}`}
                className="group flex flex-col justify-between gap-10 bg-ink-deep p-7 transition-colors hover:bg-[#33200F]"
              >
                <span className="font-display text-[13px] tabular-nums text-gold-bright">
                  0{i + 1}
                </span>
                <div>
                  <h3 className="font-display text-[23px] font-semibold text-cream">{c.nameEn}</h3>
                  <p className="mt-2 flex items-center gap-2 text-[13.5px] text-cream/50">
                    {c._count.products} dishes
                    <span className="text-gold-bright opacity-0 transition-opacity group-hover:opacity-100" aria-hidden="true">
                      &rarr;
                    </span>
                  </p>
                </div>
              </Link>
            ))}
          </div>

          <Link href="/menu" className="mt-8 inline-block text-[15px] text-gold-bright hover:underline">
            Browse the full menu &rarr;
          </Link>
        </div>
      </section>

      {/* -------------------------------------------------- featured dishes */}
      {featured.length > 0 && (
        <section className="mx-auto max-w-content px-5 py-20 sm:px-8 sm:py-28">
          <div className="flex flex-wrap items-end justify-between gap-6">
            <div>
              <p className="eyebrow">A few favourites</p>
              <h2 className="mt-3 font-display text-[30px] font-semibold leading-tight text-ink sm:text-[38px]">
                Where most tables begin
              </h2>
            </div>
            <Link href="/menu" className="text-[15px] text-gold hover:underline">
              See everything &rarr;
            </Link>
          </div>

          <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {featured.map((p) => <ProductCard key={p.id} product={p} />)}
          </div>
        </section>
      )}

      {/* ------------------------------------------------------- our work */}
      <OurWork
        images={gallery}
        intro="Photographs from real gatherings we have cooked for."
      />

      {/* --------------------------------------------------- events (toast) */}
      <section className="band-toast border-y border-line">
        <div className="mx-auto max-w-content px-5 py-20 sm:px-8 sm:py-28">
          <div className="grid items-center gap-14 lg:grid-cols-[1fr_1.15fr] lg:gap-20">
            <div>
              <p className="eyebrow">Hosting &amp; events</p>
              <h2 className="mt-3 font-display text-[32px] font-semibold leading-tight text-ink sm:text-[42px]">
                Birthdays, engagements, weddings
              </h2>
              <p className="mt-6 text-[17px] leading-relaxed text-ink-soft">
                Tell us about the occasion, choose your dishes, and let us know if you
                would like the table dressed, the setup handled, or staff on the day.
                We come back to you personally to confirm every detail.
              </p>
              <Link href="/events" className="btn-primary mt-9">Plan an Event</Link>
            </div>

            <ul className="grid gap-px overflow-hidden rounded-sm border border-line bg-line sm:grid-cols-2">
              {["Birthdays", "Engagements", "Weddings", "Every other occasion"].map((o) => (
                <li key={o} className="bg-cream-warm px-6 py-8">
                  <span className="hair" aria-hidden="true" />
                  <p className="mt-4 font-display text-[20px] text-ink">{o}</p>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* ------------------------------------------------------ how it works */}
      <section id="how" className="mx-auto max-w-content scroll-mt-24 px-5 py-20 sm:px-8 sm:py-28">
        <p className="eyebrow">How ordering works</p>
        <h2 className="mt-3 font-display text-[30px] font-semibold leading-tight text-ink sm:text-[38px]">
          Three steps
        </h2>

        <ol className="mt-12 grid gap-10 sm:grid-cols-3 sm:gap-8">
          {STEPS.map((step, i) => (
            <li key={step.title}>
              <span className="font-display text-[15px] font-semibold tabular-nums text-gold">
                0{i + 1}
              </span>
              <span className="hair mt-3" aria-hidden="true" />
              <h3 className="mt-5 font-display text-[21px] font-semibold text-ink">{step.title}</h3>
              <p className="mt-2.5 text-[15.5px] leading-relaxed text-ink-soft">{step.body}</p>
            </li>
          ))}
        </ol>
      </section>

      {/* ---------------------------------------------------------- social */}
      <section className="band-dark">
        <div className="mx-auto max-w-content px-5 py-20 text-center sm:px-8 sm:py-24">
          <p className="eyebrow-light">Follow along</p>
          <h2 className="mx-auto mt-3 max-w-lg font-display text-[30px] font-semibold leading-tight text-cream sm:text-[38px]">
            See what is coming out of the kitchen
          </h2>
          <a href={BRAND.instagram} target="_blank" rel="noreferrer" className="btn-on-dark mt-9">
            @thediine on Instagram
          </a>
        </div>
      </section>
    </>
  );
}

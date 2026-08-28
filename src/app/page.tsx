import Link from "next/link";
import { getCategories, getFeatured } from "@/lib/catalog";
import { ProductCard } from "@/components/product-card";
import { Emblem } from "@/components/logo";

export const dynamic = "force-dynamic";

const STEPS = [
  {
    title: "Choose your dishes",
    body: "Browse the menu and build your order — mains, sides, salads and desserts, with the choices each dish offers.",
  },
  {
    title: "Pick your date",
    body: "Tell us when you need it and whether you would like delivery or to collect. We ask for at least 48 hours.",
  },
  {
    title: "We confirm on WhatsApp",
    body: "Every order is confirmed personally before we start cooking, so nothing is ever left to a machine.",
  },
];

export default async function HomePage() {
  const [categories, featured] = await Promise.all([getCategories(), getFeatured(6)]);

  return (
    <>
      {/* Hero */}
      <section className="relative overflow-hidden border-b border-line">
        <div
          aria-hidden="true"
          className="absolute inset-0"
          style={{
            background:
              "radial-gradient(120% 90% at 15% 0%, #FFF8EE 0%, #FBF1E4 45%, #F3E5D0 100%)",
          }}
        />
        <div className="relative mx-auto grid max-w-content items-center gap-14 px-5 py-20 sm:px-8 sm:py-28 lg:grid-cols-[1.05fr_1fr] lg:gap-20 lg:py-32">
          <div className="max-w-2xl">
            <div className="flex items-center gap-3">
              <span className="rule-gold" />
              <p className="eyebrow">Food Made With Passion</p>
            </div>

            <h1 className="mt-7 font-display text-[42px] font-semibold leading-[1.05] tracking-tight text-ink sm:text-[58px] lg:text-[68px]">
              Food for the people you gather.
            </h1>

            <p className="mt-7 max-w-xl text-[17px] leading-relaxed text-ink-soft sm:text-[19px]">
              The Diine is a home kitchen in Egypt cooking for gatherings, hosting and
              celebrations — full trays of the food you would make yourself, if you had
              the day free.
            </p>

            <div className="mt-10 flex flex-col gap-3 sm:flex-row sm:gap-4">
              <Link href="/menu" className="btn-primary">
                Order from The Diine
              </Link>
              <Link href="/events" className="btn-outline">
                Plan an Event
              </Link>
            </div>

            <p className="mt-7 text-[14px] text-ink-faint">
              Orders need at least 48 hours&rsquo; notice · Events at least 5 days
            </p>
          </div>

          {/* Reserved for the hero photograph. Swap DishImage's placeholder for
              a real image and the composition holds. */}
          <div className="hidden lg:block">
            <div className="relative aspect-[4/5] overflow-hidden rounded-sm border border-line">
              <div
                aria-hidden="true"
                className="absolute inset-0"
                style={{ background: "linear-gradient(155deg, #F7E7CE 0%, #E6CDA2 100%)" }}
              />
              <div className="relative flex h-full flex-col items-center justify-center gap-6 px-10 text-center">
                <Emblem className="h-20 w-20 text-gold" />
                <p className="font-display text-[24px] leading-snug text-ink/60">
                  Trays of food, cooked to order, for tables full of people.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Featured */}
      {featured.length > 0 && (
        <section className="mx-auto max-w-content px-5 py-20 sm:px-8 sm:py-24">
          <div className="flex items-end justify-between gap-6">
            <div>
              <p className="eyebrow">A few favourites</p>
              <h2 className="mt-3 font-display text-[30px] font-semibold leading-tight text-ink sm:text-[38px]">
                From our table to yours
              </h2>
            </div>
            <Link href="/menu" className="hidden whitespace-nowrap text-[15px] text-gold hover:underline sm:block">
              See the full menu &rarr;
            </Link>
          </div>

          <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {featured.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>

          <Link href="/menu" className="mt-8 block text-[15px] text-gold hover:underline sm:hidden">
            See the full menu &rarr;
          </Link>
        </section>
      )}

      {/* Categories */}
      <section className="border-y border-line bg-cream-deep">
        <div className="mx-auto max-w-content px-5 py-20 sm:px-8 sm:py-24">
          <p className="eyebrow">Explore our menu</p>
          <h2 className="mt-3 max-w-xl font-display text-[30px] font-semibold leading-tight text-ink sm:text-[38px]">
            Everything is cooked to order, by the tray
          </h2>

          <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {categories.map((c) => (
              <Link
                key={c.slug}
                href={`/menu/${c.slug}`}
                className="group flex items-center justify-between gap-4 rounded-sm border border-line bg-cream-warm px-6 py-7 transition-colors hover:border-gold/60"
              >
                <div>
                  <h3 className="font-display text-[21px] font-semibold text-ink">{c.nameEn}</h3>
                  <p className="mt-1 text-[13.5px] text-ink-faint">
                    {c._count.products} {c._count.products === 1 ? "dish" : "dishes"}
                  </p>
                </div>
                <span className="text-gold transition-transform group-hover:translate-x-1" aria-hidden="true">
                  &rarr;
                </span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Catering / hosting */}
      <section className="mx-auto max-w-content px-5 py-20 sm:px-8 sm:py-28">
        <div className="grid items-center gap-12 lg:grid-cols-2 lg:gap-20">
          <div>
            <p className="eyebrow">Hosting &amp; events</p>
            <h2 className="mt-3 font-display text-[30px] font-semibold leading-tight text-ink sm:text-[38px]">
              Birthdays, engagements, weddings
            </h2>
            <p className="mt-6 text-[17px] leading-relaxed text-ink-soft">
              Event catering works a little differently. Tell us about the occasion and
              how many people you are feeding, choose your dishes from the same menu, and
              we will come back to you personally to confirm every detail.
            </p>
            <p className="mt-4 text-[17px] leading-relaxed text-ink-soft">
              You can also choose whether you would like your food in our returnable
              serving dishes, or in disposable ones you keep.
            </p>
            <Link href="/events" className="btn-gold mt-9">
              Plan an Event
            </Link>
          </div>

          <div className="relative aspect-[5/4] overflow-hidden rounded-sm border border-line">
            <div
              aria-hidden="true"
              className="absolute inset-0"
              style={{ background: "linear-gradient(155deg, #F7E7CE 0%, #E6CDA2 100%)" }}
            />
            <div className="relative flex h-full flex-col items-center justify-center gap-5 text-center">
              <Emblem className="h-16 w-16 text-gold" />
              <p className="max-w-xs px-8 font-display text-[22px] leading-snug text-ink/70">
                &ldquo;Food made with passion&rdquo;
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* How ordering works */}
      <section id="how" className="border-t border-line bg-cream-deep scroll-mt-20">
        <div className="mx-auto max-w-content px-5 py-20 sm:px-8 sm:py-24">
          <p className="eyebrow">How ordering works</p>
          <h2 className="mt-3 font-display text-[30px] font-semibold leading-tight text-ink sm:text-[38px]">
            Three steps
          </h2>

          <ol className="mt-12 grid gap-10 sm:grid-cols-3 sm:gap-8">
            {STEPS.map((step, i) => (
              <li key={step.title}>
                <span className="font-display text-[15px] font-semibold text-gold tabular-nums">
                  0{i + 1}
                </span>
                <div className="mt-3 h-px w-full bg-line" />
                <h3 className="mt-5 font-display text-[21px] font-semibold text-ink">{step.title}</h3>
                <p className="mt-2.5 text-[15.5px] leading-relaxed text-ink-soft">{step.body}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* Instagram */}
      <section className="mx-auto max-w-content px-5 py-20 text-center sm:px-8 sm:py-24">
        <p className="eyebrow">Follow along</p>
        <h2 className="mx-auto mt-3 max-w-lg font-display text-[30px] font-semibold leading-tight text-ink sm:text-[38px]">
          See what is coming out of the kitchen
        </h2>
        <a
          href="https://www.instagram.com/thediine/"
          target="_blank"
          rel="noreferrer"
          className="btn-outline mt-8"
        >
          @thediine on Instagram
        </a>
      </section>
    </>
  );
}

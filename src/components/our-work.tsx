import Link from "next/link";
import { Curve, Dots } from "./curve";

export type GalleryItem = {
  id: string;
  imageUrl: string;
  altEn: string;
  captionEn: string | null;
};

/**
 * Real photographs of The Diine's dishes, tables and events.
 *
 * An editorial collage rather than a uniform grid: the lead image runs tall,
 * the others sit at varied proportions with a slight stagger. If there are no
 * photographs the whole section disappears, so a customer never sees an empty
 * frame or a stand-in image.
 */
export function OurWork({
  images,
  heading = "Our work",
  title = "Tables we have set",
  intro,
  showLink = true,
}: {
  images: GalleryItem[];
  heading?: string;
  title?: string;
  intro?: string;
  showLink?: boolean;
}) {
  if (images.length === 0) return null;

  const [lead, ...rest] = images;

  return (
    <section className="relative bg-cream-deep">
      <Curve to="cream-deep" flip />
      <div className="mx-auto max-w-content px-5 pb-24 pt-10 sm:px-8 sm:pb-32">
        <div className="flex flex-wrap items-end justify-between gap-6">
          <div className="max-w-xl">
            <p className="label-rule">{heading}</p>
            <h2 className="mt-4 font-display text-[32px] font-semibold leading-tight text-ink sm:text-[42px]">
              {title}
            </h2>
            {intro && <p className="mt-5 text-[17px] leading-relaxed text-ink-soft">{intro}</p>}
          </div>
          {showLink ? (
            <Link href="/our-work" className="link-sweep text-[15px]">
              See more of our work &rarr;
            </Link>
          ) : (
            <Dots className="h-1.5 w-[34px] text-gold" />
          )}
        </div>

        {/* Lead image tall on the left, a matching block beside it, so the
            collage locks together instead of leaving a ragged gap. */}
        <div className="mt-12 grid gap-4 lg:grid-cols-[1.12fr_1fr] lg:items-stretch">
          <Figure item={lead} ratio="aspect-[4/5] lg:aspect-auto lg:min-h-[34rem]" />
          {rest.length > 0 && (
            <div className="grid grid-cols-2 gap-4 lg:grid-cols-1 lg:auto-rows-fr">
              {rest.slice(0, 4).map((item) => (
                <Figure key={item.id} item={item} ratio="aspect-[4/3] lg:aspect-auto" />
              ))}
            </div>
          )}
        </div>
      </div>
      <Curve to="cream-toast" />
    </section>
  );
}

/** No caption. The photography speaks for itself; alt text stays for screen readers. */
function Figure({
  item, ratio, className = "",
}: { item: GalleryItem; ratio: string; className?: string }) {
  return (
    <figure
      className={`group relative overflow-hidden rounded-sm border border-line bg-cream-warm ${ratio} ${className}`}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={item.imageUrl}
        alt={item.altEn}
        loading="lazy"
        className="h-full w-full object-cover transition-transform duration-[900ms] ease-out group-hover:scale-[1.05]"
      />
    </figure>
  );
}

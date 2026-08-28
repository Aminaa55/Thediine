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

        <div className="mt-12 grid gap-4 lg:grid-cols-[1.15fr_1fr] lg:items-start">
          <Figure item={lead} ratio="aspect-[4/5]" />
          {rest.length > 0 && (
            <div className="grid gap-4 sm:grid-cols-2">
              {rest.slice(0, 4).map((item, i) => (
                <Figure
                  key={item.id}
                  item={item}
                  ratio={i === 0 ? "aspect-[4/3]" : i === 3 ? "aspect-[4/3]" : "aspect-square"}
                  className={i === 1 ? "sm:mt-8" : i === 3 ? "sm:-mt-8" : ""}
                />
              ))}
            </div>
          )}
        </div>
      </div>
      <Curve to="cream-toast" />
    </section>
  );
}

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
      {item.captionEn && (
        <figcaption className="absolute inset-x-0 bottom-0 translate-y-2 bg-gradient-to-t from-ink/85 to-transparent p-5 text-[14px] text-cream opacity-0 transition-all duration-300 group-hover:translate-y-0 group-hover:opacity-100">
          {item.captionEn}
        </figcaption>
      )}
    </figure>
  );
}

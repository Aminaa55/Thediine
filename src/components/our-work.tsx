import Link from "next/link";

export type GalleryItem = {
  id: string;
  imageUrl: string;
  altEn: string;
  captionEn: string | null;
};

/**
 * Real photographs of The Diine's dishes, tables and events.
 *
 * If there are none, the whole section disappears — a customer never sees an
 * empty frame or a stand-in photograph.
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
    <section className="band-deep border-y border-line">
      <div className="mx-auto max-w-content px-5 py-20 sm:px-8 sm:py-24">
        <div className="flex flex-wrap items-end justify-between gap-6">
          <div>
            <p className="eyebrow">{heading}</p>
            <h2 className="mt-3 font-display text-[30px] font-semibold leading-tight text-ink sm:text-[38px]">
              {title}
            </h2>
            {intro && (
              <p className="mt-5 max-w-xl text-[17px] leading-relaxed text-ink-soft">{intro}</p>
            )}
          </div>
          {showLink && (
            <Link href="/our-work" className="text-[15px] text-gold hover:underline">
              See more of our work &rarr;
            </Link>
          )}
        </div>

        {/* One lead image, the rest in a mosaic — a grid of equal tiles reads
            as a contact sheet rather than a portfolio. */}
        <div className="mt-10 grid gap-4 lg:grid-cols-2">
          <Figure item={lead} tall />
          {rest.length > 0 && (
            <div className="grid gap-4 sm:grid-cols-2">
              {rest.slice(0, 4).map((item) => (
                <Figure key={item.id} item={item} />
              ))}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

function Figure({ item, tall = false }: { item: GalleryItem; tall?: boolean }) {
  return (
    <figure
      className={`group relative overflow-hidden rounded-sm border border-line bg-cream-warm ${
        tall ? "aspect-[4/5] lg:aspect-auto lg:h-full" : "aspect-[4/3]"
      }`}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={item.imageUrl}
        alt={item.altEn}
        loading="lazy"
        className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-[1.04]"
      />
      {item.captionEn && (
        <figcaption className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-ink-deep/80 to-transparent p-5 text-[14px] text-cream">
          {item.captionEn}
        </figcaption>
      )}
    </figure>
  );
}

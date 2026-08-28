import type { Metadata } from "next";
import Link from "next/link";
import { getGallery } from "@/lib/gallery";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Our Work" };

export default async function OurWorkPage() {
  const images = await getGallery("HOME");

  return (
    <>
      <div className="border-b border-line bg-cream-deep">
        <div className="mx-auto max-w-content px-5 py-14 sm:px-8 sm:py-20">
          <p className="eyebrow">Our work</p>
          <h1 className="mt-3 font-display text-[36px] font-semibold leading-tight text-ink sm:text-[48px]">
            Tables we have set
          </h1>
          <p className="mt-5 max-w-xl text-[17px] leading-relaxed text-ink-soft">
            Photographs from gatherings, celebrations and everyday tables we have cooked for.
          </p>
        </div>
      </div>

      <div className="mx-auto max-w-content px-5 py-16 sm:px-8 sm:py-20">
        {images.length === 0 ? (
          <div className="mx-auto max-w-md py-16 text-center">
            <p className="font-display text-[22px] text-ink">Photographs coming soon</p>
            <p className="mt-3 text-[16px] text-ink-soft">
              In the meantime, our latest work is on Instagram.
            </p>
            <Link href="/menu" className="btn-primary mt-8">Browse the menu</Link>
          </div>
        ) : (
          <div className="columns-1 gap-5 sm:columns-2 lg:columns-3">
            {images.map((img) => (
              <figure
                key={img.id}
                className="mb-5 break-inside-avoid overflow-hidden rounded-sm border border-line"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={img.imageUrl} alt={img.altEn} loading="lazy" className="w-full" />
              </figure>
            ))}
          </div>
        )}
      </div>
    </>
  );
}

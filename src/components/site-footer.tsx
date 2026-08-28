import Link from "next/link";
import { Logo } from "./logo";
import { BRAND } from "@/lib/brand";

export function SiteFooter() {
  return (
    <footer className="mt-24 border-t border-line bg-cream-deep">
      <div className="mx-auto max-w-content px-5 py-16 sm:px-8 sm:py-20">
        <div className="grid gap-12 sm:grid-cols-2 lg:grid-cols-4">
          <div className="lg:col-span-2">
            <Logo size="md" />
            <p className="mt-6 max-w-sm font-display text-[24px] italic leading-snug text-gold">
              {BRAND.tagline}.
            </p>
            <p className="mt-4 max-w-xs text-[15px] leading-relaxed text-ink-soft">
              Cooking for gatherings, hosting and celebrations across Egypt.
            </p>
          </div>

          <div>
            <h3 className="eyebrow">Menu</h3>
            <ul className="mt-5 space-y-2.5 text-[15px] text-ink-soft">
              <li><Link href="/menu/main-courses" className="hover:text-gold">Main Courses</Link></li>
              <li><Link href="/menu/side-dishes" className="hover:text-gold">Side Dishes</Link></li>
              <li><Link href="/menu/salads" className="hover:text-gold">Salads</Link></li>
              <li><Link href="/menu/desserts" className="hover:text-gold">Desserts</Link></li>
            </ul>
          </div>

          <div>
            <h3 className="eyebrow">The Diine</h3>
            <ul className="mt-5 space-y-2.5 text-[15px] text-ink-soft">
              <li><Link href="/our-work" className="hover:text-gold">Our Work</Link></li>
              <li><Link href="/events" className="hover:text-gold">Plan an event</Link></li>
              <li>
                <a href={BRAND.instagram} target="_blank" rel="noreferrer" className="hover:text-gold">
                  Instagram
                </a>
              </li>
              <li>
                <a href={`https://wa.me/${BRAND.whatsapp.replace(/[^0-9]/g, "")}`}
                   target="_blank" rel="noreferrer" className="hover:text-gold">
                  WhatsApp
                </a>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-14 flex flex-col gap-2 border-t border-line pt-7 text-[13px] text-ink-faint sm:flex-row sm:items-center sm:justify-between">
          <p>&copy; {new Date().getFullYear()} {BRAND.name}. Cairo, Egypt.</p>
          <p>Every order is confirmed personally before we cook.</p>
        </div>
      </div>
    </footer>
  );
}

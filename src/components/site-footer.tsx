import Link from "next/link";
import { Emblem, Wordmark } from "./logo";

const INSTAGRAM = "https://www.instagram.com/thediine/";

export function SiteFooter() {
  return (
    <footer className="mt-24 border-t border-line bg-cream-deep">
      <div className="mx-auto max-w-content px-5 py-16 sm:px-8">
        <div className="grid gap-12 sm:grid-cols-2 lg:grid-cols-4">
          <div className="lg:col-span-2">
            <div className="flex items-center gap-3">
              <Emblem className="h-9 w-9 text-gold" />
              <Wordmark className="text-[17px]" />
            </div>
            <p className="mt-5 max-w-xs font-display text-xl leading-snug text-ink-soft">
              Food made with passion, for the people you gather.
            </p>
          </div>

          <div>
            <h3 className="eyebrow">Menu</h3>
            <ul className="mt-4 space-y-2.5 text-[15px] text-ink-soft">
              <li><Link href="/menu/main-courses" className="hover:text-ink">Main Courses</Link></li>
              <li><Link href="/menu/side-dishes" className="hover:text-ink">Side Dishes</Link></li>
              <li><Link href="/menu/salads" className="hover:text-ink">Salads</Link></li>
              <li><Link href="/menu/desserts" className="hover:text-ink">Desserts</Link></li>
            </ul>
          </div>

          <div>
            <h3 className="eyebrow">Order</h3>
            <ul className="mt-4 space-y-2.5 text-[15px] text-ink-soft">
              <li><Link href="/menu" className="hover:text-ink">Order from The Diine</Link></li>
              <li><Link href="/events" className="hover:text-ink">Plan an event</Link></li>
              <li>
                <a href={INSTAGRAM} target="_blank" rel="noreferrer" className="hover:text-ink">
                  Instagram
                </a>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-14 flex flex-col gap-2 border-t border-line pt-7 text-[13px] text-ink-faint sm:flex-row sm:items-center sm:justify-between">
          <p>&copy; {new Date().getFullYear()} The Diine. Cairo, Egypt.</p>
          <p>Orders are confirmed by WhatsApp before they are prepared.</p>
        </div>
      </div>
    </footer>
  );
}

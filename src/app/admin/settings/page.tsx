import Link from "next/link";
import { requireAdminPage } from "@/lib/admin-auth";
import { sectionSummaries, undecided } from "@/lib/admin-settings";

export const dynamic = "force-dynamic";
export const metadata = { title: "Settings" };

/**
 * Settings.
 *
 * Grouped the way the business is run rather than the way the database is
 * shaped, and opened on what still needs a decision — because the honest answer
 * to "what is left?" is more useful than a wall of switches.
 */
const SECTIONS = [
  { href: "/admin/settings/ordering", title: "Ordering",
    body: "Notice period, how many orders a day, cancellations." },
  { href: "/admin/settings/delivery", title: "Delivery & pickup",
    body: "Areas and their fees, pickup, and the times you deliver." },
  { href: "/admin/settings/calendar", title: "Calendar & capacity",
    body: "Working days, days you are closed, and a day's own capacity." },
  { href: "/admin/settings/events", title: "Events",
    body: "Notice, guest limit, cancellation, and the guest-count ladder." },
  { href: "/admin/settings/payment", title: "Payment",
    body: "Cash and InstaPay, and the number transfers go to." },
  { href: "/admin/settings/serving", title: "Serving setup",
    body: "Returnable and disposable dishes, and what customers are told." },
  { href: "/admin/settings/contact", title: "Business details",
    body: "The WhatsApp number, Instagram and email the site shows." },
] as const;

export default async function SettingsPage() {
  await requireAdminPage();
  const [summary, todo] = await Promise.all([sectionSummaries(), undecided()]);

  const line: Record<string, string> = {
    "/admin/settings/ordering": summary.ordering,
    "/admin/settings/delivery": summary.delivery,
    "/admin/settings/calendar": summary.calendar,
    "/admin/settings/events": summary.events,
    "/admin/settings/payment": summary.payment,
    "/admin/settings/serving": summary.serving,
    "/admin/settings/contact": summary.contact,
  };

  return (
    <div>
      <p className="eyebrow">Settings</p>
      <h1 className="mt-2 font-display text-[30px] font-semibold text-ink">How the business runs</h1>
      <p className="mt-3 max-w-2xl text-[15.5px] leading-relaxed text-ink-soft">
        These are the rules the website follows. Changing one changes what customers can do from
        now on — it never changes an order that has already been placed.
      </p>

      {todo.length > 0 && (
        <section className="mt-8 rounded-sm border border-gold/50 bg-gold-pale/40 px-6 py-5">
          <p className="eyebrow">Waiting on you</p>
          <p className="mt-2 text-[15px] text-ink">
            {todo.length} {todo.length === 1 ? "thing has" : "things have"} not been decided. Nothing
            has been chosen on your behalf.
          </p>
          <ul className="mt-4 grid gap-3">
            {todo.map((t) => (
              <li key={t.key}>
                <Link href={t.where} className="group block">
                  <span className="font-display text-[16.5px] font-semibold text-ink group-hover:text-gold">
                    {t.title}
                  </span>
                  <span className="mt-0.5 block max-w-2xl text-[14px] leading-relaxed text-ink-soft">
                    {t.detail}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      <div className="mt-8 grid gap-4 sm:grid-cols-2">
        {SECTIONS.map((s) => (
          <Link
            key={s.href} href={s.href}
            className="rounded-sm border border-line bg-cream-warm px-6 py-5 transition-colors hover:border-gold"
          >
            <h2 className="font-display text-[18px] font-semibold text-ink">{s.title}</h2>
            <p className="mt-1.5 text-[14px] leading-relaxed text-ink-soft">{s.body}</p>
            <p className="mt-3 text-[14px] text-gold">{line[s.href]}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}

import type { Metadata } from "next";
import Link from "next/link";
import { currentAdmin } from "@/lib/admin-auth";
import { AdminNav } from "@/components/admin/admin-nav";
import { logoutAction } from "./admin-actions";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: { default: "Admin", template: "%s · The Diine admin" },
  // Never indexed, never followed. This is the business's own screen.
  robots: { index: false, follow: false, nocache: true },
};

/**
 * The sections.
 *
 * Menu, Settings and Analytics are coming; the row is built to hold them
 * without rearranging — it scrolls rather than wraps on a narrow screen, and
 * the active section is marked by a rule under it rather than by position.
 */
const NAV = [
  { href: "/admin", label: "Today" },
  { href: "/admin/orders", label: "Orders" },
  { href: "/admin/kitchen", label: "Kitchen" },
  { href: "/admin/menu", label: "Menu" },
  { href: "/admin/settings", label: "Settings" },
];

/**
 * The admin chrome.
 *
 * It is NOT the gate: a layout renders around a page rather than in front of
 * it, so each page asks who is signed in for itself. Signed out, this renders
 * the page bare — which is what the login screen needs.
 */
export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const admin = await currentAdmin();
  if (!admin) return <div className="min-h-screen bg-cream">{children}</div>;

  return (
    <div className="min-h-screen bg-cream">
      <header className="border-b border-line bg-cream-warm">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-8 gap-y-3 px-5 py-4 sm:px-8">
          <Link href="/admin" className="font-display text-[19px] font-semibold text-ink">
            The Diine
            <span className="ms-2 rounded-full border border-gold/45 px-2.5 py-0.5 text-[10px] uppercase tracking-[0.18em] text-gold">
              Admin
            </span>
          </Link>

          <AdminNav items={NAV} />

          <div className="ms-auto flex items-center gap-5">
            <Link href="/" className="text-[14px] text-ink-faint hover:text-ink">View the site</Link>
            <span className="text-[14px] text-ink-soft">{admin.name}</span>
            <form action={logoutAction}>
              <button type="submit" className="text-[14px] text-ink-faint underline underline-offset-4 hover:text-ink">
                Sign out
              </button>
            </form>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-5 py-10 sm:px-8">{children}</main>
    </div>
  );
}

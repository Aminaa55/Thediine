import type { Metadata } from "next";
import { Fraunces, Karla } from "next/font/google";
import "./globals.css";
import { CartProvider } from "@/lib/cart";
import { SiteHeader } from "@/components/site-header";
import { GlobalBack } from "@/components/global-back";
import { SiteFooter } from "@/components/site-footer";
import { CustomerChrome } from "@/components/customer-chrome";
import { RulesProvider } from "@/components/rules-provider";
import { getRules, getContact, earliestNormalFrom, earliestEventFrom } from "@/lib/settings";
import { toDateInput } from "@/lib/ordering";

// Loaded as the variable font it is, with its real italic. The homepage
// slogan needs Light and a true italic — not a browser-slanted one — and
// every other italic on the site becomes the drawn one rather than a fake.
const display = Fraunces({
  subsets: ["latin"],
  style: ["normal", "italic"],
  variable: "--font-display",
  display: "swap",
});

const body = Karla({
  subsets: ["latin"],
  weight: ["400", "500", "700"],
  variable: "--font-body",
  display: "swap",
});

/**
 * Nothing on this site is baked at build time.
 *
 * Every page hangs off this layout, and this layout reads the business's own
 * settings — the notice periods, the guest limit, the opening hours. Left to
 * itself Next would pre-render the quieter pages once, at deploy, and freeze
 * those numbers into them: change the event notice in admin and the event
 * pages would keep quoting the old one until the next deploy. So the whole
 * site is rendered per request, and an edit in admin is live immediately.
 */
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: {
    default: "The Diine — Food Made With Passion",
    template: "%s · The Diine",
  },
  description:
    "Home catering in Egypt for gatherings, hosting and events. Browse the menu and order for a chosen date.",
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  // The rules and the contact details come from settings, so an edit in admin
  // changes what the site says as well as what it enforces.
  const [rules, contact] = await Promise.all([getRules(), getContact()]);
  const publicRules = {
    normalNoticeLabel: rules.normalNoticeLabel,
    normalEarliest: toDateInput(earliestNormalFrom(rules)),
    dailyCapacity: rules.dailyCapacity,
    eventNoticeLabel: rules.eventNoticeLabel,
    eventEarliest: toDateInput(earliestEventFrom(rules)),
    maxGuests: rules.maxGuests,
    pickupEnabled: rules.pickupEnabled,
  };

  // lang and dir are set here so an Arabic build only changes these two values.
  return (
    <html lang="en" dir="ltr" className={`${display.variable} ${body.variable}`}>
      <body className="flex min-h-screen flex-col">
        <RulesProvider value={publicRules}>
        <CartProvider>
          {/* The customer chrome. Admin renders its own instead. */}
          <CustomerChrome>
            <SiteHeader />
            {/* One consistent back control. Event steps render their own beneath
                the progress bar, so it is suppressed there. */}
            <GlobalBack />
          </CustomerChrome>
          <main className="flex-1">{children}</main>
          <CustomerChrome>
            <SiteFooter contact={contact} />
          </CustomerChrome>
        </CartProvider>
        </RulesProvider>
      </body>
    </html>
  );
}

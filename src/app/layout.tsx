import type { Metadata } from "next";
import { Fraunces, Karla } from "next/font/google";
import "./globals.css";
import { CartProvider } from "@/lib/cart";
import { SiteHeader } from "@/components/site-header";
import { GlobalBack } from "@/components/global-back";
import { SiteFooter } from "@/components/site-footer";
import { CustomerChrome } from "@/components/customer-chrome";

const display = Fraunces({
  subsets: ["latin"],
  weight: ["400", "600", "700"],
  variable: "--font-display",
  display: "swap",
});

const body = Karla({
  subsets: ["latin"],
  weight: ["400", "500", "700"],
  variable: "--font-body",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "The Diine — Food Made With Passion",
    template: "%s · The Diine",
  },
  description:
    "Home catering in Egypt for gatherings, hosting and events. Browse the menu and order for a chosen date.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  // lang and dir are set here so an Arabic build only changes these two values.
  return (
    <html lang="en" dir="ltr" className={`${display.variable} ${body.variable}`}>
      <body className="flex min-h-screen flex-col">
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
            <SiteFooter />
          </CustomerChrome>
        </CartProvider>
      </body>
    </html>
  );
}

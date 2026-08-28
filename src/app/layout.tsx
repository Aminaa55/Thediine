import type { Metadata } from "next";
import { Fraunces, Karla } from "next/font/google";
import "./globals.css";
import { CartProvider } from "@/lib/cart";
import { SiteHeader } from "@/components/site-header";
import { BackLink } from "@/components/back-link";
import { SiteFooter } from "@/components/site-footer";

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
          <SiteHeader />
          {/* One consistent back arrow, top-left, on every inner page. */}
          <BackLink />
          <main className="flex-1">{children}</main>
          <SiteFooter />
        </CartProvider>
      </body>
    </html>
  );
}

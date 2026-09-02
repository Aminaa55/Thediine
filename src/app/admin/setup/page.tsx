import type { Metadata } from "next";
import Link from "next/link";
import { adminConfigured, setupCode, setupNeeded } from "@/lib/admin-auth";
import { SetupForm } from "@/components/admin/setup-form";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "First-time setup" };

/**
 * Creating the first admin account, once, from a browser.
 *
 * Open only while the site has NO admin at all AND a setup code is configured.
 * Once the first account exists this page shows nothing but a link to sign in,
 * for good.
 */
export default async function SetupPage() {
  const needed = await setupNeeded();
  const enabled = setupCode() !== null;

  return (
    <div className="mx-auto max-w-md px-5 py-20 sm:px-8">
      <p className="eyebrow">The Diine</p>
      <h1 className="mt-3 font-display text-[30px] font-semibold text-ink">
        {needed ? "First-time setup" : "Already set up"}
      </h1>

      {!needed ? (
        <>
          <p className="mt-5 text-[15.5px] leading-relaxed text-ink-soft">
            This site already has an admin account, so setup is closed. Sign in with it instead.
          </p>
          <Link href="/admin/login" className="btn-primary mt-8">Go to sign in</Link>
        </>
      ) : !adminConfigured() ? (
        <p className="mt-8 rounded-sm border border-[#A6391C]/30 bg-[#A6391C]/[0.06] px-5 py-4 text-[15px] leading-relaxed text-[#A6391C]">
          This deployment has no <code>ADMIN_SESSION_SECRET</code> yet, so no account could sign in
          even once it existed. Add it first, redeploy, then come back here.
        </p>
      ) : !enabled ? (
        <>
          <p className="mt-5 text-[15.5px] leading-relaxed text-ink-soft">
            Setup is switched off. To create the first account, add an environment variable named{" "}
            <code>ADMIN_SETUP_TOKEN</code> holding a long random value of your own, redeploy, then
            open this page again and type that same value here.
          </p>
          <p className="mt-4 text-[14px] leading-relaxed text-ink-faint">
            It is only a door for the very first account. Once one exists, this page closes whatever
            the value is.
          </p>
        </>
      ) : (
        <>
          <p className="mt-5 text-[15.5px] leading-relaxed text-ink-soft">
            This creates the one account that runs the business. Choose your own password — nobody
            else ever sees it, and it is stored only as a hash that cannot be read back.
          </p>
          <SetupForm />
        </>
      )}
    </div>
  );
}

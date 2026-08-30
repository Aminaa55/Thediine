import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { currentAdmin, adminConfigured } from "@/lib/admin-auth";
import { LoginForm } from "@/components/admin/login-form";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Sign in" };

export default async function LoginPage() {
  if (await currentAdmin()) redirect("/admin");

  return (
    <div className="mx-auto max-w-md px-5 py-20 sm:px-8">
      <p className="eyebrow">The Diine</p>
      <h1 className="mt-3 font-display text-[30px] font-semibold text-ink">Admin</h1>

      {adminConfigured() ? (
        <LoginForm />
      ) : (
        <p className="mt-8 rounded-sm border border-[#A6391C]/30 bg-[#A6391C]/[0.06] px-5 py-4 text-[15px] leading-relaxed text-[#A6391C]">
          This deployment has no <code>ADMIN_SESSION_SECRET</code>, so nobody can sign in. The
          customer site is unaffected.
        </p>
      )}
    </div>
  );
}

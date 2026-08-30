"use client";

import { useActionState } from "react";
import { loginAction } from "@/app/admin/admin-actions";

/**
 * The sign-in form.
 *
 * The same message comes back whether the email is unknown or the password is
 * wrong, so the form cannot be used to find out which accounts exist.
 */
export function LoginForm() {
  const [state, action, pending] = useActionState(loginAction, null as { error?: string } | null);

  return (
    <form action={action} className="mt-8 grid gap-5">
      <div>
        <label htmlFor="email" className="eyebrow mb-3 block">Email</label>
        <input
          id="email" name="email" type="email" autoComplete="username" required
          className="w-full rounded-sm border border-line bg-cream-warm px-4 py-3 text-[16px] text-ink focus:border-gold focus:outline-none"
        />
      </div>

      <div>
        <label htmlFor="password" className="eyebrow mb-3 block">Password</label>
        <input
          id="password" name="password" type="password" autoComplete="current-password" required
          className="w-full rounded-sm border border-line bg-cream-warm px-4 py-3 text-[16px] text-ink focus:border-gold focus:outline-none"
        />
      </div>

      {state?.error && (
        <p className="rounded-sm border border-[#A6391C]/30 bg-[#A6391C]/[0.07] px-4 py-3 text-[14.5px] text-[#A6391C]">
          {state.error}
        </p>
      )}

      <button type="submit" disabled={pending} className="btn-primary mt-2 disabled:bg-ink/25">
        {pending ? "Signing in…" : "Sign in"}
      </button>
    </form>
  );
}

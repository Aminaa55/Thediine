"use client";

import { useActionState } from "react";
import { setupAction } from "@/app/admin/setup/actions";

const field =
  "w-full rounded-sm border border-line bg-cream-warm px-4 py-3 text-[16px] text-ink focus:border-gold focus:outline-none";

/** The one-time form that makes the first admin account. */
export function SetupForm() {
  const [state, action, pending] = useActionState(setupAction, null as { error?: string } | null);

  return (
    <form action={action} className="mt-8 grid gap-5">
      <div>
        <label htmlFor="code" className="eyebrow mb-3 block">Setup code</label>
        <input id="code" name="code" type="password" required autoComplete="off" className={field} />
        <p className="mt-2 text-[13px] text-ink-faint">
          The value you put in <code>ADMIN_SETUP_TOKEN</code>.
        </p>
      </div>

      <div>
        <label htmlFor="name" className="eyebrow mb-3 block">Account name</label>
        <input id="name" name="name" required autoComplete="organization" className={field} />
        <p className="mt-2 text-[13px] text-ink-faint">
          Shown in the corner while you are signed in. The business name is fine.
        </p>
      </div>

      <div>
        <label htmlFor="email" className="eyebrow mb-3 block">Email</label>
        <input id="email" name="email" type="email" required autoComplete="username" className={field} />
        <p className="mt-2 text-[13px] text-ink-faint">This is what you will sign in with.</p>
      </div>

      <div>
        <label htmlFor="password" className="eyebrow mb-3 block">Password</label>
        <input
          id="password" name="password" type="password" required minLength={10}
          autoComplete="new-password" className={field}
        />
        <p className="mt-2 text-[13px] text-ink-faint">
          At least 10 characters. Save it in a password manager — there is no reset by email yet.
        </p>
      </div>

      <div>
        <label htmlFor="confirm" className="eyebrow mb-3 block">Password again</label>
        <input
          id="confirm" name="confirm" type="password" required minLength={10}
          autoComplete="new-password" className={field}
        />
      </div>

      {state?.error && (
        <p className="rounded-sm border border-[#A6391C]/30 bg-[#A6391C]/[0.07] px-4 py-3 text-[14.5px] text-[#A6391C]">
          {state.error}
        </p>
      )}

      <button type="submit" disabled={pending} className="btn-primary mt-2 disabled:bg-ink/25">
        {pending ? "Creating your account…" : "Create my admin account"}
      </button>
    </form>
  );
}

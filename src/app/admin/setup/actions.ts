"use server";

import { redirect } from "next/navigation";
import { createFirstAdmin } from "@/lib/admin-auth";

/**
 * Creates the very first admin account, once.
 *
 * The password arrives from the owner's own browser, is hashed on the way in,
 * and is never stored, logged or returned in readable form.
 */
export async function setupAction(_prev: unknown, form: FormData) {
  const password = String(form.get("password") ?? "");
  const confirm = String(form.get("confirm") ?? "");
  if (password !== confirm) return { error: "The two passwords do not match." };

  const result = await createFirstAdmin({
    code: String(form.get("code") ?? ""),
    name: String(form.get("name") ?? ""),
    email: String(form.get("email") ?? ""),
    password,
  });
  if (!result.ok) return { error: result.error ?? "That did not work." };
  redirect("/admin/login?created=1");
}

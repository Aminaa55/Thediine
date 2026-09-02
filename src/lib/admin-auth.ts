import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createHmac, randomBytes, scryptSync, timingSafeEqual } from "node:crypto";
import { db } from "./db";

/**
 * Who is allowed into admin.
 *
 * SERVER-ONLY. Passwords are stored as a scrypt hash with a per-password salt —
 * never in plain text, never reversible, and never logged. The session is a
 * signed cookie: it carries only an id and an expiry, and the signature is what
 * makes it trustworthy, so nothing a browser sends can promote itself.
 *
 * If ADMIN_SESSION_SECRET is not set, admin refuses to let anyone in. The
 * customer site is entirely unaffected by that — it never reads this file.
 */

const COOKIE = "diine_admin";
const SESSION_DAYS = 7;

/**
 * A limit on guessing.
 *
 * Without one, somebody who finds /admin can try passwords for as long as
 * they like. After a handful of failures the account stops accepting
 * attempts for a few minutes, whether or not the password is right — which
 * turns guessing from a matter of hours into a matter of years.
 *
 * Held in memory rather than the database: it is deliberately cheap, it
 * costs nothing to lose on a restart, and there is one person signing in.
 */
const MAX_ATTEMPTS = 6;
const LOCKOUT_MS = 10 * 60_000;
const attempts = new Map<string, { count: number; until: number }>();

function lockedOut(key: string): boolean {
  const a = attempts.get(key);
  if (!a) return false;
  if (Date.now() > a.until) { attempts.delete(key); return false; }
  return a.count >= MAX_ATTEMPTS;
}

function recordFailure(key: string) {
  const a = attempts.get(key);
  const fresh = !a || Date.now() > a.until;
  attempts.set(key, {
    count: fresh ? 1 : a!.count + 1,
    until: Date.now() + LOCKOUT_MS,
  });
}

function sessionSecret(): string | null {
  const s = (process.env.ADMIN_SESSION_SECRET ?? "").trim();
  return s.length >= 24 ? s : null;
}

/** Whether admin can operate at all. Checked before any login is attempted. */
export function adminConfigured(): boolean {
  return sessionSecret() !== null;
}

// ------------------------------------------------------------------ passwords

/** scrypt$<salt hex>$<hash hex> — the salt travels with the hash. */
export function hashPassword(password: string): string {
  const salt = randomBytes(16);
  const hash = scryptSync(password.normalize("NFKC"), salt, 64);
  return `scrypt$${salt.toString("hex")}$${hash.toString("hex")}`;
}

export function verifyPassword(password: string, stored: string): boolean {
  const [scheme, saltHex, hashHex] = stored.split("$");
  if (scheme !== "scrypt" || !saltHex || !hashHex) return false;
  const expected = Buffer.from(hashHex, "hex");
  const actual = scryptSync(password.normalize("NFKC"), Buffer.from(saltHex, "hex"), expected.length);
  return expected.length === actual.length && timingSafeEqual(expected, actual);
}

// ------------------------------------------------------------------- sessions

function sign(value: string, secret: string): string {
  return createHmac("sha256", secret).update(value).digest("hex");
}

/** `<adminId>.<expiry>.<signature>` — unusable without the secret. */
function makeToken(adminId: string, secret: string): string {
  const expiry = Date.now() + SESSION_DAYS * 86_400_000;
  const body = `${adminId}.${expiry}`;
  return `${body}.${sign(body, secret)}`;
}

function readToken(token: string, secret: string): string | null {
  const parts = token.split(".");
  if (parts.length !== 3) return null;
  const [adminId, expiry, signature] = parts;
  const expected = sign(`${adminId}.${expiry}`, secret);
  const a = Buffer.from(expected, "utf8");
  const b = Buffer.from(signature, "utf8");
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  if (!Number.isFinite(Number(expiry)) || Number(expiry) < Date.now()) return null;
  return adminId;
}

export type SessionAdmin = { id: string; name: string; email: string; role: "OWNER" | "STAFF" };

/** The signed-in admin, or null. Never throws — callers decide what to do. */
export async function currentAdmin(): Promise<SessionAdmin | null> {
  const secret = sessionSecret();
  if (!secret) return null;

  const token = (await cookies()).get(COOKIE)?.value;
  if (!token) return null;

  const adminId = readToken(token, secret);
  if (!adminId) return null;

  const admin = await db.adminUser.findFirst({
    where: { id: adminId, isActive: true },
    select: { id: true, name: true, email: true, role: true },
  });
  return admin;
}

/**
 * The guard every admin page calls first.
 *
 * Each page asks for itself rather than trusting the layout to have asked,
 * because a layout is not a security boundary: it renders around a page, it does
 * not stand in front of it.
 */
export async function requireAdminPage(): Promise<SessionAdmin> {
  const admin = await currentAdmin();
  if (!admin) redirect("/admin/login");
  return admin;
}

export async function startSession(adminId: string) {
  const secret = sessionSecret();
  if (!secret) throw new Error("ADMIN_SESSION_SECRET is not set.");
  (await cookies()).set(COOKIE, makeToken(adminId, secret), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_DAYS * 86_400,
  });
}

export async function endSession() {
  (await cookies()).delete(COOKIE);
}

/**
 * Signs someone in.
 *
 * The same message comes back whether the email is unknown or the password is
 * wrong, and a failure always costs the same short pause, so the form cannot be
 * used to find out which accounts exist.
 */
export async function signIn(email: string, password: string): Promise<{ ok: boolean; error?: string }> {
  if (!adminConfigured()) {
    return { ok: false, error: "Admin is not set up on this deployment." };
  }

  const key = email.trim().toLowerCase();
  if (lockedOut(key)) {
    return {
      ok: false,
      error: "Too many attempts. Please wait a few minutes and try again.",
    };
  }

  const admin = await db.adminUser.findUnique({
    where: { email: email.trim().toLowerCase() },
    select: { id: true, passwordHash: true, isActive: true },
  });

  const valid = admin?.isActive === true && verifyPassword(password, admin.passwordHash);
  if (!valid) {
    recordFailure(key);
    await new Promise((r) => setTimeout(r, 400));
    return { ok: false, error: "That email and password do not match." };
  }

  attempts.delete(key);
  await startSession(admin!.id);
  return { ok: true };
}

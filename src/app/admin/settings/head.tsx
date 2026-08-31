import Link from "next/link";

/** The same top on every settings section, so they read as one place. */
export function SettingsHead({ title, body }: { title: string; body: string }) {
  return (
    <div className="mb-8">
      <Link href="/admin/settings" className="text-[14px] text-ink-soft hover:text-ink">
        &larr; Settings
      </Link>
      <h1 className="mt-3 font-display text-[30px] font-semibold text-ink">{title}</h1>
      <p className="mt-3 max-w-2xl text-[15.5px] leading-relaxed text-ink-soft">{body}</p>
    </div>
  );
}

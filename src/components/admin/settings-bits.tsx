"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { saveSettings, type SaveResult } from "@/app/admin/settings-actions";

/**
 * The pieces the settings pages are built from.
 *
 * Every card saves on its own. Nothing here is one long form with one Save at
 * the bottom: a person changes one thing, saves that thing, and sees it said
 * back to them.
 */

export const input =
  "w-full rounded-sm border border-line bg-cream px-4 py-2.5 text-[15px] text-ink placeholder:text-ink-faint focus:border-gold focus:outline-none";

/**
 * The same field without `w-full`, for the rows that sit on one line: an area
 * and its fee, a time and its hours, a band and its multiplier. A full-width
 * field in a wrapping row pushes everything after it onto its own line.
 */
export const rowInput =
  "rounded-sm border border-line bg-cream px-4 py-2.5 text-[15px] text-ink placeholder:text-ink-faint focus:border-gold focus:outline-none";

export function useSaver() {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const run = (fn: () => Promise<SaveResult>) =>
    start(async () => {
      setError(null);
      const r = await fn();
      if (!r.ok) { setError(r.error ?? "That did not work."); setSaved(false); return; }
      setSaved(true);
      router.refresh();
      setTimeout(() => setSaved(false), 2500);
    });

  return { run, pending, saved, error };
}

/** A card holding one decision, with its own save and its own answer. */
export function SettingCard({
  title, note, children, onSave, saveLabel = "Save", state, footer,
}: {
  title: string;
  note?: string;
  children: React.ReactNode;
  onSave?: () => void;
  saveLabel?: string;
  state: ReturnType<typeof useSaver>;
  footer?: React.ReactNode;
}) {
  return (
    <section className="rounded-sm border border-line bg-cream-warm">
      <header className="border-b border-line px-6 py-4">
        <h2 className="font-display text-[18px] font-semibold text-ink">{title}</h2>
        {note && <p className="mt-1.5 max-w-2xl text-[13.5px] leading-relaxed text-ink-soft">{note}</p>}
      </header>
      <div className="px-6 py-5">
        {children}

        {state.error && (
          <p className="mt-4 rounded-sm border border-[#A6391C]/30 bg-[#A6391C]/[0.07] px-4 py-2.5 text-[14px] text-[#A6391C]">
            {state.error}
          </p>
        )}

        {onSave && (
          <div className="mt-6 flex flex-wrap items-center gap-4">
            <button type="button" disabled={state.pending} onClick={onSave}
              className="btn-primary disabled:bg-ink/25">
              {saveLabel}
            </button>
            {state.saved && <span className="text-[14px] text-[#2E6B45]">Saved.</span>}
          </div>
        )}
        {footer}
      </div>
    </section>
  );
}

export function Field({ label, htmlFor, hint, children, full = false }: {
  label: string; htmlFor: string; hint?: string; children: React.ReactNode; full?: boolean;
}) {
  return (
    <div className={full ? "sm:col-span-2" : undefined}>
      <label htmlFor={htmlFor} className="eyebrow mb-2 block">{label}</label>
      {children}
      {hint && <p className="mt-1.5 text-[13px] leading-relaxed text-ink-faint">{hint}</p>}
    </div>
  );
}

export function Switch({ on, title, body, onChange, pending }: {
  on: boolean; title: string; body?: string; onChange: (v: boolean) => void; pending?: boolean;
}) {
  return (
    <label className="flex items-start gap-3 text-[15px] text-ink">
      <input
        type="checkbox" checked={on} disabled={pending}
        onChange={(e) => onChange(e.target.checked)}
        className="mt-1 h-4 w-4 accent-[#A87E2E]"
      />
      <span>
        {title}
        {body && <span className="mt-0.5 block text-[13.5px] leading-relaxed text-ink-soft">{body}</span>}
      </span>
    </label>
  );
}

/** Something the business has not decided. Said plainly, never filled in. */
export function ToDecide({ children }: { children: React.ReactNode }) {
  return (
    <p className="mt-4 rounded-sm border border-gold/45 bg-gold-pale/40 px-4 py-3 text-[14px] leading-relaxed text-ink">
      <span className="eyebrow mb-1 block">Still to decide</span>
      {children}
    </p>
  );
}

/** The line every settings page carries: this changes nothing already placed. */
export function HistoryNote({ children }: { children: React.ReactNode }) {
  return (
    <p className="mt-8 text-[13.5px] leading-relaxed text-ink-faint">{children}</p>
  );
}

/** A card that writes settings keys directly, for the simple ones. */
export function useSettingsForm<T extends Record<string, string>>(initial: T) {
  const [values, setValues] = useState<T>(initial);
  const state = useSaver();
  const set = (patch: Partial<T>) => setValues((v) => ({ ...v, ...patch }));
  const save = (keys?: (keyof T)[]) => {
    const patch: Record<string, string> = {};
    for (const k of keys ?? (Object.keys(values) as (keyof T)[])) patch[k as string] = values[k];
    state.run(() => saveSettings(patch));
  };
  return { values, set, save, state };
}

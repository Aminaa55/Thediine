"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { saveCategory, moveCategory } from "@/app/admin/menu-actions";

/** Renaming, reordering and hiding the parts of the menu. */
export function CategoryEditor({ categories }: {
  categories: { id: string; nameEn: string; descriptionEn: string | null; isActive: boolean; count: number }[];
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const run = (fn: () => Promise<{ ok: boolean; error?: string }>) =>
    start(async () => {
      const r = await fn();
      if (!r.ok) setError(r.error ?? "That did not work.");
      else { setError(null); router.refresh(); }
    });

  return (
    <div className="grid gap-4">
      {error && (
        <p className="rounded-sm border border-[#A6391C]/30 bg-[#A6391C]/[0.07] px-4 py-3 text-[14.5px] text-[#A6391C]">
          {error}
        </p>
      )}

      {categories.map((c, i) => (
        <Row
          key={c.id} category={c} pending={pending} run={run}
          first={i === 0} last={i === categories.length - 1}
        />
      ))}
    </div>
  );
}

function Row({ category, pending, run, first, last }: {
  category: { id: string; nameEn: string; descriptionEn: string | null; isActive: boolean; count: number };
  pending: boolean;
  run: (fn: () => Promise<{ ok: boolean; error?: string }>) => void;
  first: boolean; last: boolean;
}) {
  const [name, setName] = useState(category.nameEn);
  const [description, setDescription] = useState(category.descriptionEn ?? "");

  const input =
    "w-full rounded-sm border border-line bg-cream px-4 py-2.5 text-[15px] text-ink focus:border-gold focus:outline-none";

  return (
    <section className={`rounded-sm border border-line bg-cream-warm px-6 py-5 ${pending ? "opacity-60" : ""}`}>
      <div className="flex flex-wrap items-end gap-3">
        <span className="flex flex-col gap-0.5 pb-2.5">
          <button type="button" disabled={first || pending}
            onClick={() => run(() => moveCategory(category.id, "up"))}
            aria-label={`Move ${category.nameEn} up`}
            className="text-[11px] leading-none text-ink-faint hover:text-ink disabled:opacity-25">
            &#9650;
          </button>
          <button type="button" disabled={last || pending}
            onClick={() => run(() => moveCategory(category.id, "down"))}
            aria-label={`Move ${category.nameEn} down`}
            className="text-[11px] leading-none text-ink-faint hover:text-ink disabled:opacity-25">
            &#9660;
          </button>
        </span>

        <div className="min-w-[12rem] flex-1">
          <label className="eyebrow mb-2 block" htmlFor={`n-${category.id}`}>Name</label>
          <input id={`n-${category.id}`} value={name} onChange={(e) => setName(e.target.value)} className={input} />
        </div>

        <span className="pb-3 text-[13.5px] tabular-nums text-ink-faint">
          {category.count} {category.count === 1 ? "dish" : "dishes"}
        </span>
      </div>

      <div className="mt-4">
        <label className="eyebrow mb-2 block" htmlFor={`d-${category.id}`}>
          Description <span className="normal-case tracking-normal text-ink-faint">optional</span>
        </label>
        <input id={`d-${category.id}`} value={description}
          onChange={(e) => setDescription(e.target.value)} className={input} />
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-4">
        <button type="button" disabled={pending}
          onClick={() => run(() => saveCategory(category.id, name, description, category.isActive))}
          className="btn-outline">
          Save
        </button>
        <button type="button" disabled={pending}
          onClick={() => run(() => saveCategory(category.id, name, description, !category.isActive))}
          className={`rounded-full border px-4 py-1.5 text-[13.5px] ${
            category.isActive
              ? "border-[#2E6B45]/40 bg-[#2E6B45]/[0.08] text-[#2E6B45]"
              : "border-[#A6391C]/40 bg-[#A6391C]/[0.07] text-[#A6391C]"
          }`}>
          {category.isActive ? "Showing on the site" : "Hidden"}
        </button>
      </div>
    </section>
  );
}

"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createProduct } from "@/app/admin/menu-actions";

/** The smallest thing that can be a dish. The rest is filled in afterwards. */
export function NewDishForm({ categories }: { categories: { id: string; nameEn: string }[] }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    nameEn: "", categoryId: categories[0]?.id ?? "", price: "", descriptionEn: "",
  });
  const set = (patch: Partial<typeof form>) => setForm((f) => ({ ...f, ...patch }));

  const input =
    "w-full rounded-sm border border-line bg-cream-warm px-4 py-2.5 text-[15px] text-ink placeholder:text-ink-faint focus:border-gold focus:outline-none";

  return (
    <div className="mt-8 grid gap-5">
      <div>
        <label htmlFor="name" className="eyebrow mb-2 block">Name</label>
        <input id="name" value={form.nameEn} onChange={(e) => set({ nameEn: e.target.value })}
          placeholder="Roast Lamb with Freekeh" className={input} />
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <div>
          <label htmlFor="cat" className="eyebrow mb-2 block">Course</label>
          <select id="cat" value={form.categoryId} onChange={(e) => set({ categoryId: e.target.value })}
            className={input}>
            {categories.map((c) => <option key={c.id} value={c.id}>{c.nameEn}</option>)}
          </select>
        </div>
        <div>
          <label htmlFor="price" className="eyebrow mb-2 block">Price</label>
          <input id="price" value={form.price} inputMode="decimal"
            onChange={(e) => set({ price: e.target.value })} placeholder="1250" className={input} />
          <p className="mt-1.5 text-[13px] text-ink-faint">In EGP, for a regular order.</p>
        </div>
      </div>

      <div>
        <label htmlFor="desc" className="eyebrow mb-2 block">
          Description <span className="normal-case tracking-normal text-ink-faint">optional</span>
        </label>
        <textarea id="desc" rows={2} value={form.descriptionEn}
          onChange={(e) => set({ descriptionEn: e.target.value })} className={input} />
      </div>

      {error && (
        <p className="rounded-sm border border-[#A6391C]/30 bg-[#A6391C]/[0.07] px-4 py-3 text-[14.5px] text-[#A6391C]">
          {error}
        </p>
      )}

      <div>
        <button
          type="button"
          disabled={pending}
          onClick={() => start(async () => {
            setError(null);
            const r = await createProduct(form);
            if (!r.ok) return setError(r.error);
            router.push(`/admin/menu/${r.id}`);
          })}
          className="btn-primary disabled:bg-ink/25"
        >
          {pending ? "Adding…" : "Add it to the menu"}
        </button>
      </div>
    </div>
  );
}

"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { formatEGP, piastresToPounds, PIASTRES_PER_POUND } from "@/lib/money";
import { multiplierText } from "@/lib/admin-menu";
import {
  saveProduct, saveVariant, removeVariant, setAllergen, markAllergensReviewed,
  setEventPricingEnabled, saveEventPricingNote, saveProductTiers, clearProductTiers,
  setVariantAvailability, setChoiceAvailability, setFeatured, setProductAvailability,
  archiveProduct, type ProductDetails,
} from "@/app/admin/menu-actions";

/**
 * Editing one dish.
 *
 * Each part saves on its own, so a half-finished thought is never all-or-nothing
 * and nothing is lost by leaving. Prices are typed in pounds and stored in
 * piastres; a dish has a single price OR priced choices, never both, which is
 * the same rule the catalogue was written under.
 */

type Tier = { id?: string; minGuests: string; maxGuests: string; multiplier: string; price: string };

export function DishEditor({ product, categories, allergens, sharedTiers }: {
  product: {
    id: string; nameEn: string; descriptionEn: string | null; categoryId: string;
    basePrice: number | null; sellingUnitEn: string | null;
    unitConfirmed: boolean; unitRequired: boolean;
    servesMin: number | null; servesMax: number | null;
    minQuantity: number; quantityStep: number; menuGroups: string[]; reviewNote: string | null;
    isAvailable: boolean; isFeatured: boolean;
    eventPricingEnabled: boolean; eventPricingNote: string | null;
    variants: { id: string; nameEn: string; price: number; isAvailable: boolean }[];
    optionGroups: { id: string; nameEn: string; choices: { id: string; nameEn: string; isAvailable: boolean }[] }[];
    allergens: { allergen: { id: string; nameEn: string }; reviewed: boolean }[];
    eventTiers: { id: string; minGuests: number; maxGuests: number; multiplierBp: number | null; fixedPrice: number | null }[];
    orderCount: number;
  };
  categories: { id: string; nameEn: string; groupsEn: string[] }[];
  allergens: { id: string; nameEn: string }[];
  sharedTiers: { minGuests: number; maxGuests: number; multiplierBp: number }[];
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [saved, setSaved] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const run = (label: string, fn: () => Promise<{ ok: boolean; error?: string }>) =>
    start(async () => {
      setError(null);
      const r = await fn();
      if (!r.ok) { setError(r.error ?? "That did not work."); setSaved(null); return; }
      setSaved(label);
      router.refresh();
      setTimeout(() => setSaved(null), 2500);
    });

  // --- the details ---------------------------------------------------------
  const [details, setDetails] = useState<ProductDetails>({
    nameEn: product.nameEn,
    descriptionEn: product.descriptionEn ?? "",
    categoryId: product.categoryId,
    price: product.basePrice === null ? "" : String(piastresToPounds(product.basePrice)),
    sellingUnitEn: product.sellingUnitEn ?? "",
    unitConfirmed: product.unitConfirmed,
    unitRequired: product.unitRequired,
    servesMin: product.servesMin === null ? "" : String(product.servesMin),
    servesMax: product.servesMax === null ? "" : String(product.servesMax),
    minQuantity: String(product.minQuantity),
    quantityStep: String(product.quantityStep),
    menuGroups: product.menuGroups,
    reviewNote: product.reviewNote ?? "",
  });
  const set = (patch: Partial<ProductDetails>) => setDetails((d) => ({ ...d, ...patch }));

  // --- priced choices ------------------------------------------------------
  const [newVariant, setNewVariant] = useState({ name: "", price: "" });

  // --- the dish's own guest bands -----------------------------------------
  const [tiers, setTiers] = useState<Tier[]>(
    product.eventTiers.map((t) => ({
      id: t.id,
      minGuests: String(t.minGuests),
      maxGuests: String(t.maxGuests),
      multiplier: t.multiplierBp === null ? "" : String(t.multiplierBp / 10000),
      price: t.fixedPrice === null ? "" : String(piastresToPounds(t.fixedPrice)),
    })),
  );
  const ownLadder = product.eventTiers.length > 0;

  // What the event bands are worked out from, live: the price as it is being
  // typed, or -- for a dish sold as priced choices -- the choice being looked at.
  const [pricingChoice, setPricingChoice] = useState(product.variants[0]?.id ?? "");
  const typedPrice = typedPiastres(details.price);
  const chosen = product.variants.find((v) => v.id === pricingChoice) ?? product.variants[0] ?? null;
  const eventBasis = product.variants.length > 0 ? (chosen?.price ?? null) : typedPrice;

  const [note, setNote] = useState(product.eventPricingNote ?? "");
  const allergenIds = new Set(product.allergens.map((a) => a.allergen.id));
  const unreviewed = product.allergens.some((a) => !a.reviewed);

  return (
    <div className="grid gap-6">
      {(saved || error) && (
        <p
          className={`rounded-sm border px-5 py-3 text-[14.5px] ${
            error
              ? "border-[#A6391C]/30 bg-[#A6391C]/[0.07] text-[#A6391C]"
              : "border-[#2E6B45]/30 bg-[#2E6B45]/[0.07] text-[#2E6B45]"
          }`}
        >
          {error ?? `${saved} saved.`}
        </p>
      )}

      {/* --- what it is: the things changed most often, first --- */}
      <Panel title="The dish">
        <div className="grid gap-5 sm:grid-cols-2">
          <Field label="Name" htmlFor="name" full>
            <input id="name" value={details.nameEn} onChange={(e) => set({ nameEn: e.target.value })} className={input} />
          </Field>

          <Field label="Description" htmlFor="desc" full hint="Shown under the name on the menu.">
            <textarea id="desc" rows={2} value={details.descriptionEn}
              onChange={(e) => set({ descriptionEn: e.target.value })} className={input} />
          </Field>

          <Field label="Course" htmlFor="cat">
            <select id="cat" value={details.categoryId}
              onChange={(e) => set({ categoryId: e.target.value, menuGroups: [] })} className={input}>
              {categories.map((c) => <option key={c.id} value={c.id}>{c.nameEn}</option>)}
            </select>
          </Field>

          {/* Only shown for a course that is actually divided into sections. */}
          {(categories.find((c) => c.id === details.categoryId)?.groupsEn ?? []).length > 0 && (
            <Field
              label="Section"
              htmlFor="section-0"
              full
              hint="Where it sits inside the course. A dish can be in more than one — it is still one dish, listed twice."
            >
              <div className="flex flex-wrap gap-2">
                {(categories.find((c) => c.id === details.categoryId)?.groupsEn ?? []).map((g, i) => {
                  const on = details.menuGroups.includes(g);
                  return (
                    <button
                      key={g}
                      id={i === 0 ? "section-0" : undefined}
                      type="button"
                      aria-pressed={on}
                      onClick={() =>
                        set({
                          menuGroups: on
                            ? details.menuGroups.filter((x) => x !== g)
                            : [...details.menuGroups, g],
                        })
                      }
                      className={`rounded-full border px-4 py-2 text-[14px] transition-colors ${
                        on
                          ? "border-ink bg-ink text-cream"
                          : "border-line bg-cream-warm text-ink-soft hover:border-gold"
                      }`}
                    >
                      {g}
                    </button>
                  );
                })}
              </div>
              {details.menuGroups.length === 0 && (
                <p className="mt-2 text-[13px] text-ink-faint">
                  In no section — it will show above them, on its own.
                </p>
              )}
            </Field>
          )}

          <Field
            label="Regular price" htmlFor="price"
            hint={product.variants.length > 0
              ? "Priced by its choices below."
              : "In EGP. What a normal order pays."}
          >
            <input
              id="price" value={details.price} inputMode="decimal"
              disabled={product.variants.length > 0}
              onChange={(e) => set({ price: e.target.value })}
              className={`${input} disabled:opacity-40`}
            />
          </Field>
        </div>

        <button type="button" disabled={pending}
          onClick={() => run("The dish", () => saveProduct(product.id, details))}
          className="btn-primary mt-6 disabled:bg-ink/25">
          Save the dish
        </button>
      </Panel>

      {/* --- available today, which is not the same as retired --- */}
      <Panel
        title="Availability"
        note="Whether customers can order this dish right now. It is a switch you can flick back the same day, and it never touches an order that has already been placed."
      >
        <div className="flex flex-wrap gap-3">
          <AvailabilityButton
            on={product.isAvailable} pending={pending} available
            onClick={() => run("The menu", () => setProductAvailability(product.id, true))}
          />
          <AvailabilityButton
            on={!product.isAvailable} pending={pending} available={false}
            onClick={() => run("The menu", () => setProductAvailability(product.id, false))}
          />
        </div>

        <p className="mt-4 text-[13.5px] leading-relaxed text-ink-soft">
          {product.isAvailable
            ? "Customers can order it."
            : "Customers can still see it on the menu, but cannot order it. Nothing is archived and nothing is lost \u2014 flick it back whenever it is on again."}
        </p>

        <div className="mt-6 border-t border-line-soft pt-5">
          <Toggle
            on={product.isFeatured} pending={pending}
            onChange={() => run("The homepage", () => setFeatured(product.id, !product.isFeatured))}
            title="Show on the homepage"
            body="Featured dishes lead the homepage."
          />
        </div>

        <p className="mt-5 text-[13px] leading-relaxed text-ink-faint">
          Taking a dish off the menu for good is a different thing, and it is at the bottom of this
          page.
        </p>
      </Panel>

      {/* --- priced choices --- */}
      <Panel
        title="Priced choices"
        note="A dish either has one price or a set of priced choices — Noodles with vegetables, with chicken, with shrimps. Adding the first choice clears the single price."
      >
        {product.variants.length > 0 && (
          <ul className="mb-5 divide-y divide-line-soft">
            {product.variants.map((v) => (
              <VariantRow key={v.id} productId={product.id} variant={v} run={run} pending={pending} />
            ))}
          </ul>
        )}

        <div className="flex flex-wrap items-end gap-3">
          <Field label="New choice" htmlFor="vname">
            <input id="vname" value={newVariant.name}
              onChange={(e) => setNewVariant((v) => ({ ...v, name: e.target.value }))}
              placeholder="With chicken" className={input} />
          </Field>
          <Field label="Price" htmlFor="vprice">
            <input id="vprice" value={newVariant.price} inputMode="decimal"
              onChange={(e) => setNewVariant((v) => ({ ...v, price: e.target.value }))}
              placeholder="800" className={`${input} w-32`} />
          </Field>
          <button
            type="button" disabled={pending || !newVariant.name.trim()}
            onClick={() => run("The choice", async () => {
              const r = await saveVariant(product.id, null, newVariant.name, newVariant.price);
              if (r.ok) setNewVariant({ name: "", price: "" });
              return r;
            })}
            className="btn-outline disabled:opacity-40"
          >
            Add it
          </button>
        </div>
      </Panel>

      {/* --- what comes with it --- */}
      {product.optionGroups.length > 0 && (
        <Panel
          title="What comes with it"
          note="Choices the customer makes at no extra cost. Switch one off when you have run out of it."
        >
          <div className="grid gap-5">
            {product.optionGroups.map((g) => (
              <div key={g.id}>
                <p className="eyebrow">{g.nameEn}</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {g.choices.map((c) => (
                    <button
                      key={c.id}
                      type="button"
                      disabled={pending}
                      onClick={() => run("The choice", () => setChoiceAvailability(c.id, !c.isAvailable))}
                      className={`rounded-full border px-4 py-1.5 text-[14px] transition-colors ${
                        c.isAvailable
                          ? "border-line bg-cream text-ink hover:border-gold"
                          : "border-[#A6391C]/35 bg-[#A6391C]/[0.06] text-[#A6391C] line-through"
                      }`}
                    >
                      {c.nameEn}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </Panel>
      )}

      {/* --- how it is sold: real, but not the daily edit --- */}
      <Panel
        title="Serving and order details"
        note="How this dish is sold and how few of it a customer may order."
      >
        <div className="grid gap-5 sm:grid-cols-2">
          <Field
            label="Selling unit" htmlFor="unit" full
            hint="What one of these is: a tray, a kilo, twelve pieces. Left empty until the business says — never invented."
          >
            <input id="unit" value={details.sellingUnitEn}
              onChange={(e) => set({ sellingUnitEn: e.target.value })} className={input} />
          </Field>

          <div className="grid gap-3 sm:col-span-2">
            <Toggle
              on={details.unitRequired} pending={pending}
              onChange={() => set({ unitRequired: !details.unitRequired })}
              title="This dish needs a selling unit"
              body="Only then is a missing unit flagged on the menu. Off for anything sold as it is."
            />
            {details.sellingUnitEn.trim() !== "" && (
              <Toggle
                on={details.unitConfirmed} pending={pending}
                onChange={() => set({ unitConfirmed: !details.unitConfirmed })}
                title="This selling unit is confirmed"
                body="Until it is, the dish keeps its reminder."
              />
            )}
          </div>

          <Field label="Serves from" htmlFor="smin" hint="Optional.">
            <input id="smin" value={details.servesMin} inputMode="numeric"
              onChange={(e) => set({ servesMin: e.target.value })} className={input} />
          </Field>
          <Field label="Serves up to" htmlFor="smax" hint="Optional.">
            <input id="smax" value={details.servesMax} inputMode="numeric"
              onChange={(e) => set({ servesMax: e.target.value })} className={input} />
          </Field>

          <Field label="Smallest order" htmlFor="minq" hint="How few a customer may order.">
            <input id="minq" value={details.minQuantity} inputMode="numeric"
              onChange={(e) => set({ minQuantity: e.target.value })} className={input} />
          </Field>
          <Field label="Ordered in steps of" htmlFor="step">
            <input id="step" value={details.quantityStep} inputMode="numeric"
              onChange={(e) => set({ quantityStep: e.target.value })} className={input} />
          </Field>

          <Field label="Note to yourself" htmlFor="rnote" full hint="Never shown to a customer.">
            <input id="rnote" value={details.reviewNote}
              onChange={(e) => set({ reviewNote: e.target.value })} className={input} />
          </Field>
        </div>

        <button type="button" disabled={pending}
          onClick={() => run("The details", () => saveProduct(product.id, details))}
          className="btn-primary mt-6 disabled:bg-ink/25">
          Save these details
        </button>
      </Panel>

      {/* --- allergens --- */}
      <Panel
        title="Allergens"
        note="Tagged from the menu wording during setup and never checked against a recipe. Confirm them before launch."
      >
        {unreviewed && (
          <p className="mb-4 rounded-sm border border-[#A6391C]/30 bg-[#A6391C]/[0.06] px-4 py-3 text-[14.5px] text-[#A6391C]">
            These have not been checked against the recipe yet.
          </p>
        )}

        <div className="flex flex-wrap gap-2">
          {allergens.map((a) => {
            const on = allergenIds.has(a.id);
            return (
              <button
                key={a.id}
                type="button"
                disabled={pending}
                onClick={() => run("Allergens", () => setAllergen(product.id, a.id, !on))}
                aria-pressed={on}
                className={`rounded-full border px-4 py-1.5 text-[14px] transition-colors ${
                  on ? "border-gold bg-gold-pale/50 text-ink" : "border-line bg-cream text-ink-faint hover:border-ink/30"
                }`}
              >
                {a.nameEn}
              </button>
            );
          })}
        </div>

        {unreviewed && (
          <button type="button" disabled={pending}
            onClick={() => run("Allergens", () => markAllergensReviewed(product.id))}
            className="btn-outline mt-5">
            I have checked these against the recipe
          </button>
        )}
      </Panel>

      {/* --- event pricing --- */}
      <Panel
        title="Event pricing"
        note="An event portion is cooked for the whole guest list, so it is priced by guest count."
      >
        <label className="flex items-start gap-3 text-[15px] text-ink">
          <input
            type="checkbox" checked={product.eventPricingEnabled} disabled={pending}
            onChange={(e) => run("Event pricing", () => setEventPricingEnabled(product.id, e.target.checked))}
            className="mt-1 h-4 w-4 accent-[#A87E2E]"
          />
          <span>
            Scale this dish by guest count
            <span className="mt-0.5 block text-[13.5px] text-ink-soft">
              Off means an event pays the regular price for it.
            </span>
          </span>
        </label>

        {product.eventPricingEnabled && (
          <div className="mt-6">
            {/* Worked out for this dish, from the price as it is being typed. */}
            {product.variants.length > 0 && (
              <div className="mb-5 flex flex-wrap items-center gap-3">
                <label htmlFor="evchoice" className="text-[14px] text-ink-soft">
                  Prices shown for
                </label>
                <select id="evchoice" value={pricingChoice}
                  onChange={(e) => setPricingChoice(e.target.value)}
                  className={`${input} w-auto`}>
                  {product.variants.map((v) => (
                    <option key={v.id} value={v.id}>
                      {v.nameEn} — {formatEGP(v.price)}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <p className="text-[14.5px] text-ink-soft">
              {ownLadder
                ? "This dish has its own bands, which replace the shared ladder for it."
                : "It follows the shared ladder:"}
            </p>

            {!ownLadder && (
              <ul className="mt-3 grid gap-1.5 sm:grid-cols-2">
                {sharedTiers.map((t) => (
                  <li key={t.minGuests} className="flex items-baseline gap-3 text-[14px] tabular-nums">
                    <span className="w-24 text-ink-faint">
                      {t.minGuests}&ndash;{t.maxGuests} guests
                    </span>
                    <span className="w-12 text-ink-soft">{multiplierText(t.multiplierBp)}</span>
                    <span className="font-medium text-ink">
                      {eventBasis === null
                        ? "—"
                        : formatEGP(Math.round((eventBasis * t.multiplierBp) / 10000))}
                    </span>
                  </li>
                ))}
              </ul>
            )}

            {eventBasis === null && (
              <p className="mt-3 text-[13.5px] text-ink-faint">
                Give the dish a price and the event amounts appear here.
              </p>
            )}

            <TierEditor
              tiers={tiers} setTiers={setTiers} pending={pending}
              basePrice={eventBasis}
              onSave={() => run("The bands", () => saveProductTiers(product.id, tiers))}
              onClear={() => run("The bands", async () => {
                const r = await clearProductTiers(product.id);
                if (r.ok) setTiers([]);
                return r;
              })}
              hasOwn={ownLadder}
            />

            <div className="mt-5">
              <Field label="Why it scales this way" htmlFor="epnote" hint="Never shown to a customer.">
                <input id="epnote" value={note} onChange={(e) => setNote(e.target.value)} className={input} />
              </Field>
              <button type="button" disabled={pending}
                onClick={() => run("The note", () => saveEventPricingNote(product.id, note))}
                className="btn-outline mt-3">
                Save the note
              </button>
            </div>
          </div>
        )}
      </Panel>

      <ArchiveDish id={product.id} name={product.nameEn} orderCount={product.orderCount} />
    </div>
  );
}

// ---------------------------------------------------------------- the parts

const input =
  "w-full rounded-sm border border-line bg-cream px-4 py-2.5 text-[15px] text-ink placeholder:text-ink-faint focus:border-gold focus:outline-none";

/** A price as typed, in piastres, or null while it is not a price yet. */
function typedPiastres(text: string): number | null {
  const clean = text.replace(/,/g, "").trim();
  if (clean === "") return null;
  const n = Number(clean);
  if (!Number.isFinite(n) || n < 0) return null;
  return Math.round(n * PIASTRES_PER_POUND);
}

/**
 * Available or unavailable, said in words rather than hidden in a checkbox:
 * this is the control the kitchen reaches for, and it must never read as
 * anything to do with retiring a dish.
 */
function AvailabilityButton({ on, available, pending, onClick }: {
  on: boolean; available: boolean; pending: boolean; onClick: () => void;
}) {
  const tone = available
    ? "border-[#2E6B45] bg-[#2E6B45] text-cream"
    : "border-[#A6391C] bg-[#A6391C] text-cream";
  return (
    <button
      type="button" disabled={pending} onClick={onClick} aria-pressed={on}
      className={`rounded-full border px-6 py-2.5 text-[15px] transition-colors ${
        on ? tone : "border-line bg-cream text-ink-soft hover:border-ink/40"
      }`}
    >
      {available ? "Available" : "Unavailable"}
    </button>
  );
}

function Panel({ title, note, children }: { title: string; note?: string; children: React.ReactNode }) {
  return (
    <section className="rounded-sm border border-line bg-cream-warm">
      <header className="border-b border-line px-6 py-4">
        <h2 className="font-display text-[18px] font-semibold text-ink">{title}</h2>
        {note && <p className="mt-1.5 max-w-2xl text-[13.5px] leading-relaxed text-ink-soft">{note}</p>}
      </header>
      <div className="px-6 py-5">{children}</div>
    </section>
  );
}

function Field({ label, htmlFor, hint, full = false, children }: {
  label: string; htmlFor: string; hint?: string; full?: boolean; children: React.ReactNode;
}) {
  return (
    <div className={full ? "sm:col-span-2" : undefined}>
      <label htmlFor={htmlFor} className="eyebrow mb-2 block">{label}</label>
      {children}
      {hint && <p className="mt-1.5 text-[13px] leading-relaxed text-ink-faint">{hint}</p>}
    </div>
  );
}

function Toggle({ on, pending, onChange, title, body }: {
  on: boolean; pending: boolean; onChange: () => void; title: string; body: string;
}) {
  return (
    <label className="flex items-start gap-3 text-[15px] text-ink">
      <input type="checkbox" checked={on} disabled={pending} onChange={onChange}
        className="mt-1 h-4 w-4 accent-[#A87E2E]" />
      <span>
        {title}
        <span className="mt-0.5 block text-[13.5px] text-ink-soft">{body}</span>
      </span>
    </label>
  );
}

function VariantRow({ productId, variant, run, pending }: {
  productId: string;
  variant: { id: string; nameEn: string; price: number; isAvailable: boolean };
  run: (label: string, fn: () => Promise<{ ok: boolean; error?: string }>) => void;
  pending: boolean;
}) {
  const [name, setName] = useState(variant.nameEn);
  const [price, setPrice] = useState(String(piastresToPounds(variant.price)));

  return (
    <li className="flex flex-wrap items-center gap-3 py-3">
      <input value={name} onChange={(e) => setName(e.target.value)} className={`${input} flex-1 min-w-[10rem]`} />
      <input value={price} inputMode="decimal" onChange={(e) => setPrice(e.target.value)} className={`${input} w-28`} />
      <button type="button" disabled={pending}
        onClick={() => run("The choice", () => saveVariant(productId, variant.id, name, price))}
        className="rounded-full border border-line bg-cream px-4 py-1.5 text-[13.5px] text-ink-soft hover:border-gold">
        Save
      </button>
      <button type="button" disabled={pending}
        onClick={() => run("The choice", () => setVariantAvailability(variant.id, !variant.isAvailable))}
        className={`rounded-full border px-4 py-1.5 text-[13.5px] ${
          variant.isAvailable
            ? "border-[#2E6B45]/40 bg-[#2E6B45]/[0.08] text-[#2E6B45]"
            : "border-[#A6391C]/40 bg-[#A6391C]/[0.07] text-[#A6391C]"
        }`}>
        {variant.isAvailable ? "On" : "Off"}
      </button>
      <button type="button" disabled={pending}
        onClick={() => run("The choice", () => removeVariant(variant.id))}
        className="text-[13.5px] text-ink-faint underline underline-offset-4 hover:text-[#A6391C]">
        Remove
      </button>
    </li>
  );
}

function TierEditor({ tiers, setTiers, pending, basePrice, onSave, onClear, hasOwn }: {
  tiers: Tier[];
  setTiers: (t: Tier[]) => void;
  pending: boolean;
  basePrice: number | null;
  onSave: () => void;
  onClear: () => void;
  hasOwn: boolean;
}) {
  const set = (i: number, patch: Partial<Tier>) =>
    setTiers(tiers.map((t, j) => (i === j ? { ...t, ...patch } : t)));

  return (
    <div className="mt-5">
      {tiers.length > 0 && (
        <ul className="grid gap-2">
          {tiers.map((t, i) => (
            <li key={i} className="flex flex-wrap items-center gap-2">
              <input value={t.minGuests} inputMode="numeric" aria-label="From guests"
                onChange={(e) => set(i, { minGuests: e.target.value })} className={`${input} w-20`} />
              <span className="text-[14px] text-ink-faint">to</span>
              <input value={t.maxGuests} inputMode="numeric" aria-label="To guests"
                onChange={(e) => set(i, { maxGuests: e.target.value })} className={`${input} w-20`} />
              <span className="text-[14px] text-ink-faint">guests:</span>
              <input value={t.multiplier} inputMode="decimal" placeholder="2.5" aria-label="Multiplier"
                onChange={(e) => set(i, { multiplier: e.target.value, price: "" })} className={`${input} w-24`} />
              <span className="text-[14px] text-ink-faint">&times; &mdash; or a flat</span>
              <input value={t.price} inputMode="decimal" placeholder="EGP" aria-label="Flat price"
                onChange={(e) => set(i, { price: e.target.value, multiplier: "" })} className={`${input} w-28`} />
              {basePrice !== null && t.multiplier && (
                <span className="text-[13.5px] tabular-nums text-ink-faint">
                  = {formatEGP(Math.round(basePrice * Number(t.multiplier || 0)))}
                </span>
              )}
              <button type="button"
                onClick={() => setTiers(tiers.filter((_, j) => j !== i))}
                className="text-[13.5px] text-ink-faint underline underline-offset-4 hover:text-[#A6391C]">
                Remove
              </button>
            </li>
          ))}
        </ul>
      )}

      <div className="mt-4 flex flex-wrap items-center gap-3">
        <button type="button" disabled={pending}
          onClick={() => setTiers([...tiers, { minGuests: "", maxGuests: "", multiplier: "", price: "" }])}
          className="btn-outline">
          Add a band
        </button>
        {tiers.length > 0 && (
          <button type="button" disabled={pending} onClick={onSave} className="btn-primary">
            Save these bands
          </button>
        )}
        {hasOwn && (
          <button type="button" disabled={pending} onClick={onClear}
            className="text-[14px] text-ink-faint underline underline-offset-4 hover:text-ink">
            Go back to the shared ladder
          </button>
        )}
      </div>
    </div>
  );
}

function ArchiveDish({ id, name, orderCount }: { id: string; name: string; orderCount: number }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, start] = useTransition();

  return (
    <div>
      {!open ? (
        <button type="button" onClick={() => setOpen(true)}
          className="text-[14px] text-ink-faint underline underline-offset-4 hover:text-[#A6391C]">
          Take this dish off the menu for good
        </button>
      ) : (
        <div className="rounded-sm border border-[#A6391C]/30 bg-[#A6391C]/[0.05] px-5 py-5">
          <p className="font-display text-[17px] font-semibold text-ink">Retire {name}?</p>
          <p className="mt-2 text-[14.5px] leading-relaxed text-ink-soft">
            It disappears from the menu but is never deleted
            {orderCount > 0 && ` — ${orderCount} ${orderCount === 1 ? "order has" : "orders have"} it on them`}
            , and it can be brought back exactly as it is.
          </p>
          <div className="mt-4 flex flex-wrap items-center gap-4">
            <button type="button" disabled={pending}
              onClick={() => start(async () => {
                await archiveProduct(id);
                router.push("/admin/menu");
              })}
              className="rounded-full border border-[#A6391C] bg-[#A6391C] px-5 py-2.5 text-[14.5px] text-cream disabled:opacity-50">
              {pending ? "Retiring…" : "Yes, retire it"}
            </button>
            <button type="button" onClick={() => setOpen(false)}
              className="text-[14px] text-ink-soft underline underline-offset-4">
              Keep it
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

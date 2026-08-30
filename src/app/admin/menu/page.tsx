import Link from "next/link";
import { requireAdminPage } from "@/lib/admin-auth";
import { getMenuProducts, menuAttention } from "@/lib/admin-menu";
import { MenuList } from "@/components/admin/menu-list";
import { Stat } from "@/components/admin/bits";

export const dynamic = "force-dynamic";
export const metadata = { title: "Menu" };

type Props = { searchParams: Promise<{ show?: string }> };

/**
 * The menu.
 *
 * It opens on everything, grouped the way a customer sees it. The filters above
 * are the questions the business actually has outstanding: what is off the menu
 * today, and what still needs a decision from setup — a selling unit nobody has
 * supplied, allergens nobody has checked.
 */
export default async function MenuPage({ searchParams }: Props) {
  await requireAdminPage();
  const sp = await searchParams;
  const filter = ["unavailable", "no-unit", "unreviewed", "notes"].includes(sp.show ?? "")
    ? sp.show!
    : null;

  const [products, counts] = await Promise.all([getMenuProducts(), menuAttention()]);

  return (
    <div>
      <div className="flex flex-wrap items-baseline justify-between gap-x-8 gap-y-3">
        <div>
          <p className="eyebrow">Menu</p>
          <h1 className="mt-2 font-display text-[30px] font-semibold text-ink">
            {counts.total} dishes
          </h1>
        </div>
        <div className="flex flex-wrap items-center gap-4">
          <Link href="/admin/menu/categories" className="text-[14.5px] text-ink-soft hover:text-ink">
            Courses
          </Link>
          <Link href="/admin/menu/new" className="btn-primary">Add a dish</Link>
        </div>
      </div>

      <div className="mt-7 grid gap-4 sm:grid-cols-3">
        <Stat
          label="Off the menu" value={counts.unavailable}
          href="/admin/menu?show=unavailable"
          tone={counts.unavailable > 0 ? "alert" : "plain"}
        />
        <Stat label="Without a selling unit" value={counts.noUnit} href="/admin/menu?show=no-unit" />
        <Stat
          label="Allergens to check" value={counts.unreviewed}
          href="/admin/menu?show=unreviewed"
        />
      </div>

      <div className="mt-6 flex flex-wrap items-center gap-2">
        <Chip href="/admin/menu" on={filter === null}>Everything</Chip>
        <Chip href="/admin/menu?show=unavailable" on={filter === "unavailable"}>Off the menu</Chip>
        <Chip href="/admin/menu?show=no-unit" on={filter === "no-unit"}>No selling unit</Chip>
        <Chip href="/admin/menu?show=unreviewed" on={filter === "unreviewed"}>Allergens unchecked</Chip>
        {counts.notes > 0 && (
          <Chip href="/admin/menu?show=notes" on={filter === "notes"}>Has a note</Chip>
        )}
      </div>

      <div className="mt-6">
        <MenuList products={products} filter={filter} />
      </div>

      <p className="mt-6 text-[13.5px] leading-relaxed text-ink-faint">
        Changing a price or a name here changes what customers see straight away. It never changes
        an order that has already been placed — every order keeps its own record of what was bought
        and what it cost.
      </p>
    </div>
  );
}

function Chip({ href, on, children }: { href: string; on: boolean; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className={`rounded-full border px-4 py-1.5 text-[14px] transition-colors ${
        on ? "border-ink bg-ink text-cream" : "border-line bg-cream-warm text-ink-soft hover:border-ink/40"
      }`}
    >
      {children}
    </Link>
  );
}

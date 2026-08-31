import Link from "next/link";
import { requireAdminPage } from "@/lib/admin-auth";
import { undecided } from "@/lib/admin-settings";
import { SettingsNav } from "@/components/admin/settings-nav";

export const dynamic = "force-dynamic";

/**
 * Settings.
 *
 * One place with a list down the side, so changing one thing is two clicks and
 * never a trip back to an index. Business details first: they are the plainest
 * facts about the business, not an afterthought.
 */
export default async function SettingsLayout({ children }: { children: React.ReactNode }) {
  await requireAdminPage();
  const todo = await undecided();

  return (
    <div>
      <div className="flex flex-wrap items-baseline justify-between gap-x-8 gap-y-2">
        <div>
          <p className="eyebrow">Settings</p>
          <h1 className="mt-1.5 font-display text-[26px] font-semibold text-ink">
            How the business runs
          </h1>
        </div>
        <p className="text-[13.5px] text-ink-faint">
          Changes apply from now on. They never rewrite an order already placed.
        </p>
      </div>

      <div className="mt-7 grid gap-8 lg:grid-cols-[188px_minmax(0,1fr)]">
        <SettingsNav undecided={todo.map((t) => t.where)} />
        <div className="min-w-0">{children}</div>
      </div>

      {todo.length > 0 && (
        <p className="mt-10 text-[13px] text-ink-faint">
          A gold dot in the list marks a section holding something still undecided —{" "}
          {todo.length} {todo.length === 1 ? "thing" : "things"} in all. Each one is explained where
          it belongs, and nothing has been chosen on your behalf.
        </p>
      )}
    </div>
  );
}


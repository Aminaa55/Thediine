"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { cairoDayKey } from "@/lib/ordering";

/**
 * Narrowing the list.
 *
 * Every filter is written into the address, so a view can be kept, shared or
 * bookmarked — "events I still have to answer" is a link, not a sequence of
 * clicks. Nothing here is remembered anywhere else.
 */
export function OrderFilterBar({ shown }: { shown: number }) {
  const router = useRouter();
  const sp = useSearchParams();

  const link = (patch: Record<string, string | undefined>) => {
    const p = new URLSearchParams(sp.toString());
    for (const [k, v] of Object.entries(patch)) {
      if (v) p.set(k, v);
      else p.delete(k);
    }
    const s = p.toString();
    return `/admin/orders${s ? `?${s}` : ""}`;
  };
  const set = (patch: Record<string, string | undefined>) => router.push(link(patch));

  const type = sp.get("type");
  const status = sp.get("status");
  const payment = sp.get("payment");
  const fulfilment = sp.get("fulfilment");
  const from = sp.get("from") ?? "";
  const to = sp.get("to") ?? "";
  const all = sp.get("all") === "1";
  const open = !type && !status && !payment && !fulfilment && !from && !to && !all;
  const anyFilter = !open;

  // Cairo's today, not the viewer's device or the server's clock.
  const today = cairoDayKey();
  const inDays = (n: number) => cairoDayKey(new Date(Date.now() + n * 86_400_000));

  return (
    <div className="mt-7 grid gap-4">
      <div className="flex flex-wrap items-center gap-2">
        <Chip href={link({ type: undefined, status: undefined, payment: undefined, fulfilment: undefined, from: undefined, to: undefined, all: undefined })} on={open}>
          Open
        </Chip>
        <Chip href={link({ all: "1", status: undefined, payment: undefined })} on={all}>All</Chip>
        <Divider />
        <Chip href={link({ type: type === "NORMAL" ? undefined : "NORMAL" })} on={type === "NORMAL"}>Normal</Chip>
        <Chip href={link({ type: type === "EVENT" ? undefined : "EVENT" })} on={type === "EVENT"}>Events</Chip>
        <Chip href={link({ type: "EVENT", status: "REQUESTED" })} on={status === "REQUESTED"}>Requests</Chip>
        <Chip href={link({ payment: payment === "AWAITING_VERIFICATION" ? undefined : "AWAITING_VERIFICATION" })} on={payment === "AWAITING_VERIFICATION"}>
          To verify
        </Chip>
        <Divider />
        <Chip href={link({ fulfilment: fulfilment === "DELIVERY" ? undefined : "DELIVERY" })} on={fulfilment === "DELIVERY"}>Delivery</Chip>
        <Chip href={link({ fulfilment: fulfilment === "PICKUP" ? undefined : "PICKUP" })} on={fulfilment === "PICKUP"}>Pickup</Chip>

        <form action="/admin/orders" className="ms-auto flex items-center gap-2">
          {/* The other filters survive a search. */}
          {["type", "status", "payment", "fulfilment", "from", "to", "all"].map((k) =>
            sp.get(k) ? <input key={k} type="hidden" name={k} value={sp.get(k)!} /> : null,
          )}
          <input
            type="search" name="q" defaultValue={sp.get("q") ?? ""}
            placeholder="Number, name or mobile"
            className="w-56 rounded-full border border-line bg-cream-warm px-4 py-2 text-[14.5px] text-ink placeholder:text-ink-faint focus:border-gold focus:outline-none"
          />
          <button type="submit" className="text-[14px] text-gold hover:underline">Search</button>
        </form>
      </div>

      {/* Dates: the quick answers first, the exact range behind them. */}
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2 rounded-sm border border-line bg-cream-warm px-4 py-3">
        <span className="text-[11px] uppercase tracking-widest text-ink-faint">Wanted for</span>
        <Chip href={link({ from: today, to: today })} on={from === today && to === today} small>Today</Chip>
        <Chip href={link({ from: inDays(1), to: inDays(1) })} on={from === inDays(1) && to === inDays(1)} small>Tomorrow</Chip>
        <Chip href={link({ from: today, to: inDays(7) })} on={from === today && to === inDays(7)} small>Next 7 days</Chip>
        <Chip href={link({ from: today, to: inDays(30) })} on={from === today && to === inDays(30)} small>Next 30 days</Chip>

        <span className="ms-2 flex flex-wrap items-center gap-2 text-[14px] text-ink-soft">
          <label className="flex items-center gap-2">
            <span className="text-[13px] text-ink-faint">From</span>
            <input
              type="date" value={from}
              onChange={(e) => set({ from: e.target.value || undefined })}
              className="rounded-sm border border-line bg-cream px-3 py-1.5 text-[14px] text-ink focus:border-gold focus:outline-none"
            />
          </label>
          <label className="flex items-center gap-2">
            <span className="text-[13px] text-ink-faint">to</span>
            <input
              type="date" value={to}
              onChange={(e) => set({ to: e.target.value || undefined })}
              className="rounded-sm border border-line bg-cream px-3 py-1.5 text-[14px] text-ink focus:border-gold focus:outline-none"
            />
          </label>
        </span>

        {(from || to) && (
          <Link href={link({ from: undefined, to: undefined })} className="text-[13.5px] text-ink-faint underline underline-offset-4 hover:text-ink">
            Clear dates
          </Link>
        )}
      </div>

      <p className="text-[13.5px] text-ink-faint">
        {shown} shown{anyFilter ? " · " : ""}
        {anyFilter && (
          <Link href="/admin/orders" className="text-gold hover:underline">Clear every filter</Link>
        )}
      </p>
    </div>
  );
}

function Divider() {
  return <span aria-hidden="true" className="mx-1 h-5 w-px bg-line" />;
}

function Chip({ href, on, small = false, children }: {
  href: string; on: boolean; small?: boolean; children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className={`rounded-full border transition-colors ${small ? "px-3.5 py-1 text-[13.5px]" : "px-4 py-1.5 text-[14px]"} ${
        on ? "border-ink bg-ink text-cream" : "border-line bg-cream-warm text-ink-soft hover:border-ink/40"
      }`}
    >
      {children}
    </Link>
  );
}

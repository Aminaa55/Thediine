"use client";

import { createContext, useContext } from "react";
import { RULES, EVENT_GUESTS, earliestEventDate, earliestNormalDate, toDateInput } from "@/lib/ordering";

/**
 * The business's own numbers, handed to the browser.
 *
 * The customer site is full of small statements of rule — "events need five
 * days", "up to 100 guests" — and each of them has to be the number the server
 * will actually enforce. They are read from settings once, on the server, and
 * put here so no component has to reach for a constant.
 *
 * The defaults are the rules the business already gave us, used only if a page
 * renders outside the provider.
 */
export type PublicRules = {
  normalNoticeLabel: string;
  normalEarliest: string;
  dailyCapacity: number;
  eventNoticeLabel: string;
  eventEarliest: string;
  maxGuests: number;
  pickupEnabled: boolean;
};

const DEFAULTS: PublicRules = {
  normalNoticeLabel: RULES.normal.noticeLabel,
  normalEarliest: toDateInput(earliestNormalDate()),
  dailyCapacity: RULES.normal.dailyCapacity,
  eventNoticeLabel: RULES.event.noticeLabel,
  eventEarliest: toDateInput(earliestEventDate()),
  maxGuests: EVENT_GUESTS.max,
  pickupEnabled: true,
};

const Ctx = createContext<PublicRules>(DEFAULTS);

export function RulesProvider({ value, children }: { value: PublicRules; children: React.ReactNode }) {
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useRules(): PublicRules {
  return useContext(Ctx);
}

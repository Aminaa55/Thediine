/**
 * All money in this system is stored as integer piastres (1 EGP = 100).
 * Nothing anywhere should hold a price as a float.
 */

export const PIASTRES_PER_POUND = 100;

export function poundsToPiastres(pounds: number): number {
  return Math.round(pounds * PIASTRES_PER_POUND);
}

export function piastresToPounds(piastres: number): number {
  return piastres / PIASTRES_PER_POUND;
}

/**
 * Splits a total into a deposit due now and a remainder due later.
 *
 * The deposit is rounded to the nearest piastre and the remainder is whatever
 * is left, so the two always add back up to the total exactly — nothing is
 * lost or invented to rounding.
 */
export function splitDeposit(total: number, percent: number): { deposit: number; remaining: number } {
  const deposit = Math.round((total * percent) / 100);
  return { deposit, remaining: total - deposit };
}

/** "1,250 EGP" — whole pounds unless there are piastres to show. */
export function formatEGP(piastres: number): string {
  const pounds = piastres / PIASTRES_PER_POUND;
  const hasFraction = piastres % PIASTRES_PER_POUND !== 0;
  return `${pounds.toLocaleString("en-EG", {
    minimumFractionDigits: hasFraction ? 2 : 0,
    maximumFractionDigits: 2,
  })} EGP`;
}

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

/** "1,250 EGP" — whole pounds unless there are piastres to show. */
export function formatEGP(piastres: number): string {
  const pounds = piastres / PIASTRES_PER_POUND;
  const hasFraction = piastres % PIASTRES_PER_POUND !== 0;
  return `${pounds.toLocaleString("en-EG", {
    minimumFractionDigits: hasFraction ? 2 : 0,
    maximumFractionDigits: 2,
  })} EGP`;
}

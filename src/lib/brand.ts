/**
 * Brand assets and identity constants.
 */

/**
 * The official logo file.
 *
 * NULL until the real asset is supplied. The logo is deliberately never
 * recreated, redrawn or approximated — while this is null the header and
 * footer show the name set in the brand typeface, nothing more.
 *
 * To switch it on: put the file in `public/brand/` and set this to its path,
 * e.g. "/brand/the-diine-logo.svg".
 */
export const LOGO_SRC: string | null = null;

export const BRAND = {
  name: "The Diine",
  tagline: "Food Made With Passion",
  instagram: "https://www.instagram.com/thediine/",
  whatsapp: "+201123030107",
} as const;

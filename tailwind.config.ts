import type { Config } from "tailwindcss";

/**
 * The Diine brand system, taken from the logo.
 *
 * No colours outside the brand. Visual rhythm comes from using MORE of the
 * palette's range — a deep brown for dark bands, three distinct creams, and
 * gold as a real accent rather than a tint — so sections stop blending into
 * one another.
 */
export default {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        cream: {
          DEFAULT: "#FBF1E4", // page ground
          warm: "#FFFAF3",    // raised surfaces
          deep: "#F4E5CE",    // recessed bands
          toast: "#EBD7B4",   // the warmest cream, for emphasis panels
        },
        ink: {
          DEFAULT: "#3B2310",
          deep: "#2A1809",    // dark section grounds
          soft: "#6E523A",
          faint: "#9A7E62",
        },
        gold: {
          DEFAULT: "#A87E2E",
          bright: "#C79A3F",  // on dark grounds
          pale: "#EFE2BE",
        },
        line: { DEFAULT: "#E4CFAF", soft: "#EFE0C9", dark: "#4A331F" },
      },
      fontFamily: {
        display: ["var(--font-display)", "Georgia", "serif"],
        body: ["var(--font-body)", "system-ui", "sans-serif"],
      },
      maxWidth: { content: "1180px" },
      letterSpacing: { widest: "0.22em" },
      keyframes: {
        rise: {
          from: { opacity: "0", transform: "translateY(12px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
      },
      animation: { rise: "rise .5s ease-out both" },
    },
  },
  plugins: [],
} satisfies Config;

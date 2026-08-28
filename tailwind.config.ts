import type { Config } from "tailwindcss";

/**
 * The Diine brand system, taken from the logo:
 * warm cream grounds, deep brown ink, gold accents.
 */
export default {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        cream: { DEFAULT: "#FBF1E4", deep: "#F5E7D4", warm: "#FFFAF3" },
        ink: { DEFAULT: "#3B2310", soft: "#6E523A", faint: "#9A7E62" },
        gold: { DEFAULT: "#A87E2E", light: "#D9C173", pale: "#EFE2BE" },
        line: { DEFAULT: "#E7D5BE", soft: "#F0E3D1" },
      },
      fontFamily: {
        display: ["var(--font-display)", "Georgia", "serif"],
        body: ["var(--font-body)", "system-ui", "sans-serif"],
      },
      maxWidth: { content: "1180px" },
      letterSpacing: { widest: "0.22em" },
    },
  },
  plugins: [],
} satisfies Config;

import type { Config } from "tailwindcss";

// Monochrome palette (BetterGov-style): white canvas, black type and buttons, hairline grey borders, green for positive states.
export default {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        navy: { DEFAULT: "#0a0a0a", deep: "#000000", soft: "#262626" },
        brand: { DEFAULT: "#111111", dark: "#000000", soft: "#f4f4f5" },
        canvas: "#fafafa",
        line: "#e5e5e5",
        ink: { DEFAULT: "#0a0a0a", mute: "#6b6b6b", faint: "#a3a3a3" },
        ok: { DEFAULT: "#15803d", soft: "#ecfdf3" },
        warn: { DEFAULT: "#b47d00", soft: "#fdf6e3" },
        bad: { DEFAULT: "#dc3545", soft: "#fcebed" },
        sun: "#f5c518",
      },
      fontFamily: {
        sans: ["Figtree", "system-ui", "-apple-system", "Segoe UI", "Helvetica Neue", "Arial", "sans-serif"],
        mono: ["JetBrains Mono", "ui-monospace", "SFMono-Regular", "Menlo", "Consolas", "monospace"],
      },
      boxShadow: { card: "none" },
      borderRadius: { md: "4px", lg: "6px", xl: "6px" },
    },
  },
  plugins: [],
} satisfies Config;

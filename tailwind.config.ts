import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        // ── Terra-Pulse background scale ──────────────────────────────
        "bg-deep":    "#0a0e13",
        "bg-surface": "#111820",
        "bg-raised":  "#1a2332",

        // ── Surface containers ─────────────────────────────────────────
        "surface":                    "#001525",
        "surface-dim":                "#001525",
        "surface-bright":             "#283b4d",
        "surface-container-lowest":   "#000f1d",
        "surface-container-low":      "#081d2e",
        "surface-container":          "#0c2132",
        "surface-container-high":     "#182c3d",
        "surface-container-highest":  "#233748",
        "surface-variant":            "#233748",
        "surface-tint":               "#4edea3",
        "on-surface":                 "#d0e5fb",
        "on-surface-variant":         "#bbcabf",
        "inverse-surface":            "#d0e5fb",
        "inverse-on-surface":         "#1f3243",

        // ── Primary — bioluminescent emerald ──────────────────────────
        "primary":                    "#4edea3",
        "on-primary":                 "#003824",
        "primary-container":          "#10b981",
        "on-primary-container":       "#00422b",
        "primary-fixed":              "#6ffbbe",
        "primary-fixed-dim":          "#4edea3",
        "on-primary-fixed":           "#002113",
        "on-primary-fixed-variant":   "#005236",
        "inverse-primary":            "#006c49",

        // ── Secondary — amber/caution ──────────────────────────────────
        "secondary":                  "#ffb95f",
        "on-secondary":               "#472a00",
        "secondary-container":        "#ee9800",
        "on-secondary-container":     "#5b3800",
        "secondary-fixed":            "#ffddb8",
        "secondary-fixed-dim":        "#ffb95f",
        "on-secondary-fixed":         "#2a1700",
        "on-secondary-fixed-variant": "#653e00",

        // ── Tertiary ───────────────────────────────────────────────────
        "tertiary":                   "#ffb3af",
        "on-tertiary":                "#650911",
        "tertiary-container":         "#fc7c78",
        "on-tertiary-container":      "#711419",
        "tertiary-fixed":             "#ffdad7",
        "tertiary-fixed-dim":         "#ffb3af",
        "on-tertiary-fixed":          "#410005",
        "on-tertiary-fixed-variant":  "#842225",

        // ── Error & Danger ─────────────────────────────────────────────
        "error":                "#ffb4ab",
        "on-error":             "#690005",
        "error-container":      "#93000a",
        "on-error-container":   "#ffdad6",
        "danger":               "#ef4444",
        "danger-dim":           "rgba(239,68,68,0.12)",

        // ── Outline / dividers ─────────────────────────────────────────
        "outline":              "#86948a",
        "outline-variant":      "#3c4a42",

        // ── Text ───────────────────────────────────────────────────────
        "text-primary":         "#f0f4f8",
        "text-muted":           "#4a6380",
        "on-background":        "#d0e5fb",
        "background":           "#001525",

        // ── Semantic dim tints ─────────────────────────────────────────
        "emerald-dim":   "rgba(16,185,129,0.12)",
        "amber-dim":     "rgba(245,158,11,0.10)",

        // ── Borders ────────────────────────────────────────────────────
        "border-subtle": "rgba(255,255,255,0.05)",
        "border-medium": "rgba(255,255,255,0.10)",
      },

      // ── Typography ─────────────────────────────────────────────────────
      fontFamily: {
        "display-lg":    ["Space Grotesk", "sans-serif"],
        "display-sm":    ["Space Grotesk", "sans-serif"],
        "body-md":       ["Inter", "sans-serif"],
        "caption-caps":  ["Inter", "sans-serif"],
        "data-mono":     ["JetBrains Mono", "monospace"],
        sans:            ["Inter", "sans-serif"],
        mono:            ["JetBrains Mono", "monospace"],
      },

      fontSize: {
        "display-lg": ["28px", { lineHeight: "34px", letterSpacing: "-0.02em", fontWeight: "600" }],
        "display-sm": ["22px", { lineHeight: "28px", letterSpacing: "-0.02em", fontWeight: "600" }],
        "body-md":    ["14px", { lineHeight: "20px", fontWeight: "400" }],
        "caption-caps": ["11px", { lineHeight: "14px", letterSpacing: "0.04em", fontWeight: "500" }],
        "data-mono":  ["12px", { lineHeight: "16px", fontWeight: "400" }],
      },

      // ── Spacing tokens ─────────────────────────────────────────────────
      spacing: {
        "container-margin": "1.5rem",
        "gutter":           "1rem",
        "panel-padding":    "1.25rem",
        "component-gap":    "0.75rem",
      },

      // ── Border radius ──────────────────────────────────────────────────
      borderRadius: {
        sm:      "0.25rem",
        DEFAULT: "0.5rem",
        md:      "0.75rem",
        lg:      "1rem",
        xl:      "1.5rem",
        "2xl":   "1rem",
        full:    "9999px",
      },

      // ── Box shadows ────────────────────────────────────────────────────
      boxShadow: {
        "emerald-sm": "0 0 8px rgba(16,185,129,0.12)",
        "emerald-md": "0 0 16px rgba(16,185,129,0.25)",
        "emerald-lg": "0 0 24px rgba(16,185,129,0.45)",
        "danger-sm":  "0 0 8px rgba(239,68,68,0.20)",
        "danger-lg":  "0 0 40px rgba(239,68,68,0.20)",
      },
    },
  },
  plugins: [],
};

export default config;

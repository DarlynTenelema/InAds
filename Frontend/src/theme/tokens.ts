// =============================================================================
// InAds — Tokens del Sistema de Diseño (Light Theme)
// Blanco para pantallas, Azul para diseño/títulos grandes y Negro para textos.
// =============================================================================

export const THEME_TOKENS = {
  colors: {
    background: {
      screen: "#FFFFFF",
      section: "#F8FAFC",
      muted: "#F1F5F9",
    },
    brand: {
      primary: "#2563EB",
      hover: "#1D4ED8",
      light: "#EFF6FF",
      border: "#BFDBFE",
    },
    text: {
      displayBlue: "#2563EB",
      headingDark: "#0F172A",
      body: "#0F172A",
      secondary: "#334155",
      muted: "#64748B",
    },
  },
  typography: {
    heroTitle: "text-4xl md:text-5xl font-extrabold tracking-tight text-brand-600",
    pageTitle: "text-2xl md:text-3xl font-bold tracking-tight text-brand-600",
    sectionTitle: "text-lg font-bold text-ink-primary",
    bodyBase: "text-sm text-ink-primary leading-relaxed",
    bodySmall: "text-xs text-ink-secondary",
  },
  surfaces: {
    card: "bg-surface-pure border border-surface-border rounded-2xl shadow-card",
    cardInteractive:
      "bg-surface-pure border border-surface-border hover:border-brand-200 rounded-2xl shadow-card hover:shadow-elevated transition-all duration-200",
    subtleBox: "bg-surface-subtle border border-surface-border rounded-xl",
  },
} as const;


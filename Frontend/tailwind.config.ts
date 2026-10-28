import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/theme/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          50: "#EFF6FF",
          100: "#DBEAFE",
          200: "#BFDBFE",
          500: "#3B82F6",
          600: "#2563EB", // Azul Primario de Marca y Títulos Grandes
          700: "#1D4ED8", // Azul Hover / Activo
          900: "#1E3A8A",
        },
        surface: {
          pure: "#FFFFFF",   // Blanco principal para pantallas
          subtle: "#F8FAFC", // Contraste suave para tarjetas y áreas secundarias
          muted: "#F1F5F9",
          border: "#E2E8F0",
        },
        ink: {
          primary: "#0F172A",   // Negro profundo para textos comunes
          secondary: "#334155", // Gris carbón para textos pequeños/descriptivos
          muted: "#64748B",
        },
      },
      boxShadow: {
        card: "0 1px 3px 0 rgba(15, 23, 42, 0.04), 0 1px 2px -1px rgba(15, 23, 42, 0.04)",
        elevated: "0 10px 30px -5px rgba(37, 99, 235, 0.08), 0 4px 12px -2px rgba(15, 23, 42, 0.04)",
        glow: "0 0 35px -5px rgba(37, 99, 235, 0.35)",
      },
    },
  },
  plugins: [],
};

export default config;


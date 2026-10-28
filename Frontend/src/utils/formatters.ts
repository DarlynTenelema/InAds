// =============================================================================
// InAds — Utilidades de Formato (Moneda, Fechas, Clases CSS)
// =============================================================================

import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * Combina clases de Tailwind CSS evitando conflictos de especificidad.
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Formatea montos en dólares estadounidenses (ej. "$100.00" o "$0.10").
 */
export function formatUSD(amount: number | undefined | null): string {
  const safeValue = typeof amount === "number" && !Number.isNaN(amount) ? amount : 0;
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(safeValue);
}

/**
 * Formatea números enteros con separador de miles (ej. "1,250").
 */
export function formatNumber(value: number | undefined | null): string {
  const safeValue = typeof value === "number" && !Number.isNaN(value) ? value : 0;
  return new Intl.NumberFormat("en-US").format(safeValue);
}

/**
 * Formatea fechas ISO en un formato legible en español (ej. "28 oct 2026, 14:30").
 */
export function formatDate(isoDate?: string | null): string {
  if (!isoDate) return "—";
  const date = new Date(isoDate);
  if (Number.isNaN(date.getTime())) return "—";

  return new Intl.DateTimeFormat("es-ES", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(date);
}


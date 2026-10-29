// =============================================================================
// InAds — Constantes de Negocio, Rutas y Diccionarios Reutilizables
// =============================================================================

import {
  AppStatus,
  PayoutMethodType,
  ReferralStatus,
  TransactionStatus,
} from "@/types";

export const BUSINESS_RULES = {
  COST_PER_VERIFIED_USER: 0.15,
  INFLUENCER_REWARD: 0.10,
  PLATFORM_FEE: 0.05,
  MIN_PAYOUT_USD: 100.0,
  MIN_DEPOSIT_USD: 15.0,
  DEFAULT_MIN_SESSIONS: 3,
  MIN_FOLLOWERS: 1000,
  MAX_FOLLOWERS: 10000,
  SUPPORT_EMAIL: process.env.NEXT_PUBLIC_SUPPORT_EMAIL || "0805409802d@gmail.com",
} as const;

export const APP_ROUTES = {
  AUTH: "/auth",
  PRIVACY: "/privacy",
  TERMS: "/terms",
  DASHBOARD: "/dashboard",
  APPS: "/apps",
  WALLET: "/wallet",
  SETTINGS: "/settings",
  ADMIN: "/admin",
} as const;

export const INADS_RECEIVING_ACCOUNTS = {
  paypal: {
    label: "PayPal Oficial InAds",
    destination:
      process.env.NEXT_PUBLIC_PAYPAL_ACCOUNT || "0805409802d@gmail.com",
    note: "Incluye el nombre de tu App en la nota del envío y guarda el ID de transacción.",
  },
  bank_transfer: {
    label: "Transferencia Bancaria (Coordinación Directa)",
    destination:
      process.env.NEXT_PUBLIC_BANK_ACCOUNT || "0805409802d@gmail.com",
    note: "Solicita los datos bancarios locales o envía tu comprobante con el número de referencia.",
  },
  usdt_crypto: {
    label: "USDT (Red TRC20 / Polygon)",
    destination:
      process.env.NEXT_PUBLIC_USDT_WALLET || "0805409802d@gmail.com",
    note: "Coordina la red de envío o pega el Hash de la transacción (TxID) una vez confirmada.",
  },
} as const;

export const PAYOUT_METHOD_LABELS: Record<PayoutMethodType, string> = {
  paypal: "PayPal",
  bank_transfer: "Transferencia Bancaria",
  usdt_crypto: "USDT (Cripto)",
};

export const STATUS_CONFIG: Record<
  AppStatus | ReferralStatus | TransactionStatus,
  { label: string; variant: "blue" | "green" | "amber" | "red" | "slate" }
> = {
  // Estados de App
  active: { label: "Activa", variant: "green" },
  paused: { label: "Pausada", variant: "amber" },
  out_of_funds: { label: "Sin Saldo", variant: "red" },
  archived: { label: "Archivada", variant: "slate" },

  // Estados de Referido y Transacción
  pending: { label: "Pendiente de Validación", variant: "amber" },
  processing: { label: "En Proceso", variant: "blue" },
  verified: { label: "Verificado ($0.10)", variant: "green" },
  completed: { label: "Completado / Pagado", variant: "green" },
  flagged_fraud: { label: "En Revisión Antifraude", variant: "red" },
  rejected: { label: "Rechazado", variant: "red" },
};


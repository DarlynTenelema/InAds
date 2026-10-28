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
    label: "PayPal Corporativo InAds",
    destination: "pagos@inads.io",
    note: "Incluye el nombre de tu App en la nota del envío y guarda el ID de transacción.",
  },
  bank_transfer: {
    label: "Transferencia Bancaria (USD / Local)",
    destination: "Banco InAds • Cuenta / CLABE: 0123 4567 8901 2345 67",
    note: "Envía el comprobante con el número de referencia bancaria.",
  },
  usdt_crypto: {
    label: "USDT (Red TRC20 / Polygon)",
    destination: "0x71C...9A23F84E (Polygon / ERC20)",
    note: "Pega el Hash de la transacción (TxID) una vez confirmada en la blockchain.",
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


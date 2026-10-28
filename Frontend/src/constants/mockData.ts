// =============================================================================
// InAds — Datos Mock Realistas para Visualización de UX (Influencer, Dev, Admin)
// =============================================================================

import {
  AppItem,
  FraudAlert,
  InfluencerCampaign,
  LedgerEntry,
  PayoutRequest,
  ReferralItem,
  WalletDeposit,
} from "@/types";

export type TimePeriodKey =
  | "dia"
  | "semana"
  | "quincena"
  | "mes"
  | "temporada"
  | "anio";

export interface PeriodMetrics {
  label: string;
  earned: number;
  verifiedUsers: number;
  pendingUsers: number;
  conversionRate: string;
  chartBars: { label: string; verified: number; pending: number; earned: number }[];
}

export const MOCK_INFLUENCER_PERIODS: Record<TimePeriodKey, PeriodMetrics> = {
  dia: {
    label: "Hoy",
    earned: 4.8,
    verifiedUsers: 48,
    pendingUsers: 19,
    conversionRate: "71.6%",
    chartBars: [
      { label: "08:00", verified: 5, pending: 2, earned: 0.5 },
      { label: "11:00", verified: 9, pending: 4, earned: 0.9 },
      { label: "14:00", verified: 12, pending: 5, earned: 1.2 },
      { label: "17:00", verified: 14, pending: 5, earned: 1.4 },
      { label: "20:00", verified: 8, pending: 3, earned: 0.8 },
    ],
  },
  semana: {
    label: "Esta Semana",
    earned: 24.6,
    verifiedUsers: 246,
    pendingUsers: 64,
    conversionRate: "79.3%",
    chartBars: [
      { label: "Lun", verified: 28, pending: 8, earned: 2.8 },
      { label: "Mar", verified: 35, pending: 10, earned: 3.5 },
      { label: "Mié", verified: 31, pending: 9, earned: 3.1 },
      { label: "Jue", verified: 42, pending: 11, earned: 4.2 },
      { label: "Vie", verified: 48, pending: 12, earned: 4.8 },
      { label: "Sáb", verified: 38, pending: 8, earned: 3.8 },
      { label: "Dom", verified: 24, pending: 6, earned: 2.4 },
    ],
  },
  quincena: {
    label: "Últimos 15 Días",
    earned: 46.2,
    verifiedUsers: 462,
    pendingUsers: 95,
    conversionRate: "82.9%",
    chartBars: [
      { label: "Días 1-3", verified: 78, pending: 18, earned: 7.8 },
      { label: "Días 4-6", verified: 94, pending: 21, earned: 9.4 },
      { label: "Días 7-9", verified: 88, pending: 16, earned: 8.8 },
      { label: "Días 10-12", verified: 104, pending: 22, earned: 10.4 },
      { label: "Días 13-15", verified: 98, pending: 18, earned: 9.8 },
    ],
  },
  mes: {
    label: "Este Mes",
    earned: 68.4,
    verifiedUsers: 684,
    pendingUsers: 142,
    conversionRate: "82.8%",
    chartBars: [
      { label: "Sem 1", verified: 145, pending: 32, earned: 14.5 },
      { label: "Sem 2", verified: 172, pending: 38, earned: 17.2 },
      { label: "Sem 3", verified: 190, pending: 41, earned: 19.0 },
      { label: "Sem 4", verified: 177, pending: 31, earned: 17.7 },
    ],
  },
  temporada: {
    label: "Temporada (Trimestre)",
    earned: 184.5,
    verifiedUsers: 1845,
    pendingUsers: 210,
    conversionRate: "89.7%",
    chartBars: [
      { label: "Mes 1", verified: 540, pending: 60, earned: 54.0 },
      { label: "Mes 2", verified: 621, pending: 72, earned: 62.1 },
      { label: "Mes 3", verified: 684, pending: 78, earned: 68.4 },
    ],
  },
  anio: {
    label: "Este Año",
    earned: 268.4,
    verifiedUsers: 2684,
    pendingUsers: 142,
    conversionRate: "94.9%",
    chartBars: [
      { label: "Q1", verified: 420, pending: 15, earned: 42.0 },
      { label: "Q2", verified: 610, pending: 22, earned: 61.0 },
      { label: "Q3", verified: 814, pending: 35, earned: 81.4 },
      { label: "Q4", verified: 840, pending: 70, earned: 84.0 },
    ],
  },
};

export const MOCK_APPS: AppItem[] = [
  {
    id: "app_neon_01",
    developer_id: "dev_demo_01",
    name: "Neon Drift: Cyber Racing",
    description:
      "Juego arcade de carreras synthwave con multijugador en tiempo real y personalización de naves.",
    category: "Juegos Indie",
    icon_url: null,
    store_url: "https://play.google.com/store/apps/details?id=com.pixelforge.neondrift",
    pitch_guidelines:
      "¡Muestra una carrera rápida de 15 segundos! Diles a tus seguidores: 'Descarguen Neon Drift gratis, entren a Ajustes > Código de Creador y peguen mi código CARLOS_NEON9A para desbloquear el auto Cyber-GT y jugar en mi clan'.",
    campaign_balance: 142.5,
    total_deposited: 300.0,
    cost_per_user: 0.15,
    influencer_reward: 0.1,
    api_key_prefix: "inads_live_9f82a1c4...",
    status: "active",
    min_sessions_required: 3,
    total_claims: 1240,
    total_verified: 1050,
    created_at: "2026-09-10T12:00:00Z",
  },
  {
    id: "app_pixel_02",
    developer_id: "dev_demo_01",
    name: "Pixel Kingdom: Idle RPG",
    description:
      "RPG táctico por turnos con estética retro 16-bits, jefes cooperativos y colección de héroes.",
    category: "RPG / Acción",
    icon_url: null,
    store_url: "https://store.steampowered.com/app/pixelkingdom",
    pitch_guidelines:
      "Recomienda el juego a fans de RPGs ligeros: 'Si buscan un RPG adictivo que no pida teléfono de gama alta, prueben Pixel Kingdom y usen mi código CARLOS_PIXE4B al crear su cuenta para recibir 500 gemas de bienvenida'.",
    campaign_balance: 85.2,
    total_deposited: 180.0,
    cost_per_user: 0.15,
    influencer_reward: 0.1,
    api_key_prefix: "inads_live_3b71e9d0...",
    status: "active",
    min_sessions_required: 3,
    total_claims: 790,
    total_verified: 632,
    created_at: "2026-09-22T15:30:00Z",
  },
  {
    id: "app_aether_03",
    developer_id: "dev_demo_02",
    name: "Aether Tactics Online",
    description:
      "Juego competitivo de cartas y estrategia rápida en partidas de 3 minutos para iOS y Android.",
    category: "Estrategia",
    icon_url: null,
    store_url: "https://apps.apple.com/app/aethertactics",
    pitch_guidelines:
      "Enfócate en el reto competitivo: '¿Quién me gana un 1v1 en Aether Tactics? Descárguenlo hoy, peguen mi código en su perfil y agréguenme para jugar en directo'.",
    campaign_balance: 210.0,
    total_deposited: 350.0,
    cost_per_user: 0.15,
    influencer_reward: 0.1,
    api_key_prefix: "inads_live_7c44f1a2...",
    status: "active",
    min_sessions_required: 3,
    total_claims: 1120,
    total_verified: 933,
    created_at: "2026-10-01T10:15:00Z",
  },
  {
    id: "app_focus_04",
    developer_id: "dev_demo_01",
    name: "Pomodoro Quest: Gamified Study",
    description:
      "App de productividad que convierte tus horas de estudio o programación en niveles de un personaje RPG.",
    category: "Apps Utilidad",
    icon_url: null,
    store_url: "https://pomodoroquest.app",
    pitch_guidelines:
      "Ideal para seguidores estudiantes o gamers: 'Suban de nivel en la vida real mientras estudian con Pomodoro Quest. Peguen mi código en la pestaña Comunidad para entrar al ranking'.",
    campaign_balance: 0.0,
    total_deposited: 45.0,
    cost_per_user: 0.15,
    influencer_reward: 0.1,
    api_key_prefix: "inads_live_5e19c8b3...",
    status: "out_of_funds",
    min_sessions_required: 3,
    total_claims: 340,
    total_verified: 300,
    created_at: "2026-08-18T09:00:00Z",
  },
];

export const MOCK_INFLUENCER_CAMPAIGNS: InfluencerCampaign[] = [
  {
    id: "camp_01",
    influencer_id: "inf_demo_01",
    app_id: "app_neon_01",
    referral_code: "CARLOS_NEON9A",
    pending_referrals_count: 84,
    verified_referrals_count: 412,
    total_earned: 41.2,
    is_active: true,
    apps: {
      name: "Neon Drift: Cyber Racing",
      store_url: "https://play.google.com/store/apps/details?id=com.pixelforge.neondrift",
      status: "active",
    },
  },
  {
    id: "camp_02",
    influencer_id: "inf_demo_01",
    app_id: "app_pixel_02",
    referral_code: "CARLOS_PIXE4B",
    pending_referrals_count: 58,
    verified_referrals_count: 272,
    total_earned: 27.2,
    is_active: true,
    apps: {
      name: "Pixel Kingdom: Idle RPG",
      store_url: "https://store.steampowered.com/app/pixelkingdom",
      status: "active",
    },
  },
];

export const MOCK_REFERRALS: ReferralItem[] = [
  {
    id: "ref_101",
    player_id: "plr_mateo_992",
    status: "verified",
    sessions_count: 4,
    reward_amount: 0.1,
    claimed_at: "2026-10-24T14:20:00Z",
    verified_at: "2026-10-28T09:15:00Z",
    apps: { name: "Neon Drift: Cyber Racing" },
  },
  {
    id: "ref_102",
    player_id: "plr_lucia_441",
    status: "verified",
    sessions_count: 3,
    reward_amount: 0.1,
    claimed_at: "2026-10-25T18:10:00Z",
    verified_at: "2026-10-28T10:02:00Z",
    apps: { name: "Pixel Kingdom: Idle RPG" },
  },
  {
    id: "ref_103",
    player_id: "plr_kevin_x81",
    status: "pending",
    sessions_count: 2,
    reward_amount: 0.1,
    claimed_at: "2026-10-27T21:40:00Z",
    verified_at: null,
    apps: { name: "Neon Drift: Cyber Racing" },
  },
  {
    id: "ref_104",
    player_id: "plr_santi_773",
    status: "pending",
    sessions_count: 1,
    reward_amount: 0.1,
    claimed_at: "2026-10-28T11:05:00Z",
    verified_at: null,
    apps: { name: "Neon Drift: Cyber Racing" },
  },
  {
    id: "ref_105",
    player_id: "plr_valen_209",
    status: "verified",
    sessions_count: 5,
    reward_amount: 0.1,
    claimed_at: "2026-10-20T16:00:00Z",
    verified_at: "2026-10-26T19:30:00Z",
    apps: { name: "Pixel Kingdom: Idle RPG" },
  },
];

export const MOCK_PAYOUT_REQUESTS: PayoutRequest[] = [
  {
    id: "pay_01",
    influencer_id: "inf_demo_01",
    amount: 100.0,
    payout_method: "paypal",
    payout_destination: { paypal_email: "carlos.pagos@gmail.com" },
    status: "completed",
    payment_reference: "PP-TX-994817263",
    processed_at: "2026-10-12T17:30:00Z",
    created_at: "2026-10-11T14:00:00Z",
    profiles: {
      email: "carlos.creator@gmail.com",
      full_name: "Carlos Mendoza",
      social_links: { tiktok: "@carlosgaming_yt" },
    },
  },
  {
    id: "pay_02",
    influencer_id: "inf_demo_01",
    amount: 100.0,
    payout_method: "paypal",
    payout_destination: { paypal_email: "carlos.pagos@gmail.com" },
    status: "completed",
    payment_reference: "PP-TX-773190442",
    processed_at: "2026-09-18T16:10:00Z",
    created_at: "2026-09-17T19:20:00Z",
    profiles: {
      email: "carlos.creator@gmail.com",
      full_name: "Carlos Mendoza",
      social_links: { tiktok: "@carlosgaming_yt" },
    },
  },
];

export const MOCK_ADMIN_PENDING_PAYOUTS: PayoutRequest[] = [
  {
    id: "pay_pending_01",
    influencer_id: "inf_sofia_02",
    amount: 112.4,
    payout_method: "paypal",
    payout_destination: { paypal_email: "sofia.stream@gmail.com" },
    status: "pending",
    created_at: "2026-10-28T09:30:00Z",
    profiles: {
      email: "sofia.stream@gmail.com",
      full_name: "Sofía Ramírez",
      social_links: { tiktok: "@sofia_clips (8.4k seg.)" },
    },
  },
  {
    id: "pay_pending_02",
    influencer_id: "inf_diego_03",
    amount: 100.0,
    payout_method: "usdt_crypto",
    payout_destination: {
      usdt_network: "Polygon (MATIC)",
      usdt_address: "0x892A4f19B2c38D0192837465aBcDeF1234567890",
    },
    status: "pending",
    created_at: "2026-10-27T20:15:00Z",
    profiles: {
      email: "diego.shorts@gmail.com",
      full_name: "Diego Torres",
      social_links: { tiktok: "@diego_shorts (5.2k seg.)" },
    },
  },
];

export const MOCK_WALLET_DEPOSITS: WalletDeposit[] = [
  {
    id: "dep_01",
    developer_id: "dev_demo_01",
    app_id: "app_neon_01",
    amount: 150.0,
    payment_method: "paypal",
    reference_code: "PAYPAL-INV-883920",
    status: "completed",
    created_at: "2026-10-15T11:00:00Z",
    apps: { name: "Neon Drift: Cyber Racing", campaign_balance: 142.5 },
    profiles: { email: "studio@pixelforge.dev", full_name: "PixelForge Indie Studio" },
  },
  {
    id: "dep_02",
    developer_id: "dev_demo_01",
    app_id: "app_focus_04",
    amount: 45.0,
    payment_method: "bank_transfer",
    reference_code: "SPEI-44918273",
    status: "pending",
    created_at: "2026-10-28T10:45:00Z",
    apps: { name: "Pomodoro Quest: Gamified Study", campaign_balance: 0.0 },
    profiles: { email: "studio@pixelforge.dev", full_name: "PixelForge Indie Studio" },
  },
];

export const MOCK_LEDGER_ENTRIES: LedgerEntry[] = [
  {
    id: "led_01",
    entry_type: "referral_credit_inf",
    amount: 0.1,
    balance_after: 68.4,
    description: "Ganancia por usuario verificado (plr_mateo_992 en Neon Drift)",
    created_at: "2026-10-28T09:15:00Z",
  },
  {
    id: "led_02",
    entry_type: "referral_credit_inf",
    amount: 0.1,
    balance_after: 68.3,
    description: "Ganancia por usuario verificado (plr_lucia_441 en Pixel Kingdom)",
    created_at: "2026-10-28T10:02:00Z",
  },
  {
    id: "led_03",
    entry_type: "payout_completed",
    amount: -100.0,
    balance_after: 22.2,
    description: "Retiro manual pagado vía PayPal (Ref: PP-TX-994817263)",
    created_at: "2026-10-12T17:30:00Z",
  },
];

export const MOCK_FRAUD_ALERTS: FraudAlert[] = [
  {
    id: "frd_01",
    campaign_id: "camp_99",
    influencer_id: "inf_bot_suspect",
    app_id: "app_neon_01",
    alert_type: "subnet_spike_50_hour",
    severity: "critical",
    details: {
      ip_subnet: "190.24.112.0/24",
      claims_in_last_hour: 58,
      referral_code: "DARK_NEON77",
    },
    is_resolved: false,
    created_at: "2026-10-28T11:10:00Z",
    profiles: {
      email: "suspect.account@mail.com",
      full_name: "Cuenta en Observación",
    },
    apps: { name: "Neon Drift: Cyber Racing" },
    influencer_campaigns: { referral_code: "DARK_NEON77" },
  },
];


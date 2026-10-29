// =============================================================================
// InAds — Agregador de Métricas Reales por Periodo (Sin Datos Mock)
// =============================================================================

import { BUSINESS_RULES } from "@/constants/config";
import { ReferralItem } from "@/types";

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

const PERIOD_META: Record<
  TimePeriodKey,
  { label: string; daysWindow: number; bucketLabels: string[] }
> = {
  dia: {
    label: "Hoy",
    daysWindow: 1,
    bucketLabels: ["00-06h", "06-11h", "11-15h", "15-19h", "19-24h"],
  },
  semana: {
    label: "Esta Semana",
    daysWindow: 7,
    bucketLabels: ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"],
  },
  quincena: {
    label: "Últimos 15 Días",
    daysWindow: 15,
    bucketLabels: ["Días 1-3", "Días 4-6", "Días 7-9", "Días 10-12", "Días 13-15"],
  },
  mes: {
    label: "Este Mes",
    daysWindow: 30,
    bucketLabels: ["Sem 1", "Sem 2", "Sem 3", "Sem 4"],
  },
  temporada: {
    label: "Temporada (Trimestre)",
    daysWindow: 90,
    bucketLabels: ["Mes 1", "Mes 2", "Mes 3"],
  },
  anio: {
    label: "Este Año",
    daysWindow: 365,
    bucketLabels: ["Q1", "Q2", "Q3", "Q4"],
  },
};

/**
 * Calcula las métricas y barras del gráfico en tiempo real a partir de los referidos reales del usuario.
 */
export function computePeriodMetrics(
  referrals: ReferralItem[],
  period: TimePeriodKey
): PeriodMetrics {
  const meta = PERIOD_META[period];
  const now = new Date();
  const cutoffMs = now.getTime() - meta.daysWindow * 24 * 60 * 60 * 1000;

  const filtered = referrals.filter((r) => {
    const t = new Date(r.claimed_at).getTime();
    return !Number.isNaN(t) && t >= cutoffMs;
  });

  const verifiedList = filtered.filter((r) => r.status === "verified");
  const pendingList = filtered.filter((r) => r.status === "pending");

  const verifiedUsers = verifiedList.length;
  const pendingUsers = pendingList.length;
  const earned = verifiedList.reduce(
    (sum, r) => sum + (Number(r.reward_amount) || BUSINESS_RULES.INFLUENCER_REWARD),
    0
  );

  const totalEligible = verifiedUsers + pendingUsers;
  const conversionRate =
    totalEligible > 0
      ? `${((verifiedUsers / totalEligible) * 100).toFixed(1)}%`
      : "0.0%";

  const numBuckets = meta.bucketLabels.length;
  const chartBars = meta.bucketLabels.map((label) => ({
    label,
    verified: 0,
    pending: 0,
    earned: 0,
  }));

  const windowSpanMs = Math.max(1, now.getTime() - cutoffMs);

  for (const ref of filtered) {
    if (ref.status !== "verified" && ref.status !== "pending") continue;
    const t = new Date(ref.claimed_at).getTime();
    let bucketIdx = Math.floor(((t - cutoffMs) / windowSpanMs) * numBuckets);
    if (bucketIdx < 0) bucketIdx = 0;
    if (bucketIdx >= numBuckets) bucketIdx = numBuckets - 1;

    if (ref.status === "verified") {
      chartBars[bucketIdx].verified += 1;
      chartBars[bucketIdx].earned = Number(
        (
          chartBars[bucketIdx].earned +
          (Number(ref.reward_amount) || BUSINESS_RULES.INFLUENCER_REWARD)
        ).toFixed(2)
      );
    } else {
      chartBars[bucketIdx].pending += 1;
    }
  }

  return {
    label: meta.label,
    earned: Number(earned.toFixed(2)),
    verifiedUsers,
    pendingUsers,
    conversionRate,
    chartBars,
  };
}

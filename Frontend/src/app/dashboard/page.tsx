"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowUpRight,
  Calendar,
  Check,
  CheckCircle2,
  Clock,
  Copy,
  DollarSign,
  Gamepad2,
  Loader2,
  Pause,
  Play,
  TrendingUp,
  Users,
  Wallet,
} from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { Badge, Button, Card, ProgressBar, StatCard } from "@/components/ui";
import { APP_ROUTES, BUSINESS_RULES } from "@/constants/config";
import { computePeriodMetrics, TimePeriodKey } from "@/constants/mockData";
import { useAuth } from "@/hooks/useAuth";
import { useCopyToClipboard } from "@/hooks/useCopyToClipboard";
import { inadsApi } from "@/services/api";
import { AppItem, InfluencerCampaign, ReferralItem } from "@/types";
import { cn, formatDate, formatNumber, formatUSD } from "@/utils/formatters";

const PERIOD_TABS: { key: TimePeriodKey; label: string }[] = [
  { key: "dia", label: "Día" },
  { key: "semana", label: "Semana" },
  { key: "quincena", label: "Quincena" },
  { key: "mes", label: "Mes" },
  { key: "temporada", label: "Temporada" },
  { key: "anio", label: "Año" },
];

export default function DashboardPage() {
  const { profile, refreshProfile } = useAuth();
  const { copyText, isCopied } = useCopyToClipboard();
  const [selectedPeriod, setSelectedPeriod] = useState<TimePeriodKey>("mes");

  const [devApps, setDevApps] = useState<AppItem[]>([]);
  const [campaigns, setCampaigns] = useState<InfluencerCampaign[]>([]);
  const [referrals, setReferrals] = useState<ReferralItem[]>([]);
  const [isLoadingData, setIsLoadingData] = useState<boolean>(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [togglingAppId, setTogglingAppId] = useState<string | null>(null);

  const loadDashboard = useCallback(async () => {
    setIsLoadingData(true);
    setErrorMessage(null);
    try {
      const res = await inadsApi.getDashboard();
      if (res.role === "developer") {
        setDevApps(res.apps || []);
        setReferrals(res.recent_referrals || []);
      } else {
        setCampaigns(res.campaigns || []);
        setReferrals(res.recent_referrals || []);
      }
      await refreshProfile();
    } catch (err: any) {
      setErrorMessage(err?.message || "No se pudieron cargar las métricas del dashboard.");
    } finally {
      setIsLoadingData(false);
    }
  }, [refreshProfile]);

  useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);

  const handleToggleDevAppStatus = async (app: AppItem) => {
    const nextStatus = app.status === "active" ? "paused" : "active";
    setTogglingAppId(app.id);
    setErrorMessage(null);
    try {
      const res = await inadsApi.toggleAppStatus(app.id, nextStatus);
      if (res.app) {
        setDevApps((prev) => prev.map((a) => (a.id === app.id ? res.app : a)));
      }
    } catch (err: any) {
      setErrorMessage(err?.message || "No se pudo cambiar el estado de la campaña.");
    } finally {
      setTogglingAppId(null);
    }
  };

  const role = profile?.role || "influencer";
  const periodData = useMemo(
    () => computePeriodMetrics(referrals, selectedPeriod),
    [referrals, selectedPeriod]
  );

  // Vista para Desarrolladores Indie
  if (role === "developer") {
    const totalBudget = devApps.reduce((acc, a) => acc + Number(a.campaign_balance || 0), 0);
    const totalVerified = devApps.reduce((acc, a) => acc + Number(a.total_verified || 0), 0);
    const totalClaims = devApps.reduce((acc, a) => acc + Number(a.total_claims || 0), 0);
    const retentionPct =
      totalClaims > 0 ? ((totalVerified / totalClaims) * 100).toFixed(1) + "%" : "0.0%";

    return (
      <AppShell
        title="Dashboard de Desarrollador"
        subtitle="Monitorea el rendimiento de tus campañas, usuarios retenidos y presupuesto disponible."
        headerAction={
          <div className="flex items-center gap-2.5">
            <Link href={APP_ROUTES.WALLET}>
              <Button variant="outline" size="sm" leftIcon={<Wallet className="w-4 h-4" />}>
                Recargar Saldo
              </Button>
            </Link>
            <Link href={APP_ROUTES.APPS}>
              <Button size="sm" leftIcon={<Gamepad2 className="w-4 h-4" />}>
                + Publicar App
              </Button>
            </Link>
          </div>
        }
      >
        <div className="space-y-6">
          {errorMessage && (
            <div className="p-4 rounded-2xl bg-red-50 border border-red-200 text-xs sm:text-sm font-bold text-red-700">
              {errorMessage}
            </div>
          )}

          {/* KPIs del Desarrollador */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard
              highlightBlue
              label="Presupuesto Activo"
              value={formatUSD(totalBudget)}
              helperText={`Alcanza para ~${formatNumber(
                Math.floor(totalBudget / BUSINESS_RULES.COST_PER_VERIFIED_USER)
              )} jugadores más`}
              icon={<Wallet className="w-5 h-5" />}
            />
            <StatCard
              label="Jugadores Verificados"
              value={formatNumber(totalVerified)}
              helperText="Cumplieron retención ($0.15 c/u)"
              icon={<CheckCircle2 className="w-5 h-5" />}
            />
            <StatCard
              label="Códigos Canjeados"
              value={formatNumber(totalClaims)}
              helperText="Instalaciones totales con código"
              icon={<Users className="w-5 h-5" />}
            />
            <StatCard
              label="Tasa de Retención"
              value={retentionPct}
              helperText="Jugadores que superan 3 sesiones"
              icon={<TrendingUp className="w-5 h-5" />}
            />
          </div>

          {/* Tabla de Estado de Apps del Desarrollador */}
          <Card
            title="Rendimiento por Juego / Aplicación"
            subtitle="Se descuentan $0.15 USD únicamente cuando el jugador valida su actividad."
            noPadding
          >
            {isLoadingData ? (
              <div className="p-10 flex items-center justify-center gap-2 text-xs font-bold text-ink-secondary">
                <Loader2 className="w-4 h-4 animate-spin text-brand-600" />
                <span>Cargando tus aplicaciones...</span>
              </div>
            ) : devApps.length === 0 ? (
              <div className="p-10 text-center space-y-3">
                <p className="text-sm font-bold text-ink-primary">
                  Aún no has publicado ningún juego o aplicación.
                </p>
                <p className="text-xs text-ink-secondary max-w-md mx-auto">
                  Publica tu primera app para obtener tu API Key y aparecer en el catálogo de micro-influencers.
                </p>
                <div className="pt-2">
                  <Link href={APP_ROUTES.APPS}>
                    <Button size="sm" leftIcon={<Gamepad2 className="w-4 h-4" />}>
                      + Publicar mi Primera App
                    </Button>
                  </Link>
                </div>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-surface-border bg-surface-subtle text-[11px] font-bold uppercase tracking-wider text-ink-secondary">
                      <th className="py-3.5 px-6">Aplicación</th>
                      <th className="py-3.5 px-4">Estado</th>
                      <th className="py-3.5 px-4">Saldo Campaña</th>
                      <th className="py-3.5 px-4">Canjes / Verificados</th>
                      <th className="py-3.5 px-6 text-right">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-surface-border text-sm">
                    {devApps.map((app) => (
                      <tr key={app.id} className="hover:bg-surface-subtle/60">
                        <td className="py-4 px-6">
                          <p className="font-bold text-ink-primary">{app.name}</p>
                          <p className="text-xs text-ink-secondary font-mono mt-0.5">
                            API Key: {app.api_key_prefix}
                          </p>
                        </td>
                        <td className="py-4 px-4">
                          <Badge status={app.status} />
                        </td>
                        <td className="py-4 px-4 font-extrabold text-brand-600">
                          {formatUSD(app.campaign_balance)}
                        </td>
                        <td className="py-4 px-4">
                          <span className="font-bold text-ink-primary">
                            {formatNumber(app.total_verified)}
                          </span>{" "}
                          <span className="text-xs text-ink-secondary">
                            de {formatNumber(app.total_claims)} registros
                          </span>
                        </td>
                        <td className="py-4 px-6 text-right">
                          <div className="inline-flex items-center justify-end gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              disabled={
                                togglingAppId === app.id ||
                                (app.status !== "active" &&
                                  app.campaign_balance < BUSINESS_RULES.COST_PER_VERIFIED_USER)
                              }
                              isLoading={togglingAppId === app.id}
                              onClick={() => handleToggleDevAppStatus(app)}
                              leftIcon={
                                app.status === "active" ? (
                                  <Pause className="w-3.5 h-3.5" />
                                ) : (
                                  <Play className="w-3.5 h-3.5" />
                                )
                              }
                            >
                              {app.status === "active" ? "Pausar" : "Activar"}
                            </Button>
                            <Link
                              href={APP_ROUTES.APPS}
                              className="text-xs font-bold text-brand-600 hover:text-brand-700 inline-flex items-center gap-1 px-2 py-1"
                            >
                              Gestionar <ArrowUpRight className="w-3.5 h-3.5" />
                            </Link>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        </div>
      </AppShell>
    );
  }

  // Vista Principal para Creadores / Micro-Influencers
  const availableBalance = Number(profile?.available_balance ?? 0);
  const pendingBalance = Number(profile?.pending_balance ?? 0);
  const maxBarValue = Math.max(
    ...periodData.chartBars.map((b) => b.verified + b.pending),
    1
  );

  return (
    <AppShell
      title="Dashboard de Creador"
      subtitle="Métricas transparentes de tus códigos promocionales y ganancias verificadas."
      headerAction={
        <div className="inline-flex flex-wrap items-center bg-surface-subtle border border-surface-border rounded-xl p-1 gap-1">
          {PERIOD_TABS.map((tab) => {
            const active = selectedPeriod === tab.key;
            return (
              <button
                key={tab.key}
                type="button"
                onClick={() => setSelectedPeriod(tab.key)}
                className={cn(
                  "px-3 py-1.5 rounded-lg text-xs font-bold transition-all",
                  active
                    ? "bg-brand-600 text-surface-pure shadow-2xs"
                    : "text-ink-secondary hover:text-ink-primary"
                )}
              >
                {tab.label}
              </button>
            );
          })}
        </div>
      }
    >
      <div className="space-y-6">
        {errorMessage && (
          <div className="p-4 rounded-2xl bg-red-50 border border-red-200 text-xs sm:text-sm font-bold text-red-700">
            {errorMessage}
          </div>
        )}

        {/* 1. Tarjetas de Métricas por Periodo */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            highlightBlue
            label={`Ganancia (${periodData.label})`}
            value={formatUSD(periodData.earned)}
            helperText={`${formatNumber(periodData.verifiedUsers)} usuarios × $0.10 USD`}
            icon={<DollarSign className="w-5 h-5" />}
          />
          <StatCard
            label="Disponible para Retiro"
            value={formatUSD(availableBalance)}
            helperText="Mínimo de retiro: $100.00 USD"
            icon={<Wallet className="w-5 h-5" />}
          />
          <StatCard
            label="En Validación (Actividad)"
            value={formatUSD(pendingBalance)}
            helperText={`${formatNumber(
              Math.round(pendingBalance / BUSINESS_RULES.INFLUENCER_REWARD)
            )} seguidores en periodo de prueba`}
            icon={<Clock className="w-5 h-5" />}
          />
          <StatCard
            label={`Verificados (${periodData.label})`}
            value={formatNumber(periodData.verifiedUsers)}
            helperText={`Conversión efectiva: ${periodData.conversionRate}`}
            icon={<Users className="w-5 h-5" />}
          />
        </div>

        {/* 2. Barra de Meta de Retiro ($100.00 USD) */}
        <Card className="bg-surface-pure">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex-1 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-bold text-ink-primary">
                  Progreso hacia tu próximo pago manual de $100.00 USD
                </span>
                <span className="text-sm font-black text-brand-600">
                  {formatUSD(availableBalance)} / $100.00 USD
                </span>
              </div>
              <ProgressBar
                current={availableBalance}
                target={BUSINESS_RULES.MIN_PAYOUT_USD}
              />
              <p className="text-xs text-ink-secondary">
                {availableBalance >= BUSINESS_RULES.MIN_PAYOUT_USD
                  ? "¡Ya alcanzaste el mínimo de $100.00 USD! Puedes solicitar tu transferencia ahora."
                  : `Te faltan ${formatUSD(
                      BUSINESS_RULES.MIN_PAYOUT_USD - availableBalance
                    )} (${Math.ceil(
                      (BUSINESS_RULES.MIN_PAYOUT_USD - availableBalance) / 0.1
                    )} seguidores verificados) para habilitar el retiro.`}
              </p>
            </div>
            <Link href={APP_ROUTES.WALLET} className="shrink-0">
              <Button variant="primary" size="md">
                Ir a Billetera
              </Button>
            </Link>
          </div>
        </Card>

        {/* 3. Gráfico de Conversiones del Periodo + Mis Códigos Activos */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Gráfico de Barras Sólido y Limpio */}
          <Card
            title={`Evolución de Conversiones — ${periodData.label}`}
            subtitle="Comparativa de seguidores verificados ($0.10 acreditados) vs pendientes de actividad."
            headerAction={
              <div className="flex items-center gap-3 text-xs font-semibold">
                <span className="inline-flex items-center gap-1.5 text-ink-primary">
                  <span className="w-2.5 h-2.5 rounded-xs bg-brand-600" />
                  Verificados
                </span>
                <span className="inline-flex items-center gap-1.5 text-ink-secondary">
                  <span className="w-2.5 h-2.5 rounded-xs bg-brand-200" />
                  Pendientes
                </span>
              </div>
            }
            className="lg:col-span-7"
          >
            <div className="pt-4">
              <div
                className="grid gap-3 items-end h-52 border-b border-surface-border pb-3"
                style={{
                  gridTemplateColumns: `repeat(${periodData.chartBars.length}, minmax(0, 1fr))`,
                }}
              >
                {periodData.chartBars.map((bar) => {
                  const totalCount = bar.verified + bar.pending;
                  const totalHeightPct =
                    totalCount > 0
                      ? Math.max(12, (totalCount / maxBarValue) * 100)
                      : 6;
                  const verifiedRatio =
                    totalCount > 0 ? (bar.verified / totalCount) * 100 : 0;

                  return (
                    <div
                      key={bar.label}
                      className="flex flex-col items-center justify-end h-full group"
                    >
                      <span className="text-[11px] font-extrabold text-brand-600 mb-1.5">
                        {formatUSD(bar.earned)}
                      </span>
                      <div
                        style={{ height: `${totalHeightPct}%` }}
                        className="w-full max-w-[42px] rounded-t-xl bg-brand-100 overflow-hidden flex flex-col justify-end border border-brand-200 transition-all"
                      >
                        <div
                          style={{ height: `${verifiedRatio}%` }}
                          className="w-full bg-brand-600 transition-all"
                        />
                      </div>
                    </div>
                  );
                })}
              </div>

              <div
                className="grid gap-3 pt-2.5 text-center"
                style={{
                  gridTemplateColumns: `repeat(${periodData.chartBars.length}, minmax(0, 1fr))`,
                }}
              >
                {periodData.chartBars.map((bar) => (
                  <div key={bar.label}>
                    <p className="text-xs font-bold text-ink-primary">{bar.label}</p>
                    <p className="text-[10px] text-ink-secondary">
                      {bar.verified} verif.
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </Card>

          {/* Mis Códigos Activos para Copiar en 1 Toque */}
          <Card
            title="Mis Códigos en Promoción"
            subtitle="Copia tu código y pégalo en la descripción o comentarios de tu video."
            headerAction={
              <Link
                href={APP_ROUTES.APPS}
                className="text-xs font-bold text-brand-600 hover:underline"
              >
                + Explorar apps
              </Link>
            }
            className="lg:col-span-5"
          >
            {isLoadingData ? (
              <div className="py-10 flex items-center justify-center gap-2 text-xs font-bold text-ink-secondary">
                <Loader2 className="w-4 h-4 animate-spin text-brand-600" />
                <span>Cargando tus códigos...</span>
              </div>
            ) : campaigns.length === 0 ? (
              <div className="p-6 rounded-2xl bg-surface-subtle border border-surface-border text-center space-y-3">
                <p className="text-xs font-bold text-ink-primary">
                  Aún no has generado ningún código promocional.
                </p>
                <p className="text-xs text-ink-secondary">
                  Explora el catálogo de juegos y apps activas para obtener tu código único en un clic.
                </p>
                <Link href={APP_ROUTES.APPS} className="inline-block pt-1">
                  <Button size="sm">Ir al Catálogo de Apps</Button>
                </Link>
              </div>
            ) : (
              <div className="space-y-3">
                {campaigns.map((camp) => {
                  const copied = isCopied(camp.id);
                  return (
                    <div
                      key={camp.id}
                      className="p-4 rounded-xl bg-surface-subtle border border-surface-border flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                    >
                      <div>
                        <p className="text-sm font-bold text-ink-primary">
                          {camp.apps?.name || "Aplicación"}
                        </p>
                        <div className="flex items-center gap-3 text-xs text-ink-secondary mt-1">
                          <span>
                            <strong className="text-ink-primary">
                              {camp.verified_referrals_count}
                            </strong>{" "}
                            verificados
                          </span>
                          <span>•</span>
                          <span className="font-bold text-brand-600">
                            Ganado: {formatUSD(camp.total_earned)}
                          </span>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => copyText(camp.referral_code, camp.id)}
                        className={cn(
                          "inline-flex items-center justify-center gap-2 px-3.5 py-2 rounded-xl text-xs font-extrabold border transition-all shrink-0",
                          copied
                            ? "bg-emerald-600 text-surface-pure border-emerald-600"
                            : "bg-surface-pure text-brand-600 border-brand-200 hover:border-brand-600"
                        )}
                      >
                        {copied ? (
                          <>
                            <Check className="w-3.5 h-3.5" />
                            ¡Copiado!
                          </>
                        ) : (
                          <>
                            <Copy className="w-3.5 h-3.5" />
                            {camp.referral_code}
                          </>
                        )}
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </Card>
        </div>

        {/* 4. Tabla de Últimos Usuarios Registrados con tu Código */}
        <Card
          title="Últimos Usuarios Registrados con tu Código"
          subtitle="Cada seguidor que cumple la actividad mínima en el juego suma automáticamente $0.10 USD a tu saldo disponible."
          noPadding
        >
          {isLoadingData ? (
            <div className="p-10 flex items-center justify-center gap-2 text-xs font-bold text-ink-secondary">
              <Loader2 className="w-4 h-4 animate-spin text-brand-600" />
              <span>Consultando actividad reciente...</span>
            </div>
          ) : referrals.length === 0 ? (
            <div className="p-10 text-center space-y-2">
              <p className="text-sm font-bold text-ink-primary">
                Sin conversiones registradas todavía
              </p>
              <p className="text-xs text-ink-secondary max-w-md mx-auto">
                Cuando tus seguidores ingresen tu código dentro de los juegos o aplicaciones, aparecerán aquí en tiempo real.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-surface-border bg-surface-subtle text-[11px] font-bold uppercase tracking-wider text-ink-secondary">
                    <th className="py-3.5 px-6">Jugador (ID en Juego)</th>
                    <th className="py-3.5 px-4">Juego / App</th>
                    <th className="py-3.5 px-4">Actividad</th>
                    <th className="py-3.5 px-4">Estado</th>
                    <th className="py-3.5 px-4">Fecha Registro</th>
                    <th className="py-3.5 px-6 text-right">Comisión</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-surface-border text-sm">
                  {referrals.map((ref) => (
                    <tr key={ref.id} className="hover:bg-surface-subtle/60">
                      <td className="py-3.5 px-6 font-mono text-xs font-bold text-ink-primary">
                        {ref.player_id}
                      </td>
                      <td className="py-3.5 px-4 font-semibold text-ink-primary">
                        {ref.apps?.name}
                      </td>
                      <td className="py-3.5 px-4 text-xs text-ink-secondary">
                        {ref.sessions_count} / 3 sesiones
                      </td>
                      <td className="py-3.5 px-4">
                        <Badge status={ref.status} />
                      </td>
                      <td className="py-3.5 px-4 text-xs text-ink-secondary">
                        <span className="inline-flex items-center gap-1">
                          <Calendar className="w-3.5 h-3.5" />
                          {formatDate(ref.claimed_at)}
                        </span>
                      </td>
                      <td className="py-3.5 px-6 text-right font-extrabold text-brand-600">
                        +{formatUSD(ref.reward_amount || 0.1)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      </div>
    </AppShell>
  );
}

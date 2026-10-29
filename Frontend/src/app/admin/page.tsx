"use client";

import React, { useCallback, useEffect, useState } from "react";
import {
  AlertTriangle,
  Ban,
  Check,
  CheckCircle2,
  DollarSign,
  ExternalLink,
  Loader2,
  RefreshCw,
  ShieldAlert,
  Wallet,
  XCircle,
} from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { Badge, Button, Card, Input, StatCard } from "@/components/ui";
import { PAYOUT_METHOD_LABELS } from "@/constants/config";
import { inadsApi } from "@/services/api";
import { FraudAlert, PayoutRequest, WalletDeposit } from "@/types";
import { formatDate, formatUSD } from "@/utils/formatters";

export default function AdminManualOperationsPage() {
  const [deposits, setDeposits] = useState<WalletDeposit[]>([]);
  const [payouts, setPayouts] = useState<PayoutRequest[]>([]);
  const [alerts, setAlerts] = useState<FraudAlert[]>([]);
  const [transferRefs, setTransferRefs] = useState<Record<string, string>>({});
  const [isLoadingAdmin, setIsLoadingAdmin] = useState<boolean>(true);
  const [adminError, setAdminError] = useState<string | null>(null);
  const [processingId, setProcessingId] = useState<string | null>(null);

  const loadAdminOverview = useCallback(async () => {
    setIsLoadingAdmin(true);
    setAdminError(null);
    try {
      const res = await inadsApi.getAdminOverview();
      setDeposits(res.pending_deposits || []);
      setPayouts(res.pending_payouts || []);
      setAlerts(res.fraud_alerts || []);
    } catch (err: any) {
      setAdminError(
        err?.message || "No se pudo cargar el resumen de administración."
      );
    } finally {
      setIsLoadingAdmin(false);
    }
  }, []);

  useEffect(() => {
    loadAdminOverview();
  }, [loadAdminOverview]);

  // Aprobar recarga manual de Desarrollador en 1 clic
  const handleApproveDeposit = async (depositId: string) => {
    setProcessingId(depositId);
    setAdminError(null);
    try {
      await inadsApi.adminApproveDeposit(depositId);
      setDeposits((prev) =>
        prev.map((d) => (d.id === depositId ? { ...d, status: "completed" } : d))
      );
    } catch (err: any) {
      setAdminError(err?.message || "Error al aprobar la recarga.");
    } finally {
      setProcessingId(null);
    }
  };

  const handleRejectDeposit = async (depositId: string) => {
    setProcessingId(depositId);
    setAdminError(null);
    try {
      await inadsApi.adminRejectDeposit(depositId);
      setDeposits((prev) =>
        prev.map((d) => (d.id === depositId ? { ...d, status: "rejected" } : d))
      );
    } catch (err: any) {
      setAdminError(err?.message || "Error al rechazar la recarga.");
    } finally {
      setProcessingId(null);
    }
  };

  // Marcar retiro de $100+ USD de Influencer como Pagado manualmente
  const handleCompletePayout = async (payoutId: string) => {
    const ref = transferRefs[payoutId]?.trim();
    if (!ref) {
      setAdminError(
        "Por favor ingresa el número de referencia o ID de la transferencia realizada antes de marcar como pagado."
      );
      return;
    }

    setProcessingId(payoutId);
    setAdminError(null);
    try {
      await inadsApi.adminCompletePayout(payoutId, ref);
      setPayouts((prev) =>
        prev.map((p) =>
          p.id === payoutId
            ? {
                ...p,
                status: "completed",
                payment_reference: ref,
                processed_at: new Date().toISOString(),
              }
            : p
        )
      );
    } catch (err: any) {
      setAdminError(err?.message || "Error al marcar el retiro como pagado.");
    } finally {
      setProcessingId(null);
    }
  };

  // Rechazar retiro y reembolsar saldo al Influencer
  const handleRejectPayout = async (payoutId: string) => {
    setProcessingId(payoutId);
    setAdminError(null);
    try {
      await inadsApi.adminRejectPayout(
        payoutId,
        "Datos de cobro inválidos o revisión administrativa"
      );
      setPayouts((prev) =>
        prev.map((p) => (p.id === payoutId ? { ...p, status: "rejected" } : p))
      );
    } catch (err: any) {
      setAdminError(err?.message || "No se pudo rechazar el retiro.");
    } finally {
      setProcessingId(null);
    }
  };

  const handleResolveAlert = async (
    alert: FraudAlert,
    suspendInfluencer: boolean
  ) => {
    setProcessingId(alert.id);
    setAdminError(null);
    try {
      await inadsApi.adminResolveFraudAlert(alert.id, {
        suspend_influencer: suspendInfluencer,
        influencer_id: alert.influencer_id,
        reason: suspendInfluencer
          ? "Suspendido por alerta antifraude de subred IP (>50 registros/hora)"
          : undefined,
      });
      setAlerts((prev) =>
        prev.map((a) => (a.id === alert.id ? { ...a, is_resolved: true } : a))
      );
    } catch (err: any) {
      setAdminError(err?.message || "Error al resolver la alerta antifraude.");
    } finally {
      setProcessingId(null);
    }
  };

  const pendingDepositsCount = deposits.filter(
    (d) => d.status === "pending"
  ).length;
  const pendingPayoutsCount = payouts.filter(
    (p) => p.status === "pending" || p.status === "processing"
  ).length;
  const unresolvedAlertsCount = alerts.filter((a) => !a.is_resolved).length;

  return (
    <AppShell
      title="Panel Interno de Administración (/admin)"
      subtitle="Aprueba comprobantes de recarga de desarrolladores, registra transferencias de $100+ USD y supervisa el sistema antifraude."
      headerAction={
        <Button
          variant="outline"
          size="sm"
          onClick={loadAdminOverview}
          isLoading={isLoadingAdmin}
          leftIcon={<RefreshCw className="w-4 h-4" />}
        >
          Actualizar Panel
        </Button>
      }
    >
      <div className="space-y-6">
        {adminError && (
          <div className="p-4 rounded-2xl bg-red-50 border border-red-200 text-xs sm:text-sm font-bold text-red-700">
            {adminError}
          </div>
        )}

        {/* Resumen Operativo */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <StatCard
            highlightBlue
            label="Retiros por Pagar ($100+)"
            value={String(pendingPayoutsCount)}
            helperText="Solicitudes manuales de influencers"
            icon={<DollarSign className="w-5 h-5" />}
          />
          <StatCard
            label="Recargas por Aprobar"
            value={String(pendingDepositsCount)}
            helperText="Comprobantes enviados por Indie Devs"
            icon={<Wallet className="w-5 h-5" />}
          />
          <StatCard
            label="Alertas Antifraude"
            value={String(unresolvedAlertsCount)}
            helperText="Picos de subred (>50 registros/hora)"
            icon={<ShieldAlert className="w-5 h-5" />}
          />
        </div>

        {/* 1. Gestión de Retiros de Influencers ($100.00 USD Mínimo) */}
        <Card
          title="1. Solicitudes de Retiro Manual de Influencers ($100+ USD)"
          subtitle="Realiza la transferencia a los datos indicados por el creador y pega el número de referencia para marcarlo como pagado."
        >
          {isLoadingAdmin ? (
            <div className="py-10 flex items-center justify-center gap-2 text-xs font-bold text-ink-secondary">
              <Loader2 className="w-4 h-4 animate-spin text-brand-600" />
              <span>Consultando solicitudes de retiro...</span>
            </div>
          ) : payouts.length === 0 ? (
            <div className="p-8 rounded-2xl bg-surface-subtle border border-surface-border text-center">
              <p className="text-sm font-bold text-ink-primary">
                No hay solicitudes de retiro pendientes
              </p>
              <p className="text-xs text-ink-secondary mt-1">
                Cuando un influencer alcance los $100.00 USD y solicite un retiro, aparecerá aquí para pago manual.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {payouts.map((p) => {
                const dest =
                  p.payout_destination?.paypal_email ||
                  p.payout_destination?.bank_clabe_or_iban ||
                  p.payout_destination?.usdt_address ||
                  "—";

                return (
                  <div
                    key={p.id}
                    className="p-4 rounded-2xl bg-surface-subtle border border-surface-border flex flex-col lg:flex-row lg:items-center justify-between gap-4"
                  >
                    <div className="space-y-1">
                      <div className="flex flex-wrap items-center gap-2.5">
                        <span className="text-base font-extrabold text-ink-primary">
                          {p.profiles?.full_name || p.profiles?.email}
                        </span>
                        <Badge status={p.status} />
                        {p.profiles?.social_links?.tiktok && (
                          <span className="text-xs text-ink-secondary">
                            TikTok: {p.profiles.social_links.tiktok}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-ink-secondary">
                        Método:{" "}
                        <strong className="text-ink-primary">
                          {PAYOUT_METHOD_LABELS[p.payout_method] || p.payout_method}
                        </strong>{" "}
                        • Destino:{" "}
                        <code className="font-mono font-bold text-brand-600 bg-surface-pure px-2 py-0.5 rounded-md border border-surface-border">
                          {dest}
                        </code>
                      </p>
                      <p className="text-[11px] text-ink-secondary">
                        Solicitado el {formatDate(p.created_at)}
                      </p>
                    </div>

                    <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                      <div className="text-left sm:text-right mr-2">
                        <span className="text-[10px] font-bold uppercase text-ink-secondary block">
                          Monto a Enviar
                        </span>
                        <span className="text-xl font-black text-brand-600">
                          {formatUSD(p.amount)}
                        </span>
                      </div>

                      {p.status === "pending" || p.status === "processing" ? (
                        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                          <Input
                            placeholder="Ref. / ID de transferencia"
                            value={transferRefs[p.id] || ""}
                            onChange={(e) =>
                              setTransferRefs((prev) => ({
                                ...prev,
                                [p.id]: e.target.value,
                              }))
                            }
                            className="w-full sm:w-52"
                          />
                          <Button
                            size="sm"
                            isLoading={processingId === p.id}
                            leftIcon={<Check className="w-4 h-4" />}
                            onClick={() => handleCompletePayout(p.id)}
                          >
                            Marcar Pagado
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            disabled={processingId === p.id}
                            onClick={() => handleRejectPayout(p.id)}
                            title="Rechazar y reintegrar saldo"
                          >
                            <XCircle className="w-4 h-4 text-red-600" />
                          </Button>
                        </div>
                      ) : (
                        <span className="text-xs font-mono font-bold text-emerald-700 bg-emerald-50 px-3 py-1.5 rounded-xl border border-emerald-200">
                          {p.status === "completed"
                            ? `Pagado • Ref: ${p.payment_reference}`
                            : "Rechazado (Saldo Reintegrado)"}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </Card>

        {/* 2. Aprobación de Recargas de Desarrolladores */}
        <Card
          title="2. Aprobación de Recargas de Presupuesto (Developers)"
          subtitle="Verifica que el pago ingresó a tu cuenta y aprueba con 1 clic para acreditar el saldo y activar la App."
          noPadding
        >
          {isLoadingAdmin ? (
            <div className="p-10 flex items-center justify-center gap-2 text-xs font-bold text-ink-secondary">
              <Loader2 className="w-4 h-4 animate-spin text-brand-600" />
              <span>Consultando recargas de desarrolladores...</span>
            </div>
          ) : deposits.length === 0 ? (
            <div className="p-10 text-center">
              <p className="text-sm font-bold text-ink-primary">
                No hay recargas pendientes por validar
              </p>
              <p className="text-xs text-ink-secondary mt-1">
                Los comprobantes enviados por desarrolladores aparecerán aquí para aprobación en 1 clic.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-surface-border bg-surface-subtle text-[11px] font-bold uppercase tracking-wider text-ink-secondary">
                    <th className="py-3.5 px-6">Desarrollador / App</th>
                    <th className="py-3.5 px-4">Método y Referencia</th>
                    <th className="py-3.5 px-4">Monto</th>
                    <th className="py-3.5 px-4">Estado</th>
                    <th className="py-3.5 px-6 text-right">Acción Manual</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-surface-border text-sm">
                  {deposits.map((dep) => (
                    <tr key={dep.id} className="hover:bg-surface-subtle/60">
                      <td className="py-4 px-6">
                        <p className="font-bold text-ink-primary">
                          {dep.apps?.name || "Aplicación"}
                        </p>
                        <p className="text-xs text-ink-secondary">
                          {dep.profiles?.full_name} ({dep.profiles?.email})
                        </p>
                      </td>
                      <td className="py-4 px-4">
                        <span className="text-xs font-semibold text-ink-primary block">
                          {PAYOUT_METHOD_LABELS[dep.payment_method] || dep.payment_method}
                        </span>
                        <span className="font-mono text-xs text-brand-600 block">
                          {dep.reference_code}
                        </span>
                        {dep.receipt_url && (
                          <a
                            href={dep.receipt_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-[11px] font-bold text-brand-600 hover:underline mt-0.5"
                          >
                            <ExternalLink className="w-3 h-3" />
                            Ver comprobante adjunto
                          </a>
                        )}
                      </td>
                      <td className="py-4 px-4 font-black text-brand-600">
                        {formatUSD(dep.amount)}
                      </td>
                      <td className="py-4 px-4">
                        <Badge status={dep.status} />
                      </td>
                      <td className="py-4 px-6 text-right">
                        {dep.status === "pending" ? (
                          <div className="inline-flex items-center gap-2">
                            <Button
                              size="sm"
                              variant="primary"
                              isLoading={processingId === dep.id}
                              leftIcon={<CheckCircle2 className="w-3.5 h-3.5" />}
                              onClick={() => handleApproveDeposit(dep.id)}
                            >
                              Aprobar y Acreditar
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              disabled={processingId === dep.id}
                              onClick={() => handleRejectDeposit(dep.id)}
                              title="Rechazar comprobante"
                            >
                              <XCircle className="w-4 h-4 text-red-600" />
                            </Button>
                          </div>
                        ) : (
                          <span className="text-xs font-semibold text-ink-secondary">
                            Procesado
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>

        {/* 3. Control Antifraude Rápido */}
        <Card
          title="3. Monitor Antifraude Automático"
          subtitle="El sistema congela automáticamente cualquier código que reciba más de 50 registros desde la misma subred IP en 1 hora."
        >
          {isLoadingAdmin ? (
            <div className="py-10 flex items-center justify-center gap-2 text-xs font-bold text-ink-secondary">
              <Loader2 className="w-4 h-4 animate-spin text-brand-600" />
              <span>Verificando alertas antifraude...</span>
            </div>
          ) : alerts.length === 0 ? (
            <div className="p-8 rounded-2xl bg-surface-subtle border border-surface-border text-center">
              <p className="text-sm font-bold text-emerald-700">
                Sin anomalías ni alertas antifraude activas
              </p>
              <p className="text-xs text-ink-secondary mt-1">
                Todos los códigos y registros de dispositivos operan dentro de los parámetros normales.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {alerts.map((alert) => (
                <div
                  key={alert.id}
                  className="p-4 rounded-2xl bg-red-50/60 border border-red-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                >
                  <div className="flex items-start gap-3">
                    <AlertTriangle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-sm font-extrabold text-ink-primary">
                          Código:{" "}
                          {alert.influencer_campaigns?.referral_code || "SOSPECHOSO"}
                        </span>
                        <Badge
                          label={
                            alert.is_resolved ? "Resuelta" : "Alerta Crítica Activa"
                          }
                          variant={alert.is_resolved ? "green" : "red"}
                        />
                      </div>
                      <p className="text-xs text-ink-secondary mt-1">
                        App: <strong>{alert.apps?.name}</strong> • Subred detectada:{" "}
                        <code className="font-mono font-bold">
                          {String(alert.details?.ip_subnet || "N/A")}
                        </code>{" "}
                        ({String(alert.details?.claims_in_last_hour || 0)} registros en 1 hora)
                      </p>
                    </div>
                  </div>

                  {!alert.is_resolved && (
                    <div className="flex flex-wrap items-center gap-2 shrink-0">
                      <Button
                        size="sm"
                        variant="outline"
                        isLoading={processingId === alert.id}
                        onClick={() => handleResolveAlert(alert, false)}
                      >
                        Descartar Alerta
                      </Button>
                      <Button
                        size="sm"
                        variant="danger"
                        isLoading={processingId === alert.id}
                        leftIcon={<Ban className="w-3.5 h-3.5" />}
                        onClick={() => handleResolveAlert(alert, true)}
                      >
                        Suspender Creador
                      </Button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </AppShell>
  );
}

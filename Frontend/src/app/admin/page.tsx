"use client";

import React, { useEffect, useState } from "react";
import {
  AlertTriangle,
  Check,
  CheckCircle2,
  DollarSign,
  ShieldAlert,
  Wallet,
  XCircle,
} from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { Badge, Button, Card, Input, StatCard } from "@/components/ui";
import { PAYOUT_METHOD_LABELS } from "@/constants/config";
import {
  MOCK_ADMIN_PENDING_PAYOUTS,
  MOCK_FRAUD_ALERTS,
  MOCK_WALLET_DEPOSITS,
} from "@/constants/mockData";
import { useAuth } from "@/hooks/useAuth";
import { inadsApi } from "@/services/api";
import { FraudAlert, PayoutRequest, WalletDeposit } from "@/types";
import { formatDate, formatUSD } from "@/utils/formatters";

export default function AdminManualOperationsPage() {
  const { isDemoMode } = useAuth();
  const [deposits, setDeposits] = useState<WalletDeposit[]>(MOCK_WALLET_DEPOSITS);
  const [payouts, setPayouts] = useState<PayoutRequest[]>(
    MOCK_ADMIN_PENDING_PAYOUTS
  );
  const [alerts, setAlerts] = useState<FraudAlert[]>(MOCK_FRAUD_ALERTS);
  const [transferRefs, setTransferRefs] = useState<Record<string, string>>({});

  useEffect(() => {
    if (isDemoMode) return;

    inadsApi
      .getAdminOverview()
      .then((res) => {
        if (res.pending_deposits) setDeposits(res.pending_deposits);
        if (res.pending_payouts) setPayouts(res.pending_payouts);
        if (res.fraud_alerts) setAlerts(res.fraud_alerts);
      })
      .catch(() => {});
  }, [isDemoMode]);

  // Aprobar recarga manual de Desarrollador en 1 clic
  const handleApproveDeposit = async (depositId: string) => {
    if (!isDemoMode) {
      await inadsApi.adminApproveDeposit(depositId);
    }
    setDeposits((prev) =>
      prev.map((d) => (d.id === depositId ? { ...d, status: "completed" } : d))
    );
  };

  const handleRejectDeposit = async (depositId: string) => {
    if (!isDemoMode) {
      await inadsApi.adminRejectDeposit(depositId);
    }
    setDeposits((prev) =>
      prev.map((d) => (d.id === depositId ? { ...d, status: "rejected" } : d))
    );
  };

  // Marcar retiro de $100+ USD de Influencer como Pagado manualmente
  const handleCompletePayout = async (payoutId: string) => {
    const ref =
      transferRefs[payoutId]?.trim() ||
      `MANUAL-TX-${Date.now().toString().slice(-6)}`;
    if (!isDemoMode) {
      await inadsApi.adminCompletePayout(payoutId, ref);
    }
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
  };

  const handleResolveAlert = async (alertId: string) => {
    if (!isDemoMode) {
      await inadsApi.adminResolveFraudAlert(alertId, {});
    }
    setAlerts((prev) =>
      prev.map((a) => (a.id === alertId ? { ...a, is_resolved: true } : a))
    );
  };

  const pendingDepositsCount = deposits.filter(
    (d) => d.status === "pending"
  ).length;
  const pendingPayoutsCount = payouts.filter(
    (p) => p.status === "pending"
  ).length;
  const unresolvedAlertsCount = alerts.filter((a) => !a.is_resolved).length;

  return (
    <AppShell
      title="Panel Interno de Administración (/admin)"
      subtitle="Aprueba comprobantes de recarga de desarrolladores, registra transferencias de $100+ USD y supervisa el sistema antifraude."
    >
      <div className="space-y-6">
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
          <div className="space-y-4">
            {payouts.map((p) => {
              const dest =
                p.payout_destination.paypal_email ||
                p.payout_destination.bank_clabe_or_iban ||
                p.payout_destination.usdt_address ||
                "—";

              return (
                <div
                  key={p.id}
                  className="p-4 rounded-2xl bg-surface-subtle border border-surface-border flex flex-col lg:flex-row lg:items-center justify-between gap-4"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2.5">
                      <span className="text-base font-extrabold text-ink-primary">
                        {p.profiles?.full_name}
                      </span>
                      <Badge status={p.status} />
                      <span className="text-xs text-ink-secondary">
                        {p.profiles?.social_links?.tiktok}
                      </span>
                    </div>
                    <p className="text-xs text-ink-secondary">
                      Método:{" "}
                      <strong className="text-ink-primary">
                        {PAYOUT_METHOD_LABELS[p.payout_method]}
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

                    {p.status === "pending" ? (
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
                          leftIcon={<Check className="w-4 h-4" />}
                          onClick={() => handleCompletePayout(p.id)}
                        >
                          Marcar como Pagado
                        </Button>
                      </div>
                    ) : (
                      <span className="text-xs font-mono font-bold text-emerald-700 bg-emerald-50 px-3 py-1.5 rounded-xl border border-emerald-200">
                        Pagado • Ref: {p.payment_reference}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </Card>

        {/* 2. Aprobación de Recargas de Desarrolladores */}
        <Card
          title="2. Aprobación de Recargas de Presupuesto (Developers)"
          subtitle="Verifica que el pago ingresó a tu cuenta y aprueba con 1 clic para acreditar el saldo y activar la App."
          noPadding
        >
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
                        {dep.apps?.name}
                      </p>
                      <p className="text-xs text-ink-secondary">
                        {dep.profiles?.full_name} ({dep.profiles?.email})
                      </p>
                    </td>
                    <td className="py-4 px-4">
                      <span className="text-xs font-semibold text-ink-primary block">
                        {PAYOUT_METHOD_LABELS[dep.payment_method]}
                      </span>
                      <span className="font-mono text-xs text-brand-600">
                        {dep.reference_code}
                      </span>
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
                            leftIcon={<CheckCircle2 className="w-3.5 h-3.5" />}
                            onClick={() => handleApproveDeposit(dep.id)}
                          >
                            Aprobar y Acreditar
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleRejectDeposit(dep.id)}
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
        </Card>

        {/* 3. Control Antifraude Rápido */}
        <Card
          title="3. Monitor Antifraude Automático"
          subtitle="El sistema congela automáticamente cualquier código que reciba más de 50 registros desde la misma subred IP en 1 hora."
        >
          <div className="space-y-3">
            {alerts.map((alert) => (
              <div
                key={alert.id}
                className="p-4 rounded-2xl bg-red-50/60 border border-red-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
              >
                <div className="flex items-start gap-3">
                  <AlertTriangle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
                  <div>
                    <div className="flex items-center gap-2">
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
                        {String(alert.details.ip_subnet)}
                      </code>{" "}
                      ({String(alert.details.claims_in_last_hour)} registros en 1 hora)
                    </p>
                  </div>
                </div>

                {!alert.is_resolved && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleResolveAlert(alert.id)}
                  >
                    Marcar como Revisada
                  </Button>
                )}
              </div>
            ))}
          </div>
        </Card>
      </div>
    </AppShell>
  );
}

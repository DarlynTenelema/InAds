"use client";

import React, { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  ArrowDownLeft,
  ArrowUpRight,
  Check,
  CheckCircle2,
  Clock,
  Copy,
  DollarSign,
  ExternalLink,
  Gamepad2,
  Loader2,
  Mail,
  Send,
  Wallet,
} from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import {
  Badge,
  Button,
  Card,
  Input,
  Modal,
  ProgressBar,
  Select,
  StatCard,
} from "@/components/ui";
import {
  APP_ROUTES,
  BUSINESS_RULES,
  INADS_RECEIVING_ACCOUNTS,
  PAYOUT_METHOD_LABELS,
} from "@/constants/config";
import { useAuth } from "@/hooks/useAuth";
import { useCopyToClipboard } from "@/hooks/useCopyToClipboard";
import { inadsApi } from "@/services/api";
import {
  AppItem,
  LedgerEntry,
  PayoutMethodType,
  PayoutRequest,
  WalletDeposit,
} from "@/types";
import { formatDate, formatUSD } from "@/utils/formatters";

export default function WalletPage() {
  const { profile, refreshProfile } = useAuth();
  const { copyText, isCopied } = useCopyToClipboard();

  const [payouts, setPayouts] = useState<PayoutRequest[]>([]);
  const [deposits, setDeposits] = useState<WalletDeposit[]>([]);
  const [ledger, setLedger] = useState<LedgerEntry[]>([]);
  const [devApps, setDevApps] = useState<AppItem[]>([]);
  const [isLoadingWallet, setIsLoadingWallet] = useState<boolean>(true);
  const [walletError, setWalletError] = useState<string | null>(null);
  const [walletSuccess, setWalletSuccess] = useState<string | null>(null);

  const [isWithdrawModalOpen, setIsWithdrawModalOpen] = useState(false);
  const [isDepositModalOpen, setIsDepositModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Formulario de solicitud de retiro ($100+ USD)
  const [withdrawMethod, setWithdrawMethod] = useState<PayoutMethodType>("paypal");
  const [withdrawDestination, setWithdrawDestination] = useState("");

  // Formulario de reporte de recarga manual (Developer)
  const [depositAppId, setDepositAppId] = useState("");
  const [depositAmount, setDepositAmount] = useState("30");
  const [depositMethod, setDepositMethod] = useState<PayoutMethodType>("paypal");
  const [depositReference, setDepositReference] = useState("");
  const [depositReceiptUrl, setDepositReceiptUrl] = useState("");

  // Sincronizar método y destino predeterminado del perfil del usuario
  useEffect(() => {
    if (!profile) return;
    const method = profile.payout_method || "paypal";
    setWithdrawMethod(method);
    const details = profile.payout_details || {};
    if (method === "paypal") {
      setWithdrawDestination(details.paypal_email || "");
    } else if (method === "bank_transfer") {
      setWithdrawDestination(details.bank_clabe_or_iban || "");
    } else {
      setWithdrawDestination(details.usdt_address || "");
    }
  }, [profile]);

  const loadWallet = useCallback(async () => {
    setIsLoadingWallet(true);
    setWalletError(null);
    try {
      const res = await inadsApi.getWallet();
      setPayouts(res.payouts || []);
      setDeposits(res.deposits || []);
      setLedger(res.ledger || []);
      if (res.apps) {
        setDevApps(res.apps);
        if (res.apps.length > 0) {
          setDepositAppId((prev) => prev || res.apps[0].id);
        }
      }
    } catch (err: any) {
      setWalletError(err?.message || "No se pudo cargar la información de tu billetera.");
    } finally {
      setIsLoadingWallet(false);
    }
  }, []);

  useEffect(() => {
    loadWallet();
  }, [loadWallet, profile?.role]);

  const role = profile?.role || "influencer";
  const availableBalance = Number(profile?.available_balance ?? 0);
  const pendingBalance = Number(profile?.pending_balance ?? 0);
  const totalEarned = Number(profile?.total_earned ?? 0);
  const canWithdraw = availableBalance >= BUSINESS_RULES.MIN_PAYOUT_USD;

  // Enviar solicitud de retiro manual (Influencer)
  const handleRequestPayout = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canWithdraw || !withdrawDestination.trim()) return;

    setIsSubmitting(true);
    setWalletError(null);
    setWalletSuccess(null);
    try {
      const payoutDetails =
        withdrawMethod === "paypal"
          ? { paypal_email: withdrawDestination.trim() }
          : withdrawMethod === "bank_transfer"
          ? { bank_clabe_or_iban: withdrawDestination.trim() }
          : { usdt_address: withdrawDestination.trim() };

      await inadsApi.updateSettings({
        payout_method: withdrawMethod,
        payout_details: payoutDetails,
      });
      await inadsApi.requestPayout(availableBalance);
      await loadWallet();
      await refreshProfile();
      setIsWithdrawModalOpen(false);
      setWalletSuccess(
        "Solicitud de retiro registrada exitosamente. El administrador procesará tu transferencia."
      );
    } catch (err: any) {
      setWalletError(err?.message || "Error al solicitar el retiro.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Reportar recarga manual de campaña (Developer)
  const handleReportDeposit = async (e: React.FormEvent) => {
    e.preventDefault();
    const numericAmount = parseFloat(depositAmount);
    if (
      !depositAppId ||
      Number.isNaN(numericAmount) ||
      numericAmount < BUSINESS_RULES.MIN_DEPOSIT_USD ||
      !depositReference.trim()
    ) {
      return;
    }

    setIsSubmitting(true);
    setWalletError(null);
    setWalletSuccess(null);
    try {
      const res = await inadsApi.reportDeposit({
        app_id: depositAppId,
        amount: numericAmount,
        payment_method: depositMethod,
        reference_code: depositReference.trim(),
        receipt_url: depositReceiptUrl.trim() || undefined,
      });
      if (res.deposit) {
        await loadWallet();
      }
      setDepositReference("");
      setDepositReceiptUrl("");
      setIsDepositModalOpen(false);
      setWalletSuccess(
        "Comprobante de recarga enviado. El administrador validará la referencia y acreditará el saldo en tu campaña."
      );
    } catch (err: any) {
      setWalletError(err?.message || "No se pudo registrar el comprobante de recarga.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // =========================================================================
  // VISTA DESARROLLADOR: Presupuesto Prepagado y Reporte Manual de Recarga
  // =========================================================================
  if (role === "developer") {
    return (
      <AppShell
        title="Presupuesto & Recargas de Campaña"
        subtitle="Transfiere el presupuesto de tu campaña y reporta el comprobante para acreditación inmediata."
        headerAction={
          <Button
            variant="primary"
            leftIcon={<Send className="w-4 h-4" />}
            disabled={devApps.length === 0}
            onClick={() => setIsDepositModalOpen(true)}
          >
            Reportar Recarga Manual
          </Button>
        }
      >
        <div className="space-y-6">
          {walletError && (
            <div className="p-4 rounded-2xl bg-red-50 border border-red-200 text-xs sm:text-sm font-bold text-red-700">
              {walletError}
            </div>
          )}
          {walletSuccess && (
            <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-center gap-2 text-xs sm:text-sm font-bold text-emerald-900">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
              <span>{walletSuccess}</span>
            </div>
          )}

          {devApps.length === 0 && !isLoadingWallet && (
            <div className="p-5 rounded-2xl bg-brand-50 border border-brand-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <p className="text-sm font-extrabold text-brand-700">
                  Primero publica tu Juego o Aplicación
                </p>
                <p className="text-xs text-ink-secondary mt-0.5">
                  Para reportar una recarga de presupuesto, registra primero la aplicación a la que se asignarán los fondos.
                </p>
              </div>
              <Link href={APP_ROUTES.APPS} className="shrink-0">
                <Button size="sm" leftIcon={<Gamepad2 className="w-4 h-4" />}>
                  + Publicar App
                </Button>
              </Link>
            </div>
          )}

          {/* Cuentas Oficiales de InAds para Transferir */}
          <Card
            title="1. Cuentas Oficiales de InAds para Fondear tu Campaña"
            subtitle="Realiza tu transferencia por el monto deseado (mínimo $15.00 USD) y luego presiona 'Reportar Recarga Manual'."
          >
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {(
                Object.entries(INADS_RECEIVING_ACCOUNTS) as [
                  PayoutMethodType,
                  typeof INADS_RECEIVING_ACCOUNTS.paypal
                ][]
              ).map(([key, info]) => (
                <div
                  key={key}
                  className="p-4 rounded-2xl bg-surface-subtle border border-surface-border flex flex-col justify-between gap-3"
                >
                  <div>
                    <span className="text-xs font-extrabold uppercase tracking-wider text-brand-600 block">
                      {info.label}
                    </span>
                    <p className="text-sm font-mono font-bold text-ink-primary mt-1.5 break-all">
                      {info.destination}
                    </p>
                    <p className="text-xs text-ink-secondary mt-2 leading-relaxed">
                      {info.note}
                    </p>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => copyText(info.destination, key)}
                    leftIcon={
                      isCopied(key) ? (
                        <Check className="w-3.5 h-3.5" />
                      ) : (
                        <Copy className="w-3.5 h-3.5" />
                      )
                    }
                  >
                    {isCopied(key) ? "¡Copiado!" : "Copiar Destino"}
                  </Button>
                </div>
              ))}
            </div>
          </Card>

          {/* Historial de Recargas Reportadas */}
          <Card
            title="2. Historial de Recargas Reportadas"
            subtitle="El administrador verifica la referencia de pago y acredita el saldo en tu aplicación."
            noPadding
          >
            {isLoadingWallet ? (
              <div className="p-10 flex items-center justify-center gap-2 text-xs font-bold text-ink-secondary">
                <Loader2 className="w-4 h-4 animate-spin text-brand-600" />
                <span>Consultando historial de recargas...</span>
              </div>
            ) : deposits.length === 0 ? (
              <div className="p-10 text-center space-y-2">
                <p className="text-sm font-bold text-ink-primary">
                  Aún no has reportado recargas de saldo
                </p>
                <p className="text-xs text-ink-secondary max-w-md mx-auto">
                  Cuando realices una transferencia y reportes el comprobante aquí, verás el estado de validación de tus fondos.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-surface-border bg-surface-subtle text-[11px] font-bold uppercase tracking-wider text-ink-secondary">
                      <th className="py-3.5 px-6">Aplicación Destino</th>
                      <th className="py-3.5 px-4">Método</th>
                      <th className="py-3.5 px-4">Referencia / Comprobante</th>
                      <th className="py-3.5 px-4">Estado</th>
                      <th className="py-3.5 px-4">Fecha</th>
                      <th className="py-3.5 px-6 text-right">Monto</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-surface-border text-sm">
                    {deposits.map((dep) => (
                      <tr key={dep.id} className="hover:bg-surface-subtle/60">
                        <td className="py-4 px-6 font-bold text-ink-primary">
                          {dep.apps?.name || "Aplicación"}
                        </td>
                        <td className="py-4 px-4 text-xs font-semibold text-ink-secondary">
                          {PAYOUT_METHOD_LABELS[dep.payment_method] || dep.payment_method}
                        </td>
                        <td className="py-4 px-4 font-mono text-xs text-ink-primary">
                          <div>{dep.reference_code}</div>
                          {dep.receipt_url && (
                            <a
                              href={dep.receipt_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 text-[11px] font-sans font-bold text-brand-600 hover:underline mt-0.5"
                            >
                              <ExternalLink className="w-3 h-3" />
                              Ver comprobante
                            </a>
                          )}
                        </td>
                        <td className="py-4 px-4">
                          <Badge status={dep.status} />
                        </td>
                        <td className="py-4 px-4 text-xs text-ink-secondary">
                          {formatDate(dep.created_at)}
                        </td>
                        <td className="py-4 px-6 text-right font-extrabold text-brand-600">
                          +{formatUSD(dep.amount)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        </div>

        {/* Modal Reportar Recarga */}
        <Modal
          isOpen={isDepositModalOpen}
          onClose={() => setIsDepositModalOpen(false)}
          title="Reportar Recarga Manual de Presupuesto"
          subtitle="Ingresa los datos de tu transferencia para acreditar el saldo a tu campaña."
        >
          <form onSubmit={handleReportDeposit} className="space-y-4">
            <Select
              label="Aplicación a Recargar"
              value={depositAppId}
              onChange={(e) => setDepositAppId(e.target.value)}
              options={devApps.map((a) => ({
                value: a.id,
                label: `${a.name} (Saldo actual: ${formatUSD(a.campaign_balance)})`,
              }))}
            />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                label="Monto Transferido (USD)"
                type="number"
                min="15"
                step="0.01"
                required
                value={depositAmount}
                onChange={(e) => setDepositAmount(e.target.value)}
                helperText="Mínimo $15.00 USD (100 jugadores)"
              />
              <Select
                label="Método Utilizado"
                value={depositMethod}
                onChange={(e) =>
                  setDepositMethod(e.target.value as PayoutMethodType)
                }
                options={[
                  { value: "paypal", label: "PayPal" },
                  { value: "bank_transfer", label: "Transferencia Bancaria" },
                  { value: "usdt_crypto", label: "USDT (Cripto)" },
                ]}
              />
            </div>
            <Input
              label="Código de Referencia / ID de Transacción"
              placeholder="Ej: PAYPAL-TX-994812 o Clave de Rastreo"
              required
              value={depositReference}
              onChange={(e) => setDepositReference(e.target.value)}
            />
            <Input
              label="Enlace al Comprobante / Captura de Pago (Opcional)"
              type="url"
              placeholder="https://drive.google.com/... o enlace a tu captura"
              value={depositReceiptUrl}
              onChange={(e) => setDepositReceiptUrl(e.target.value)}
              helperText="Puedes pegar un enlace al comprobante o enviarlo a 0805409802d@gmail.com"
            />
            <div className="flex justify-end gap-2 pt-3 border-t border-surface-border">
              <Button
                type="button"
                variant="ghost"
                onClick={() => setIsDepositModalOpen(false)}
              >
                Cancelar
              </Button>
              <Button type="submit" isLoading={isSubmitting}>
                Enviar Comprobante
              </Button>
            </div>
          </form>
        </Modal>
      </AppShell>
    );
  }

  // =========================================================================
  // VISTA INFLUENCER: Retiros Manuales a partir de $100.00 USD
  // =========================================================================
  return (
    <AppShell
      title="Billetera & Retiros ($100 USD)"
      subtitle="Tus ganancias verificadas y solicitudes de transferencia manual."
    >
      <div className="space-y-6">
        {walletError && (
          <div className="p-4 rounded-2xl bg-red-50 border border-red-200 text-xs sm:text-sm font-bold text-red-700">
            {walletError}
          </div>
        )}
        {walletSuccess && (
          <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-center gap-2 text-xs sm:text-sm font-bold text-emerald-900">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
            <span>{walletSuccess}</span>
          </div>
        )}

        {/* 1. Tarjetas de Saldo */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <StatCard
            highlightBlue
            label="Saldo Disponible"
            value={formatUSD(availableBalance)}
            helperText="Usuarios verificados listos para cobro"
            icon={<Wallet className="w-5 h-5" />}
          />
          <StatCard
            label="Saldo en Validación"
            value={formatUSD(pendingBalance)}
            helperText="Se libera al cumplir la actividad en el juego"
            icon={<Clock className="w-5 h-5" />}
          />
          <StatCard
            label="Total Ganado Histórico"
            value={formatUSD(totalEarned)}
            helperText="Pagos acumulados en tu cuenta"
            icon={<DollarSign className="w-5 h-5" />}
          />
        </div>

        {/* 2. Panel de Solicitud de Retiro ($100.00 USD Mínimo) */}
        <Card
          title="Estado de Habilitación de Retiro"
          subtitle="Para proteger tus ganancias de comisiones bancarias, los pagos se procesan a partir de $100.00 USD."
        >
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
            <div className="flex-1 space-y-2.5">
              <ProgressBar
                current={availableBalance}
                target={BUSINESS_RULES.MIN_PAYOUT_USD}
                labelLeft={`Acumulado: ${formatUSD(availableBalance)}`}
                labelRight="Meta mínima: $100.00 USD"
              />
              <p className="text-xs text-ink-secondary">
                {canWithdraw
                  ? "¡Excelente! Has superado el umbral de $100.00 USD. Solicita tu retiro y te transferiremos directamente."
                  : `Necesitas ${formatUSD(
                      BUSINESS_RULES.MIN_PAYOUT_USD - availableBalance
                    )} adicionales para desbloquear el botón de retiro.`}
              </p>
              <p className="text-xs text-ink-secondary flex items-center gap-1.5 pt-1">
                <Mail className="w-3.5 h-3.5 text-brand-600 shrink-0" />
                <span>
                  ¿Dudas con tu pago o método de cobro? Comunícate directamente con administración en{" "}
                  <a
                    href={`mailto:${BUSINESS_RULES.SUPPORT_EMAIL}`}
                    className="font-bold text-brand-600 hover:underline"
                  >
                    {BUSINESS_RULES.SUPPORT_EMAIL}
                  </a>
                </span>
              </p>
            </div>

            <div className="shrink-0">
              <Button
                variant="primary"
                size="lg"
                disabled={!canWithdraw}
                leftIcon={<ArrowUpRight className="w-5 h-5" />}
                onClick={() => setIsWithdrawModalOpen(true)}
              >
                {canWithdraw
                  ? `Solicitar Retiro de ${formatUSD(availableBalance)}`
                  : "Retiro Bloqueado (< $100 USD)"}
              </Button>
            </div>
          </div>
        </Card>

        {/* 3. Historial de Retiros y Movimientos */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <Card
            title="Solicitudes de Retiro"
            subtitle="Estado de tus pagos e identificador de transferencia."
            noPadding
            className="lg:col-span-7"
          >
            {isLoadingWallet ? (
              <div className="p-10 flex items-center justify-center gap-2 text-xs font-bold text-ink-secondary">
                <Loader2 className="w-4 h-4 animate-spin text-brand-600" />
                <span>Consultando retiros...</span>
              </div>
            ) : payouts.length === 0 ? (
              <div className="p-10 text-center space-y-2">
                <p className="text-sm font-bold text-ink-primary">
                  Aún no tienes solicitudes de retiro
                </p>
                <p className="text-xs text-ink-secondary max-w-md mx-auto">
                  Cuando acumules $100.00 USD en saldo disponible, podrás solicitar tu transferencia y seguir su estado aquí.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-surface-border bg-surface-subtle text-[11px] font-bold uppercase tracking-wider text-ink-secondary">
                      <th className="py-3.5 px-6">Fecha</th>
                      <th className="py-3.5 px-4">Método</th>
                      <th className="py-3.5 px-4">Estado</th>
                      <th className="py-3.5 px-4">Ref. Transferencia</th>
                      <th className="py-3.5 px-6 text-right">Monto</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-surface-border text-sm">
                    {payouts.map((p) => (
                      <tr key={p.id} className="hover:bg-surface-subtle/60">
                        <td className="py-3.5 px-6 text-xs text-ink-secondary">
                          {formatDate(p.created_at)}
                        </td>
                        <td className="py-3.5 px-4 font-semibold text-ink-primary text-xs">
                          {PAYOUT_METHOD_LABELS[p.payout_method] || p.payout_method}
                        </td>
                        <td className="py-3.5 px-4">
                          <Badge status={p.status} />
                        </td>
                        <td className="py-3.5 px-4 font-mono text-xs text-ink-secondary">
                          {p.payment_reference || "En revisión por Admin"}
                        </td>
                        <td className="py-3.5 px-6 text-right font-extrabold text-brand-600">
                          {formatUSD(p.amount)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>

          <Card
            title="Libro Contable Reciente"
            subtitle="Últimas acreditaciones verificadas en tu cuenta."
            className="lg:col-span-5"
          >
            {isLoadingWallet ? (
              <div className="py-10 flex items-center justify-center gap-2 text-xs font-bold text-ink-secondary">
                <Loader2 className="w-4 h-4 animate-spin text-brand-600" />
                <span>Cargando movimientos...</span>
              </div>
            ) : ledger.length === 0 ? (
              <div className="p-6 rounded-2xl bg-surface-subtle border border-surface-border text-center">
                <p className="text-xs font-bold text-ink-primary">
                  Sin movimientos contables registrados
                </p>
                <p className="text-xs text-ink-secondary mt-1">
                  Cada conversión verificada ($0.10 USD) quedará registrada de forma inmutable en tu libro contable.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {ledger.map((entry) => {
                  const isPositive = entry.amount >= 0;
                  return (
                    <div
                      key={entry.id}
                      className="p-3.5 rounded-xl bg-surface-subtle border border-surface-border flex items-start justify-between gap-3"
                    >
                      <div className="flex items-start gap-2.5">
                        <div className="p-2 rounded-lg bg-surface-pure border border-surface-border text-brand-600 shrink-0 mt-0.5">
                          {isPositive ? (
                            <ArrowDownLeft className="w-4 h-4" />
                          ) : (
                            <ArrowUpRight className="w-4 h-4" />
                          )}
                        </div>
                        <div>
                          <p className="text-xs font-bold text-ink-primary leading-snug">
                            {entry.description}
                          </p>
                          <p className="text-[11px] text-ink-secondary mt-1">
                            {formatDate(entry.created_at)}
                          </p>
                        </div>
                      </div>
                      <span
                        className={
                          isPositive
                            ? "text-xs font-black text-brand-600 shrink-0"
                            : "text-xs font-black text-ink-primary shrink-0"
                        }
                      >
                        {isPositive
                          ? `+${formatUSD(entry.amount)}`
                          : formatUSD(entry.amount)}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </Card>
        </div>
      </div>

      {/* Modal Solicitar Retiro Manual ($100+ USD) */}
      <Modal
        isOpen={isWithdrawModalOpen}
        onClose={() => setIsWithdrawModalOpen(false)}
        title="Solicitar Retiro Manual"
        subtitle="Confirma tus datos de cobro para que enviemos tu pago."
      >
        <form onSubmit={handleRequestPayout} className="space-y-4">
          <div className="p-4 rounded-xl bg-brand-50 border border-brand-200 flex items-center justify-between">
            <span className="text-xs font-bold text-brand-700">
              Monto total a transferir:
            </span>
            <span className="text-xl font-black text-brand-600">
              {formatUSD(availableBalance)}
            </span>
          </div>

          <Select
            label="Método de Recepción"
            value={withdrawMethod}
            onChange={(e) => {
              const nextMethod = e.target.value as PayoutMethodType;
              setWithdrawMethod(nextMethod);
              const details = profile?.payout_details || {};
              if (nextMethod === "paypal") {
                setWithdrawDestination(details.paypal_email || "");
              } else if (nextMethod === "bank_transfer") {
                setWithdrawDestination(details.bank_clabe_or_iban || "");
              } else {
                setWithdrawDestination(details.usdt_address || "");
              }
            }}
            options={[
              { value: "paypal", label: "PayPal" },
              {
                value: "bank_transfer",
                label: "Transferencia Bancaria (CLABE / CBU / IBAN)",
              },
              { value: "usdt_crypto", label: "USDT (Polygon / TRC20)" },
            ]}
          />

          <Input
            label={
              withdrawMethod === "paypal"
                ? "Correo Electrónico de PayPal"
                : withdrawMethod === "bank_transfer"
                ? "CLABE / CBU / Cuenta Bancaria y Banco"
                : "Dirección de Billetera USDT"
            }
            required
            value={withdrawDestination}
            onChange={(e) => setWithdrawDestination(e.target.value)}
            placeholder={
              withdrawMethod === "paypal"
                ? "tu-correo@paypal.com"
                : "Ingresa tus datos de cuenta"
            }
          />

          <div className="flex justify-end gap-2 pt-3 border-t border-surface-border">
            <Button
              type="button"
              variant="ghost"
              onClick={() => setIsWithdrawModalOpen(false)}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              isLoading={isSubmitting}
              leftIcon={<CheckCircle2 className="w-4 h-4" />}
            >
              Confirmar Retiro de {formatUSD(availableBalance)}
            </Button>
          </div>
        </form>
      </Modal>
    </AppShell>
  );
}

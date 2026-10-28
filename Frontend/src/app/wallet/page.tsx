"use client";

import React, { useEffect, useState } from "react";
import {
  ArrowDownLeft,
  ArrowUpRight,
  Check,
  CheckCircle2,
  Clock,
  Copy,
  DollarSign,
  Send,
  Sparkles,
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
  BUSINESS_RULES,
  INADS_RECEIVING_ACCOUNTS,
  PAYOUT_METHOD_LABELS,
} from "@/constants/config";
import {
  MOCK_APPS,
  MOCK_LEDGER_ENTRIES,
  MOCK_PAYOUT_REQUESTS,
  MOCK_WALLET_DEPOSITS,
} from "@/constants/mockData";
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
  const { profile, isDemoMode, updateProfileState, refreshProfile } = useAuth();
  const { copyText, isCopied } = useCopyToClipboard();

  const [payouts, setPayouts] = useState<PayoutRequest[]>(MOCK_PAYOUT_REQUESTS);
  const [deposits, setDeposits] = useState<WalletDeposit[]>(MOCK_WALLET_DEPOSITS);
  const [ledger, setLedger] = useState<LedgerEntry[]>(MOCK_LEDGER_ENTRIES);
  const [devApps, setDevApps] = useState<AppItem[]>(
    MOCK_APPS.filter((a) => a.developer_id === "dev_demo_01")
  );
  const [isWithdrawModalOpen, setIsWithdrawModalOpen] = useState(false);
  const [isDepositModalOpen, setIsDepositModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Formulario de solicitud de retiro ($100+ USD)
  const [withdrawMethod, setWithdrawMethod] = useState<PayoutMethodType>(
    profile?.payout_method || "paypal"
  );
  const [withdrawDestination, setWithdrawDestination] = useState(
    profile?.payout_details?.paypal_email || "carlos.pagos@gmail.com"
  );

  // Formulario de reporte de recarga manual (Developer)
  const [depositAppId, setDepositAppId] = useState("app_neon_01");
  const [depositAmount, setDepositAmount] = useState("45");
  const [depositMethod, setDepositMethod] = useState<PayoutMethodType>("paypal");
  const [depositReference, setDepositReference] = useState("");

  useEffect(() => {
    if (isDemoMode) return;

    inadsApi
      .getWallet()
      .then((res) => {
        if (res.payouts) setPayouts(res.payouts);
        if (res.deposits) setDeposits(res.deposits);
        if (res.ledger) setLedger(res.ledger);
        if (res.apps && res.apps.length > 0) {
          setDevApps(res.apps);
          setDepositAppId(res.apps[0].id);
        }
      })
      .catch(() => {});
  }, [isDemoMode]);

  const role = profile?.role || "influencer";
  const availableBalance = profile?.available_balance ?? 68.4;
  const pendingBalance = profile?.pending_balance ?? 14.2;
  const totalEarned = profile?.total_earned ?? 268.4;
  const canWithdraw = availableBalance >= BUSINESS_RULES.MIN_PAYOUT_USD;

  // Enviar solicitud de retiro manual (Influencer)
  const handleRequestPayout = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canWithdraw || !withdrawDestination.trim()) return;

    setIsSubmitting(true);
    try {
      const payoutDetails =
        withdrawMethod === "paypal"
          ? { paypal_email: withdrawDestination.trim() }
          : withdrawMethod === "bank_transfer"
          ? { bank_clabe_or_iban: withdrawDestination.trim() }
          : { usdt_address: withdrawDestination.trim() };

      if (!isDemoMode) {
        await inadsApi.updateSettings({
          payout_method: withdrawMethod,
          payout_details: payoutDetails,
        });
        await inadsApi.requestPayout(availableBalance);
        const walletRes = await inadsApi.getWallet();
        if (walletRes.payouts) setPayouts(walletRes.payouts);
        if (walletRes.ledger) setLedger(walletRes.ledger);
        await refreshProfile();
      } else {
        const newPayout: PayoutRequest = {
          id: `pay_${Date.now()}`,
          influencer_id: profile?.id || "inf_demo_01",
          amount: availableBalance,
          payout_method: withdrawMethod,
          payout_destination: payoutDetails,
          status: "pending",
          created_at: new Date().toISOString(),
        };
        setPayouts((prev) => [newPayout, ...prev]);
        updateProfileState({ available_balance: 0 });
      }
      setIsWithdrawModalOpen(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Reportar recarga manual de campaña (Developer)
  const handleReportDeposit = async (e: React.FormEvent) => {
    e.preventDefault();
    const numericAmount = parseFloat(depositAmount);
    if (Number.isNaN(numericAmount) || numericAmount < 15 || !depositReference.trim()) {
      return;
    }

    setIsSubmitting(true);
    try {
      if (!isDemoMode) {
        const res = await inadsApi.reportDeposit({
          app_id: depositAppId,
          amount: numericAmount,
          payment_method: depositMethod,
          reference_code: depositReference.trim(),
        });
        if (res.deposit) {
          setDeposits((prev) => [res.deposit, ...prev]);
        }
      } else {
        const targetApp = devApps.find((a) => a.id === depositAppId);
        const createdDeposit: WalletDeposit = {
          id: `dep_${Date.now()}`,
          developer_id: profile?.id || "dev_demo_01",
          app_id: depositAppId,
          amount: numericAmount,
          payment_method: depositMethod,
          reference_code: depositReference.trim(),
          status: "pending",
          created_at: new Date().toISOString(),
          apps: { name: targetApp?.name || "App Seleccionada" },
        };
        setDeposits((prev) => [createdDeposit, ...prev]);
      }
      setDepositReference("");
      setIsDepositModalOpen(false);
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
            onClick={() => setIsDepositModalOpen(true)}
          >
            Reportar Recarga Manual
          </Button>
        }
      >
        <div className="space-y-6">
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
                        {dep.apps?.name}
                      </td>
                      <td className="py-4 px-4 text-xs font-semibold text-ink-secondary">
                        {PAYOUT_METHOD_LABELS[dep.payment_method]}
                      </td>
                      <td className="py-4 px-4 font-mono text-xs text-ink-primary">
                        {dep.reference_code}
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
      headerAction={
        isDemoMode ? (
          <Button
            variant="secondary"
            size="sm"
            leftIcon={<Sparkles className="w-4 h-4" />}
            onClick={() =>
              updateProfileState({
                available_balance: availableBalance >= 100 ? 68.4 : 114.5,
              })
            }
          >
            {availableBalance >= 100
              ? "Volver saldo a $68.40 (Demo)"
              : "Simular Saldo en $114.50 (Probar Retiro)"}
          </Button>
        ) : undefined
      }
    >
      <div className="space-y-6">
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
                        {PAYOUT_METHOD_LABELS[p.payout_method]}
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
          </Card>

          <Card
            title="Libro Contable Reciente"
            subtitle="Últimas acreditaciones verificadas en tu cuenta."
            className="lg:col-span-5"
          >
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
                      {isPositive ? `+${formatUSD(entry.amount)}` : formatUSD(entry.amount)}
                    </span>
                  </div>
                );
              })}
            </div>
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
            onChange={(e) =>
              setWithdrawMethod(e.target.value as PayoutMethodType)
            }
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

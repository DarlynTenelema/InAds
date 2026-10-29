"use client";

import React, { useEffect, useState } from "react";
import {
  Bell,
  CheckCircle2,
  CreditCard,
  Globe,
  Mail,
  Save,
  Shield,
  User,
} from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { Button, Card, Input, Select } from "@/components/ui";
import { BUSINESS_RULES } from "@/constants/config";
import { useAuth } from "@/hooks/useAuth";
import { inadsApi } from "@/services/api";
import { PayoutMethodType } from "@/types";

export default function SettingsPage() {
  const { profile, updateProfileState } = useAuth();

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [tiktok, setTiktok] = useState("");
  const [youtube, setYoutube] = useState("");
  const [twitch, setTwitch] = useState("");
  const [instagram, setInstagram] = useState("");

  const [payoutMethod, setPayoutMethod] = useState<PayoutMethodType>("paypal");
  const [paypalEmail, setPaypalEmail] = useState("");
  const [bankAccount, setBankAccount] = useState("");
  const [usdtAddress, setUsdtAddress] = useState("");
  const [emailNotifications, setEmailNotifications] = useState(true);

  const [isSaving, setIsSaving] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  useEffect(() => {
    if (!profile) return;
    setFullName(profile.full_name || "");
    setEmail(profile.email || "");
    setTiktok(profile.social_links?.tiktok || "");
    setYoutube(profile.social_links?.youtube || "");
    setTwitch(profile.social_links?.twitch || "");
    setInstagram(profile.social_links?.instagram || "");
    setPayoutMethod(profile.payout_method || "paypal");
    setPaypalEmail(profile.payout_details?.paypal_email || "");
    setBankAccount(profile.payout_details?.bank_clabe_or_iban || "");
    setUsdtAddress(profile.payout_details?.usdt_address || "");
    setEmailNotifications(profile.email_notifications ?? true);
  }, [profile]);

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setSaveError(null);
    setSavedSuccess(false);

    const payload = {
      full_name: fullName.trim(),
      payout_method: payoutMethod,
      payout_details: {
        paypal_email: paypalEmail.trim(),
        bank_clabe_or_iban: bankAccount.trim(),
        usdt_address: usdtAddress.trim(),
      },
      social_links: {
        tiktok: tiktok.trim(),
        youtube: youtube.trim(),
        twitch: twitch.trim(),
        instagram: instagram.trim(),
      },
      email_notifications: emailNotifications,
    };

    try {
      const res = await inadsApi.updateSettings(payload);
      if (res.profile) {
        updateProfileState(res.profile);
      }
      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 3200);
    } catch (err: any) {
      setSaveError(err?.message || "No se pudieron guardar los cambios.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <AppShell
      title="Configuraciones de Cuenta"
      subtitle="Administra tus datos personales, redes sociales vinculadas y método predeterminado de pago."
    >
      <form onSubmit={handleSaveSettings} className="space-y-6 max-w-4xl">
        {saveError && (
          <div className="p-4 rounded-2xl bg-red-50 border border-red-200 text-xs sm:text-sm font-bold text-red-700">
            {saveError}
          </div>
        )}

        {savedSuccess && (
          <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-center gap-2.5 text-xs sm:text-sm font-bold text-emerald-900">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
            <span>
              Tus configuraciones y datos de pago han sido actualizados correctamente.
            </span>
          </div>
        )}

        {/* 1. Datos Personales */}
        <Card
          title="Datos del Perfil"
          subtitle="Información asociada a tu inicio de sesión con Google OAuth."
        >
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Nombre Completo o Nombre de Canal / Estudio"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              leftIcon={<User className="w-4 h-4" />}
              required
            />
            <Input
              label="Correo Electrónico (Google OAuth)"
              value={email}
              disabled
              leftIcon={<Mail className="w-4 h-4" />}
              helperText="Correo verificado mediante Google Cloud OAuth 2.0"
            />
          </div>
        </Card>

        {/* 2. Redes Sociales del Creador */}
        <Card
          title="Redes Sociales y Canales de Promoción"
          subtitle="Vincula tus perfiles donde compartes los códigos (1,000 a 10,000+ seguidores)."
        >
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Usuario de TikTok"
              placeholder="@tu_usuario"
              value={tiktok}
              onChange={(e) => setTiktok(e.target.value)}
              leftIcon={<Globe className="w-4 h-4" />}
            />
            <Input
              label="Canal de YouTube / Shorts"
              placeholder="youtube.com/@tucanal"
              value={youtube}
              onChange={(e) => setYoutube(e.target.value)}
              leftIcon={<Globe className="w-4 h-4" />}
            />
            <Input
              label="Canal de Twitch"
              placeholder="twitch.tv/tu_canal"
              value={twitch}
              onChange={(e) => setTwitch(e.target.value)}
              leftIcon={<Globe className="w-4 h-4" />}
            />
            <Input
              label="Perfil de Instagram / Reels"
              placeholder="@tu_instagram"
              value={instagram}
              onChange={(e) => setInstagram(e.target.value)}
              leftIcon={<Globe className="w-4 h-4" />}
            />
          </div>
        </Card>

        {/* 3. Configuración de Cobro para Retiros de $100 USD */}
        <Card
          title="Método de Cobro Predeterminado"
          subtitle="A esta cuenta enviaremos tus retiros manuales cuando alcances los $100.00 USD."
        >
          <div className="space-y-4">
            <Select
              label="Método Preferido"
              value={payoutMethod}
              onChange={(e) =>
                setPayoutMethod(e.target.value as PayoutMethodType)
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

            {payoutMethod === "paypal" && (
              <Input
                label="Correo de Cuenta PayPal"
                type="email"
                placeholder="tu-correo@paypal.com"
                value={paypalEmail}
                onChange={(e) => setPaypalEmail(e.target.value)}
                leftIcon={<CreditCard className="w-4 h-4" />}
              />
            )}

            {payoutMethod === "bank_transfer" && (
              <Input
                label="CLABE Interbancaria / CBU / IBAN y Nombre del Banco"
                placeholder="Ej: BBVA • 012180001234567890"
                value={bankAccount}
                onChange={(e) => setBankAccount(e.target.value)}
                leftIcon={<CreditCard className="w-4 h-4" />}
              />
            )}

            {payoutMethod === "usdt_crypto" && (
              <Input
                label="Dirección de Wallet USDT (Red Polygon o TRC20)"
                placeholder="0x..."
                value={usdtAddress}
                onChange={(e) => setUsdtAddress(e.target.value)}
                leftIcon={<CreditCard className="w-4 h-4" />}
              />
            )}
          </div>
        </Card>

        {/* 4. Notificaciones y Seguridad */}
        <Card
          title="Preferencias y Seguridad"
          subtitle="Alertas de conversiones verificadas y protección de sesión."
        >
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-start gap-3">
              <div className="p-2.5 rounded-xl bg-brand-50 text-brand-600 mt-0.5">
                <Bell className="w-4 h-4" />
              </div>
              <div>
                <p className="text-sm font-bold text-ink-primary">
                  Notificaciones por Correo Electrónico
                </p>
                <p className="text-xs text-ink-secondary mt-0.5">
                  Recibir un aviso cuando tus seguidores cumplan la actividad y
                  cuando se procese tu retiro de $100 USD.
                </p>
              </div>
            </div>

            <input
              type="checkbox"
              checked={emailNotifications}
              onChange={(e) => setEmailNotifications(e.target.checked)}
              className="w-5 h-5 accent-brand-600 rounded-md cursor-pointer"
            />
          </div>

          <div className="mt-4 pt-4 border-t border-surface-border flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs text-ink-secondary">
            <div className="flex items-center gap-2">
              <Shield className="w-4 h-4 text-brand-600 shrink-0" />
              <span>
                Tu sesión está protegida mediante tokens firmados con{" "}
                <strong className="text-ink-primary">Google OAuth & Supabase RLS</strong>.
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <Mail className="w-3.5 h-3.5 text-brand-600 shrink-0" />
              <span>
                Soporte directo:{" "}
                <a
                  href={`mailto:${BUSINESS_RULES.SUPPORT_EMAIL}`}
                  className="font-bold text-brand-600 hover:underline"
                >
                  {BUSINESS_RULES.SUPPORT_EMAIL}
                </a>
              </span>
            </div>
          </div>
        </Card>

        <div className="flex justify-end">
          <Button
            type="submit"
            size="lg"
            isLoading={isSaving}
            leftIcon={<Save className="w-4 h-4" />}
          >
            Guardar Cambios
          </Button>
        </div>
      </form>
    </AppShell>
  );
}

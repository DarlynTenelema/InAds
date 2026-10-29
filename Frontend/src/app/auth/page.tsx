"use client";

import React, { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
  Award,
  CheckCircle2,
  Flame,
  Globe,
  Shield,
} from "lucide-react";
import { AnimatedBackground } from "@/components/auth/AnimatedBackground";
import { GoogleAuthCard } from "@/components/auth/GoogleAuthCard";
import { LiveConversionShowcase } from "@/components/auth/LiveConversionShowcase";
import { APP_ROUTES } from "@/constants/config";
import { useAuth } from "@/hooks/useAuth";
import { fadeInUp, staggerContainer } from "@/theme/animations";
import { UserRole } from "@/types";

const PENDING_ROLE_STORAGE_KEY = "inads_pending_oauth_role";

export default function AuthLoginPage() {
  const router = useRouter();
  const { profile, isLoading, authError: contextAuthError, loginWithGoogle, selectRole } = useAuth();
  const [selectedRole, setSelectedRole] = useState<UserRole>("influencer");
  const [authError, setAuthError] = useState<string | null>(null);

  // Detectar si Google / Supabase devolvió un error en el hash de la URL (#error_description=...)
  useEffect(() => {
    if (typeof window === "undefined") return;
    const hash = window.location.hash;
    if (hash && hash.includes("error_description=")) {
      const params = new URLSearchParams(hash.replace(/^#/, ""));
      const desc = params.get("error_description");
      if (desc) {
        setAuthError(decodeURIComponent(desc.replace(/\+/g, " ")));
      }
    }
  }, []);

  // Cuando el usuario regresa del callback de Google OAuth con sesión activa en Supabase:
  // Si aún no tiene rol en la base de datos, le asignamos el rol que eligió antes de ir a Google.
  useEffect(() => {
    if (isLoading || !profile) return;

    const finalizeOAuthOnboarding = async () => {
      try {
        if (!profile.role) {
          const savedRole =
            (typeof window !== "undefined"
              ? (window.localStorage.getItem(PENDING_ROLE_STORAGE_KEY) as UserRole | null)
              : null) || selectedRole;
          await selectRole(savedRole);
        }
        if (typeof window !== "undefined") {
          window.localStorage.removeItem(PENDING_ROLE_STORAGE_KEY);
        }
        router.replace(APP_ROUTES.DASHBOARD);
      } catch (err: any) {
        setAuthError(err?.message || "No se pudo completar el registro de rol.");
      }
    };

    finalizeOAuthOnboarding();
  }, [isLoading, profile, selectRole, selectedRole, router]);

  const handleContinueWithGoogle = async (role: UserRole) => {
    setAuthError(null);
    try {
      if (typeof window !== "undefined") {
        window.localStorage.setItem(PENDING_ROLE_STORAGE_KEY, role);
      }
      await loginWithGoogle(role);
    } catch (err: any) {
      setAuthError(err?.message || "Error al iniciar sesión con Google.");
    }
  };

  return (
    <div className="relative min-h-[100dvh] bg-surface-pure text-ink-primary overflow-x-hidden flex flex-col justify-between">
      {/* Fondo Animado Especial con Halos Azules y Rayos de Datos */}
      <AnimatedBackground />

      {/* Barra Superior Minimalista (Adaptada a Móviles y TikTok In-App Browser) */}
      <header className="relative z-10 w-full max-w-7xl mx-auto px-4 sm:px-8 pt-5 pb-3 flex items-center justify-between gap-3">
        <motion.div
          initial={{ opacity: 0, x: -16 }}
          animate={{ opacity: 1, x: 0 }}
          className="flex items-center gap-2.5"
        >
          <Image
            src="/logo.png"
            alt="InAds Logo"
            width={44}
            height={44}
            className="w-11 h-11 object-contain rounded-xl shadow-xs"
            priority
          />
          <div>
            <span className="text-2xl font-black tracking-tight text-brand-600 leading-none block">
              InAds
            </span>
            <span className="text-[10px] font-bold uppercase tracking-widest text-ink-secondary">
              Creators & Indie Games
            </span>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, x: 16 }}
          animate={{ opacity: 1, x: 0 }}
          className="flex items-center gap-2"
        >
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-surface-subtle border border-surface-border text-xs font-bold text-ink-primary shadow-2xs">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="hidden xs:inline">Pagos Activos:</span> $0.10 / usuario
          </span>
        </motion.div>
      </header>

      {/* Contenido Principal Responsive (Mobile-First + Split Desktop) */}
      <main className="relative z-10 w-full max-w-7xl mx-auto px-4 sm:px-8 py-6 sm:py-10 lg:py-12">
        {(authError || contextAuthError) && (
          <div className="mb-6 p-4 rounded-2xl bg-red-50 border border-red-200 text-xs sm:text-sm font-bold text-red-700">
            {authError || contextAuthError}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-start">
          {/* Columna Izquierda: Carta de Presentación + Simulador en Vivo */}
          <motion.div
            variants={staggerContainer}
            initial="hidden"
            animate="visible"
            className="lg:col-span-7 space-y-6"
          >
            {/* Etiqueta Superior Animada */}
            <motion.div
              variants={fadeInUp}
              className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-brand-50 border border-brand-200 text-brand-700 text-xs font-extrabold"
            >
              <Flame className="w-4 h-4 text-brand-600 shrink-0" />
              <span>
                Para Micro-Influencers (1k a 10k) y Desarrolladores Independientes
              </span>
            </motion.div>

            {/* Titular Principal en Azul Vibrante y Negro Profundo */}
            <motion.div variants={fadeInUp} className="space-y-3">
              <h1 className="text-3xl sm:text-5xl lg:text-[52px] font-black tracking-tight leading-[1.08] text-brand-600">
                Monetiza tu comunidad{" "}
                <span className="text-ink-primary block sm:inline">
                  compartiendo un solo código.
                </span>
              </h1>
              <p className="text-sm sm:text-base lg:text-lg text-ink-secondary max-w-2xl leading-relaxed font-medium">
                {selectedRole === "influencer" ? (
                  <>
                    Elige un juego o app indie, copia tu código en tus videos de{" "}
                    <strong className="text-ink-primary font-bold">
                      TikTok, Shorts o Reels
                    </strong>{" "}
                    y recibe{" "}
                    <strong className="text-brand-600 font-extrabold">
                      $0.10 USD
                    </strong>{" "}
                    por cada seguidor que descargue la app y valide su cuenta.
                  </>
                ) : (
                  <>
                    Conecta tu juego o aplicación en minutos y adquiere jugadores reales
                    promocionados por cientos de micro-influencers por solo{" "}
                    <strong className="text-brand-600 font-extrabold">
                      $0.15 USD
                    </strong>{" "}
                    por usuario verificado.
                  </>
                )}
              </p>
            </motion.div>

            {/* En teléfonos móviles mostramos la tarjeta de Login justo aquí para conversión inmediata desde TikTok */}
            <motion.div variants={fadeInUp} className="block lg:hidden">
              <GoogleAuthCard
                selectedRole={selectedRole}
                onSelectRole={setSelectedRole}
                onContinueWithGoogle={handleContinueWithGoogle}
              />
            </motion.div>

            {/* Showcase en Vivo + Calculadora Interactiva + Pasos */}
            <motion.div variants={fadeInUp}>
              <LiveConversionShowcase selectedRole={selectedRole} />
            </motion.div>
          </motion.div>

          {/* Columna Derecha (Desktop): Tarjeta Interactiva de Login con Google */}
          <div className="hidden lg:block lg:col-span-5 lg:sticky lg:top-8">
            <GoogleAuthCard
              selectedRole={selectedRole}
              onSelectRole={setSelectedRole}
              onContinueWithGoogle={handleContinueWithGoogle}
            />

            {/* Tarjeta de Garantías Transparentes bajo el Login */}
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="mt-4 bg-surface-subtle border border-surface-border rounded-2xl p-4 grid grid-cols-3 gap-2 text-center"
            >
              <div>
                <p className="text-lg font-black text-brand-600">$0.10</p>
                <p className="text-[11px] font-semibold text-ink-secondary">
                  Pago por Usuario
                </p>
              </div>
              <div className="border-x border-surface-border">
                <p className="text-lg font-black text-brand-600">$100</p>
                <p className="text-[11px] font-semibold text-ink-secondary">
                  Mínimo de Retiro
                </p>
              </div>
              <div>
                <p className="text-lg font-black text-brand-600">100%</p>
                <p className="text-[11px] font-semibold text-ink-secondary">
                  Usuarios Reales
                </p>
              </div>
            </motion.div>
          </div>
        </div>
      </main>

      {/* Pie de Página Limpio */}
      <footer className="relative z-10 w-full border-t border-surface-border bg-surface-pure/80 backdrop-blur-xs py-4 px-4 sm:px-8">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-ink-secondary">
          <div className="flex flex-wrap items-center justify-center gap-4 font-semibold">
            <span className="inline-flex items-center gap-1.5 text-ink-primary">
              <CheckCircle2 className="w-3.5 h-3.5 text-brand-600" />
              Sin contratos exclusivos
            </span>
            <span className="inline-flex items-center gap-1.5 text-ink-primary">
              <Shield className="w-3.5 h-3.5 text-brand-600" />
              Validación antifraude activa
            </span>
            <span className="inline-flex items-center gap-1.5 text-ink-primary">
              <Award className="w-3.5 h-3.5 text-brand-600" />
              Creado para Indie Devs & Micro-Creators
            </span>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-4 font-medium">
            <Link
              href={APP_ROUTES.PRIVACY}
              className="text-brand-600 font-bold hover:underline"
            >
              Política de Privacidad
            </Link>
            <span>•</span>
            <Link
              href={APP_ROUTES.TERMS}
              className="text-brand-600 font-bold hover:underline"
            >
              Condiciones del Servicio
            </Link>
            <span>•</span>
            <span className="inline-flex items-center gap-1.5">
              <Globe className="w-3.5 h-3.5 text-brand-600" />
              <span>InAds Platform © {new Date().getFullYear()}</span>
            </span>
          </div>
        </div>
      </footer>
    </div>
  );
}

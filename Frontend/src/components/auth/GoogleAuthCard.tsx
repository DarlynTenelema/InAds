"use client";

import React, { useState } from "react";
import { motion } from "framer-motion";
import {
  ArrowRight,
  Check,
  Code2,
  Loader2,
  ShieldCheck,
  Sparkles,
  Users,
} from "lucide-react";
import { UserRole } from "@/types";
import { cn } from "@/utils/formatters";

interface GoogleAuthCardProps {
  selectedRole: UserRole;
  onSelectRole: (role: UserRole) => void;
  onContinueWithGoogle: (role: UserRole) => Promise<void>;
}

const ROLE_OPTIONS: {
  id: UserRole;
  title: string;
  badge: string;
  subtitle: string;
  icon: React.ElementType;
  perks: string[];
}[] = [
  {
    id: "influencer",
    title: "Soy Creador / Influencer",
    badge: "1,000 a 10,000 seg.",
    subtitle: "Monetiza tu comunidad de TikTok, Shorts, Reels o Twitch sin contratos.",
    icon: Users,
    perks: [
      "Gana $0.10 USD por cada seguidor verificado que use tu código",
      "Copia tu código y guion promocional en 10 segundos",
      "Retiros seguros a partir de $100.00 USD (PayPal, Banco o USDT)",
    ],
  },
  {
    id: "developer",
    title: "Soy Desarrollador Indie",
    badge: "Juegos & Apps",
    subtitle: "Adquiere jugadores reales y retenidos a una fracción del costo de Ads.",
    icon: Code2,
    perks: [
      "Paga solo $0.15 USD por jugador real verificado (0% gasto en bots)",
      "Integración rápida con solo 2 endpoints REST y tu API Key",
      "Control total de presupuesto prepagado y pausa en 1 clic",
    ],
  },
];

export function GoogleAuthCard({
  selectedRole,
  onSelectRole,
  onContinueWithGoogle,
}: GoogleAuthCardProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const activeConfig =
    ROLE_OPTIONS.find((r) => r.id === selectedRole) || ROLE_OPTIONS[0];

  const handleLogin = async () => {
    setIsSubmitting(true);
    try {
      await onContinueWithGoogle(selectedRole);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: "spring", stiffness: 260, damping: 24 }}
      className="w-full bg-surface-pure border border-surface-border rounded-3xl p-6 sm:p-8 shadow-elevated relative overflow-hidden"
    >
      {/* Resplandor decorativo superior derecho */}
      <div className="absolute -top-20 -right-20 w-44 h-44 rounded-full bg-brand-500/10 blur-2xl pointer-events-none" />

      {/* Encabezado de la Tarjeta */}
      <div className="mb-6">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-brand-50 border border-brand-200 text-brand-700 text-xs font-extrabold mb-3">
          <Sparkles className="w-3.5 h-3.5 text-brand-600" />
          <span>Acceso Oficial • Sin Comisiones Ocultas</span>
        </div>
        <h2 className="text-2xl sm:text-3xl font-black text-brand-600 tracking-tight">
          Comienza en InAds
        </h2>
        <p className="text-xs sm:text-sm text-ink-secondary mt-1">
          Elige tu perfil e inicia sesión en un toque con tu cuenta de Google.
        </p>
      </div>

      {/* Selector Animado de Rol (Tabs con layoutId de Framer Motion) */}
      <div className="grid grid-cols-2 gap-2 p-1.5 bg-surface-subtle border border-surface-border rounded-2xl mb-6">
        {ROLE_OPTIONS.map((option) => {
          const Icon = option.icon;
          const isActive = selectedRole === option.id;
          return (
            <button
              key={option.id}
              type="button"
              onClick={() => onSelectRole(option.id)}
              className={cn(
                "relative py-3 px-3 rounded-xl text-left transition-colors z-10 focus:outline-none",
                isActive ? "text-surface-pure" : "text-ink-primary hover:bg-surface-muted/60"
              )}
            >
              {isActive && (
                <motion.div
                  layoutId="activeRoleHighlight"
                  transition={{ type: "spring", stiffness: 360, damping: 30 }}
                  className="absolute inset-0 bg-brand-600 rounded-xl shadow-sm -z-10"
                />
              )}
              <div className="flex items-center justify-between gap-1 mb-1">
                <Icon
                  className={cn(
                    "w-4 h-4 shrink-0",
                    isActive ? "text-surface-pure" : "text-brand-600"
                  )}
                />
                <span
                  className={cn(
                    "text-[10px] font-extrabold px-1.5 py-0.5 rounded-md",
                    isActive
                      ? "bg-brand-700 text-surface-pure"
                      : "bg-brand-50 text-brand-700"
                  )}
                >
                  {option.badge}
                </span>
              </div>
              <p className="text-xs sm:text-sm font-extrabold leading-tight">
                {option.id === "influencer" ? "Micro-Influencer" : "Indie Developer"}
              </p>
            </button>
          );
        })}
      </div>

      {/* Beneficios Dinámicos según el Rol Seleccionado */}
      <motion.div
        key={activeConfig.id}
        initial={{ opacity: 0, x: 10 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.22 }}
        className="bg-surface-subtle border border-surface-border rounded-2xl p-4 mb-6"
      >
        <p className="text-xs font-bold text-ink-primary mb-3">
          {activeConfig.subtitle}
        </p>
        <ul className="space-y-2.5">
          {activeConfig.perks.map((perk) => (
            <li key={perk} className="flex items-start gap-2.5 text-xs text-ink-secondary">
              <span className="w-4 h-4 rounded-full bg-brand-600 text-surface-pure flex items-center justify-center shrink-0 mt-0.5">
                <Check className="w-2.5 h-2.5 stroke-[3]" />
              </span>
              <span className="text-ink-primary font-medium leading-snug">{perk}</span>
            </li>
          ))}
        </ul>
      </motion.div>

      {/* Botón Principal de Google OAuth con Efecto de Brillo Animado */}
      <motion.button
        type="button"
        onClick={handleLogin}
        disabled={isSubmitting}
        whileHover={{ scale: 1.015, y: -1 }}
        whileTap={{ scale: 0.985 }}
        className="group relative w-full py-4 px-5 rounded-2xl bg-brand-600 hover:bg-brand-700 text-surface-pure font-extrabold text-sm sm:text-base shadow-glow transition-all flex items-center justify-center gap-3 overflow-hidden disabled:opacity-60 cursor-pointer"
      >
        {/* Efecto Shimmer que cruza el botón */}
        <motion.span
          animate={{ x: ["-120%", "220%"] }}
          transition={{
            duration: 2.8,
            repeat: Infinity,
            ease: "easeInOut",
            repeatDelay: 1.2,
          }}
          className="
            absolute inset-y-0 w-24
            bg-gradient-to-r from-transparent via-white/25 to-transparent
            skew-x-12 pointer-events-none
          "
        />

        {isSubmitting ? (
          <Loader2 className="w-5 h-5 animate-spin" />
        ) : (
          <span className="w-7 h-7 rounded-lg bg-surface-pure flex items-center justify-center shrink-0 shadow-xs">
            {/* Logo Oficial de Google SVG */}
            <svg className="w-4 h-4" viewBox="0 0 24 24">
              <path
                fill="#4285F4"
                d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17Z"
              />
              <path
                fill="#34A853"
                d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.11-6.72-4.96H1.29v3.14C3.26 21.3 7.31 24 12 24Z"
              />
              <path
                fill="#FBBC05"
                d="M5.28 14.24c-.24-.72-.38-1.49-.38-2.24s.14-1.52.38-2.24V6.62H1.29C.47 8.24 0 10.06 0 12s.47 3.76 1.29 5.38l3.99-3.14Z"
              />
              <path
                fill="#EA4335"
                d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.31 0 3.26 2.7 1.29 6.62l3.99 3.14c.95-2.85 3.6-4.96 6.72-4.96Z"
              />
            </svg>
          </span>
        )}

        <span>
          Continuar con Google como{" "}
          {selectedRole === "influencer" ? "Creador" : "Desarrollador"}
        </span>
        <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform shrink-0" />
      </motion.button>

      {/* Sello de Seguridad y Antifraude */}
      <div className="mt-5 pt-4 border-t border-surface-border flex flex-wrap items-center justify-between gap-2 text-[11px] text-ink-secondary">
        <span className="inline-flex items-center gap-1.5 font-semibold text-ink-primary">
          <ShieldCheck className="w-4 h-4 text-brand-600" />
          Protección Antifraude de 15 días / sesiones reales
        </span>
        <span>OAuth 2.0 Verificado</span>
      </div>
    </motion.div>
  );
}


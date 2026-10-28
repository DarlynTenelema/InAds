"use client";

import React, { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  CheckCircle2,
  Coins,
  Gamepad2,
  ShieldCheck,
  Sparkles,
  TrendingUp,
  Users,
  Zap,
} from "lucide-react";
import { BUSINESS_RULES } from "@/constants/config";
import { floatingSlow } from "@/theme/animations";
import { UserRole } from "@/types";
import { cn, formatNumber, formatUSD } from "@/utils/formatters";

interface LiveConversionShowcaseProps {
  selectedRole: UserRole;
}

const LIVE_EVENTS = [
  {
    id: "ev1",
    badge: "Código Verificado",
    creator: "@leo_gamingyt",
    code: "LEO_NEON",
    game: "Neon Drift 3D",
    detail: "+140 jugadores activos (3 sesiones)",
    amount: "+$14.00 USD",
  },
  {
    id: "ev2",
    badge: "Retiro Enviado",
    creator: "@valeria_clips",
    code: "VALE_QUEST",
    game: "Pixel Kingdom",
    detail: "1,000 usuarios verificados • PayPal",
    amount: "$100.00 USD",
  },
  {
    id: "ev3",
    badge: "Campaña Indie",
    creator: "NovaForge Studio",
    code: "ACTIVA",
    game: "Cyber Dungeon",
    detail: "320 jugadores retenidos por solo $48.00",
    amount: "$0.15 / jugador",
  },
  {
    id: "ev4",
    badge: "Código Verificado",
    creator: "@diego_shorts",
    code: "DIEGO_RPG",
    game: "Aether Tactics",
    detail: "+210 seguidores canjearon su código",
    amount: "+$21.00 USD",
  },
];

const SIMULATOR_PRESETS = [250, 500, 1000, 2500];

export function LiveConversionShowcase({ selectedRole }: LiveConversionShowcaseProps) {
  const [eventIdx, setEventIdx] = useState(0);
  const [simulatedUsers, setSimulatedUsers] = useState<number>(1000);

  useEffect(() => {
    const interval = setInterval(() => {
      setEventIdx((prev) => (prev + 1) % LIVE_EVENTS.length);
    }, 3600);
    return () => clearInterval(interval);
  }, []);

  const currentEvent = LIVE_EVENTS[eventIdx];
  const isDeveloper = selectedRole === "developer";

  const creatorEarnings = simulatedUsers * BUSINESS_RULES.INFLUENCER_REWARD;
  const developerCost = simulatedUsers * BUSINESS_RULES.COST_PER_VERIFIED_USER;
  const traditionalAdsCost = simulatedUsers * 2.2; // Promedio $2.20 CPI en anuncios tradicionales

  return (
    <div className="w-full space-y-5">
      {/* 1. Ticker en Vivo con transición spring (Funciona en Móvil y Desktop) */}
      <div className="relative h-[88px] sm:h-[84px]">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentEvent.id}
            initial={{ opacity: 0, y: 16, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -16, scale: 0.97 }}
            transition={{ type: "spring", stiffness: 320, damping: 26 }}
            className="w-full bg-surface-pure/95 backdrop-blur-md border border-brand-200 rounded-2xl p-3.5 sm:px-4 shadow-elevated flex items-center justify-between gap-3"
          >
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-10 h-10 rounded-xl bg-brand-600 text-surface-pure flex items-center justify-center shrink-0 shadow-xs">
                <Zap className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-brand-50 text-brand-700 border border-brand-200">
                    <span className="w-1.5 h-1.5 rounded-full bg-brand-600 animate-ping" />
                    {currentEvent.badge}
                  </span>
                  <span className="text-xs font-extrabold text-ink-primary truncate">
                    {currentEvent.creator}
                  </span>
                </div>
                <p className="text-xs text-ink-secondary truncate mt-1">
                  <span className="font-semibold text-ink-primary">
                    {currentEvent.game}
                  </span>{" "}
                  • {currentEvent.detail}
                </p>
              </div>
            </div>

            <div className="text-right shrink-0">
              <span className="inline-block text-sm sm:text-base font-black text-brand-600 bg-brand-50 px-2.5 py-1 rounded-xl border border-brand-200">
                {currentEvent.amount}
              </span>
            </div>
          </motion.div>
        </AnimatePresence>
      </div>

      {/* 2. Simulador Interactivo en Tiempo Real */}
      <motion.div
        animate={floatingSlow(0.2)}
        className="bg-surface-pure border border-surface-border rounded-3xl p-5 sm:p-6 shadow-elevated relative overflow-hidden"
      >
        {/* Borde superior azul brillante */}
        <div className="absolute inset-x-0 top-0 h-1.5 bg-gradient-to-r from-brand-500 via-brand-600 to-brand-700" />

        <div className="flex items-center justify-between gap-2 mb-4">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-brand-600" />
            <span className="text-xs font-extrabold uppercase tracking-wider text-brand-600">
              {isDeveloper
                ? "Calculadora de Adquisición Indie"
                : "Simulador de Ganancias Creador"}
            </span>
          </div>
          <span className="text-xs font-bold text-ink-secondary bg-surface-subtle px-2.5 py-1 rounded-lg border border-surface-border">
            {isDeveloper ? "$0.15 USD / jugador" : "$0.10 USD / seguidor"}
          </span>
        </div>

        {/* Selector rápido de cantidad de jugadores (Thumb-friendly para TikTok Mobile) */}
        <p className="text-xs font-semibold text-ink-secondary mb-2.5">
          {isDeveloper
            ? "Selecciona cuántos jugadores verificados deseas adquirir:"
            : "Selecciona cuántos seguidores ingresan tu código en el juego:"}
        </p>

        <div className="grid grid-cols-4 gap-2 mb-5">
          {SIMULATOR_PRESETS.map((count) => {
            const active = simulatedUsers === count;
            return (
              <button
                key={count}
                type="button"
                onClick={() => setSimulatedUsers(count)}
                className={cn(
                  "py-2.5 px-2 rounded-xl text-xs sm:text-sm font-extrabold transition-all border",
                  active
                    ? "bg-brand-600 text-surface-pure border-brand-600 shadow-sm scale-[1.02]"
                    : "bg-surface-subtle text-ink-primary border-surface-border hover:border-brand-300"
                )}
              >
                {formatNumber(count)}
              </button>
            );
          })}
        </div>

        {/* Resultado Animado */}
        <div className="bg-surface-subtle border border-surface-border rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-ink-secondary block">
              {isDeveloper
                ? "Tu Inversión Total en InAds"
                : "Tu Ganancia Directa Acumulada"}
            </span>
            <motion.div
              key={`${isDeveloper}-${simulatedUsers}`}
              initial={{ scale: 0.92, opacity: 0.5 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: "spring", stiffness: 380, damping: 20 }}
              className="text-3xl sm:text-4xl font-black text-brand-600 tracking-tight mt-0.5"
            >
              {isDeveloper ? formatUSD(developerCost) : formatUSD(creatorEarnings)}
            </motion.div>
            <p className="text-xs text-ink-secondary mt-1">
              {isDeveloper ? (
                <>
                  En anuncios tradicionales pagarías aprox.{" "}
                  <span className="line-through font-bold text-ink-primary">
                    {formatUSD(traditionalAdsCost)}
                  </span>
                </>
              ) : creatorEarnings >= BUSINESS_RULES.MIN_PAYOUT_USD ? (
                <span className="text-emerald-700 font-bold">
                  ¡Meta de $100.00 alcanzada! Retiro 100% habilitado.
                </span>
              ) : (
                <>
                  Progreso hacia tu retiro de $100.00:{" "}
                  <span className="font-bold text-ink-primary">
                    {Math.min(100, (creatorEarnings / 100) * 100).toFixed(0)}%
                  </span>
                </>
              )}
            </p>
          </div>

          <div className="flex sm:flex-col items-center sm:items-end justify-between border-t sm:border-t-0 pt-3 sm:pt-0 border-surface-border">
            <span className="text-xs font-semibold text-ink-secondary">
              {isDeveloper ? "Ahorro estimado" : "Usuarios activos"}
            </span>
            <span className="text-base font-extrabold text-ink-primary flex items-center gap-1 mt-0.5">
              {isDeveloper ? (
                <>
                  <TrendingUp className="w-4 h-4 text-brand-600" />
                  -93% CPA
                </>
              ) : (
                <>
                  <Users className="w-4 h-4 text-brand-600" />
                  {formatNumber(simulatedUsers)} jugadores
                </>
              )}
            </span>
          </div>
        </div>
      </motion.div>

      {/* 3. Tarjetas de Flujo en 3 Pasos */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {(isDeveloper
          ? [
              {
                icon: Gamepad2,
                step: "Paso 1",
                title: "Publica tu Juego",
                desc: "Sube tu app, define el guion para creadores y obtén tu API Key.",
              },
              {
                icon: ShieldCheck,
                step: "Paso 2",
                title: "Cero Bots",
                desc: "Solo pagas cuando el jugador cumple sesiones reales verificadas.",
              },
              {
                icon: Coins,
                step: "Paso 3",
                title: "Escala con $0.15",
                desc: "Recarga presupuesto manualmente y activa decenas de creadores.",
              },
            ]
          : [
              {
                icon: Sparkles,
                step: "Paso 1",
                title: "Elige una App",
                desc: "Copia tu código único y las frases clave listas para tu video.",
              },
              {
                icon: Users,
                step: "Paso 2",
                title: "Comparte en Redes",
                desc: "Tus seguidores descargan el juego y pegan tu código dentro.",
              },
              {
                icon: CheckCircle2,
                step: "Paso 3",
                title: "Gana $0.10 c/u",
                desc: "El sistema cuenta cada jugador activo y retiras al llegar a $100.",
              },
            ]
        ).map((item, index) => {
          const Icon = item.icon;
          return (
            <motion.div
              key={item.title}
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15 + index * 0.08 }}
              whileHover={{ y: -4 }}
              className="bg-surface-pure border border-surface-border hover:border-brand-200 rounded-2xl p-4 shadow-card transition-all"
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] font-extrabold uppercase tracking-wider text-brand-600">
                  {item.step}
                </span>
                <div className="w-7 h-7 rounded-lg bg-brand-50 text-brand-600 flex items-center justify-center">
                  <Icon className="w-4 h-4" />
                </div>
              </div>
              <h3 className="text-sm font-extrabold text-ink-primary">
                {item.title}
              </h3>
              <p className="text-xs text-ink-secondary mt-1 leading-relaxed">
                {item.desc}
              </p>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}


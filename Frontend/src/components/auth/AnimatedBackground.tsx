"use client";

import React from "react";
import { motion } from "framer-motion";

/**
 * Fondo animado de alta gama en Theme Claro (#FFFFFF):
 * - Retícula arquitectónica azul ultradelgada
 * - Halos de luz azul respirando suavemente
 * - Pulsos de datos ("beams") viajando por las líneas simulando tráfico de códigos en vivo
 */
export function AnimatedBackground() {
  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden bg-surface-pure z-0">
      {/* Retícula geométrica sutil en azul sobre blanco */}
      <div
        className="absolute inset-0 opacity-60"
        style={{
          backgroundImage: `
            linear-gradient(to right, rgba(37, 99, 235, 0.055) 1px, transparent 1px),
            linear-gradient(to bottom, rgba(37, 99, 235, 0.055) 1px, transparent 1px)
          `,
          backgroundSize: "44px 44px",
        }}
      />

      {/* Máscara radial para suavizar bordes hacia blanco puro */}
      <div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(circle at 50% 35%, transparent 25%, #FFFFFF 88%)",
        }}
      />

      {/* Halo Azul Superior (Respira suavemente) */}
      <motion.div
        animate={{
          scale: [1, 1.15, 1],
          opacity: [0.22, 0.36, 0.22],
          x: [0, 25, 0],
          y: [0, -15, 0],
        }}
        transition={{
          duration: 9,
          repeat: Infinity,
          ease: "easeInOut",
        }}
        className="absolute -top-28 -left-24 w-80 h-80 sm:w-[460px] sm:h-[460px] rounded-full bg-brand-500/20 blur-3xl"
      />

      {/* Halo Azul Secundario Derecha */}
      <motion.div
        animate={{
          scale: [1, 1.2, 1],
          opacity: [0.15, 0.28, 0.15],
          x: [0, -30, 0],
          y: [0, 25, 0],
        }}
        transition={{
          duration: 11,
          repeat: Infinity,
          ease: "easeInOut",
          delay: 1.5,
        }}
        className="absolute top-1/3 -right-28 w-72 h-72 sm:w-[420px] sm:h-[420px] rounded-full bg-brand-600/15 blur-3xl"
      />

      {/* Rayos de datos azules horizontales ("Data Beams") */}
      <motion.div
        initial={{ x: "-100%", opacity: 0 }}
        animate={{ x: "220%", opacity: [0, 1, 1, 0] }}
        transition={{
          duration: 5.5,
          repeat: Infinity,
          ease: "linear",
          repeatDelay: 1.5,
        }}
        style={{ top: "176px" }}
        className="
          absolute left-0 w-40 sm:w-64 h-[2px]
          bg-gradient-to-r from-transparent via-brand-600 to-transparent
        "
      />

      <motion.div
        initial={{ x: "220%", opacity: 0 }}
        animate={{ x: "-100%", opacity: [0, 0.85, 0.85, 0] }}
        transition={{
          duration: 6.5,
          repeat: Infinity,
          ease: "linear",
          delay: 2.8,
          repeatDelay: 2,
        }}
        style={{ top: "352px" }}
        className="
          absolute left-0 w-36 sm:w-56 h-[2px]
          bg-gradient-to-r from-transparent via-brand-500 to-transparent
        "
      />

      {/* Partículas flotantes azules */}
      {[
        { left: "14%", top: "22%", delay: 0, size: "w-2 h-2" },
        { left: "82%", top: "18%", delay: 1.2, size: "w-2.5 h-2.5" },
        { left: "76%", top: "74%", delay: 2.1, size: "w-2 h-2" },
        { left: "18%", top: "78%", delay: 0.7, size: "w-1.5 h-1.5" },
      ].map((dot, idx) => (
        <motion.div
          key={idx}
          animate={{
            y: [0, -18, 0],
            opacity: [0.25, 0.7, 0.25],
            scale: [1, 1.25, 1],
          }}
          transition={{
            duration: 4.5 + idx,
            repeat: Infinity,
            ease: "easeInOut",
            delay: dot.delay,
          }}
          style={{ left: dot.left, top: dot.top }}
          className={`absolute ${dot.size} rounded-full bg-brand-600 shadow-glow`}
        />
      ))}
    </div>
  );
}


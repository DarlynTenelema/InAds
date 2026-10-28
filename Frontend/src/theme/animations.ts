// =============================================================================
// InAds — Variantes de Animación Reutilizables (Framer Motion)
// Centraliza las físicas de resorte (spring), entradas y efectos flotantes.
// =============================================================================

import { Variants } from "framer-motion";

export const fadeInUp: Variants = {
  hidden: { opacity: 0, y: 22 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      type: "spring",
      stiffness: 260,
      damping: 24,
    },
  },
};

export const staggerContainer: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0.05,
    },
  },
};

export const scaleInSpring: Variants = {
  hidden: { opacity: 0, scale: 0.94 },
  visible: {
    opacity: 1,
    scale: 1,
    transition: {
      type: "spring",
      stiffness: 300,
      damping: 25,
    },
  },
  exit: {
    opacity: 0,
    scale: 0.95,
    transition: { duration: 0.15 },
  },
};

// Animación continua de levitación para tarjetas decorativas en la pantalla de Login
export const floatingSlow = (delay = 0) => ({
  y: [0, -10, 0],
  transition: {
    duration: 4.5,
    repeat: Infinity,
    ease: "easeInOut" as const,
    delay,
  },
});

export const buttonTapMotion = {
  whileHover: { scale: 1.015 },
  whileTap: { scale: 0.985 },
};


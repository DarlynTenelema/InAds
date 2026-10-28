"use client";

import React from "react";
import { AnimatePresence, motion } from "framer-motion";
import { X } from "lucide-react";
import { scaleInSpring } from "@/theme/animations";

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  maxWidthClass?: string;
}

export function Modal({
  isOpen,
  onClose,
  title,
  subtitle,
  children,
  maxWidthClass = "max-w-lg",
}: ModalProps) {
  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-ink-primary/40 backdrop-blur-xs"
          />

          <motion.div
            variants={scaleInSpring}
            initial="hidden"
            animate="visible"
            exit="exit"
            className={`relative z-10 w-full ${maxWidthClass} bg-surface-pure border border-surface-border rounded-2xl shadow-elevated p-6 max-h-[90vh] overflow-y-auto`}
          >
            <div className="flex items-start justify-between gap-4 pb-4 border-b border-surface-border mb-5">
              <div>
                <h2 className="text-xl font-bold text-brand-600 tracking-tight">
                  {title}
                </h2>
                {subtitle && (
                  <p className="text-xs text-ink-secondary mt-1">{subtitle}</p>
                )}
              </div>
              <button
                onClick={onClose}
                className="p-1.5 rounded-lg text-ink-secondary hover:text-ink-primary hover:bg-surface-muted transition-colors"
                aria-label="Cerrar modal"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {children}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}


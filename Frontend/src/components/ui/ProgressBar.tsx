"use client";

import React from "react";
import { motion } from "framer-motion";
import { cn } from "@/utils/formatters";

interface ProgressBarProps {
  current: number;
  target: number;
  labelLeft?: string;
  labelRight?: string;
  className?: string;
}

export function ProgressBar({
  current,
  target,
  labelLeft,
  labelRight,
  className,
}: ProgressBarProps) {
  const pct = target > 0 ? Math.min(100, Math.max(0, (current / target) * 100)) : 0;

  return (
    <div className={cn("w-full", className)}>
      {(labelLeft || labelRight) && (
        <div className="flex items-center justify-between text-xs font-semibold mb-2">
          <span className="text-ink-primary">{labelLeft}</span>
          <span className="text-brand-600">{labelRight || `${pct.toFixed(0)}%`}</span>
        </div>
      )}
      <div className="w-full h-3 bg-surface-muted rounded-full overflow-hidden border border-surface-border">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.7, ease: "easeOut" }}
          className="h-full bg-gradient-to-r from-brand-600 to-brand-500 rounded-full"
        />
      </div>
    </div>
  );
}


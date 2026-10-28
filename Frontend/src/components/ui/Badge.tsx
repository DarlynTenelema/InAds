import React from "react";
import { STATUS_CONFIG } from "@/constants/config";
import { AppStatus, ReferralStatus, TransactionStatus } from "@/types";
import { cn } from "@/utils/formatters";

type BadgeVariant = "blue" | "green" | "amber" | "red" | "slate";

const badgeStyles: Record<BadgeVariant, string> = {
  blue: "bg-brand-50 text-brand-700 border-brand-200",
  green: "bg-emerald-50 text-emerald-700 border-emerald-200",
  amber: "bg-amber-50 text-amber-800 border-amber-200",
  red: "bg-red-50 text-red-700 border-red-200",
  slate: "bg-surface-muted text-ink-secondary border-surface-border",
};

interface BadgeProps {
  status?: AppStatus | ReferralStatus | TransactionStatus;
  label?: string;
  variant?: BadgeVariant;
  className?: string;
}

export function Badge({ status, label, variant, className }: BadgeProps) {
  const mapped = status ? STATUS_CONFIG[status] : undefined;
  const resolvedVariant: BadgeVariant = variant || mapped?.variant || "slate";
  const resolvedLabel = label || mapped?.label || status || "";

  return (
    <span
      className={cn(
        "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border",
        badgeStyles[resolvedVariant],
        className
      )}
    >
      {resolvedLabel}
    </span>
  );
}


import React from "react";
import { cn } from "@/utils/formatters";

interface StatCardProps {
  label: string;
  value: string;
  helperText?: string;
  icon?: React.ReactNode;
  highlightBlue?: boolean;
  className?: string;
}

export function StatCard({
  label,
  value,
  helperText,
  icon,
  highlightBlue = false,
  className,
}: StatCardProps) {
  return (
    <div
      className={cn(
        "bg-surface-pure border border-surface-border rounded-2xl p-5 shadow-card flex items-start justify-between gap-4",
        highlightBlue && "border-brand-200 bg-gradient-to-br from-surface-pure to-brand-50/40",
        className
      )}
    >
      <div>
        <p className="text-xs font-semibold uppercase tracking-wider text-ink-secondary">
          {label}
        </p>
        <p
          className={cn(
            "text-2xl md:text-3xl font-extrabold tracking-tight mt-1.5",
            highlightBlue ? "text-brand-600" : "text-ink-primary"
          )}
        >
          {value}
        </p>
        {helperText && (
          <p className="text-xs text-ink-secondary mt-1.5">{helperText}</p>
        )}
      </div>
      {icon && (
        <div
          className={cn(
            "p-3 rounded-xl border shrink-0",
            highlightBlue
              ? "bg-brand-600 text-surface-pure border-brand-600 shadow-sm"
              : "bg-brand-50 text-brand-600 border-brand-100"
          )}
        >
          {icon}
        </div>
      )}
    </div>
  );
}


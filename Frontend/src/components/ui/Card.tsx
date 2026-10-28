import React from "react";
import { THEME_TOKENS } from "@/theme/tokens";
import { cn } from "@/utils/formatters";

interface CardProps {
  children: React.ReactNode;
  title?: string;
  subtitle?: string;
  headerAction?: React.ReactNode;
  interactive?: boolean;
  noPadding?: boolean;
  className?: string;
}

export function Card({
  children,
  title,
  subtitle,
  headerAction,
  interactive = false,
  noPadding = false,
  className,
}: CardProps) {
  return (
    <div
      className={cn(
        interactive ? THEME_TOKENS.surfaces.cardInteractive : THEME_TOKENS.surfaces.card,
        !noPadding && "p-6",
        className
      )}
    >
      {(title || subtitle || headerAction) && (
        <div
          className={cn(
            "flex items-start justify-between gap-4 mb-5",
            noPadding && "px-6 pt-6"
          )}
        >
          <div>
            {title && (
              <h3 className="text-base font-bold text-ink-primary tracking-tight">
                {title}
              </h3>
            )}
            {subtitle && (
              <p className="text-xs text-ink-secondary mt-0.5">{subtitle}</p>
            )}
          </div>
          {headerAction && <div className="shrink-0">{headerAction}</div>}
        </div>
      )}
      {children}
    </div>
  );
}


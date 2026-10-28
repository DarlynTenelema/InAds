import React from "react";
import { cn } from "@/utils/formatters";

interface BaseFieldProps {
  label?: string;
  helperText?: string;
  error?: string | null;
}

export interface InputProps
  extends React.InputHTMLAttributes<HTMLInputElement>,
    BaseFieldProps {
  leftIcon?: React.ReactNode;
}

export function Input({
  label,
  helperText,
  error,
  leftIcon,
  className,
  ...props
}: InputProps) {
  return (
    <div className="w-full">
      {label && (
        <label className="block text-xs font-bold uppercase tracking-wider text-ink-primary mb-1.5">
          {label}
        </label>
      )}
      <div className="relative">
        {leftIcon && (
          <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-ink-secondary">
            {leftIcon}
          </div>
        )}
        <input
          className={cn(
            "w-full rounded-xl border border-surface-border bg-surface-pure px-3.5 py-2.5 text-sm text-ink-primary placeholder:text-ink-muted focus:border-brand-600 focus:outline-none focus:ring-2 focus:ring-brand-500/20 transition-all",
            leftIcon && "pl-10",
            error && "border-red-500 focus:border-red-600 focus:ring-red-500/20",
            className
          )}
          {...props}
        />
      </div>
      {error ? (
        <p className="mt-1 text-xs font-medium text-red-600">{error}</p>
      ) : (
        helperText && <p className="mt-1 text-xs text-ink-secondary">{helperText}</p>
      )}
    </div>
  );
}

export interface TextareaProps
  extends React.TextareaHTMLAttributes<HTMLTextAreaElement>,
    BaseFieldProps {}

export function Textarea({
  label,
  helperText,
  error,
  className,
  ...props
}: TextareaProps) {
  return (
    <div className="w-full">
      {label && (
        <label className="block text-xs font-bold uppercase tracking-wider text-ink-primary mb-1.5">
          {label}
        </label>
      )}
      <textarea
        className={cn(
          "w-full rounded-xl border border-surface-border bg-surface-pure px-3.5 py-2.5 text-sm text-ink-primary placeholder:text-ink-muted focus:border-brand-600 focus:outline-none focus:ring-2 focus:ring-brand-500/20 transition-all",
          error && "border-red-500 focus:border-red-600 focus:ring-red-500/20",
          className
        )}
        {...props}
      />
      {error ? (
        <p className="mt-1 text-xs font-medium text-red-600">{error}</p>
      ) : (
        helperText && <p className="mt-1 text-xs text-ink-secondary">{helperText}</p>
      )}
    </div>
  );
}

export interface SelectProps
  extends React.SelectHTMLAttributes<HTMLSelectElement>,
    BaseFieldProps {
  options: { value: string; label: string }[];
}

export function Select({
  label,
  helperText,
  error,
  options,
  className,
  ...props
}: SelectProps) {
  return (
    <div className="w-full">
      {label && (
        <label className="block text-xs font-bold uppercase tracking-wider text-ink-primary mb-1.5">
          {label}
        </label>
      )}
      <select
        className={cn(
          "w-full rounded-xl border border-surface-border bg-surface-pure px-3.5 py-2.5 text-sm text-ink-primary focus:border-brand-600 focus:outline-none focus:ring-2 focus:ring-brand-500/20 transition-all",
          error && "border-red-500",
          className
        )}
        {...props}
      >
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
      {error ? (
        <p className="mt-1 text-xs font-medium text-red-600">{error}</p>
      ) : (
        helperText && <p className="mt-1 text-xs text-ink-secondary">{helperText}</p>
      )}
    </div>
  );
}


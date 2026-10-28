"use client";

import React from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Gamepad2,
  LayoutDashboard,
  LogOut,
  Settings,
  ShieldCheck,
  Sparkles,
  Wallet,
} from "lucide-react";
import { APP_ROUTES } from "@/constants/config";
import { useAuth } from "@/hooks/useAuth";
import { THEME_TOKENS } from "@/theme/tokens";
import { UserRole } from "@/types";
import { cn, formatUSD } from "@/utils/formatters";

interface AppShellProps {
  title: string;
  subtitle?: string;
  headerAction?: React.ReactNode;
  children: React.ReactNode;
}

export function AppShell({
  title,
  subtitle,
  headerAction,
  children,
}: AppShellProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { profile, isDemoMode, switchDemoRole, logout } = useAuth();

  const currentRole: UserRole = profile?.role || "influencer";

  const navItems = [
    {
      href: APP_ROUTES.DASHBOARD,
      label: "Dashboard",
      shortLabel: "Inicio",
      icon: LayoutDashboard,
    },
    {
      href: APP_ROUTES.APPS,
      label: currentRole === "developer" ? "Mis Apps & API" : "Apps & Códigos",
      shortLabel: "Apps",
      icon: Gamepad2,
    },
    {
      href: APP_ROUTES.WALLET,
      label: currentRole === "developer" ? "Presupuesto & Recargas" : "Billetera ($100)",
      shortLabel: "Billetera",
      icon: Wallet,
    },
    {
      href: APP_ROUTES.SETTINGS,
      label: "Configuraciones",
      shortLabel: "Ajustes",
      icon: Settings,
    },
    ...(profile?.is_admin || currentRole === "admin"
      ? [
          {
            href: APP_ROUTES.ADMIN,
            label: "Admin (Pagos Manuales)",
            shortLabel: "Admin",
            icon: ShieldCheck,
          },
        ]
      : []),
  ];

  const handleLogout = async () => {
    await logout();
    router.push(APP_ROUTES.AUTH);
  };

  return (
    <div className="min-h-[100dvh] bg-surface-subtle text-ink-primary flex flex-col md:flex-row pb-20 md:pb-0">
      {/* 1. Barra Superior Compacta Exclusiva para Teléfonos Móviles */}
      <div className="md:hidden sticky top-0 z-30 bg-surface-pure/95 backdrop-blur-md border-b border-surface-border px-4 py-3 flex items-center justify-between gap-2">
        <Link href={APP_ROUTES.DASHBOARD} className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-brand-600 text-surface-pure flex items-center justify-center font-black text-base shadow-xs">
            In
          </div>
          <span className="text-lg font-black text-brand-600 tracking-tight">
            InAds
          </span>
        </Link>

        <div className="flex items-center gap-2">
          {isDemoMode && (
            <div className="flex items-center bg-surface-subtle border border-surface-border rounded-lg p-0.5">
              {(["influencer", "developer", "admin"] as UserRole[]).map((r) => (
                <button
                  key={r}
                  type="button"
                  onClick={() => switchDemoRole(r)}
                  className={cn(
                    "px-2 py-1 rounded-md text-[10px] font-extrabold transition-colors",
                    currentRole === r
                      ? "bg-brand-600 text-surface-pure"
                      : "text-ink-secondary"
                  )}
                >
                  {r === "influencer" ? "Creador" : r === "developer" ? "Dev" : "Admin"}
                </button>
              ))}
            </div>
          )}

          <button
            type="button"
            onClick={handleLogout}
            className="p-2 rounded-lg text-ink-secondary hover:text-red-600 hover:bg-red-50"
            aria-label="Cerrar sesión"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* 2. Sidebar Lateral Profesional para Escritorio (Desktop) */}
      <aside className="hidden md:flex md:w-64 bg-surface-pure border-r border-surface-border flex-col justify-between shrink-0 sticky top-0 h-screen">
        <div className="p-5">
          <Link
            href={APP_ROUTES.DASHBOARD}
            className="flex items-center gap-2.5 mb-7"
          >
            <div className="w-9 h-9 rounded-xl bg-brand-600 text-surface-pure flex items-center justify-center font-black text-lg shadow-sm">
              In
            </div>
            <div>
              <span className="text-xl font-extrabold tracking-tight text-brand-600">
                InAds
              </span>
              <span className="block text-[10px] font-bold uppercase tracking-widest text-ink-secondary">
                {currentRole === "developer"
                  ? "Indie Dev Portal"
                  : currentRole === "admin"
                  ? "Admin Control"
                  : "Creator Network"}
              </span>
            </div>
          </Link>

          <nav className="space-y-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-semibold transition-all",
                    isActive
                      ? "bg-brand-600 text-surface-pure shadow-xs"
                      : "text-ink-secondary hover:text-ink-primary hover:bg-surface-muted"
                  )}
                >
                  <Icon className="w-4 h-4 shrink-0" />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Pie de Sidebar */}
        <div className="p-4 border-t border-surface-border space-y-3 bg-surface-subtle/60">
          {currentRole === "influencer" && profile && (
            <div className="p-3 rounded-xl bg-surface-pure border border-surface-border">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-ink-secondary">Disponible</span>
                <span className="font-extrabold text-brand-600">
                  {formatUSD(profile.available_balance)}
                </span>
              </div>
              <div className="w-full h-1.5 bg-surface-muted rounded-full mt-2 overflow-hidden">
                <div
                  className="h-full bg-brand-600 rounded-full"
                  style={{
                    width: `${Math.min(100, (profile.available_balance / 100) * 100)}%`,
                  }}
                />
              </div>
              <p className="text-[11px] text-ink-secondary mt-1.5">
                Meta de retiro: $100.00 USD
              </p>
            </div>
          )}

          {isDemoMode && (
            <div className="p-2.5 rounded-xl bg-brand-50/70 border border-brand-200">
              <div className="flex items-center gap-1.5 text-[11px] font-bold text-brand-700 mb-1.5">
                <Sparkles className="w-3.5 h-3.5" />
                <span>Cambiar Vista (Rol):</span>
              </div>
              <div className="grid grid-cols-3 gap-1">
                {(["influencer", "developer", "admin"] as UserRole[]).map((r) => (
                  <button
                    key={r}
                    type="button"
                    onClick={() => switchDemoRole(r)}
                    className={cn(
                      "px-2 py-1 rounded-lg text-[11px] font-bold capitalize transition-colors",
                      currentRole === r
                        ? "bg-brand-600 text-surface-pure"
                        : "bg-surface-pure text-ink-secondary hover:text-ink-primary border border-surface-border"
                    )}
                  >
                    {r === "influencer" ? "Creador" : r === "developer" ? "Dev" : "Admin"}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="flex items-center justify-between gap-2 pt-1">
            <div className="min-w-0">
              <p className="text-xs font-bold text-ink-primary truncate">
                {profile?.full_name || "Usuario InAds"}
              </p>
              <p className="text-[11px] text-ink-secondary truncate">
                {profile?.email || "conectado@inads.io"}
              </p>
            </div>
            <button
              type="button"
              onClick={handleLogout}
              className="p-2 rounded-lg text-ink-secondary hover:text-red-600 hover:bg-red-50 transition-colors"
              title="Cerrar sesión"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* 3. Área de Contenido Principal */}
      <main className="flex-1 min-w-0">
        <header className="bg-surface-pure border-b border-surface-border px-4 sm:px-6 md:px-10 py-5 sm:py-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className={THEME_TOKENS.typography.pageTitle}>{title}</h1>
            {subtitle && (
              <p className="text-xs sm:text-sm text-ink-secondary mt-1">
                {subtitle}
              </p>
            )}
          </div>
          {headerAction && <div className="shrink-0">{headerAction}</div>}
        </header>

        <div className="p-4 sm:p-6 md:p-10 max-w-7xl mx-auto">{children}</div>
      </main>

      {/* 4. Barra de Navegación Inferior Fija para Teléfonos Móviles (Estilo App Nativa) */}
      <nav className="md:hidden fixed bottom-0 inset-x-0 z-40 bg-surface-pure/95 backdrop-blur-md border-t border-surface-border px-2 py-1.5 flex items-center justify-around shadow-elevated">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex flex-col items-center justify-center py-1 px-2.5 rounded-xl text-[11px] font-bold transition-colors",
                isActive
                  ? "text-brand-600 bg-brand-50"
                  : "text-ink-secondary hover:text-ink-primary"
              )}
            >
              <Icon className="w-5 h-5 mb-0.5" />
              <span>{item.shortLabel}</span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}

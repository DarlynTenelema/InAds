"use client";

import React, { useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Gamepad2,
  LayoutDashboard,
  Loader2,
  LogOut,
  Mail,
  Settings,
  ShieldCheck,
  Wallet,
} from "lucide-react";
import { APP_ROUTES, BUSINESS_RULES } from "@/constants/config";
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
  const { profile, isLoading, logout } = useAuth();

  useEffect(() => {
    if (isLoading) return;
    if (!profile || !profile.role) {
      router.replace(APP_ROUTES.AUTH);
      return;
    }
    if (
      pathname.startsWith(APP_ROUTES.ADMIN) &&
      !profile.is_admin &&
      profile.role !== "admin"
    ) {
      router.replace(APP_ROUTES.DASHBOARD);
    }
  }, [isLoading, profile, pathname, router]);

  if (isLoading || !profile || !profile.role) {
    return (
      <div className="min-h-[100dvh] bg-surface-subtle flex flex-col items-center justify-center gap-3 text-ink-secondary">
        <Loader2 className="w-7 h-7 animate-spin text-brand-600" />
        <p className="text-xs font-bold">Verificando tu sesión segura en InAds...</p>
      </div>
    );
  }

  const currentRole: UserRole = profile.role;

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
    ...(profile.is_admin || currentRole === "admin"
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
          <Image
            src="/logo.png"
            alt="InAds"
            width={32}
            height={32}
            className="w-8 h-8 object-contain rounded-lg shadow-2xs"
            priority
          />
          <span className="text-lg font-black text-brand-600 tracking-tight">
            InAds
          </span>
        </Link>

        <div className="flex items-center gap-2">
          <span className="px-2.5 py-1 rounded-lg bg-brand-50 border border-brand-200 text-[10px] font-extrabold uppercase text-brand-700">
            {currentRole === "developer"
              ? "Desarrollador"
              : currentRole === "admin"
              ? "Admin"
              : "Creador"}
          </span>
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
            <Image
              src="/logo.png"
              alt="InAds"
              width={38}
              height={38}
              className="w-9 h-9 object-contain rounded-xl shadow-xs"
              priority
            />
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
          {currentRole === "influencer" && (
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

          <div className="flex items-center justify-between gap-2 pt-1">
            <div className="min-w-0">
              <p className="text-xs font-bold text-ink-primary truncate">
                {profile.full_name || "Usuario InAds"}
              </p>
              <p className="text-[11px] text-ink-secondary truncate">
                {profile.email}
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

          <a
            href={`mailto:${BUSINESS_RULES.SUPPORT_EMAIL}`}
            className="flex items-center gap-1.5 pt-2 border-t border-surface-border text-[11px] font-semibold text-ink-secondary hover:text-brand-600 transition-colors truncate"
            title={`Contactar soporte: ${BUSINESS_RULES.SUPPORT_EMAIL}`}
          >
            <Mail className="w-3.5 h-3.5 text-brand-600 shrink-0" />
            <span className="truncate">Soporte: {BUSINESS_RULES.SUPPORT_EMAIL}</span>
          </a>
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

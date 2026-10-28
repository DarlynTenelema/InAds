import React from "react";
import Link from "next/link";
import { ArrowLeft, FileText } from "lucide-react";
import { APP_ROUTES } from "@/constants/config";

export default function TermsOfServicePage() {
  return (
    <div className="min-h-[100dvh] bg-surface-pure text-ink-primary flex flex-col justify-between">
      <header className="w-full max-w-4xl mx-auto px-4 sm:px-8 pt-6 pb-4 flex items-center justify-between border-b border-surface-border">
        <Link href={APP_ROUTES.AUTH} className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-brand-600 text-surface-pure flex items-center justify-center font-black text-lg">
            In
          </div>
          <span className="text-xl font-black tracking-tight text-brand-600">
            InAds
          </span>
        </Link>

        <Link
          href={APP_ROUTES.AUTH}
          className="inline-flex items-center gap-1.5 text-xs font-bold text-brand-600 hover:underline"
        >
          <ArrowLeft className="w-4 h-4" />
          Volver al Inicio
        </Link>
      </header>

      <main className="w-full max-w-4xl mx-auto px-4 sm:px-8 py-12 flex-1">
        <div className="bg-surface-pure border border-surface-border rounded-2xl p-6 sm:p-10 shadow-card min-h-[360px]">
          <div className="flex items-center gap-2.5 mb-6 pb-4 border-b border-surface-border">
            <FileText className="w-6 h-6 text-brand-600" />
            <h1 className="text-2xl sm:text-3xl font-black text-brand-600 tracking-tight">
              Condiciones del Servicio
            </h1>
          </div>

          {/* Espacio limpio sin texto predefinido */}
          <div className="min-h-[220px]" />
        </div>
      </main>

      <footer className="w-full border-t border-surface-border py-4 px-4 sm:px-8 text-center text-xs text-ink-secondary">
        InAds © {new Date().getFullYear()}
      </footer>
    </div>
  );
}


import React from "react";
import Link from "next/link";
import { ArrowLeft, FileText } from "lucide-react";
import { APP_ROUTES } from "@/constants/config";

export default function TermsOfServicePage() {
  const lastUpdated = "28 de octubre de 2026";

  return (
    <div className="min-h-[100dvh] bg-surface-pure text-ink-primary flex flex-col justify-between">
      <header className="w-full max-w-4xl mx-auto px-4 sm:px-8 pt-6 pb-4 flex items-center justify-between border-b border-surface-border">
        <Link href={APP_ROUTES.AUTH} className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-brand-600 text-surface-pure flex items-center justify-center font-black text-lg">
            in
          </div>
          <span className="text-xl font-black tracking-tight text-ink-primary">
            inAds
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

      <main className="w-full max-w-4xl mx-auto px-4 sm:px-8 py-10 flex-1">
        <article className="bg-surface-pure border border-surface-border rounded-2xl p-6 sm:p-10 shadow-card">
          <div className="flex items-center gap-3 mb-4 pb-4 border-b border-surface-border">
            <FileText className="w-7 h-7 text-brand-600" />
            <div>
              <h1 className="text-2xl sm:text-3xl font-black text-ink-primary tracking-tight">
                Condiciones del Servicio de inAds
              </h1>
              <p className="text-xs text-ink-secondary mt-1">
                Última actualización: {lastUpdated}
              </p>
            </div>
          </div>

          <div className="space-y-6 text-sm text-ink-secondary leading-relaxed">
            <section>
              <h2 className="text-base font-bold text-ink-primary mb-2">
                1. Aceptación de los Términos
              </h2>
              <p>
                Al registrarse, acceder o utilizar la plataforma <strong>inAds</strong> (en adelante, &quot;el Servicio&quot;), usted acepta quedar legalmente vinculado por las presentes Condiciones del Servicio y por nuestra Política de Privacidad. Si no está de acuerdo con alguno de estos términos, le rogamos que no utilice la plataforma.
              </p>
            </section>

            <section>
              <h2 className="text-base font-bold text-ink-primary mb-2">
                2. Descripción del Servicio y Roles
              </h2>
              <p>
                inAds es un ecosistema que facilita la adquisición y monetización de aplicaciones y videojuegos móviles/web a través del marketing de creadores:
              </p>
              <ul className="list-disc list-inside mt-2 space-y-1.5 pl-2">
                <li>
                  <strong className="text-ink-primary">Desarrolladores:</strong> Crean campañas de promoción depositando fondos prepagados y configuran eventos de validación de referidos dentro de sus juegos o aplicaciones mediante nuestra API.
                </li>
                <li>
                  <strong className="text-ink-primary">Creadores de Contenido:</strong> Obtienen códigos de referido exclusivos para promover las aplicaciones participantes ante su comunidad de seguidores y acumulan recompensas por cada conversión efectivamente validada.
                </li>
              </ul>
            </section>

            <section>
              <h2 className="text-base font-bold text-ink-primary mb-2">
                3. Modelo de Tarifas y Pagos
              </h2>
              <p>
                El modelo económico de inAds opera bajo transparencia absoluta:
              </p>
              <ul className="list-disc list-inside mt-2 space-y-1.5 pl-2">
                <li>Cada referido calificado y validado por el backend tiene un coste de $0.15 USD fijado por la plataforma para el desarrollador.</li>
                <li>El creador recibe una recompensa neta de $0.10 USD por referido validado.</li>
                <li>inAds retiene una comisión de servicio de $0.05 USD por infraestructura, verificación antifraude y mantenimiento operativo.</li>
                <li>El umbral mínimo para solicitar un retiro de ganancias acumuladas es de $100.00 USD. Los retiros son revisados y procesados de manera segura dentro de un plazo operativo de 24 a 72 horas hábiles.</li>
              </ul>
            </section>

            <section>
              <h2 className="text-base font-bold text-ink-primary mb-2">
                4. Conducta Prohibida y Lucha Antifraude
              </h2>
              <p>
                Queda estrictamente prohibido y será motivo de suspensión inmediata y cancelación de fondos retenidos:
              </p>
              <ul className="list-disc list-inside mt-2 space-y-1 pl-2">
                <li>El uso de bots, emuladores automatizados, granjas de clics o proxies para generar referidos fraudulentos.</li>
                <li>La creación de cuentas múltiples por una misma persona para reclamar referidos propios.</li>
                <li>Engañar a los usuarios finales o realizar publicidad engañosa respecto a las características de las aplicaciones promovidas.</li>
                <li>Cualquier intento de eludir los controles de seguridad, manipular la API o vulnerar las políticas de privacidad.</li>
              </ul>
            </section>

            <section>
              <h2 className="text-base font-bold text-ink-primary mb-2">
                5. Modificaciones y Cancelación de Cuenta
              </h2>
              <p>
                Nos reservamos el derecho de modificar estas condiciones en cualquier momento. Los cambios significativos serán debidamente notificados a través de la plataforma. Cualquier usuario puede solicitar la baja voluntaria de su cuenta en cualquier momento contactando a nuestro soporte.
              </p>
            </section>

            <section>
              <h2 className="text-base font-bold text-ink-primary mb-2">
                6. Contacto
              </h2>
              <p>
                Para cualquier consulta jurídica o de soporte relacionada con estas condiciones:
              </p>
              <p className="mt-2 font-medium text-ink-primary">
                Soporte:{" "}
                <a
                  href="mailto:darlyndavid2026@gmail.com"
                  className="text-brand-600 underline"
                >
                  darlyndavid2026@gmail.com
                </a>
              </p>
            </section>
          </div>
        </article>
      </main>

      <footer className="w-full border-t border-surface-border py-4 px-4 sm:px-8 text-center text-xs text-ink-secondary">
        inAds © {new Date().getFullYear()} — Plataforma de Monetización y Crecimiento.
      </footer>
    </div>
  );
}

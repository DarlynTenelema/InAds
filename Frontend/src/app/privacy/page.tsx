import React from "react";
import Link from "next/link";
import { ArrowLeft, Shield } from "lucide-react";
import { APP_ROUTES } from "@/constants/config";

export default function PrivacyPolicyPage() {
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
            <Shield className="w-7 h-7 text-brand-600" />
            <div>
              <h1 className="text-2xl sm:text-3xl font-black text-ink-primary tracking-tight">
                Política de Privacidad de inAds
              </h1>
              <p className="text-xs text-ink-secondary mt-1">
                Última actualización: {lastUpdated}
              </p>
            </div>
          </div>

          <div className="space-y-6 text-sm text-ink-secondary leading-relaxed">
            <section>
              <h2 className="text-base font-bold text-ink-primary mb-2">
                1. Información General y Responsable del Tratamiento
              </h2>
              <p>
                <strong>inAds</strong> (disponible en{" "}
                <span className="text-brand-600 font-medium">https://inads.quinindews.com</span>) es una plataforma diseñada para conectar a desarrolladores independientes de aplicaciones y juegos con creadores de contenido y micro-influencers para la promoción y adquisición de usuarios mediante códigos de referido verificados.
              </p>
              <p className="mt-2">
                Nos tomamos muy en serio la confidencialidad y protección de sus datos personales. Esta Política de Privacidad describe de manera transparente qué información recopilamos, cómo la utilizamos y qué medidas adoptamos para garantizar su seguridad, en pleno cumplimiento con los requisitos de las políticas de datos de usuario de Google y las normativas aplicables.
              </p>
            </section>

            <section>
              <h2 className="text-base font-bold text-ink-primary mb-2">
                2. Datos que Recopilamos
              </h2>
              <p>
                Solo recopilamos los datos estrictamente necesarios para prestar y asegurar las funciones de la plataforma:
              </p>
              <ul className="list-disc list-inside mt-2 space-y-1.5 pl-2">
                <li>
                  <strong className="text-ink-primary">Autenticación con Google (OAuth 2.0):</strong> Al iniciar sesión mediante Google, solicitamos acceso a su dirección de correo electrónico principal (<code>email</code>) y a su perfil público básico (<code>profile</code>, nombre completo y fotografía de avatar). No solicitamos acceso a correos electrónicos privados, contactos, Google Drive ni a ningún otro servicio sensible de su cuenta de Google.
                </li>
                <li>
                  <strong className="text-ink-primary">Datos de Perfil y Plataforma:</strong> Rol de usuario seleccionado (Desarrollador o Creador), códigos de referido generados, enlaces de redes sociales proporcionados voluntariamente por los creadores y balances de recompensas acumuladas.
                </li>
                <li>
                  <strong className="text-ink-primary">Información de Transacciones y Retiros:</strong> Para procesar pagos y depósitos, recopilamos los identificadores de cuenta proporcionados por el usuario (dirección de wallet o cuenta bancaria) y los comprobantes de depósito emitidos por el desarrollador.
                </li>
                <li>
                  <strong className="text-ink-primary">Datos Técnicos y de Registro:</strong> Dirección IP, tipo de navegador y registros de auditoría de actividad para prevenir fraudes, multicuentas y abusos en el sistema de referidos.
                </li>
              </ul>
            </section>

            <section>
              <h2 className="text-base font-bold text-ink-primary mb-2">
                3. Finalidad del Tratamiento de los Datos
              </h2>
              <p>Utilizamos la información recopilada exclusivamente para los siguientes fines:</p>
              <ul className="list-disc list-inside mt-2 space-y-1 pl-2">
                <li>Autenticar su identidad y permitir un acceso seguro a su panel de control.</li>
                <li>Atribuir con precisión las conversiones y recompensas a los creadores de contenido correspondientes.</li>
                <li>Gestionar los depósitos de saldo de los desarrolladores y procesar los retiros solicitados por los creadores.</li>
                <li>Detectar y prevenir actividades fraudulentas o violaciones de nuestras condiciones del servicio.</li>
                <li>Enviar notificaciones operativas esenciales sobre el estado de sus retiros, campañas o seguridad de la cuenta.</li>
              </ul>
            </section>

            <section>
              <h2 className="text-base font-bold text-ink-primary mb-2">
                4. Uso de Datos de las APIs de Google (Google API Services User Data Policy)
              </h2>
              <p>
                El uso que hace <strong>inAds</strong> de la información recibida a través de las APIs de Google se adhiere rigurosamente a la{" "}
                <a
                  href="https://developers.google.com/terms/api-services-user-data-policy"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-brand-600 underline font-medium"
                >
                  Política de Datos de Usuario de los Servicios de API de Google
                </a>
                , incluidos los requisitos de Uso Limitado (<em>Limited Use Requirements</em>).
              </p>
              <p className="mt-2">
                En particular:
              </p>
              <ul className="list-disc list-inside mt-1.5 space-y-1 pl-2">
                <li>
                  <strong>No vendemos</strong> ni transferimos sus datos de usuario de Google a terceros, empresas de publicidad ni corredores de datos.
                </li>
                <li>
                  <strong>No utilizamos</strong> datos de usuario de Google para servir anuncios publicitarios personalizados o basados en intereses.
                </li>
                <li>
                  <strong>No utilizamos</strong> sus datos personales obtenidos de Google para entrenar modelos de inteligencia artificial o aprendizaje automático sin su consentimiento expreso.
                </li>
              </ul>
            </section>

            <section>
              <h2 className="text-base font-bold text-ink-primary mb-2">
                5. Almacenamiento, Retención y Seguridad de los Datos
              </h2>
              <p>
                Implementamos estándares de seguridad de nivel bancario e industrial. Todas las comunicaciones viajan cifradas bajo HTTPS/TLS con certificados SSL modernos. Las bases de datos operan con políticas estrictas de seguridad a nivel de fila (Row-Level Security - RLS) que impiden el acceso no autorizado de un usuario a los datos de otro.
              </p>
              <p className="mt-2">
                Conservamos su información mientras su cuenta permanezca activa. Si decide eliminar su cuenta, sus datos identificables serán suprimidos de nuestros sistemas activos de manera permanente.
              </p>
            </section>

            <section>
              <h2 className="text-base font-bold text-ink-primary mb-2">
                6. Derechos del Usuario (Acceso, Rectificación y Supresión)
              </h2>
              <p>
                Usted tiene pleno derecho a acceder a sus datos personales, solicitar su corrección si son inexactos, solicitar su portabilidad o pedir la supresión total de su cuenta e información asociada. Para ejercer estos derechos, puede comunicarse directamente a nuestro correo de contacto indicado a continuación.
              </p>
            </section>

            <section>
              <h2 className="text-base font-bold text-ink-primary mb-2">
                7. Contacto
              </h2>
              <p>
                Si tiene preguntas, comentarios o solicitudes respecto a esta Política de Privacidad o al tratamiento de sus datos personales, puede contactar al equipo responsable en:
              </p>
              <p className="mt-2 font-medium text-ink-primary">
                Correo electrónico:{" "}
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

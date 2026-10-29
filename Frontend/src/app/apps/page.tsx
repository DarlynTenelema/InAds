"use client";

import React, { useCallback, useEffect, useState } from "react";
import {
  Check,
  Code2,
  Copy,
  ExternalLink,
  Gamepad2,
  KeyRound,
  Loader2,
  Megaphone,
  Pause,
  Play,
  Plus,
  RefreshCw,
  Search,
  Sparkles,
} from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import {
  Badge,
  Button,
  Card,
  Input,
  Modal,
  Select,
  Textarea,
} from "@/components/ui";
import { BUSINESS_RULES } from "@/constants/config";
import { useAuth } from "@/hooks/useAuth";
import { useCopyToClipboard } from "@/hooks/useCopyToClipboard";
import { inadsApi, resolveApiBaseUrl } from "@/services/api";
import { AppItem, InfluencerCampaign } from "@/types";
import { cn, formatNumber, formatUSD } from "@/utils/formatters";

export default function AppsMarketplacePage() {
  const { profile } = useAuth();
  const { copyText, isCopied } = useCopyToClipboard();

  const [appsList, setAppsList] = useState<AppItem[]>([]);
  const [campaigns, setCampaigns] = useState<InfluencerCampaign[]>([]);
  const [isLoadingApps, setIsLoadingApps] = useState<boolean>(true);
  const [pageError, setPageError] = useState<string | null>(null);

  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");

  // Modal de detalle de App para el Influencer (Código + Qué decir)
  const [selectedAppForModal, setSelectedAppForModal] = useState<AppItem | null>(
    null
  );
  const [joiningAppId, setJoiningAppId] = useState<string | null>(null);

  // Modal de "+ Agregar Producto" para el Desarrollador
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isCreatingApp, setIsCreatingApp] = useState(false);
  const [newlyGeneratedApiKey, setNewlyGeneratedApiKey] = useState<string | null>(
    null
  );
  const [regeneratingKeyAppId, setRegeneratingKeyAppId] = useState<string | null>(
    null
  );
  const [togglingStatusAppId, setTogglingStatusAppId] = useState<string | null>(
    null
  );
  const [isDocsModalOpen, setIsDocsModalOpen] = useState(false);

  // Estado del formulario de nueva App (Developer)
  const [newAppName, setNewAppName] = useState("");
  const [newAppCategory, setNewAppCategory] = useState("Juegos Indie");
  const [newAppStoreUrl, setNewAppStoreUrl] = useState("");
  const [newAppDescription, setNewAppDescription] = useState("");
  const [newAppPitch, setNewAppPitch] = useState("");

  const role = profile?.role || "influencer";

  const loadApps = useCallback(async () => {
    setIsLoadingApps(true);
    setPageError(null);
    try {
      const res = await inadsApi.listApps();
      setAppsList(res.apps || []);
      if (res.my_campaigns) {
        setCampaigns(res.my_campaigns);
      }
    } catch (err: any) {
      setPageError(err?.message || "No se pudo cargar el catálogo de aplicaciones.");
    } finally {
      setIsLoadingApps(false);
    }
  }, []);

  useEffect(() => {
    loadApps();
  }, [loadApps]);

  const categories = ["all", "Juegos Indie", "RPG / Acción", "Estrategia", "Apps Utilidad"];

  const filteredApps = appsList.filter((app) => {
    if (role === "influencer" && app.status !== "active") return false;
    const matchesSearch =
      app.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      app.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCat =
      selectedCategory === "all" ||
      app.category.toLowerCase() === selectedCategory.toLowerCase() ||
      (selectedCategory === "Juegos Indie" && app.category === "game");
    return matchesSearch && matchesCat;
  });

  // Abrir modal del Influencer obteniendo o generando su código real en el Backend
  const handleOpenInfluencerAppModal = async (app: AppItem) => {
    setPageError(null);
    const existing = campaigns.find((c) => c.app_id === app.id);
    if (existing) {
      setSelectedAppForModal(app);
      return;
    }

    setJoiningAppId(app.id);
    try {
      const res = await inadsApi.joinAppCampaign(app.id);
      if (res.campaign) {
        setCampaigns((prev) => [res.campaign, ...prev.filter((c) => c.app_id !== app.id)]);
      }
      setSelectedAppForModal(app);
    } catch (err: any) {
      setPageError(err?.message || "No se pudo generar tu código para esta aplicación.");
    } finally {
      setJoiningAppId(null);
    }
  };

  // Crear nueva App como Desarrollador en el Backend
  const handleCreateDeveloperApp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAppName.trim() || !newAppStoreUrl.trim() || !newAppPitch.trim()) return;

    setIsCreatingApp(true);
    setPageError(null);
    try {
      const res = await inadsApi.createApp({
        name: newAppName.trim(),
        description: newAppDescription.trim(),
        category: newAppCategory,
        store_url: newAppStoreUrl.trim(),
        pitch_guidelines: newAppPitch.trim(),
        min_sessions_required: BUSINESS_RULES.DEFAULT_MIN_SESSIONS,
      });

      if (res.app) {
        setAppsList((prev) => [res.app, ...prev]);
      }
      setNewlyGeneratedApiKey(res.api_key);
      setNewAppName("");
      setNewAppStoreUrl("");
      setNewAppDescription("");
      setNewAppPitch("");
    } catch (err: any) {
      setPageError(err?.message || "Error al registrar la aplicación.");
    } finally {
      setIsCreatingApp(false);
    }
  };

  const handleToggleDevAppStatus = async (app: AppItem) => {
    const nextStatus = app.status === "active" ? "paused" : "active";
    setTogglingStatusAppId(app.id);
    setPageError(null);
    try {
      const res = await inadsApi.toggleAppStatus(app.id, nextStatus);
      if (res.app) {
        setAppsList((prev) => prev.map((a) => (a.id === app.id ? res.app : a)));
      }
    } catch (err: any) {
      setPageError(err?.message || "No se pudo actualizar el estado de la aplicación.");
    } finally {
      setTogglingStatusAppId(null);
    }
  };

  const handleRegenerateApiKey = async (appId: string) => {
    setRegeneratingKeyAppId(appId);
    setPageError(null);
    try {
      const res = await inadsApi.regenerateApiKey(appId);
      setAppsList((prev) =>
        prev.map((a) =>
          a.id === appId ? { ...a, api_key_prefix: res.api_key_prefix } : a
        )
      );
      setNewlyGeneratedApiKey(res.api_key);
      setIsCreateModalOpen(true);
    } catch (err: any) {
      setPageError(err?.message || "No se pudo regenerar la API Key.");
    } finally {
      setRegeneratingKeyAppId(null);
    }
  };

  const activeModalCampaign = selectedAppForModal
    ? campaigns.find((c) => c.app_id === selectedAppForModal.id)
    : null;

  return (
    <AppShell
      title={
        role === "developer"
          ? "Mis Apps & Conexión al Sistema"
          : "Apps & Empresas Disponibles"
      }
      subtitle={
        role === "developer"
          ? "Agrega tu juego o app, configura el guion para los influencers y conecta nuestra API."
          : "Selecciona el juego o app con el que desees trabajar para desplegar tu código y guion promocional."
      }
      headerAction={
        role === "developer" ? (
          <div className="flex flex-wrap items-center gap-2.5">
            <Button
              variant="outline"
              size="md"
              leftIcon={<Code2 className="w-4 h-4" />}
              onClick={() => setIsDocsModalOpen(true)}
            >
              Documentación API
            </Button>
            <Button
              variant="primary"
              size="md"
              leftIcon={<Plus className="w-4 h-4" />}
              onClick={() => {
                setNewlyGeneratedApiKey(null);
                setIsCreateModalOpen(true);
              }}
            >
              + Publicar Nueva App
            </Button>
          </div>
        ) : undefined
      }
    >
      <div className="space-y-6">
        {pageError && (
          <div className="p-4 rounded-2xl bg-red-50 border border-red-200 text-xs sm:text-sm font-bold text-red-700">
            {pageError}
          </div>
        )}

        {/* Barra de Búsqueda y Filtros por Categoría */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-surface-pure border border-surface-border rounded-2xl p-4 shadow-card">
          <div className="w-full md:w-80">
            <Input
              placeholder="Buscar juego o aplicación..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              leftIcon={<Search className="w-4 h-4" />}
            />
          </div>

          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0">
            {categories.map((cat) => {
              const active = selectedCategory === cat;
              return (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setSelectedCategory(cat)}
                  className={cn(
                    "px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-colors",
                    active
                      ? "bg-brand-600 text-surface-pure"
                      : "bg-surface-subtle text-ink-secondary hover:text-ink-primary border border-surface-border"
                  )}
                >
                  {cat === "all" ? "Todas las Categorías" : cat}
                </button>
              );
            })}
          </div>
        </div>

        {/* Grid de Tarjetas de Apps */}
        {isLoadingApps ? (
          <div className="p-16 bg-surface-pure border border-surface-border rounded-2xl flex items-center justify-center gap-2 text-xs font-bold text-ink-secondary">
            <Loader2 className="w-5 h-5 animate-spin text-brand-600" />
            <span>Cargando catálogo de aplicaciones...</span>
          </div>
        ) : filteredApps.length === 0 ? (
          <div className="p-12 bg-surface-pure border border-surface-border rounded-2xl text-center space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-brand-50 text-brand-600 flex items-center justify-center mx-auto">
              <Gamepad2 className="w-6 h-6" />
            </div>
            <h3 className="text-base font-extrabold text-ink-primary">
              {role === "developer"
                ? "Aún no tienes aplicaciones registradas"
                : "No hay aplicaciones activas en esta categoría"}
            </h3>
            <p className="text-xs text-ink-secondary max-w-md mx-auto">
              {role === "developer"
                ? "Publica tu primer juego o aplicación para obtener tu API Key y recibir jugadores referidos por micro-influencers."
                : "Cuando los desarrolladores activen campañas con presupuesto disponible, aparecerán aquí listas para promocionar."}
            </p>
            {role === "developer" && (
              <div className="pt-2">
                <Button
                  onClick={() => {
                    setNewlyGeneratedApiKey(null);
                    setIsCreateModalOpen(true);
                  }}
                  leftIcon={<Plus className="w-4 h-4" />}
                >
                  + Publicar Nueva App
                </Button>
              </div>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {filteredApps.map((app) => {
              const existingCamp = campaigns.find((c) => c.app_id === app.id);

              return (
                <Card
                  key={app.id}
                  interactive
                  className="flex flex-col justify-between h-full"
                >
                  <div>
                    {/* Cabecera de la Tarjeta */}
                    <div className="flex items-start justify-between gap-3 mb-4">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-2xl bg-brand-50 border border-brand-200 text-brand-600 flex items-center justify-center shrink-0">
                          <Gamepad2 className="w-6 h-6" />
                        </div>
                        <div>
                          <span className="text-[11px] font-bold uppercase tracking-wider text-brand-600">
                            {app.category}
                          </span>
                          <h3 className="text-base font-extrabold text-ink-primary leading-snug">
                            {app.name}
                          </h3>
                        </div>
                      </div>
                      <Badge status={app.status} />
                    </div>

                    {/* Descripción */}
                    <p className="text-xs text-ink-secondary leading-relaxed mb-4">
                      {app.description}
                    </p>

                    {/* Métricas de la Tarjeta */}
                    <div className="grid grid-cols-2 gap-2.5 p-3 rounded-xl bg-surface-subtle border border-surface-border mb-5">
                      <div>
                        <span className="text-[10px] font-bold uppercase text-ink-secondary block">
                          {role === "developer"
                            ? "Costo por Jugador"
                            : "Tu Pago por Usuario"}
                        </span>
                        <span className="text-base font-black text-brand-600">
                          {role === "developer"
                            ? formatUSD(app.cost_per_user || 0.15)
                            : formatUSD(app.influencer_reward)}
                        </span>
                      </div>
                      <div>
                        <span className="text-[10px] font-bold uppercase text-ink-secondary block">
                          Presupuesto Activo
                        </span>
                        <span className="text-sm font-extrabold text-ink-primary">
                          {formatUSD(app.campaign_balance)}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Pie de Tarjeta según Rol */}
                  {role === "developer" ? (
                    <div className="space-y-3 pt-3 border-t border-surface-border">
                      <div className="flex items-center justify-between text-xs gap-2">
                        <span className="font-mono text-ink-secondary truncate">
                          {app.api_key_prefix}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleRegenerateApiKey(app.id)}
                          disabled={regeneratingKeyAppId === app.id}
                          className="text-[11px] font-bold text-brand-600 hover:underline inline-flex items-center gap-1 shrink-0"
                        >
                          <RefreshCw
                            className={cn(
                              "w-3 h-3",
                              regeneratingKeyAppId === app.id && "animate-spin"
                            )}
                          />
                          Regenerar Key
                        </button>
                      </div>
                      <div className="flex items-center justify-between text-xs text-ink-secondary">
                        <span>
                          Canjes:{" "}
                          <strong className="text-ink-primary">
                            {formatNumber(app.total_claims || 0)}
                          </strong>
                        </span>
                        <span>
                          Verificados:{" "}
                          <strong className="text-ink-primary">
                            {formatNumber(app.total_verified)}
                          </strong>
                        </span>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleToggleDevAppStatus(app)}
                          isLoading={togglingStatusAppId === app.id}
                          disabled={
                            app.status !== "active" &&
                            app.campaign_balance < BUSINESS_RULES.COST_PER_VERIFIED_USER
                          }
                          leftIcon={
                            app.status === "active" ? (
                              <Pause className="w-3.5 h-3.5" />
                            ) : (
                              <Play className="w-3.5 h-3.5" />
                            )
                          }
                        >
                          {app.status === "active" ? "Pausar" : "Activar"}
                        </Button>
                        <Button
                          variant="secondary"
                          size="sm"
                          leftIcon={<Code2 className="w-3.5 h-3.5" />}
                          onClick={() => setIsDocsModalOpen(true)}
                        >
                          Conectar API
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="pt-3 border-t border-surface-border space-y-2.5">
                      {existingCamp && (
                        <div className="flex items-center justify-between px-3 py-1.5 rounded-lg bg-brand-50 border border-brand-200 text-xs">
                          <span className="font-semibold text-brand-700">Tu código:</span>
                          <span className="font-mono font-black text-brand-600">
                            {existingCamp.referral_code}
                          </span>
                        </div>
                      )}
                      <Button
                        variant="primary"
                        size="md"
                        fullWidth
                        isLoading={joiningAppId === app.id}
                        leftIcon={<Sparkles className="w-4 h-4" />}
                        onClick={() => handleOpenInfluencerAppModal(app)}
                      >
                        {existingCamp
                          ? "Ver Código y Guion de Promoción"
                          : "Trabajar con esta App (Obtener Código)"}
                      </Button>
                    </div>
                  )}
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* =====================================================================
          MODAL 1 (INFLUENCER): Despliegue de Código y Qué Decir en el Video
         ===================================================================== */}
      <Modal
        isOpen={Boolean(selectedAppForModal)}
        onClose={() => setSelectedAppForModal(null)}
        title={selectedAppForModal?.name || "Detalles de Promoción"}
        subtitle="Copia tu código único y utiliza este guion recomendado en tus redes sociales."
        maxWidthClass="max-w-xl"
      >
        {selectedAppForModal && activeModalCampaign && (
          <div className="space-y-5">
            {/* Paso 1: Código para Copiar */}
            <div className="p-4 rounded-2xl bg-brand-50/70 border border-brand-200 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-extrabold uppercase tracking-wider text-brand-700">
                  1. Tu Código Único de Creador ($0.10 USD / seguidor verificado)
                </span>
                <Badge label="Activo" variant="green" />
              </div>

              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-surface-pure p-3.5 rounded-xl border border-brand-200">
                <span className="text-xl sm:text-2xl font-mono font-black text-brand-600 tracking-wider text-center sm:text-left">
                  {activeModalCampaign.referral_code}
                </span>
                <Button
                  size="sm"
                  variant={isCopied("modal_code") ? "secondary" : "primary"}
                  leftIcon={
                    isCopied("modal_code") ? (
                      <Check className="w-4 h-4" />
                    ) : (
                      <Copy className="w-4 h-4" />
                    )
                  }
                  onClick={() =>
                    copyText(activeModalCampaign.referral_code, "modal_code")
                  }
                >
                  {isCopied("modal_code") ? "¡Código Copiado!" : "Copiar Código"}
                </Button>
              </div>
              <p className="text-xs text-ink-secondary">
                Tus seguidores solo deben descargar la app, crear su cuenta y pegar
                este código dentro del juego.
              </p>
            </div>

            {/* Paso 2: Qué puede decir el Influencer para promocionar la App */}
            <div className="p-4 rounded-2xl bg-surface-subtle border border-surface-border space-y-3">
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-extrabold uppercase tracking-wider text-ink-primary flex items-center gap-1.5">
                  <Megaphone className="w-4 h-4 text-brand-600" />
                  2. ¿Qué decir para promocionar esta App? (Guion sugerido)
                </span>
                <button
                  type="button"
                  onClick={() =>
                    copyText(selectedAppForModal.pitch_guidelines, "modal_pitch")
                  }
                  className="text-xs font-bold text-brand-600 hover:underline inline-flex items-center gap-1"
                >
                  {isCopied("modal_pitch") ? (
                    <>
                      <Check className="w-3.5 h-3.5" /> Guion copiado
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" /> Copiar guion
                    </>
                  )}
                </button>
              </div>

              <p className="text-sm text-ink-primary bg-surface-pure p-3.5 rounded-xl border border-surface-border leading-relaxed">
                {selectedAppForModal.pitch_guidelines}
              </p>
            </div>

            {/* Enlace de la tienda para colocar en la bio o comentario fijado */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2">
              <div className="space-y-1">
                <a
                  href={selectedAppForModal.store_url}
                  target="_blank"
                  rel="noreferrer"
                  className="text-xs font-bold text-brand-600 hover:underline inline-flex items-center gap-1.5"
                >
                  <ExternalLink className="w-4 h-4" />
                  Abrir página de descarga del juego
                </a>
                <p className="text-[11px] text-ink-secondary">
                  ¿Consultas con esta campaña? Escríbenos a{" "}
                  <a
                    href={`mailto:${BUSINESS_RULES.SUPPORT_EMAIL}`}
                    className="font-bold text-brand-600 hover:underline"
                  >
                    {BUSINESS_RULES.SUPPORT_EMAIL}
                  </a>
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSelectedAppForModal(null)}
              >
                Listo, cerrar
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* =====================================================================
          MODAL 2 (DEVELOPER): + Publicar Nueva App / Mostrar API Key
         ===================================================================== */}
      <Modal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        title={
          newlyGeneratedApiKey
            ? "Tu API Key de Desarrollador"
            : "+ Publicar Nueva App en InAds"
        }
        subtitle={
          newlyGeneratedApiKey
            ? "Guarda esta llave en un lugar seguro. Solo se muestra una vez."
            : "Registra tu juego o aplicación y obtén tu API Key para conectarla al sistema."
        }
        maxWidthClass="max-w-xl"
      >
        {newlyGeneratedApiKey ? (
          <div className="space-y-5">
            <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 space-y-2">
              <p className="text-sm font-extrabold text-emerald-900">
                ¡API Key generada exitosamente!
              </p>
              <p className="text-xs text-emerald-800">
                Copia y guarda tu <strong>API Key de Desarrollador</strong>. Por
                seguridad solo almacenamos su hash criptográfico HMAC-SHA256 en la
                base de datos. Recuerda recargar saldo en la pestaña{" "}
                <strong>Billetera</strong> para que tu campaña se active en el
                catálogo público.
              </p>
            </div>

            <div className="p-4 rounded-xl bg-surface-subtle border border-surface-border flex items-center justify-between gap-3">
              <code className="text-xs sm:text-sm font-mono font-bold text-brand-600 break-all">
                {newlyGeneratedApiKey}
              </code>
              <Button
                size="sm"
                onClick={() => copyText(newlyGeneratedApiKey, "new_api_key")}
                leftIcon={
                  isCopied("new_api_key") ? (
                    <Check className="w-4 h-4" />
                  ) : (
                    <Copy className="w-4 h-4" />
                  )
                }
              >
                {isCopied("new_api_key") ? "Copiada" : "Copiar Key"}
              </Button>
            </div>

            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => {
                  setIsCreateModalOpen(false);
                  setIsDocsModalOpen(true);
                }}
              >
                Ver cómo conectar API
              </Button>
              <Button onClick={() => setIsCreateModalOpen(false)}>
                Finalizar
              </Button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleCreateDeveloperApp} className="space-y-4">
            <Input
              label="Nombre del Juego o Aplicación"
              placeholder="Ej: Cyber Runner 2099"
              required
              value={newAppName}
              onChange={(e) => setNewAppName(e.target.value)}
            />

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Select
                label="Categoría"
                value={newAppCategory}
                onChange={(e) => setNewAppCategory(e.target.value)}
                options={[
                  { value: "Juegos Indie", label: "Juegos Indie" },
                  { value: "RPG / Acción", label: "RPG / Acción" },
                  { value: "Estrategia", label: "Estrategia" },
                  { value: "Apps Utilidad", label: "Apps Utilidad" },
                ]}
              />
              <Input
                label="Enlace de Descarga (PlayStore / Steam / Web)"
                placeholder="https://play.google.com/store/..."
                required
                value={newAppStoreUrl}
                onChange={(e) => setNewAppStoreUrl(e.target.value)}
              />
            </div>

            <Textarea
              label="Descripción Breve del Producto"
              rows={2}
              placeholder="Describe de qué trata tu juego para atraer a los creadores..."
              required
              value={newAppDescription}
              onChange={(e) => setNewAppDescription(e.target.value)}
            />

            <Textarea
              label="Guion para el Influencer (¿Qué debe decir en su video?)"
              rows={3}
              placeholder="Ej: Muestra el jefe del nivel 1 y diles a tus seguidores que ingresen tu código en Ajustes para recibir 300 monedas gratis..."
              required
              value={newAppPitch}
              onChange={(e) => setNewAppPitch(e.target.value)}
            />

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-surface-border">
              <Button
                type="button"
                variant="ghost"
                onClick={() => setIsCreateModalOpen(false)}
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                isLoading={isCreatingApp}
                leftIcon={<KeyRound className="w-4 h-4" />}
              >
                Registrar y Generar API Key
              </Button>
            </div>
          </form>
        )}
      </Modal>

      {/* =====================================================================
          MODAL 3 (DEVELOPER): Documentación Rápida de Conexión API
         ===================================================================== */}
      <Modal
        isOpen={isDocsModalOpen}
        onClose={() => setIsDocsModalOpen(false)}
        title="Conecta tu Juego o App en 2 Llamadas HTTP"
        subtitle="Envía estas peticiones desde el servidor o cliente de tu juego hacia nuestro Backend en Golang."
        maxWidthClass="max-w-2xl"
      >
        <div className="space-y-4 text-xs">
          <div className="p-4 rounded-xl bg-surface-subtle border border-surface-border space-y-2">
            <span className="font-extrabold text-brand-600 uppercase tracking-wider block">
              1. Cuando el jugador pega el código dentro del juego:
            </span>
            <pre className="p-3 rounded-lg bg-ink-primary text-surface-pure font-mono overflow-x-auto leading-relaxed">
{`POST ${resolveApiBaseUrl()}/referrals/claim
Authorization: Bearer inads_live_TU_API_KEY
Content-Type: application/json

{
  "referral_code": "CODIGO_DEL_CREADOR",
  "player_id": "jugador_unico_123",
  "device_hash": "id_unico_dispositivo"
}`}
            </pre>
          </div>

          <div className="p-4 rounded-xl bg-surface-subtle border border-surface-border space-y-2">
            <span className="font-extrabold text-brand-600 uppercase tracking-wider block">
              2. Cuando el jugador cumple actividad/retención (libera los $0.10 al influencer):
            </span>
            <pre className="p-3 rounded-lg bg-ink-primary text-surface-pure font-mono overflow-x-auto leading-relaxed">
{`POST ${resolveApiBaseUrl()}/referrals/verify
Authorization: Bearer inads_live_TU_API_KEY
Content-Type: application/json

{
  "player_id": "jugador_unico_123",
  "event": "retention_confirmed"
}`}
            </pre>
          </div>
        </div>
      </Modal>
    </AppShell>
  );
}

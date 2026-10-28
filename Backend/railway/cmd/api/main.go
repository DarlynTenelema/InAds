package main

import (
	"context"
	"log/slog"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"inads-backend/internal/config"
	"inads-backend/internal/handlers"
	"inads-backend/internal/middleware"
	"inads-backend/internal/supabase"
)

func main() {
	logger := slog.New(slog.NewJSONHandler(os.Stdout, nil))
	slog.SetDefault(logger)

	cfg := config.Load()
	db := supabase.NewClient(cfg.SupabaseURL, cfg.SupabaseAnonKey, cfg.SupabaseServiceRoleKey)
	guard := middleware.NewGuard(cfg, db)
	srv := handlers.NewServer(cfg, db)

	mux := http.NewServeMux()

	// 1. Healthcheck (Railway readiness probe)
	mux.HandleFunc("GET /api/v1/health", srv.HealthCheck)

	// 2. API de Integración para Juegos y Apps (Autenticadas con Developer API Key)
	mux.HandleFunc("POST /api/v1/referrals/claim", guard.RequireDeveloperAPIKey(srv.ClaimReferral))
	mux.HandleFunc("POST /api/v1/referrals/verify", guard.RequireDeveloperAPIKey(srv.VerifyReferral))

	// 3. Perfil, Selección de Rol y Configuración (Pantallas /auth y /settings)
	mux.HandleFunc("GET /api/v1/me", guard.RequireAuth(srv.GetMyProfile))
	mux.HandleFunc("POST /api/v1/me/role", guard.RequireAuth(srv.SelectInitialRole))
	mux.HandleFunc("PATCH /api/v1/me/settings", guard.RequireAuth(srv.UpdateSettings))

	// 4. Dashboard de Métricas (Pantalla /dashboard)
	mux.HandleFunc("GET /api/v1/dashboard", guard.RequireAuth(srv.GetDashboard))

	// 5. Catálogo de Apps y Gestión de Códigos (Pantalla /apps)
	mux.HandleFunc("GET /api/v1/apps", guard.RequireAuth(srv.ListApps))
	mux.HandleFunc("POST /api/v1/apps", guard.RequireAuth(srv.CreateApp))
	mux.HandleFunc("PATCH /api/v1/apps/{id}/status", guard.RequireAuth(srv.ToggleAppStatus))
	mux.HandleFunc("POST /api/v1/apps/{id}/regenerate-key", guard.RequireAuth(srv.RegenerateAPIKey))
	mux.HandleFunc("POST /api/v1/apps/{id}/join", guard.RequireAuth(srv.JoinAppCampaign))

	// 6. Billetera & Finanzas Manuales (Pantalla /wallet — Retiros >= $100 y Recargas)
	mux.HandleFunc("GET /api/v1/wallet", guard.RequireAuth(srv.GetWallet))
	mux.HandleFunc("POST /api/v1/wallet/payouts", guard.RequireAuth(srv.RequestPayout))
	mux.HandleFunc("POST /api/v1/wallet/deposits", guard.RequireAuth(srv.ReportDeposit))

	// 7. Módulo Interno de Administración Manual (Pantalla /admin)
	mux.HandleFunc("GET /api/v1/admin/overview", guard.RequireAdmin(srv.AdminOverview))
	mux.HandleFunc("POST /api/v1/admin/deposits/{id}/approve", guard.RequireAdmin(srv.AdminApproveDeposit))
	mux.HandleFunc("POST /api/v1/admin/deposits/{id}/reject", guard.RequireAdmin(srv.AdminRejectDeposit))
	mux.HandleFunc("POST /api/v1/admin/payouts/{id}/complete", guard.RequireAdmin(srv.AdminCompletePayout))
	mux.HandleFunc("POST /api/v1/admin/fraud-alerts/{id}/resolve", guard.RequireAdmin(srv.AdminResolveFraudAlert))

	httpServer := &http.Server{
		Addr:              ":" + cfg.Port,
		Handler:           guard.SecurityAndCORS(mux),
		ReadHeaderTimeout: 5 * time.Second,
		ReadTimeout:       15 * time.Second,
		WriteTimeout:      15 * time.Second,
		IdleTimeout:       60 * time.Second,
	}

	go func() {
		slog.Info("Servidor InAds Golang API iniciado",
			"port", cfg.Port,
			"env", cfg.AppEnv,
			"supabase_ready", db.IsConfigured(),
		)
		if err := httpServer.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			slog.Error("Error fatal en servidor HTTP", "error", err)
			os.Exit(1)
		}
	}()

	// Apagado controlado (Graceful Shutdown para Railway)
	stopChan := make(chan os.Signal, 1)
	signal.Notify(stopChan, os.Interrupt, syscall.SIGTERM)
	<-stopChan

	slog.Info("Apagando servidor InAds de forma segura...")
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()
	_ = httpServer.Shutdown(ctx)
}


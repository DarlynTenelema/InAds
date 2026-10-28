package handlers

import (
	"encoding/json"
	"net/http"
	"net/url"
	"strings"

	"inads-backend/internal/middleware"
	"inads-backend/internal/security"
)

// ListApps — GET /api/v1/apps
// Para Influencers: devuelve el catálogo de apps activas más sus códigos generados.
// Para Desarrolladores: devuelve todas sus apps publicadas.
func (s *Server) ListApps(w http.ResponseWriter, r *http.Request) {
	userID, _ := r.Context().Value(middleware.CtxUserIDKey).(string)

	var profiles []struct {
		Role *string `json:"role"`
	}
	_ = s.DB.Query(r.Context(), "profiles?id=eq."+url.QueryEscape(userID)+"&select=role", &profiles)

	role := "influencer"
	if len(profiles) > 0 && profiles[0].Role != nil {
		role = *profiles[0].Role
	}

	if role == "developer" {
		var myApps []map[string]any
		query := "apps?developer_id=eq." + url.QueryEscape(userID) + "&select=id,name,description,category,icon_url,store_url,pitch_guidelines,campaign_balance,total_deposited,cost_per_user,influencer_reward,api_key_prefix,status,min_sessions_required,total_claims,total_verified,created_at&order=created_at.desc"
		if err := s.DB.Query(r.Context(), query, &myApps); err != nil {
			middleware.WriteError(w, http.StatusInternalServerError, "DB_ERROR", err.Error())
			return
		}
		middleware.WriteJSON(w, http.StatusOK, map[string]any{
			"status": "success",
			"role":   "developer",
			"apps":   myApps,
		})
		return
	}

	// Catálogo público de apps activas para Influencers
	var activeApps []map[string]any
	query := "apps?status=eq.active&select=id,name,description,category,icon_url,store_url,pitch_guidelines,campaign_balance,influencer_reward,min_sessions_required,total_verified,created_at&order=created_at.desc"
	if err := s.DB.Query(r.Context(), query, &activeApps); err != nil {
		middleware.WriteError(w, http.StatusInternalServerError, "DB_ERROR", err.Error())
		return
	}

	var myCampaigns []map[string]any
	_ = s.DB.Query(r.Context(), "influencer_campaigns?influencer_id=eq."+url.QueryEscape(userID)+"&select=id,app_id,referral_code,pending_referrals_count,verified_referrals_count,total_earned", &myCampaigns)

	middleware.WriteJSON(w, http.StatusOK, map[string]any{
		"status":       "success",
		"role":         "influencer",
		"apps":         activeApps,
		"my_campaigns": myCampaigns,
	})
}

// CreateApp — POST /api/v1/apps
// Permite a un Desarrollador registrar una nueva App/Juego y obtener su API Key única.
func (s *Server) CreateApp(w http.ResponseWriter, r *http.Request) {
	userID, _ := r.Context().Value(middleware.CtxUserIDKey).(string)

	var req struct {
		Name                string `json:"name"`
		Description         string `json:"description"`
		Category            string `json:"category"`
		IconURL             string `json:"icon_url"`
		StoreURL            string `json:"store_url"`
		PitchGuidelines     string `json:"pitch_guidelines"`
		MinSessionsRequired int    `json:"min_sessions_required"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		middleware.WriteError(w, http.StatusBadRequest, "INVALID_JSON", "JSON inválido")
		return
	}

	req.Name = strings.TrimSpace(req.Name)
	req.Description = strings.TrimSpace(req.Description)
	req.StoreURL = strings.TrimSpace(req.StoreURL)
	req.PitchGuidelines = strings.TrimSpace(req.PitchGuidelines)

	if req.Name == "" || req.Description == "" || req.StoreURL == "" || req.PitchGuidelines == "" {
		middleware.WriteError(w, http.StatusBadRequest, "MISSING_FIELDS", "Nombre, descripción, enlace de tienda y guion para el creador son obligatorios")
		return
	}
	if req.Category == "" {
		req.Category = "game"
	}
	if req.MinSessionsRequired < 1 {
		req.MinSessionsRequired = s.Cfg.MinSessionsForVerification
	}

	rawAPIKey, keyPrefix, keyHash, err := security.GenerateDeveloperAPIKey(s.Cfg.APIKeyHMACSecret)
	if err != nil {
		middleware.WriteError(w, http.StatusInternalServerError, "KEY_GEN_ERROR", err.Error())
		return
	}

	newApp := map[string]any{
		"developer_id":          userID,
		"name":                  req.Name,
		"description":           req.Description,
		"category":              req.Category,
		"icon_url":              req.IconURL,
		"store_url":             req.StoreURL,
		"pitch_guidelines":      req.PitchGuidelines,
		"cost_per_user":         s.Cfg.CostPerVerifiedUser,
		"influencer_reward":     s.Cfg.InfluencerReward,
		"platform_fee":          s.Cfg.PlatformFee,
		"api_key_prefix":        keyPrefix,
		"api_key_hash":          keyHash,
		"status":                "out_of_funds",
		"min_sessions_required": req.MinSessionsRequired,
	}

	var created []map[string]any
	if err := s.DB.Insert(r.Context(), "apps", newApp, &created); err != nil {
		middleware.WriteError(w, http.StatusInternalServerError, "DB_INSERT_ERROR", err.Error())
		return
	}

	delete(created[0], "api_key_hash")

	middleware.WriteJSON(w, http.StatusCreated, map[string]any{
		"status":  "success",
		"app":     created[0],
		"api_key": rawAPIKey, // Se muestra en texto plano una única vez al desarrollador
		"notice":  "Guarda tu API Key en un lugar seguro. Por seguridad solo almacenamos su hash criptográfico.",
	})
}

// ToggleAppStatus — PATCH /api/v1/apps/{id}/status
// Permite al Desarrollador pausar o reanudar su campaña si cuenta con saldo suficiente.
func (s *Server) ToggleAppStatus(w http.ResponseWriter, r *http.Request) {
	userID, _ := r.Context().Value(middleware.CtxUserIDKey).(string)
	appID := r.PathValue("id")

	var req struct {
		Status string `json:"status"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		middleware.WriteError(w, http.StatusBadRequest, "INVALID_JSON", "JSON inválido")
		return
	}

	targetStatus := strings.ToLower(strings.TrimSpace(req.Status))
	if targetStatus != "active" && targetStatus != "paused" {
		middleware.WriteError(w, http.StatusBadRequest, "INVALID_STATUS", "El estado debe ser 'active' o 'paused'")
		return
	}

	var apps []struct {
		ID              string  `json:"id"`
		CampaignBalance float64 `json:"campaign_balance"`
		CostPerUser     float64 `json:"cost_per_user"`
	}
	query := "apps?id=eq." + url.QueryEscape(appID) + "&developer_id=eq." + url.QueryEscape(userID) + "&select=id,campaign_balance,cost_per_user"
	if err := s.DB.Query(r.Context(), query, &apps); err != nil || len(apps) == 0 {
		middleware.WriteError(w, http.StatusNotFound, "APP_NOT_FOUND", "Aplicación no encontrada")
		return
	}

	if targetStatus == "active" && apps[0].CampaignBalance < apps[0].CostPerUser {
		middleware.WriteError(w, http.StatusUnprocessableEntity, "INSUFFICIENT_FUNDS", "Necesitas recargar saldo en tu campaña antes de activarla")
		return
	}

	var updated []map[string]any
	if err := s.DB.Update(r.Context(), "apps?id=eq."+url.QueryEscape(appID), map[string]any{"status": targetStatus}, &updated); err != nil {
		middleware.WriteError(w, http.StatusInternalServerError, "UPDATE_ERROR", err.Error())
		return
	}

	middleware.WriteJSON(w, http.StatusOK, map[string]any{
		"status": "success",
		"app":    updated[0],
	})
}

// RegenerateAPIKey — POST /api/v1/apps/{id}/regenerate-key
func (s *Server) RegenerateAPIKey(w http.ResponseWriter, r *http.Request) {
	userID, _ := r.Context().Value(middleware.CtxUserIDKey).(string)
	appID := r.PathValue("id")

	rawAPIKey, keyPrefix, keyHash, err := security.GenerateDeveloperAPIKey(s.Cfg.APIKeyHMACSecret)
	if err != nil {
		middleware.WriteError(w, http.StatusInternalServerError, "KEY_GEN_ERROR", err.Error())
		return
	}

	var updated []map[string]any
	query := "apps?id=eq." + url.QueryEscape(appID) + "&developer_id=eq." + url.QueryEscape(userID)
	if err := s.DB.Update(r.Context(), query, map[string]any{
		"api_key_prefix": keyPrefix,
		"api_key_hash":   keyHash,
	}, &updated); err != nil || len(updated) == 0 {
		middleware.WriteError(w, http.StatusNotFound, "APP_NOT_FOUND", "No se pudo regenerar la llave para esta aplicación")
		return
	}

	middleware.WriteJSON(w, http.StatusOK, map[string]any{
		"status":         "success",
		"api_key":        rawAPIKey,
		"api_key_prefix": keyPrefix,
	})
}

// JoinAppCampaign — POST /api/v1/apps/{id}/join
// Genera (o recupera) el código único del Influencer para promocionar una App seleccionada.
func (s *Server) JoinAppCampaign(w http.ResponseWriter, r *http.Request) {
	userID, _ := r.Context().Value(middleware.CtxUserIDKey).(string)
	appID := r.PathValue("id")

	// 1. Si ya tiene un código para esta app, devolverlo directamente
	var existing []map[string]any
	checkQuery := "influencer_campaigns?influencer_id=eq." + url.QueryEscape(userID) + "&app_id=eq." + url.QueryEscape(appID) + "&select=*"
	if err := s.DB.Query(r.Context(), checkQuery, &existing); err == nil && len(existing) > 0 {
		middleware.WriteJSON(w, http.StatusOK, map[string]any{
			"status":   "success",
			"campaign": existing[0],
		})
		return
	}

	// 2. Obtener nombre del influencer y de la app para construir un código legible (ej. CARLOS_PIXEL9A)
	var profiles []struct {
		FullName string `json:"full_name"`
	}
	_ = s.DB.Query(r.Context(), "profiles?id=eq."+url.QueryEscape(userID)+"&select=full_name", &profiles)

	var apps []struct {
		Name            string `json:"name"`
		PitchGuidelines string `json:"pitch_guidelines"`
	}
	if err := s.DB.Query(r.Context(), "apps?id=eq."+url.QueryEscape(appID)+"&select=name,pitch_guidelines", &apps); err != nil || len(apps) == 0 {
		middleware.WriteError(w, http.StatusNotFound, "APP_NOT_FOUND", "Aplicación no encontrada")
		return
	}

	infName := "CREATOR"
	if len(profiles) > 0 && profiles[0].FullName != "" {
		infName = profiles[0].FullName
	}

	code := security.GenerateReferralCode(infName, apps[0].Name)

	var created []map[string]any
	err := s.DB.Insert(r.Context(), "influencer_campaigns", map[string]any{
		"influencer_id": userID,
		"app_id":        appID,
		"referral_code": code,
	}, &created)
	if err != nil {
		middleware.WriteError(w, http.StatusInternalServerError, "CAMPAIGN_CREATE_ERROR", err.Error())
		return
	}

	middleware.WriteJSON(w, http.StatusCreated, map[string]any{
		"status":           "success",
		"campaign":         created[0],
		"pitch_guidelines": apps[0].PitchGuidelines,
	})
}


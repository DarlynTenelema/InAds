package handlers

import (
	"encoding/json"
	"net/http"
	"net/url"
	"strings"

	"inads-backend/internal/middleware"
)

// GetMyProfile — GET /api/v1/me
func (s *Server) GetMyProfile(w http.ResponseWriter, r *http.Request) {
	userID, _ := r.Context().Value(middleware.CtxUserIDKey).(string)
	email, _ := r.Context().Value(middleware.CtxUserEmailKey).(string)

	var profiles []map[string]any
	query := "profiles?id=eq." + url.QueryEscape(userID) + "&select=*"
	if err := s.DB.Query(r.Context(), query, &profiles); err != nil {
		middleware.WriteError(w, http.StatusInternalServerError, "DB_ERROR", err.Error())
		return
	}

	if len(profiles) == 0 {
		// Si aún no existía fila en profiles, crearla automáticamente
		newProfile := map[string]any{
			"id":        userID,
			"email":     email,
			"full_name": strings.Split(email, "@")[0],
		}
		if err := s.DB.Insert(r.Context(), "profiles", newProfile, &profiles); err != nil {
			middleware.WriteError(w, http.StatusInternalServerError, "PROFILE_CREATE_ERROR", err.Error())
			return
		}
	}

	profile := profiles[0]
	profile["is_admin"] = s.Cfg.AdminEmails[email] || profile["role"] == "admin"

	middleware.WriteJSON(w, http.StatusOK, map[string]any{
		"status":  "success",
		"profile": profile,
	})
}

// SelectInitialRole — POST /api/v1/me/role
// Permite elegir entre "influencer" o "developer" durante el onboarding (/auth).
func (s *Server) SelectInitialRole(w http.ResponseWriter, r *http.Request) {
	userID, _ := r.Context().Value(middleware.CtxUserIDKey).(string)

	var req struct {
		Role string `json:"role"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		middleware.WriteError(w, http.StatusBadRequest, "INVALID_JSON", "JSON inválido")
		return
	}

	role := strings.ToLower(strings.TrimSpace(req.Role))
	if role != "influencer" && role != "developer" {
		middleware.WriteError(w, http.StatusBadRequest, "INVALID_ROLE", "El rol debe ser 'influencer' o 'developer'")
		return
	}

	// Verificar si ya tenía un rol asignado
	var existing []struct {
		Role *string `json:"role"`
	}
	if err := s.DB.Query(r.Context(), "profiles?id=eq."+url.QueryEscape(userID)+"&select=role", &existing); err != nil {
		middleware.WriteError(w, http.StatusInternalServerError, "DB_ERROR", err.Error())
		return
	}
	if len(existing) > 0 && existing[0].Role != nil && *existing[0].Role != "" {
		middleware.WriteError(w, http.StatusConflict, "ROLE_ALREADY_SET", "Tu cuenta ya tiene un rol asignado")
		return
	}

	var updated []map[string]any
	if err := s.DB.Update(r.Context(), "profiles?id=eq."+url.QueryEscape(userID), map[string]any{"role": role}, &updated); err != nil {
		middleware.WriteError(w, http.StatusInternalServerError, "UPDATE_ERROR", err.Error())
		return
	}

	middleware.WriteJSON(w, http.StatusOK, map[string]any{
		"status":  "success",
		"profile": updated[0],
	})
}

// UpdateSettings — PATCH /api/v1/me/settings
// Actualiza nombre, redes sociales vinculadas, método de cobro y preferencias (/settings y /wallet).
func (s *Server) UpdateSettings(w http.ResponseWriter, r *http.Request) {
	userID, _ := r.Context().Value(middleware.CtxUserIDKey).(string)

	var req struct {
		FullName           *string        `json:"full_name"`
		AvatarURL          *string        `json:"avatar_url"`
		PayoutMethod       *string        `json:"payout_method"`
		PayoutDetails      map[string]any `json:"payout_details"`
		SocialLinks        map[string]any `json:"social_links"`
		EmailNotifications *bool          `json:"email_notifications"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		middleware.WriteError(w, http.StatusBadRequest, "INVALID_JSON", "JSON inválido")
		return
	}

	updates := make(map[string]any)
	if req.FullName != nil {
		updates["full_name"] = strings.TrimSpace(*req.FullName)
	}
	if req.AvatarURL != nil {
		updates["avatar_url"] = strings.TrimSpace(*req.AvatarURL)
	}
	if req.PayoutMethod != nil {
		pm := strings.ToLower(strings.TrimSpace(*req.PayoutMethod))
		if pm != "paypal" && pm != "bank_transfer" && pm != "usdt_crypto" {
			middleware.WriteError(w, http.StatusBadRequest, "INVALID_PAYOUT_METHOD", "Método de cobro no válido (usa paypal, bank_transfer o usdt_crypto)")
			return
		}
		updates["payout_method"] = pm
	}
	if req.PayoutDetails != nil {
		updates["payout_details"] = req.PayoutDetails
	}
	if req.SocialLinks != nil {
		updates["social_links"] = req.SocialLinks
	}
	if req.EmailNotifications != nil {
		updates["email_notifications"] = *req.EmailNotifications
	}

	if len(updates) == 0 {
		middleware.WriteError(w, http.StatusBadRequest, "EMPTY_UPDATE", "No se enviaron campos para actualizar")
		return
	}

	var updated []map[string]any
	if err := s.DB.Update(r.Context(), "profiles?id=eq."+url.QueryEscape(userID), updates, &updated); err != nil {
		middleware.WriteError(w, http.StatusInternalServerError, "UPDATE_ERROR", err.Error())
		return
	}

	middleware.WriteJSON(w, http.StatusOK, map[string]any{
		"status":  "success",
		"profile": updated[0],
	})
}


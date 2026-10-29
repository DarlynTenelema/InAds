package handlers

import (
	"math"
	"net/http"
	"net/url"

	"inads-backend/internal/middleware"
)

// GetDashboard — GET /api/v1/dashboard
// Devuelve las métricas adaptadas automáticamente al rol del usuario (Influencer o Desarrollador).
func (s *Server) GetDashboard(w http.ResponseWriter, r *http.Request) {
	userID, _ := r.Context().Value(middleware.CtxUserIDKey).(string)

	var profiles []struct {
		ID               string  `json:"id"`
		Role             *string `json:"role"`
		AvailableBalance float64 `json:"available_balance"`
		PendingBalance   float64 `json:"pending_balance"`
		TotalEarned      float64 `json:"total_earned"`
	}
	if err := s.DB.Query(r.Context(), "profiles?id=eq."+url.QueryEscape(userID)+"&select=id,role,available_balance,pending_balance,total_earned", &profiles); err != nil || len(profiles) == 0 {
		middleware.WriteError(w, http.StatusNotFound, "PROFILE_NOT_FOUND", "Perfil no encontrado")
		return
	}

	user := profiles[0]
	role := ""
	if user.Role != nil {
		role = *user.Role
	}

	if role == "developer" {
		devApps := make([]map[string]any, 0)
		_ = s.DB.Query(r.Context(), "apps?developer_id=eq."+url.QueryEscape(userID)+"&order=created_at.desc", &devApps)

		recentReferrals := make([]map[string]any, 0)
		_ = s.DB.Query(r.Context(), "referrals?select=id,player_id,status,sessions_count,claimed_at,verified_at,apps!inner(name,developer_id)&apps.developer_id=eq."+url.QueryEscape(userID)+"&order=claimed_at.desc&limit=100", &recentReferrals)

		middleware.WriteJSON(w, http.StatusOK, map[string]any{
			"status":           "success",
			"role":             "developer",
			"apps":             devApps,
			"recent_referrals": recentReferrals,
		})
		return
	}

	// Vista Influencer (por defecto)
	campaigns := make([]map[string]any, 0)
	_ = s.DB.Query(r.Context(), "influencer_campaigns?influencer_id=eq."+url.QueryEscape(userID)+"&select=*,apps(name,icon_url,store_url,status)&order=created_at.desc", &campaigns)

	recentReferrals := make([]map[string]any, 0)
	_ = s.DB.Query(r.Context(), "referrals?influencer_id=eq."+url.QueryEscape(userID)+"&select=id,player_id,status,sessions_count,reward_amount,claimed_at,verified_at,apps(name)&order=claimed_at.desc&limit=200", &recentReferrals)

	progressPct := math.Min(100.0, (user.AvailableBalance/s.Cfg.MinPayoutAmount)*100.0)

	middleware.WriteJSON(w, http.StatusOK, map[string]any{
		"status": "success",
		"role":   "influencer",
		"metrics": map[string]any{
			"available_balance":    user.AvailableBalance,
			"pending_balance":      user.PendingBalance,
			"total_earned":         user.TotalEarned,
			"min_payout_threshold": s.Cfg.MinPayoutAmount,
			"payout_progress_pct":  math.Round(progressPct*100) / 100,
			"can_withdraw":         user.AvailableBalance >= s.Cfg.MinPayoutAmount,
		},
		"campaigns":        campaigns,
		"recent_referrals": recentReferrals,
	})
}


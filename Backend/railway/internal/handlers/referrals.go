package handlers

import (
	"encoding/json"
	"net/http"
	"strings"

	"inads-backend/internal/config"
	"inads-backend/internal/middleware"
	"inads-backend/internal/security"
	"inads-backend/internal/supabase"
)

type Server struct {
	Cfg *config.Config
	DB  *supabase.Client
}

func NewServer(cfg *config.Config, db *supabase.Client) *Server {
	return &Server{Cfg: cfg, DB: db}
}

// HealthCheck — GET /api/v1/health
func (s *Server) HealthCheck(w http.ResponseWriter, r *http.Request) {
	middleware.WriteJSON(w, http.StatusOK, map[string]any{
		"status":              "ok",
		"service":             "inads-golang-api",
		"environment":         s.Cfg.AppEnv,
		"supabase_configured": s.DB.IsConfigured(),
	})
}

// ClaimReferral — POST /api/v1/referrals/claim
// Endpoint que llama el videojuego/app cuando un jugador ingresa el código del influencer.
func (s *Server) ClaimReferral(w http.ResponseWriter, r *http.Request) {
	apiKeyHash, _ := r.Context().Value(middleware.CtxAPIKeyHashKey).(string)

	var req struct {
		ReferralCode string `json:"referral_code"`
		PlayerID     string `json:"player_id"`
		DeviceHash   string `json:"device_hash"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		middleware.WriteError(w, http.StatusBadRequest, "INVALID_JSON", "Cuerpo JSON inválido")
		return
	}

	req.ReferralCode = strings.ToUpper(strings.TrimSpace(req.ReferralCode))
	req.PlayerID = strings.TrimSpace(req.PlayerID)
	req.DeviceHash = strings.TrimSpace(req.DeviceHash)

	if req.ReferralCode == "" || req.PlayerID == "" || req.DeviceHash == "" {
		middleware.WriteError(w, http.StatusBadRequest, "MISSING_FIELDS", "Los campos 'referral_code', 'player_id' y 'device_hash' son obligatorios")
		return
	}

	// Hashear el device_hash con nuestro salt del servidor para privacidad y seguridad uniforme
	saltedDeviceHash := security.HashDeviceID(req.DeviceHash, s.Cfg.DeviceHashSalt)
	ipSubnet := security.ExtractIPSubnet(r.RemoteAddr, r.Header.Get("X-Forwarded-For"))

	rpcPayload := map[string]any{
		"p_api_key_hash":  apiKeyHash,
		"p_referral_code": req.ReferralCode,
		"p_player_id":     req.PlayerID,
		"p_device_hash":   saltedDeviceHash,
		"p_ip_subnet":     ipSubnet,
	}

	var result map[string]any
	if err := s.DB.CallRPC(r.Context(), "fn_claim_referral", rpcPayload, &result); err != nil {
		middleware.WriteError(w, http.StatusInternalServerError, "RPC_ERROR", err.Error())
		return
	}

	if result["status"] == "error" {
		middleware.WriteJSON(w, http.StatusUnprocessableEntity, result)
		return
	}

	middleware.WriteJSON(w, http.StatusOK, result)
}

// VerifyReferral — POST /api/v1/referrals/verify
// Endpoint que llama el juego cuando el usuario registra actividad o cumple la retención.
func (s *Server) VerifyReferral(w http.ResponseWriter, r *http.Request) {
	apiKeyHash, _ := r.Context().Value(middleware.CtxAPIKeyHashKey).(string)

	var req struct {
		PlayerID string `json:"player_id"`
		Event    string `json:"event"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		middleware.WriteError(w, http.StatusBadRequest, "INVALID_JSON", "Cuerpo JSON inválido")
		return
	}

	req.PlayerID = strings.TrimSpace(req.PlayerID)
	req.Event = strings.TrimSpace(req.Event)
	if req.PlayerID == "" {
		middleware.WriteError(w, http.StatusBadRequest, "MISSING_PLAYER_ID", "El campo 'player_id' es obligatorio")
		return
	}
	if req.Event == "" {
		req.Event = "session_ping"
	}

	rpcPayload := map[string]any{
		"p_api_key_hash": apiKeyHash,
		"p_player_id":    req.PlayerID,
		"p_event":        req.Event,
	}

	var result map[string]any
	if err := s.DB.CallRPC(r.Context(), "fn_verify_referral", rpcPayload, &result); err != nil {
		middleware.WriteError(w, http.StatusInternalServerError, "RPC_ERROR", err.Error())
		return
	}

	if result["status"] == "error" {
		middleware.WriteJSON(w, http.StatusUnprocessableEntity, result)
		return
	}

	middleware.WriteJSON(w, http.StatusOK, result)
}


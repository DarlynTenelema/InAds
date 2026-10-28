package handlers

import (
	"encoding/json"
	"net/http"
	"net/url"
	"strings"
	"time"

	"inads-backend/internal/middleware"
)

// AdminOverview — GET /api/v1/admin/overview
// Panel interno de administración: lista recargas pendientes, retiros de $100 pendientes y alertas antifraude.
func (s *Server) AdminOverview(w http.ResponseWriter, r *http.Request) {
	var pendingDeposits []map[string]any
	_ = s.DB.Query(r.Context(), "wallet_deposits?status=eq.pending&select=*,profiles!wallet_deposits_developer_id_fkey(email,full_name),apps(name,campaign_balance)&order=created_at.asc", &pendingDeposits)

	var pendingPayouts []map[string]any
	_ = s.DB.Query(r.Context(), "payout_requests?status=in.(pending,processing)&select=*,profiles!payout_requests_influencer_id_fkey(email,full_name,social_links)&order=created_at.asc", &pendingPayouts)

	var fraudAlerts []map[string]any
	_ = s.DB.Query(r.Context(), "fraud_alerts?is_resolved=eq.false&select=*,profiles(email,full_name),apps(name),influencer_campaigns(referral_code)&order=created_at.desc", &fraudAlerts)

	middleware.WriteJSON(w, http.StatusOK, map[string]any{
		"status":           "success",
		"pending_deposits": pendingDeposits,
		"pending_payouts":  pendingPayouts,
		"fraud_alerts":     fraudAlerts,
	})
}

// AdminApproveDeposit — POST /api/v1/admin/deposits/{id}/approve
// Acredita el saldo en la campaña del desarrollador y activa su App automáticamente.
func (s *Server) AdminApproveDeposit(w http.ResponseWriter, r *http.Request) {
	adminID, _ := r.Context().Value(middleware.CtxUserIDKey).(string)
	depositID := r.PathValue("id")

	var req struct {
		AdminNotes string `json:"admin_notes"`
	}
	_ = json.NewDecoder(r.Body).Decode(&req)

	var result map[string]any
	err := s.DB.CallRPC(r.Context(), "fn_admin_approve_deposit", map[string]any{
		"p_admin_id":    adminID,
		"p_deposit_id":  depositID,
		"p_admin_notes": req.AdminNotes,
	}, &result)
	if err != nil {
		middleware.WriteError(w, http.StatusInternalServerError, "RPC_ERROR", err.Error())
		return
	}

	if result["status"] == "error" {
		middleware.WriteJSON(w, http.StatusUnprocessableEntity, result)
		return
	}

	middleware.WriteJSON(w, http.StatusOK, result)
}

// AdminRejectDeposit — POST /api/v1/admin/deposits/{id}/reject
func (s *Server) AdminRejectDeposit(w http.ResponseWriter, r *http.Request) {
	adminID, _ := r.Context().Value(middleware.CtxUserIDKey).(string)
	depositID := r.PathValue("id")

	var req struct {
		AdminNotes string `json:"admin_notes"`
	}
	_ = json.NewDecoder(r.Body).Decode(&req)

	var updated []map[string]any
	err := s.DB.Update(r.Context(), "wallet_deposits?id=eq."+url.QueryEscape(depositID)+"&status=eq.pending", map[string]any{
		"status":      "rejected",
		"admin_notes": req.AdminNotes,
		"reviewed_by": adminID,
		"reviewed_at": time.Now().UTC().Format(time.RFC3339),
	}, &updated)
	if err != nil || len(updated) == 0 {
		middleware.WriteError(w, http.StatusUnprocessableEntity, "REJECT_FAILED", "No se pudo rechazar la recarga")
		return
	}

	middleware.WriteJSON(w, http.StatusOK, map[string]any{
		"status":  "success",
		"deposit": updated[0],
	})
}

// AdminCompletePayout — POST /api/v1/admin/payouts/{id}/complete
// Marca un retiro de $100 USD como pagado tras haber realizado la transferencia manual.
func (s *Server) AdminCompletePayout(w http.ResponseWriter, r *http.Request) {
	adminID, _ := r.Context().Value(middleware.CtxUserIDKey).(string)
	payoutID := r.PathValue("id")

	var req struct {
		PaymentReference string `json:"payment_reference"`
		AdminNotes       string `json:"admin_notes"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		middleware.WriteError(w, http.StatusBadRequest, "INVALID_JSON", "JSON inválido")
		return
	}

	req.PaymentReference = strings.TrimSpace(req.PaymentReference)
	if req.PaymentReference == "" {
		middleware.WriteError(w, http.StatusBadRequest, "MISSING_REFERENCE", "Ingresa el número de referencia/ID de la transferencia realizada")
		return
	}

	var result map[string]any
	err := s.DB.CallRPC(r.Context(), "fn_admin_complete_payout", map[string]any{
		"p_admin_id":          adminID,
		"p_payout_id":         payoutID,
		"p_payment_reference": req.PaymentReference,
		"p_admin_notes":       req.AdminNotes,
	}, &result)
	if err != nil {
		middleware.WriteError(w, http.StatusInternalServerError, "RPC_ERROR", err.Error())
		return
	}

	if result["status"] == "error" {
		middleware.WriteJSON(w, http.StatusUnprocessableEntity, result)
		return
	}

	middleware.WriteJSON(w, http.StatusOK, result)
}

// AdminResolveFraudAlert — POST /api/v1/admin/fraud-alerts/{id}/resolve
func (s *Server) AdminResolveFraudAlert(w http.ResponseWriter, r *http.Request) {
	adminID, _ := r.Context().Value(middleware.CtxUserIDKey).(string)
	alertID := r.PathValue("id")

	var req struct {
		SuspendInfluencer bool   `json:"suspend_influencer"`
		InfluencerID      string `json:"influencer_id"`
		Reason            string `json:"reason"`
	}
	_ = json.NewDecoder(r.Body).Decode(&req)

	if req.SuspendInfluencer && req.InfluencerID != "" {
		var ignored []map[string]any
		_ = s.DB.Update(r.Context(), "profiles?id=eq."+url.QueryEscape(req.InfluencerID), map[string]any{
			"is_suspended":      true,
			"suspension_reason": req.Reason,
		}, &ignored)
	}

	var updated []map[string]any
	err := s.DB.Update(r.Context(), "fraud_alerts?id=eq."+url.QueryEscape(alertID), map[string]any{
		"is_resolved": true,
		"resolved_by": adminID,
		"resolved_at": time.Now().UTC().Format(time.RFC3339),
	}, &updated)
	if err != nil {
		middleware.WriteError(w, http.StatusInternalServerError, "UPDATE_ERROR", err.Error())
		return
	}

	middleware.WriteJSON(w, http.StatusOK, map[string]any{
		"status": "success",
		"alert":  updated,
	})
}


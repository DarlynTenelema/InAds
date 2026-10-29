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
	pendingDeposits := make([]map[string]any, 0)
	_ = s.DB.Query(r.Context(), "wallet_deposits?status=eq.pending&select=*,profiles!wallet_deposits_developer_id_fkey(email,full_name),apps(name,campaign_balance)&order=created_at.asc", &pendingDeposits)

	pendingPayouts := make([]map[string]any, 0)
	_ = s.DB.Query(r.Context(), "payout_requests?status=in.(pending,processing)&select=*,profiles!payout_requests_influencer_id_fkey(email,full_name,social_links)&order=created_at.asc", &pendingPayouts)

	fraudAlerts := make([]map[string]any, 0)
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

// AdminRejectPayout — POST /api/v1/admin/payouts/{id}/reject
// Rechaza una solicitud de retiro y reembolsa el saldo retenido al Influencer.
func (s *Server) AdminRejectPayout(w http.ResponseWriter, r *http.Request) {
	adminID, _ := r.Context().Value(middleware.CtxUserIDKey).(string)
	payoutID := r.PathValue("id")

	var req struct {
		AdminNotes string `json:"admin_notes"`
	}
	_ = json.NewDecoder(r.Body).Decode(&req)

	var result map[string]any
	err := s.DB.CallRPC(r.Context(), "fn_admin_reject_payout", map[string]any{
		"p_admin_id":    adminID,
		"p_payout_id":   payoutID,
		"p_admin_notes": req.AdminNotes,
	}, &result)
	if err == nil {
		if result["status"] == "error" {
			middleware.WriteJSON(w, http.StatusUnprocessableEntity, result)
			return
		}
		middleware.WriteJSON(w, http.StatusOK, result)
		return
	}

	// Respaldo directo si la función SQL fn_admin_reject_payout aún no fue ejecutada en Supabase
	var payouts []struct {
		ID           string  `json:"id"`
		InfluencerID string  `json:"influencer_id"`
		Amount       float64 `json:"amount"`
		Status       string  `json:"status"`
	}
	if qErr := s.DB.Query(r.Context(), "payout_requests?id=eq."+url.QueryEscape(payoutID)+"&select=id,influencer_id,amount,status", &payouts); qErr != nil || len(payouts) == 0 {
		middleware.WriteError(w, http.StatusNotFound, "PAYOUT_NOT_FOUND", "Solicitud de retiro no encontrada")
		return
	}
	if payouts[0].Status != "pending" && payouts[0].Status != "processing" {
		middleware.WriteError(w, http.StatusUnprocessableEntity, "ALREADY_PROCESSED", "El retiro ya fue procesado")
		return
	}

	var profiles []struct {
		AvailableBalance float64 `json:"available_balance"`
	}
	_ = s.DB.Query(r.Context(), "profiles?id=eq."+url.QueryEscape(payouts[0].InfluencerID)+"&select=available_balance", &profiles)
	newBal := payouts[0].Amount
	if len(profiles) > 0 {
		newBal += profiles[0].AvailableBalance
	}

	var updatedPayout []map[string]any
	if uErr := s.DB.Update(r.Context(), "payout_requests?id=eq."+url.QueryEscape(payoutID), map[string]any{
		"status":       "rejected",
		"admin_notes":  req.AdminNotes,
		"processed_by": adminID,
		"processed_at": time.Now().UTC().Format(time.RFC3339),
	}, &updatedPayout); uErr != nil {
		middleware.WriteError(w, http.StatusInternalServerError, "REJECT_FAILED", uErr.Error())
		return
	}

	var ignored []map[string]any
	_ = s.DB.Update(r.Context(), "profiles?id=eq."+url.QueryEscape(payouts[0].InfluencerID), map[string]any{
		"available_balance": newBal,
	}, &ignored)
	_ = s.DB.Insert(r.Context(), "ledger_entries", map[string]any{
		"user_id":       payouts[0].InfluencerID,
		"entry_type":    "payout_rejected_refund",
		"amount":        payouts[0].Amount,
		"balance_after": newBal,
		"description":   "Retiro rechazado — saldo reintegrado",
	}, &ignored)

	middleware.WriteJSON(w, http.StatusOK, map[string]any{
		"status":           "success",
		"payout_id":        payoutID,
		"refunded_balance": newBal,
	})
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

	// Consultar la alerta real en la base de datos para obtener el influencer_id verificado
	var existingAlerts []struct {
		ID           string  `json:"id"`
		InfluencerID *string `json:"influencer_id"`
	}
	if err := s.DB.Query(r.Context(), "fraud_alerts?id=eq."+url.QueryEscape(alertID)+"&select=id,influencer_id", &existingAlerts); err != nil || len(existingAlerts) == 0 {
		middleware.WriteError(w, http.StatusNotFound, "ALERT_NOT_FOUND", "Alerta antifraude no encontrada")
		return
	}

	targetInfluencerID := strings.TrimSpace(req.InfluencerID)
	if existingAlerts[0].InfluencerID != nil && *existingAlerts[0].InfluencerID != "" {
		targetInfluencerID = *existingAlerts[0].InfluencerID
	}

	if req.SuspendInfluencer && targetInfluencerID != "" {
		reason := strings.TrimSpace(req.Reason)
		if reason == "" {
			reason = "Suspendido por alerta antifraude de subred IP (>50 registros/hora)"
		}
		var ignored []map[string]any
		_ = s.DB.Update(r.Context(), "profiles?id=eq."+url.QueryEscape(targetInfluencerID), map[string]any{
			"is_suspended":      true,
			"suspension_reason": reason,
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


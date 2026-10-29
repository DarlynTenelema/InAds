package handlers

import (
	"encoding/json"
	"net/http"
	"net/url"
	"strings"

	"inads-backend/internal/middleware"
)

// GetWallet — GET /api/v1/wallet
// Devuelve el estado financiero, historial de retiros/recargas y el libro contable del usuario.
func (s *Server) GetWallet(w http.ResponseWriter, r *http.Request) {
	userID, _ := r.Context().Value(middleware.CtxUserIDKey).(string)

	var profiles []map[string]any
	if err := s.DB.Query(r.Context(), "profiles?id=eq."+url.QueryEscape(userID)+"&select=*", &profiles); err != nil || len(profiles) == 0 {
		middleware.WriteError(w, http.StatusNotFound, "PROFILE_NOT_FOUND", "Perfil no encontrado")
		return
	}

	profile := profiles[0]
	role, _ := profile["role"].(string)

	ledger := make([]map[string]any, 0)
	_ = s.DB.Query(r.Context(), "ledger_entries?user_id=eq."+url.QueryEscape(userID)+"&order=created_at.desc&limit=50", &ledger)

	if role == "developer" {
		deposits := make([]map[string]any, 0)
		_ = s.DB.Query(r.Context(), "wallet_deposits?developer_id=eq."+url.QueryEscape(userID)+"&select=*,apps(name)&order=created_at.desc", &deposits)

		myApps := make([]map[string]any, 0)
		_ = s.DB.Query(r.Context(), "apps?developer_id=eq."+url.QueryEscape(userID)+"&select=id,name,campaign_balance,status", &myApps)

		middleware.WriteJSON(w, http.StatusOK, map[string]any{
			"status":   "success",
			"role":     "developer",
			"apps":     myApps,
			"deposits": deposits,
			"ledger":   ledger,
		})
		return
	}

	payouts := make([]map[string]any, 0)
	_ = s.DB.Query(r.Context(), "payout_requests?influencer_id=eq."+url.QueryEscape(userID)+"&order=created_at.desc", &payouts)

	middleware.WriteJSON(w, http.StatusOK, map[string]any{
		"status":               "success",
		"role":                 "influencer",
		"profile":              profile,
		"min_payout_threshold": s.Cfg.MinPayoutAmount,
		"payouts":              payouts,
		"ledger":               ledger,
	})
}

// RequestPayout — POST /api/v1/wallet/payouts
// Permite a un Influencer solicitar el retiro manual cuando alcanza el mínimo de $100.00 USD.
func (s *Server) RequestPayout(w http.ResponseWriter, r *http.Request) {
	userID, _ := r.Context().Value(middleware.CtxUserIDKey).(string)

	var req struct {
		Amount float64 `json:"amount"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		middleware.WriteError(w, http.StatusBadRequest, "INVALID_JSON", "JSON inválido")
		return
	}

	if req.Amount < s.Cfg.MinPayoutAmount {
		middleware.WriteError(w, http.StatusUnprocessableEntity, "BELOW_MINIMUM", "El monto mínimo de retiro es de $100.00 USD")
		return
	}

	var result map[string]any
	err := s.DB.CallRPC(r.Context(), "fn_request_payout", map[string]any{
		"p_influencer_id": userID,
		"p_amount":        req.Amount,
	}, &result)
	if err != nil {
		middleware.WriteError(w, http.StatusInternalServerError, "RPC_ERROR", err.Error())
		return
	}

	if result["status"] == "error" {
		middleware.WriteJSON(w, http.StatusUnprocessableEntity, result)
		return
	}

	middleware.WriteJSON(w, http.StatusCreated, result)
}

// ReportDeposit — POST /api/v1/wallet/deposits
// Permite a un Desarrollador reportar una recarga manual de saldo adjuntando el número de comprobante.
func (s *Server) ReportDeposit(w http.ResponseWriter, r *http.Request) {
	userID, _ := r.Context().Value(middleware.CtxUserIDKey).(string)

	var req struct {
		AppID         string  `json:"app_id"`
		Amount        float64 `json:"amount"`
		PaymentMethod string  `json:"payment_method"`
		ReferenceCode string  `json:"reference_code"`
		ReceiptURL    string  `json:"receipt_url"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		middleware.WriteError(w, http.StatusBadRequest, "INVALID_JSON", "JSON inválido")
		return
	}

	req.AppID = strings.TrimSpace(req.AppID)
	req.PaymentMethod = strings.TrimSpace(req.PaymentMethod)
	req.ReferenceCode = strings.TrimSpace(req.ReferenceCode)

	if req.AppID == "" || req.PaymentMethod == "" || req.ReferenceCode == "" {
		middleware.WriteError(w, http.StatusBadRequest, "MISSING_FIELDS", "Debes especificar la App, el método de pago y el código de comprobante/referencia")
		return
	}
	if req.Amount < 15.00 {
		middleware.WriteError(w, http.StatusUnprocessableEntity, "MIN_DEPOSIT_ERROR", "La recarga mínima de campaña es de $15.00 USD")
		return
	}

	// Verificar que la App pertenezca a este Desarrollador
	var apps []struct {
		ID string `json:"id"`
	}
	if err := s.DB.Query(r.Context(), "apps?id=eq."+url.QueryEscape(req.AppID)+"&developer_id=eq."+url.QueryEscape(userID)+"&select=id", &apps); err != nil || len(apps) == 0 {
		middleware.WriteError(w, http.StatusForbidden, "NOT_YOUR_APP", "La aplicación seleccionada no pertenece a tu cuenta")
		return
	}

	var created []map[string]any
	err := s.DB.Insert(r.Context(), "wallet_deposits", map[string]any{
		"developer_id":   userID,
		"app_id":         req.AppID,
		"amount":         req.Amount,
		"payment_method": req.PaymentMethod,
		"reference_code": req.ReferenceCode,
		"receipt_url":    req.ReceiptURL,
		"status":         "pending",
	}, &created)
	if err != nil {
		middleware.WriteError(w, http.StatusInternalServerError, "DEPOSIT_CREATE_ERROR", err.Error())
		return
	}

	middleware.WriteJSON(w, http.StatusCreated, map[string]any{
		"status":  "success",
		"deposit": created[0],
		"message": "Recarga reportada. El administrador verificará tu transferencia y acreditará el saldo en breve.",
	})
}


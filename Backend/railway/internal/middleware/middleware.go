package middleware

import (
	"context"
	"encoding/json"
	"net/http"
	"strings"
	"sync"
	"time"

	"inads-backend/internal/config"
	"inads-backend/internal/security"
	"inads-backend/internal/supabase"
)

type contextKey string

const (
	CtxUserIDKey     contextKey = "user_id"
	CtxUserEmailKey  contextKey = "user_email"
	CtxAPIKeyHashKey contextKey = "api_key_hash"
)

type Guard struct {
	cfg       *config.Config
	db        *supabase.Client
	mu        sync.Mutex
	ipBuckets map[string]*rateBucket
}

type rateBucket struct {
	count     int
	resetTime time.Time
}

func NewGuard(cfg *config.Config, db *supabase.Client) *Guard {
	g := &Guard{
		cfg:       cfg,
		db:        db,
		ipBuckets: make(map[string]*rateBucket),
	}
	go g.cleanupBuckets()
	return g
}

func (g *Guard) cleanupBuckets() {
	ticker := time.NewTicker(2 * time.Minute)
	for range ticker.C {
		now := time.Now()
		g.mu.Lock()
		for ip, b := range g.ipBuckets {
			if now.After(b.resetTime) {
				delete(g.ipBuckets, ip)
			}
		}
		g.mu.Unlock()
	}
}

// SecurityAndCORS aplica cabeceras de seguridad HTTP, control de orígenes CORS y Rate Limiting por IP.
func (g *Guard) SecurityAndCORS(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("X-Content-Type-Options", "nosniff")
		w.Header().Set("X-Frame-Options", "DENY")
		w.Header().Set("Referrer-Policy", "strict-origin-when-cross-origin")

		origin := r.Header.Get("Origin")
		if origin != "" && g.isOriginAllowed(origin) {
			w.Header().Set("Access-Control-Allow-Origin", origin)
			w.Header().Set("Vary", "Origin")
			w.Header().Set("Access-Control-Allow-Credentials", "true")
			w.Header().Set("Access-Control-Allow-Methods", "GET, POST, PATCH, PUT, DELETE, OPTIONS")
			w.Header().Set("Access-Control-Allow-Headers", "Authorization, Content-Type, X-API-Key")
		}

		if r.Method == http.MethodOptions {
			w.WriteHeader(http.StatusNoContent)
			return
		}

		// Rate limit por IP
		clientIP := security.ExtractIPSubnet(r.RemoteAddr, r.Header.Get("X-Forwarded-For"))
		if !g.allowRequest(clientIP) {
			WriteError(w, http.StatusTooManyRequests, "RATE_LIMIT_EXCEEDED", "Demasiadas solicitudes. Por favor intenta de nuevo en un minuto.")
			return
		}

		next.ServeHTTP(w, r)
	})
}

func (g *Guard) isOriginAllowed(origin string) bool {
	for _, allowed := range g.cfg.AllowedOrigins {
		if allowed == "*" || strings.EqualFold(allowed, origin) {
			return true
		}
	}
	return false
}

func (g *Guard) allowRequest(ipKey string) bool {
	g.mu.Lock()
	defer g.mu.Unlock()

	now := time.Now()
	b, exists := g.ipBuckets[ipKey]
	if !exists || now.After(b.resetTime) {
		g.ipBuckets[ipKey] = &rateBucket{
			count:     1,
			resetTime: now.Add(time.Minute),
		}
		return true
	}

	if b.count >= g.cfg.RateLimitRequestsPerMinute {
		return false
	}
	b.count++
	return true
}

// RequireAuth valida el token Bearer JWT de Supabase e inyecta user_id y email en el contexto.
func (g *Guard) RequireAuth(next http.HandlerFunc) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		authHeader := r.Header.Get("Authorization")
		if !strings.HasPrefix(authHeader, "Bearer ") {
			WriteError(w, http.StatusUnauthorized, "MISSING_TOKEN", "Se requiere autenticación (Bearer token)")
			return
		}

		token := strings.TrimSpace(strings.TrimPrefix(authHeader, "Bearer "))
		var userID, email string

		// 1. Verificar con SUPABASE_JWT_SECRET local si está configurado
		if g.cfg.SupabaseJWTSecret != "" && g.cfg.SupabaseJWTSecret != "reemplazar_con_supabase_jwt_secret" {
			claims, err := security.VerifySupabaseJWT(token, g.cfg.SupabaseJWTSecret)
			if err != nil {
				WriteError(w, http.StatusUnauthorized, "INVALID_TOKEN", err.Error())
				return
			}
			userID = claims.Sub
			email = claims.Email
		} else if g.db.IsConfigured() {
			// 2. Fallback: Validar contra el endpoint /auth/v1/user de Supabase
			uid, em, err := g.db.VerifyTokenRemote(r.Context(), token)
			if err != nil {
				WriteError(w, http.StatusUnauthorized, "INVALID_SESSION", "Sesión inválida o expirada")
				return
			}
			userID = uid
			email = em
		} else {
			WriteError(w, http.StatusServiceUnavailable, "SUPABASE_NOT_CONFIGURED", "Configura las credenciales de Supabase en Backend/.env")
			return
		}

		ctx := context.WithValue(r.Context(), CtxUserIDKey, userID)
		ctx = context.WithValue(ctx, CtxUserEmailKey, strings.ToLower(strings.TrimSpace(email)))
		next.ServeHTTP(w, r.WithContext(ctx))
	}
}

// RequireAdmin restringe el acceso exclusivamente a los correos definidos en ADMIN_EMAILS o usuarios con rol 'admin'.
func (g *Guard) RequireAdmin(next http.HandlerFunc) http.HandlerFunc {
	return g.RequireAuth(func(w http.ResponseWriter, r *http.Request) {
		email, _ := r.Context().Value(CtxUserEmailKey).(string)
		userID, _ := r.Context().Value(CtxUserIDKey).(string)

		if g.cfg.AdminEmails[email] {
			next.ServeHTTP(w, r)
			return
		}

		// Verificar en la tabla profiles si tiene role = 'admin'
		var profiles []struct {
			Role string `json:"role"`
		}
		err := g.db.Query(r.Context(), "profiles?id=eq."+userID+"&select=role", &profiles)
		if err == nil && len(profiles) > 0 && profiles[0].Role == "admin" {
			next.ServeHTTP(w, r)
			return
		}

		WriteError(w, http.StatusForbidden, "ADMIN_ONLY", "Acceso restringido exclusivamente al administrador de InAds")
	})
}

// RequireDeveloperAPIKey autentica llamadas hechas desde los juegos/apps usando Authorization: Bearer <DEV_API_KEY>.
func (g *Guard) RequireDeveloperAPIKey(next http.HandlerFunc) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		rawKey := strings.TrimSpace(r.Header.Get("X-API-Key"))
		if rawKey == "" {
			authHeader := r.Header.Get("Authorization")
			if strings.HasPrefix(authHeader, "Bearer ") {
				rawKey = strings.TrimSpace(strings.TrimPrefix(authHeader, "Bearer "))
			}
		}

		if rawKey == "" || !strings.HasPrefix(rawKey, "inads_live_") {
			WriteError(w, http.StatusUnauthorized, "MISSING_API_KEY", "Envía tu API Key de desarrollador en 'Authorization: Bearer inads_live_...'")
			return
		}

		keyHash := security.HashAPIKey(rawKey, g.cfg.APIKeyHMACSecret)
		ctx := context.WithValue(r.Context(), CtxAPIKeyHashKey, keyHash)
		next.ServeHTTP(w, r.WithContext(ctx))
	}
}

func WriteJSON(w http.ResponseWriter, status int, data any) {
	w.Header().Set("Content-Type", "application/json; charset=utf-8")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(data)
}

func WriteError(w http.ResponseWriter, status int, code string, message string) {
	WriteJSON(w, status, map[string]any{
		"status":  "error",
		"code":    code,
		"message": message,
	})
}


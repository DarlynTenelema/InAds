package security

import (
	"crypto/hmac"
	"crypto/sha256"
	"encoding/base64"
	"encoding/json"
	"errors"
	"strings"
	"time"
)

type JWTClaims struct {
	Sub   string `json:"sub"`
	Email string `json:"email"`
	Role  string `json:"role"`
	Exp   int64  `json:"exp"`
}

// VerifySupabaseJWT valida criptográficamente un token JWT emitido por Supabase Auth (HS256).
func VerifySupabaseJWT(tokenString, jwtSecret string) (*JWTClaims, error) {
	parts := strings.Split(tokenString, ".")
	if len(parts) != 3 {
		return nil, errors.New("formato de token JWT inválido")
	}

	headerBytes, err := base64.RawURLEncoding.DecodeString(parts[0])
	if err != nil {
		return nil, errors.New("cabecera JWT mal codificada")
	}
	var header struct {
		Alg string `json:"alg"`
	}
	if err := json.Unmarshal(headerBytes, &header); err != nil || header.Alg != "HS256" {
		return nil, errors.New("algoritmo de firma JWT no permitido (se requiere HS256)")
	}

	unsignedToken := parts[0] + "." + parts[1]
	signature, err := base64.RawURLEncoding.DecodeString(parts[2])
	if err != nil {
		return nil, errors.New("firma JWT mal codificada")
	}

	mac := hmac.New(sha256.New, []byte(jwtSecret))
	mac.Write([]byte(unsignedToken))
	expectedSig := mac.Sum(nil)

	if !hmac.Equal(signature, expectedSig) {
		// Intentar también decodificando el secret en Base64 por si fue copiado en ese formato
		if decodedSecret, decErr := base64.StdEncoding.DecodeString(jwtSecret); decErr == nil {
			macB64 := hmac.New(sha256.New, decodedSecret)
			macB64.Write([]byte(unsignedToken))
			if !hmac.Equal(signature, macB64.Sum(nil)) {
				return nil, errors.New("firma de token JWT inválida")
			}
		} else {
			return nil, errors.New("firma de token JWT inválida")
		}
	}

	payloadBytes, err := base64.RawURLEncoding.DecodeString(parts[1])
	if err != nil {
		return nil, errors.New("payload JWT mal codificado")
	}

	var claims JWTClaims
	if err := json.Unmarshal(payloadBytes, &claims); err != nil {
		return nil, errors.New("no se pudieron leer los claims del JWT")
	}

	if claims.Exp <= 0 || time.Now().Unix() > claims.Exp {
		return nil, errors.New("la sesión ha expirado o el token carece de fecha de expiración")
	}

	if claims.Sub == "" {
		return nil, errors.New("token sin identificador de usuario (sub)")
	}

	if claims.Role != "" && claims.Role != "authenticated" && claims.Role != "service_role" {
		return nil, errors.New("rol de token JWT no autorizado")
	}

	return &claims, nil
}


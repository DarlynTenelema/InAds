package security

import (
	"crypto/hmac"
	"crypto/rand"
	"crypto/sha256"
	"encoding/hex"
	"fmt"
	"net"
	"regexp"
	"strings"
)

var nonAlphaNumRegex = regexp.MustCompile(`[^A-Z0-9]+`)

// GenerateDeveloperAPIKey crea una API Key segura para un Desarrollador ("inads_live_<hex>"),
// su prefijo visible para la UI y el hash HMAC-SHA256 que se almacena en la base de datos.
func GenerateDeveloperAPIKey(hmacSecret string) (rawKey string, prefix string, keyHash string, err error) {
	randomBytes := make([]byte, 24)
	if _, err := rand.Read(randomBytes); err != nil {
		return "", "", "", fmt.Errorf("error generando entropía para API Key: %w", err)
	}

	tokenHex := hex.EncodeToString(randomBytes)
	rawKey = "inads_live_" + tokenHex
	prefix = "inads_live_" + tokenHex[:8] + "..."
	keyHash = HashAPIKey(rawKey, hmacSecret)

	return rawKey, prefix, keyHash, nil
}

// HashAPIKey calcula el HMAC-SHA256 de una API Key para búsqueda segura sin almacenar llaves en texto plano.
func HashAPIKey(rawKey, hmacSecret string) string {
	mac := hmac.New(sha256.New, []byte(hmacSecret))
	mac.Write([]byte(strings.TrimSpace(rawKey)))
	return hex.EncodeToString(mac.Sum(nil))
}

// HashDeviceID anonimiza y protege el identificador del dispositivo con un salt del servidor.
func HashDeviceID(rawDeviceID, salt string) string {
	h := sha256.New()
	h.Write([]byte(salt + ":" + strings.TrimSpace(rawDeviceID)))
	return hex.EncodeToString(h.Sum(nil))
}

// GenerateReferralCode construye un código limpio en mayúsculas para que el influencer comparta con su comunidad.
func GenerateReferralCode(influencerName, appName string) string {
	cleanInf := nonAlphaNumRegex.ReplaceAllString(strings.ToUpper(influencerName), "")
	if len(cleanInf) > 8 {
		cleanInf = cleanInf[:8]
	}
	if len(cleanInf) < 3 {
		cleanInf = "CREATOR"
	}

	cleanApp := nonAlphaNumRegex.ReplaceAllString(strings.ToUpper(appName), "")
	if len(cleanApp) > 4 {
		cleanApp = cleanApp[:4]
	}
	if len(cleanApp) < 2 {
		cleanApp = "APP"
	}

	randSuffix := make([]byte, 2)
	_, _ = rand.Read(randSuffix)
	suffixHex := strings.ToUpper(hex.EncodeToString(randSuffix))

	return fmt.Sprintf("%s_%s%s", cleanInf, cleanApp, suffixHex)
}

// ExtractIPSubnet obtiene la subred /24 (IPv4) o /64 (IPv6) para alimentar el detector antifraude (>50 registros/hora).
// Toma el último salto confiable de X-Forwarded-For (añadido por el proxy inverso de Railway) para evitar spoofing de cabeceras.
func ExtractIPSubnet(remoteAddr, xForwardedFor string) string {
	var ipStr string
	if strings.TrimSpace(xForwardedFor) != "" {
		parts := strings.Split(xForwardedFor, ",")
		for i := len(parts) - 1; i >= 0; i-- {
			candidate := strings.TrimSpace(parts[i])
			if candidate != "" && net.ParseIP(candidate) != nil {
				ipStr = candidate
				break
			}
		}
	}
	if ipStr == "" {
		host, _, err := net.SplitHostPort(remoteAddr)
		if err == nil {
			ipStr = host
		} else {
			ipStr = remoteAddr
		}
	}

	ip := net.ParseIP(ipStr)
	if ip == nil {
		return "unknown"
	}

	if ipv4 := ip.To4(); ipv4 != nil {
		return fmt.Sprintf("%d.%d.%d.0/24", ipv4[0], ipv4[1], ipv4[2])
	}

	// Para IPv6 agrupamos por /64
	ipNet := &net.IPNet{
		IP:   ip.Mask(net.CIDRMask(64, 128)),
		Mask: net.CIDRMask(64, 128),
	}
	return ipNet.String()
}


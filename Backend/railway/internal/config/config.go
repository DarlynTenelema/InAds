package config

import (
	"bufio"
	"os"
	"strconv"
	"strings"
)

type Config struct {
	AppEnv                      string
	Port                        string
	AllowedOrigins              []string
	SupabaseURL                 string
	SupabaseAnonKey             string
	SupabaseServiceRoleKey      string
	SupabaseJWTSecret           string
	APIKeyHMACSecret            string
	DeviceHashSalt              string
	AdminEmails                 map[string]bool
	CostPerVerifiedUser         float64
	InfluencerReward            float64
	PlatformFee                 float64
	MinPayoutAmount             float64
	MinSessionsForVerification  int
	FraudMaxClaimsPerSubnetHour int
	RateLimitRequestsPerMinute  int
}

func Load() *Config {
	// Intentar cargar .env local si existe (en Railway se inyectan como variables del sistema)
	loadDotEnv("../.env")
	loadDotEnv(".env")

	originsRaw := getEnv("ALLOWED_ORIGINS", "http://localhost:3000")
	var origins []string
	for _, o := range strings.Split(originsRaw, ",") {
		trimmed := strings.TrimSpace(o)
		if trimmed != "" {
			origins = append(origins, trimmed)
		}
	}

	adminEmails := map[string]bool{
		"0805409802d@gmail.com":     true,
		"darlyndavid2026@gmail.com": true,
		"darlyndavid100@gmail.com":  true,
	}
	for _, email := range strings.Split(getEnv("ADMIN_EMAILS", ""), ",") {
		clean := strings.ToLower(strings.TrimSpace(email))
		if clean != "" {
			adminEmails[clean] = true
		}
	}

	return &Config{
		AppEnv:                      getEnv("APP_ENV", "development"),
		Port:                        getEnv("PORT", "8080"),
		AllowedOrigins:              origins,
		SupabaseURL:                 strings.TrimRight(getEnv("SUPABASE_URL", ""), "/"),
		SupabaseAnonKey:             getEnv("SUPABASE_ANON_KEY", ""),
		SupabaseServiceRoleKey:      getEnv("SUPABASE_SERVICE_ROLE_KEY", ""),
		SupabaseJWTSecret:           getEnv("SUPABASE_JWT_SECRET", ""),
		APIKeyHMACSecret:            getEnv("API_KEY_HMAC_SECRET", "default_dev_hmac_secret_change_in_prod"),
		DeviceHashSalt:              getEnv("DEVICE_HASH_SALT", "default_dev_device_salt_change_in_prod"),
		AdminEmails:                 adminEmails,
		CostPerVerifiedUser:         getEnvFloat("COST_PER_VERIFIED_USER", 0.15),
		InfluencerReward:            getEnvFloat("INFLUENCER_REWARD", 0.10),
		PlatformFee:                 getEnvFloat("PLATFORM_FEE", 0.05),
		MinPayoutAmount:             getEnvFloat("MIN_PAYOUT_AMOUNT", 100.00),
		MinSessionsForVerification:  getEnvInt("MIN_SESSIONS_FOR_VERIFICATION", 3),
		FraudMaxClaimsPerSubnetHour: getEnvInt("FRAUD_MAX_CLAIMS_PER_SUBNET_HOUR", 50),
		RateLimitRequestsPerMinute:  getEnvInt("RATE_LIMIT_REQUESTS_PER_MINUTE", 120),
	}
}

func loadDotEnv(path string) {
	file, err := os.Open(path)
	if err != nil {
		return
	}
	defer file.Close()

	scanner := bufio.NewScanner(file)
	for scanner.Scan() {
		line := strings.TrimSpace(scanner.Text())
		if line == "" || strings.HasPrefix(line, "#") {
			continue
		}
		parts := strings.SplitN(line, "=", 2)
		if len(parts) != 2 {
			continue
		}
		key := strings.TrimSpace(parts[0])
		val := strings.TrimSpace(parts[1])
		val = strings.Trim(val, `"'`)
		if os.Getenv(key) == "" {
			_ = os.Setenv(key, val)
		}
	}
}

func getEnv(key, fallback string) string {
	if val := os.Getenv(key); val != "" {
		return val
	}
	return fallback
}

func getEnvFloat(key string, fallback float64) float64 {
	if val := os.Getenv(key); val != "" {
		if parsed, err := strconv.ParseFloat(val, 64); err == nil {
			return parsed
		}
	}
	return fallback
}

func getEnvInt(key string, fallback int) int {
	if val := os.Getenv(key); val != "" {
		if parsed, err := strconv.Atoi(val); err == nil {
			return parsed
		}
	}
	return fallback
}


package security

import (
	"strings"
	"testing"
)

func TestGenerateAndHashDeveloperAPIKey(t *testing.T) {
	secret := "test_hmac_secret_key_for_inads"
	rawKey, prefix, hash, err := GenerateDeveloperAPIKey(secret)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if !strings.HasPrefix(rawKey, "inads_live_") {
		t.Errorf("expected rawKey to start with inads_live_, got %s", rawKey)
	}
	if !strings.HasSuffix(prefix, "...") {
		t.Errorf("expected prefix to end with ..., got %s", prefix)
	}
	computed := HashAPIKey(rawKey, secret)
	if computed != hash {
		t.Errorf("hash mismatch: expected %s, got %s", hash, computed)
	}
}

func TestExtractIPSubnet(t *testing.T) {
	sub := ExtractIPSubnet("203.0.113.45:54321", "")
	if sub != "203.0.113.0/24" {
		t.Errorf("expected 203.0.113.0/24, got %s", sub)
	}

	subForwarded := ExtractIPSubnet("10.0.0.1:8080", "198.51.100.99, 10.0.0.1")
	if subForwarded != "198.51.100.0/24" {
		t.Errorf("expected 198.51.100.0/24, got %s", subForwarded)
	}
}

func TestGenerateReferralCode(t *testing.T) {
	code := GenerateReferralCode("Carlos Gamer", "Pixel Quest")
	if !strings.HasPrefix(code, "CARLOSGA_PIXE") {
		t.Errorf("unexpected referral code format: %s", code)
	}
}


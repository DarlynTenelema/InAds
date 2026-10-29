package supabase

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"time"
)

type Client struct {
	baseURL        string
	serviceRoleKey string
	anonKey        string
	httpClient     *http.Client
}

func NewClient(baseURL, anonKey, serviceRoleKey string) *Client {
	return &Client{
		baseURL:        baseURL,
		anonKey:        anonKey,
		serviceRoleKey: serviceRoleKey,
		httpClient: &http.Client{
			Timeout: 12 * time.Second,
		},
	}
}

func (c *Client) IsConfigured() bool {
	return c.baseURL != "" && !bytes.Contains([]byte(c.baseURL), []byte("[TU_PROJECT_REF]")) &&
		c.serviceRoleKey != "" && c.serviceRoleKey != "reemplazar_con_supabase_service_role_key"
}

// CallRPC ejecuta una función almacenada de PostgreSQL (ej. fn_claim_referral, fn_verify_referral) usando Service Role.
func (c *Client) CallRPC(ctx context.Context, fnName string, payload any, out any) error {
	bodyBytes, err := json.Marshal(payload)
	if err != nil {
		return err
	}

	url := fmt.Sprintf("%s/rest/v1/rpc/%s", c.baseURL, fnName)
	req, err := http.NewRequestWithContext(ctx, http.MethodPost, url, bytes.NewReader(bodyBytes))
	if err != nil {
		return err
	}

	c.setServiceHeaders(req)
	req.Header.Set("Content-Type", "application/json")

	return c.doRequest(req, out)
}

// Query realiza una consulta SELECT a través de PostgREST (ej. "profiles?id=eq.123&select=*").
func (c *Client) Query(ctx context.Context, queryPath string, out any) error {
	url := fmt.Sprintf("%s/rest/v1/%s", c.baseURL, queryPath)
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, url, nil)
	if err != nil {
		return err
	}

	c.setServiceHeaders(req)
	return c.doRequest(req, out)
}

// Insert inserta un registro en una tabla de Supabase y retorna la representación creada.
func (c *Client) Insert(ctx context.Context, table string, payload any, out any) error {
	bodyBytes, err := json.Marshal(payload)
	if err != nil {
		return err
	}

	url := fmt.Sprintf("%s/rest/v1/%s", c.baseURL, table)
	req, err := http.NewRequestWithContext(ctx, http.MethodPost, url, bytes.NewReader(bodyBytes))
	if err != nil {
		return err
	}

	c.setServiceHeaders(req)
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Prefer", "return=representation")

	return c.doRequest(req, out)
}

// Update actualiza registros que coincidan con el queryPath (ej. "apps?id=eq.123").
func (c *Client) Update(ctx context.Context, queryPath string, payload any, out any) error {
	bodyBytes, err := json.Marshal(payload)
	if err != nil {
		return err
	}

	url := fmt.Sprintf("%s/rest/v1/%s", c.baseURL, queryPath)
	req, err := http.NewRequestWithContext(ctx, http.MethodPatch, url, bytes.NewReader(bodyBytes))
	if err != nil {
		return err
	}

	c.setServiceHeaders(req)
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Prefer", "return=representation")

	return c.doRequest(req, out)
}

// UploadStorageObject sube un archivo a Supabase Storage y retorna su URL pública accesible.
func (c *Client) UploadStorageObject(ctx context.Context, bucket, objectPath, contentType string, data []byte) (string, error) {
	url := fmt.Sprintf("%s/storage/v1/object/%s/%s", c.baseURL, bucket, objectPath)
	req, err := http.NewRequestWithContext(ctx, http.MethodPost, url, bytes.NewReader(data))
	if err != nil {
		return "", err
	}

	c.setServiceHeaders(req)
	req.Header.Set("Content-Type", contentType)
	req.Header.Set("x-upsert", "true")

	resp, err := c.httpClient.Do(req)
	if err != nil {
		return "", fmt.Errorf("error de red subiendo a Supabase Storage: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode >= 400 {
		respBytes, _ := io.ReadAll(resp.Body)
		return "", fmt.Errorf("error Supabase Storage (%d): %s", resp.StatusCode, string(respBytes))
	}

	publicURL := fmt.Sprintf("%s/storage/v1/object/public/%s/%s", c.baseURL, bucket, objectPath)
	return publicURL, nil
}

// VerifyTokenRemote verifica el access_token directamente contra Supabase Auth (/auth/v1/user)
// como respaldo cuando SUPABASE_JWT_SECRET aún no ha sido configurado localmente.
func (c *Client) VerifyTokenRemote(ctx context.Context, accessToken string) (userID string, email string, err error) {
	url := fmt.Sprintf("%s/auth/v1/user", c.baseURL)
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, url, nil)
	if err != nil {
		return "", "", err
	}

	apiKey := c.anonKey
	if apiKey == "" || apiKey == "reemplazar_con_supabase_anon_key" {
		apiKey = c.serviceRoleKey
	}
	req.Header.Set("apikey", apiKey)
	req.Header.Set("Authorization", "Bearer "+accessToken)

	var respData struct {
		ID    string `json:"id"`
		Email string `json:"email"`
	}
	if err := c.doRequest(req, &respData); err != nil {
		return "", "", err
	}
	return respData.ID, respData.Email, nil
}

func (c *Client) setServiceHeaders(req *http.Request) {
	req.Header.Set("apikey", c.serviceRoleKey)
	req.Header.Set("Authorization", "Bearer "+c.serviceRoleKey)
}

func (c *Client) doRequest(req *http.Request, out any) error {
	resp, err := c.httpClient.Do(req)
	if err != nil {
		return fmt.Errorf("error de red hacia Supabase: %w", err)
	}
	defer resp.Body.Close()

	respBytes, err := io.ReadAll(resp.Body)
	if err != nil {
		return fmt.Errorf("error leyendo respuesta de Supabase: %w", err)
	}

	if resp.StatusCode >= 400 {
		return fmt.Errorf("error Supabase (%d): %s", resp.StatusCode, string(respBytes))
	}

	if out != nil && len(respBytes) > 0 {
		if err := json.Unmarshal(respBytes, out); err != nil {
			return fmt.Errorf("error decodificando JSON de Supabase: %w", err)
		}
	}
	return nil
}


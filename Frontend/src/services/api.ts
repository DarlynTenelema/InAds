// =============================================================================
// InAds — Cliente Centralizado de API (Comunicación con Backend Golang)
// =============================================================================

import { getAccessToken } from "@/lib/supabase";
import { PayoutDetails, PayoutMethodType, SocialLinks, UserRole } from "@/types";

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080/api/v1";

interface RequestOptions extends RequestInit {
  bodyData?: unknown;
}

async function apiRequest<T>(endpoint: string, options: RequestOptions = {}): Promise<T> {
  const token = await getAccessToken();

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string>),
  };

  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers,
    body: options.bodyData !== undefined ? JSON.stringify(options.bodyData) : options.body,
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok || data?.status === "error") {
    throw new Error(data?.message || `Error HTTP ${response.status}`);
  }

  return data as T;
}

export const inadsApi = {
  // 1. Perfil y Configuración (/auth y /settings)
  getProfile: () => apiRequest<{ status: string; profile: any }>("/me"),

  selectInitialRole: (role: UserRole) =>
    apiRequest<{ status: string; profile: any }>("/me/role", {
      method: "POST",
      bodyData: { role },
    }),

  updateSettings: (payload: {
    full_name?: string;
    avatar_url?: string;
    payout_method?: PayoutMethodType;
    payout_details?: PayoutDetails;
    social_links?: SocialLinks;
    email_notifications?: boolean;
  }) =>
    apiRequest<{ status: string; profile: any }>("/me/settings", {
      method: "PATCH",
      bodyData: payload,
    }),

  // 2. Dashboard (/dashboard)
  getDashboard: () => apiRequest<any>("/dashboard"),

  // 3. Catálogo de Apps y Códigos (/apps)
  listApps: () => apiRequest<any>("/apps"),

  createApp: (payload: {
    name: string;
    description: string;
    category: string;
    icon_url?: string;
    store_url: string;
    pitch_guidelines: string;
    min_sessions_required?: number;
  }) =>
    apiRequest<{ status: string; app: any; api_key: string; notice: string }>("/apps", {
      method: "POST",
      bodyData: payload,
    }),

  toggleAppStatus: (appId: string, status: "active" | "paused") =>
    apiRequest<{ status: string; app: any }>(`/apps/${appId}/status`, {
      method: "PATCH",
      bodyData: { status },
    }),

  regenerateApiKey: (appId: string) =>
    apiRequest<{ status: string; api_key: string; api_key_prefix: string }>(
      `/apps/${appId}/regenerate-key`,
      { method: "POST" }
    ),

  joinAppCampaign: (appId: string) =>
    apiRequest<{ status: string; campaign: any; pitch_guidelines?: string }>(
      `/apps/${appId}/join`,
      { method: "POST" }
    ),

  // 4. Billetera & Pagos Manuales (/wallet)
  getWallet: () => apiRequest<any>("/wallet"),

  requestPayout: (amount: number) =>
    apiRequest<any>("/wallet/payouts", {
      method: "POST",
      bodyData: { amount },
    }),

  reportDeposit: (payload: {
    app_id: string;
    amount: number;
    payment_method: PayoutMethodType;
    reference_code: string;
    receipt_url?: string;
  }) =>
    apiRequest<any>("/wallet/deposits", {
      method: "POST",
      bodyData: payload,
    }),

  // 5. Panel de Administración Manual (/admin)
  getAdminOverview: () => apiRequest<any>("/admin/overview"),

  adminApproveDeposit: (depositId: string, adminNotes?: string) =>
    apiRequest<any>(`/admin/deposits/${depositId}/approve`, {
      method: "POST",
      bodyData: { admin_notes: adminNotes || "" },
    }),

  adminRejectDeposit: (depositId: string, adminNotes?: string) =>
    apiRequest<any>(`/admin/deposits/${depositId}/reject`, {
      method: "POST",
      bodyData: { admin_notes: adminNotes || "" },
    }),

  adminCompletePayout: (payoutId: string, paymentReference: string, adminNotes?: string) =>
    apiRequest<any>(`/admin/payouts/${payoutId}/complete`, {
      method: "POST",
      bodyData: {
        payment_reference: paymentReference,
        admin_notes: adminNotes || "",
      },
    }),

  adminResolveFraudAlert: (
    alertId: string,
    payload: { suspend_influencer?: boolean; influencer_id?: string; reason?: string }
  ) =>
    apiRequest<any>(`/admin/fraud-alerts/${alertId}/resolve`, {
      method: "POST",
      bodyData: payload,
    }),
};


// =============================================================================
// InAds — Tipos Globales del Dominio (TypeScript)
// =============================================================================

export type UserRole = "influencer" | "developer" | "admin";

export type AppStatus = "active" | "paused" | "out_of_funds" | "archived";

export type ReferralStatus = "pending" | "verified" | "flagged_fraud" | "rejected";

export type TransactionStatus = "pending" | "processing" | "completed" | "rejected";

export type PayoutMethodType = "paypal" | "bank_transfer" | "usdt_crypto";

export interface PayoutDetails {
  paypal_email?: string;
  bank_name?: string;
  bank_account_holder?: string;
  bank_clabe_or_iban?: string;
  usdt_network?: string;
  usdt_address?: string;
}

export interface SocialLinks {
  tiktok?: string;
  youtube?: string;
  twitch?: string;
  instagram?: string;
}

export interface UserProfile {
  id: string;
  email: string;
  full_name: string;
  avatar_url?: string | null;
  role: UserRole | null;
  available_balance: number;
  pending_balance: number;
  total_earned: number;
  payout_method?: PayoutMethodType | null;
  payout_details: PayoutDetails;
  social_links: SocialLinks;
  email_notifications: boolean;
  is_suspended: boolean;
  is_admin?: boolean;
  created_at: string;
}

export interface AppItem {
  id: string;
  developer_id?: string;
  name: string;
  description: string;
  category: string;
  icon_url?: string | null;
  store_url: string;
  pitch_guidelines: string;
  campaign_balance: number;
  total_deposited?: number;
  cost_per_user?: number;
  influencer_reward: number;
  api_key_prefix?: string;
  status: AppStatus;
  min_sessions_required: number;
  total_claims?: number;
  total_verified: number;
  created_at: string;
}

export interface InfluencerCampaign {
  id: string;
  influencer_id: string;
  app_id: string;
  referral_code: string;
  pending_referrals_count: number;
  verified_referrals_count: number;
  flagged_referrals_count?: number;
  total_earned: number;
  is_active: boolean;
  created_at?: string;
  apps?: {
    name: string;
    icon_url?: string;
    store_url: string;
    status: AppStatus;
  };
}

export interface ReferralItem {
  id: string;
  campaign_id?: string;
  app_id?: string;
  player_id: string;
  status: ReferralStatus;
  sessions_count: number;
  reward_amount?: number;
  claimed_at: string;
  verified_at?: string | null;
  apps?: {
    name: string;
  };
}

export interface WalletDeposit {
  id: string;
  developer_id: string;
  app_id: string;
  amount: number;
  payment_method: PayoutMethodType;
  reference_code: string;
  receipt_url?: string;
  status: TransactionStatus;
  admin_notes?: string;
  created_at: string;
  apps?: {
    name: string;
    campaign_balance?: number;
  };
  profiles?: {
    email: string;
    full_name: string;
  };
}

export interface PayoutRequest {
  id: string;
  influencer_id: string;
  amount: number;
  payout_method: PayoutMethodType;
  payout_destination: PayoutDetails;
  status: TransactionStatus;
  payment_reference?: string;
  admin_notes?: string;
  processed_at?: string;
  created_at: string;
  profiles?: {
    email: string;
    full_name: string;
    social_links?: SocialLinks;
  };
}

export interface LedgerEntry {
  id: string;
  user_id?: string;
  app_id?: string;
  entry_type: string;
  amount: number;
  balance_after?: number | null;
  description: string;
  created_at: string;
}

export interface FraudAlert {
  id: string;
  campaign_id: string;
  influencer_id: string;
  app_id: string;
  alert_type: string;
  severity: "low" | "medium" | "high" | "critical";
  details: Record<string, unknown>;
  is_resolved: boolean;
  created_at: string;
  profiles?: {
    email: string;
    full_name: string;
  };
  apps?: {
    name: string;
  };
  influencer_campaigns?: {
    referral_code: string;
  };
}


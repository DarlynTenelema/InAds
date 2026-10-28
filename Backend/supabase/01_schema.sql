-- =============================================================================
-- InAds — 01_schema.sql
-- Esquema Principal de Base de Datos PostgreSQL (Supabase)
-- =============================================================================

-- Extensiones requeridas
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- =============================================================================
-- 1. TIPOS ENUMERADOS (ENUMS)
-- =============================================================================

DO $$ BEGIN
    CREATE TYPE user_role AS ENUM ('influencer', 'developer', 'admin');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE app_status AS ENUM ('active', 'paused', 'out_of_funds', 'archived');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE referral_status AS ENUM ('pending', 'verified', 'flagged_fraud', 'rejected');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE transaction_status AS ENUM ('pending', 'processing', 'completed', 'rejected');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE payout_method_type AS ENUM ('paypal', 'bank_transfer', 'usdt_crypto');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- =============================================================================
-- 2. TABLA: profiles (Usuarios: Influencers, Desarrolladores y Admins)
-- Vinculada a auth.users de Supabase (Google OAuth)
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT UNIQUE NOT NULL,
    full_name TEXT,
    avatar_url TEXT,
    role user_role DEFAULT NULL, -- Se elige en el onboarding (/auth)
    
    -- Finanzas del Influencer (Saldos protegidos con CHECK >= 0)
    available_balance NUMERIC(12, 2) NOT NULL DEFAULT 0.00 CHECK (available_balance >= 0.00),
    pending_balance NUMERIC(12, 2) NOT NULL DEFAULT 0.00 CHECK (pending_balance >= 0.00),
    total_earned NUMERIC(12, 2) NOT NULL DEFAULT 0.00 CHECK (total_earned >= 0.00),
    
    -- Configuración de Cobro del Influencer
    payout_method payout_method_type,
    payout_details JSONB NOT NULL DEFAULT '{}'::jsonb, -- Ej: {"paypal_email": "...", "bank_clabe": "..."}
    
    -- Redes Sociales y Preferencias
    social_links JSONB NOT NULL DEFAULT '{}'::jsonb,   -- Ej: {"tiktok": "@user", "youtube": "..."}
    email_notifications BOOLEAN NOT NULL DEFAULT TRUE,
    
    -- Seguridad y Moderación
    is_suspended BOOLEAN NOT NULL DEFAULT FALSE,
    suspension_reason TEXT,
    
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_profiles_role ON public.profiles(role);
CREATE INDEX IF NOT EXISTS idx_profiles_email ON public.profiles(email);

-- =============================================================================
-- 3. TABLA: apps (Juegos y Aplicaciones publicadas por Desarrolladores)
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.apps (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    developer_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    
    name TEXT NOT NULL,
    description TEXT NOT NULL,
    category TEXT NOT NULL DEFAULT 'game',
    icon_url TEXT,
    store_url TEXT NOT NULL,           -- Enlace a Play Store, App Store, Steam o Web
    pitch_guidelines TEXT NOT NULL,    -- Guion / qué decir para que el influencer promocione la app
    
    -- Presupuesto Prepagado (Escrow de Campaña)
    campaign_balance NUMERIC(12, 2) NOT NULL DEFAULT 0.00 CHECK (campaign_balance >= 0.00),
    total_deposited NUMERIC(12, 2) NOT NULL DEFAULT 0.00 CHECK (total_deposited >= 0.00),
    
    -- Tarifas por Conversión (Fijadas en el MVP: $0.15 dev -> $0.10 influencer + $0.05 InAds)
    cost_per_user NUMERIC(6, 2) NOT NULL DEFAULT 0.15 CHECK (cost_per_user > 0),
    influencer_reward NUMERIC(6, 2) NOT NULL DEFAULT 0.10 CHECK (influencer_reward > 0),
    platform_fee NUMERIC(6, 2) NOT NULL DEFAULT 0.05 CHECK (platform_fee >= 0),
    
    -- Seguridad de API Key (Solo guardamos prefijo visible y el hash SHA-256)
    api_key_prefix TEXT NOT NULL,      -- Ej: "inads_live_9f8a..."
    api_key_hash TEXT UNIQUE NOT NULL, -- Hash HMAC-SHA256 de la llave completa
    
    -- Estado y Métricas Acumuladas
    status app_status NOT NULL DEFAULT 'out_of_funds',
    min_sessions_required INTEGER NOT NULL DEFAULT 3 CHECK (min_sessions_required >= 1),
    total_claims INTEGER NOT NULL DEFAULT 0,
    total_verified INTEGER NOT NULL DEFAULT 0,
    
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    CONSTRAINT chk_pricing_split CHECK (cost_per_user = (influencer_reward + platform_fee))
);

CREATE INDEX IF NOT EXISTS idx_apps_developer_id ON public.apps(developer_id);
CREATE INDEX IF NOT EXISTS idx_apps_status ON public.apps(status);
CREATE INDEX IF NOT EXISTS idx_apps_api_key_hash ON public.apps(api_key_hash);

-- =============================================================================
-- 4. TABLA: influencer_campaigns (Códigos únicos de Influencer por App)
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.influencer_campaigns (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    influencer_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    app_id UUID NOT NULL REFERENCES public.apps(id) ON DELETE CASCADE,
    
    -- Código que el seguidor pega dentro del juego (siempre en MAYÚSCULAS)
    referral_code TEXT UNIQUE NOT NULL CHECK (referral_code = UPPER(referral_code)),
    
    -- Contadores Rápidos para el Dashboard
    pending_referrals_count INTEGER NOT NULL DEFAULT 0 CHECK (pending_referrals_count >= 0),
    verified_referrals_count INTEGER NOT NULL DEFAULT 0 CHECK (verified_referrals_count >= 0),
    flagged_referrals_count INTEGER NOT NULL DEFAULT 0 CHECK (flagged_referrals_count >= 0),
    total_earned NUMERIC(12, 2) NOT NULL DEFAULT 0.00 CHECK (total_earned >= 0.00),
    
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    UNIQUE (influencer_id, app_id)
);

CREATE INDEX IF NOT EXISTS idx_campaigns_referral_code ON public.influencer_campaigns(referral_code);
CREATE INDEX IF NOT EXISTS idx_campaigns_influencer_id ON public.influencer_campaigns(influencer_id);
CREATE INDEX IF NOT EXISTS idx_campaigns_app_id ON public.influencer_campaigns(app_id);

-- =============================================================================
-- 5. TABLA: referrals (Jugadores/Usuarios que canjearon un código)
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.referrals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    campaign_id UUID NOT NULL REFERENCES public.influencer_campaigns(id) ON DELETE RESTRICT,
    app_id UUID NOT NULL REFERENCES public.apps(id) ON DELETE RESTRICT,
    influencer_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
    
    -- Identificadores Antifraude enviados por el juego vía API
    player_id TEXT NOT NULL,           -- ID del usuario dentro de la base de datos del juego
    device_hash TEXT NOT NULL,         -- Hash único de dispositivo para bloquear multi-cuentas/emuladores
    ip_subnet TEXT,                    -- Subred /24 del jugador para detectar granjas de bots
    
    -- Seguimiento de Retención / Actividad
    sessions_count INTEGER NOT NULL DEFAULT 1 CHECK (sessions_count >= 1),
    last_activity_date DATE NOT NULL DEFAULT CURRENT_DATE,
    
    -- Estado de Validación y Recompensa
    status referral_status NOT NULL DEFAULT 'pending',
    reward_amount NUMERIC(6, 2) NOT NULL DEFAULT 0.10,
    fraud_reason TEXT,
    
    claimed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    verified_at TIMESTAMPTZ,
    
    -- Reglas Antifraude Estrictas a nivel de Base de Datos:
    -- 1. Un jugador solo puede canjear un código por juego.
    UNIQUE (app_id, player_id),
    -- 2. Un dispositivo físico solo puede canjear un código por juego.
    UNIQUE (app_id, device_hash)
);

CREATE INDEX IF NOT EXISTS idx_referrals_campaign_id ON public.referrals(campaign_id);
CREATE INDEX IF NOT EXISTS idx_referrals_influencer_id ON public.referrals(influencer_id);
CREATE INDEX IF NOT EXISTS idx_referrals_app_player ON public.referrals(app_id, player_id);
CREATE INDEX IF NOT EXISTS idx_referrals_status_claimed ON public.referrals(status, claimed_at DESC);
CREATE INDEX IF NOT EXISTS idx_referrals_subnet_claimed ON public.referrals(app_id, ip_subnet, claimed_at DESC);

-- =============================================================================
-- 6. TABLA: wallet_deposits (Recargas Manuales de Desarrolladores)
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.wallet_deposits (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    developer_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
    app_id UUID NOT NULL REFERENCES public.apps(id) ON DELETE RESTRICT,
    
    amount NUMERIC(12, 2) NOT NULL CHECK (amount >= 15.00), -- Mínimo sugerido de recarga: $15 USD
    payment_method TEXT NOT NULL,                           -- 'paypal', 'bank_transfer', 'usdt_crypto'
    reference_code TEXT NOT NULL,                           -- Número de comprobante / ID de transacción
    receipt_url TEXT,                                       -- Captura opcional del comprobante
    
    status transaction_status NOT NULL DEFAULT 'pending',
    admin_notes TEXT,
    reviewed_by UUID REFERENCES public.profiles(id),
    reviewed_at TIMESTAMPTZ,
    
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_deposits_developer_id ON public.wallet_deposits(developer_id);
CREATE INDEX IF NOT EXISTS idx_deposits_status ON public.wallet_deposits(status, created_at DESC);

-- =============================================================================
-- 7. TABLA: payout_requests (Solicitudes de Retiro Manual de Influencers >= $100)
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.payout_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    influencer_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
    
    -- Regla de negocio crítica: Mínimo $100.00 USD para proteger márgenes frente a comisiones
    amount NUMERIC(12, 2) NOT NULL CHECK (amount >= 100.00),
    payout_method payout_method_type NOT NULL,
    payout_destination JSONB NOT NULL,                      -- Snapshot de los datos de cobro al solicitar
    
    status transaction_status NOT NULL DEFAULT 'pending',
    payment_reference TEXT,                                 -- ID de transferencia colocado por el Admin al pagar
    receipt_url TEXT,
    admin_notes TEXT,
    processed_by UUID REFERENCES public.profiles(id),
    processed_at TIMESTAMPTZ,
    
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_payouts_influencer_id ON public.payout_requests(influencer_id);
CREATE INDEX IF NOT EXISTS idx_payouts_status ON public.payout_requests(status, created_at DESC);

-- =============================================================================
-- 8. TABLA: ledger_entries (Libro Mayor Contable Inmutable de Auditoría)
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.ledger_entries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.profiles(id) ON DELETE RESTRICT,
    app_id UUID REFERENCES public.apps(id) ON DELETE RESTRICT,
    referral_id UUID REFERENCES public.referrals(id) ON DELETE RESTRICT,
    
    entry_type TEXT NOT NULL, -- 'deposit_approved', 'referral_debit_dev', 'referral_credit_inf', 'platform_fee', 'payout_locked', 'payout_completed', 'payout_rejected_refund'
    amount NUMERIC(12, 2) NOT NULL,
    balance_after NUMERIC(12, 2),
    description TEXT NOT NULL,
    
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ledger_user_id ON public.ledger_entries(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ledger_app_id ON public.ledger_entries(app_id, created_at DESC);

-- =============================================================================
-- 9. TABLA: fraud_alerts (Alertas Automáticas para el Panel /admin)
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.fraud_alerts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    campaign_id UUID REFERENCES public.influencer_campaigns(id) ON DELETE CASCADE,
    influencer_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    app_id UUID REFERENCES public.apps(id) ON DELETE CASCADE,
    
    alert_type TEXT NOT NULL, -- 'subnet_spike_50_hour', 'duplicate_device_flood', 'suspicious_conversion_velocity'
    severity TEXT NOT NULL DEFAULT 'high',
    details JSONB NOT NULL DEFAULT '{}'::jsonb,
    
    is_resolved BOOLEAN NOT NULL DEFAULT FALSE,
    resolved_by UUID REFERENCES public.profiles(id),
    resolved_at TIMESTAMPTZ,
    
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_fraud_alerts_unresolved ON public.fraud_alerts(is_resolved, created_at DESC);


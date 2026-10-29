-- =============================================================================
-- InAds — 03_rls_security.sql
-- Políticas de Seguridad a Nivel de Fila (RLS) y Blindaje de Columnas Sensibles
-- =============================================================================

-- =============================================================================
-- 1. ACTIVAR ROW LEVEL SECURITY (RLS) EN TODAS LAS TABLAS
-- =============================================================================

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.apps ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.influencer_campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.referrals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wallet_deposits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payout_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ledger_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fraud_alerts ENABLE ROW LEVEL SECURITY;

-- =============================================================================
-- 2. TRIGGER DE BLINDAJE: Impedir que un usuario modifique su propio saldo o rol
-- Solo el backend Golang (service_role / postgres) puede alterar saldos o estado
-- =============================================================================

CREATE OR REPLACE FUNCTION public.protect_sensitive_profile_columns()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    -- Si la consulta viene desde el cliente web (authenticated) y no del backend (service_role)
    IF current_setting('request.jwt.claim.role', true) = 'authenticated' THEN
        IF TG_OP = 'INSERT' THEN
            NEW.available_balance := 0.00;
            NEW.pending_balance := 0.00;
            NEW.total_earned := 0.00;
            NEW.is_suspended := FALSE;
            IF NEW.role = 'admin' THEN
                RAISE EXCEPTION 'Operación denegada: No puedes asignarte permisos de administrador.';
            END IF;
        ELSIF TG_OP = 'UPDATE' THEN
            -- Impedir alteración de saldos
            IF NEW.available_balance IS DISTINCT FROM OLD.available_balance
               OR NEW.pending_balance IS DISTINCT FROM OLD.pending_balance
               OR NEW.total_earned IS DISTINCT FROM OLD.total_earned THEN
                RAISE EXCEPTION 'Operación denegada: No tienes permiso para modificar saldos directamente.';
            END IF;

            -- Impedir desbloqueo de cuenta suspendida
            IF NEW.is_suspended IS DISTINCT FROM OLD.is_suspended THEN
                RAISE EXCEPTION 'Operación denegada: Estado de moderación protegido.';
            END IF;

            -- Permitir alternar entre 'influencer' y 'developer', pero jamás permitir auto-asignarse 'admin'.
            IF NEW.role IS DISTINCT FROM OLD.role THEN
                IF NEW.role = 'admin' AND OLD.role IS DISTINCT FROM 'admin' THEN
                    RAISE EXCEPTION 'Operación denegada: No puedes asignarte permisos de administrador.';
                END IF;
            END IF;
        END IF;
    END IF;

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_protect_profile_columns ON public.profiles;
CREATE TRIGGER trg_protect_profile_columns
    BEFORE INSERT OR UPDATE ON public.profiles
    FOR EACH ROW EXECUTE FUNCTION public.protect_sensitive_profile_columns();

-- Trigger similar para evitar que un Developer edite su propio campaign_balance desde el frontend
CREATE OR REPLACE FUNCTION public.protect_sensitive_app_columns()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    IF current_setting('request.jwt.claim.role', true) = 'authenticated' THEN
        IF TG_OP = 'INSERT' THEN
            NEW.campaign_balance := 0.00;
            NEW.total_deposited := 0.00;
            NEW.total_claims := 0;
            NEW.total_verified := 0;
            NEW.cost_per_user := 0.15;
            NEW.influencer_reward := 0.10;
            NEW.platform_fee := 0.05;
            NEW.status := 'out_of_funds';
        ELSIF TG_OP = 'UPDATE' THEN
            IF NEW.campaign_balance IS DISTINCT FROM OLD.campaign_balance
               OR NEW.total_deposited IS DISTINCT FROM OLD.total_deposited
               OR NEW.total_claims IS DISTINCT FROM OLD.total_claims
               OR NEW.total_verified IS DISTINCT FROM OLD.total_verified
               OR NEW.cost_per_user IS DISTINCT FROM OLD.cost_per_user
               OR NEW.influencer_reward IS DISTINCT FROM OLD.influencer_reward
               OR NEW.platform_fee IS DISTINCT FROM OLD.platform_fee
               OR NEW.api_key_hash IS DISTINCT FROM OLD.api_key_hash THEN
                RAISE EXCEPTION 'Operación denegada: Las métricas y el saldo de campaña son administrados exclusivamente por el motor de InAds.';
            END IF;

            IF NEW.status = 'active' AND OLD.campaign_balance < OLD.cost_per_user THEN
                RAISE EXCEPTION 'Operación denegada: No puedes activar una campaña sin saldo disponible.';
            END IF;
        END IF;
    END IF;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_protect_app_columns ON public.apps;
CREATE TRIGGER trg_protect_app_columns
    BEFORE INSERT OR UPDATE ON public.apps
    FOR EACH ROW EXECUTE FUNCTION public.protect_sensitive_app_columns();

-- =============================================================================
-- 3. POLÍTICAS RLS POR TABLA
-- =============================================================================

-- --- TABLA: profiles ---
DROP POLICY IF EXISTS "Usuarios ven su propio perfil" ON public.profiles;
CREATE POLICY "Usuarios ven su propio perfil"
    ON public.profiles FOR SELECT
    USING (auth.uid() = id);

DROP POLICY IF EXISTS "Usuarios crean su propio perfil inicial" ON public.profiles;
CREATE POLICY "Usuarios crean su propio perfil inicial"
    ON public.profiles FOR INSERT
    WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "Usuarios actualizan su propio perfil" ON public.profiles;
CREATE POLICY "Usuarios actualizan su propio perfil"
    ON public.profiles FOR UPDATE
    USING (auth.uid() = id)
    WITH CHECK (auth.uid() = id);

-- --- TABLA: apps ---
-- Influencers ven apps activas; Desarrolladores ven todas sus propias apps
DROP POLICY IF EXISTS "Ver apps activas o propias" ON public.apps;
CREATE POLICY "Ver apps activas o propias"
    ON public.apps FOR SELECT
    USING (status = 'active' OR developer_id = auth.uid());

DROP POLICY IF EXISTS "Desarrolladores crean sus apps" ON public.apps;
CREATE POLICY "Desarrolladores crean sus apps"
    ON public.apps FOR INSERT
    WITH CHECK (developer_id = auth.uid());

DROP POLICY IF EXISTS "Desarrolladores editan sus apps" ON public.apps;
CREATE POLICY "Desarrolladores editan sus apps"
    ON public.apps FOR UPDATE
    USING (developer_id = auth.uid())
    WITH CHECK (developer_id = auth.uid());

-- --- TABLA: influencer_campaigns ---
DROP POLICY IF EXISTS "Influencers y Devs ven campañas asociadas" ON public.influencer_campaigns;
CREATE POLICY "Influencers y Devs ven campañas asociadas"
    ON public.influencer_campaigns FOR SELECT
    USING (
        influencer_id = auth.uid()
        OR EXISTS (SELECT 1 FROM public.apps WHERE apps.id = influencer_campaigns.app_id AND apps.developer_id = auth.uid())
    );

DROP POLICY IF EXISTS "Influencers generan su código de campaña" ON public.influencer_campaigns;
CREATE POLICY "Influencers generan su código de campaña"
    ON public.influencer_campaigns FOR INSERT
    WITH CHECK (influencer_id = auth.uid());

-- --- TABLA: referrals ---
-- Influencers ven sus propios referidos; Desarrolladores ven los referidos de sus apps
DROP POLICY IF EXISTS "Lectura de referidos propios" ON public.referrals;
CREATE POLICY "Lectura de referidos propios"
    ON public.referrals FOR SELECT
    USING (
        influencer_id = auth.uid()
        OR EXISTS (SELECT 1 FROM public.apps WHERE apps.id = referrals.app_id AND apps.developer_id = auth.uid())
    );

-- --- TABLA: wallet_deposits ---
DROP POLICY IF EXISTS "Desarrolladores ven sus recargas" ON public.wallet_deposits;
CREATE POLICY "Desarrolladores ven sus recargas"
    ON public.wallet_deposits FOR SELECT
    USING (developer_id = auth.uid());

DROP POLICY IF EXISTS "Desarrolladores reportan recargas manuales" ON public.wallet_deposits;
CREATE POLICY "Desarrolladores reportan recargas manuales"
    ON public.wallet_deposits FOR INSERT
    WITH CHECK (developer_id = auth.uid() AND status = 'pending');

-- --- TABLA: payout_requests ---
DROP POLICY IF EXISTS "Influencers ven sus solicitudes de retiro" ON public.payout_requests;
CREATE POLICY "Influencers ven sus solicitudes de retiro"
    ON public.payout_requests FOR SELECT
    USING (influencer_id = auth.uid());

-- --- TABLA: ledger_entries ---
DROP POLICY IF EXISTS "Usuarios ven su propio historial contable" ON public.ledger_entries;
CREATE POLICY "Usuarios ven su propio historial contable"
    ON public.ledger_entries FOR SELECT
    USING (user_id = auth.uid());

-- =============================================================================
-- 4. REVOCAR EJECUCIÓN PÚBLICA DE FUNCIONES INTERNAS CRÍTICAS
-- Solo el backend Golang (service_role) puede invocar las funciones de API y Admin
-- =============================================================================

REVOKE EXECUTE ON FUNCTION public.fn_claim_referral FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.fn_verify_referral FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.fn_request_payout FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.fn_admin_approve_deposit FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.fn_admin_complete_payout FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.fn_admin_reject_payout FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.fn_claim_referral TO service_role;
GRANT EXECUTE ON FUNCTION public.fn_verify_referral TO service_role;
GRANT EXECUTE ON FUNCTION public.fn_request_payout TO service_role;
GRANT EXECUTE ON FUNCTION public.fn_admin_approve_deposit TO service_role;
GRANT EXECUTE ON FUNCTION public.fn_admin_complete_payout TO service_role;
GRANT EXECUTE ON FUNCTION public.fn_admin_reject_payout TO service_role;

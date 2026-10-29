-- =============================================================================
-- InAds — 02_functions_and_triggers.sql
-- Motores Transaccionales Atómicos (Escrow, Antifraude, Códigos y Pagos Manuales)
-- =============================================================================

-- =============================================================================
-- 1. TRIGGER: Actualización automática de updated_at
-- =============================================================================

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_profiles_updated_at ON public.profiles;
CREATE TRIGGER trg_profiles_updated_at
    BEFORE UPDATE ON public.profiles
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS trg_apps_updated_at ON public.apps;
CREATE TRIGGER trg_apps_updated_at
    BEFORE UPDATE ON public.apps
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS trg_campaigns_updated_at ON public.influencer_campaigns;
CREATE TRIGGER trg_campaigns_updated_at
    BEFORE UPDATE ON public.influencer_campaigns
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- =============================================================================
-- 2. TRIGGER: Creación automática de Perfil al registrarse con Google OAuth
-- =============================================================================

CREATE OR REPLACE FUNCTION public.handle_new_auth_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
    INSERT INTO public.profiles (id, email, full_name, avatar_url)
    VALUES (
        NEW.id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
        COALESCE(NEW.raw_user_meta_data->>'avatar_url', NEW.raw_user_meta_data->>'picture', NULL)
    )
    ON CONFLICT DO NOTHING;
    RETURN NEW;
EXCEPTION
    WHEN OTHERS THEN
        RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_auth_user();

-- Sincronizar automáticamente usuarios de auth.users que hayan iniciado sesión antes de crear el trigger
INSERT INTO public.profiles (id, email, full_name, avatar_url)
SELECT
    u.id,
    u.email,
    COALESCE(u.raw_user_meta_data->>'full_name', u.raw_user_meta_data->>'name', split_part(u.email, '@', 1)),
    COALESCE(u.raw_user_meta_data->>'avatar_url', u.raw_user_meta_data->>'picture', NULL)
FROM auth.users u
WHERE u.email IS NOT NULL
ON CONFLICT DO NOTHING;

-- =============================================================================
-- 3. FUNCIÓN: Canje de Código dentro del Juego (POST /api/v1/referrals/claim)
-- Incluye validación de presupuesto y detección antifraude por subred IP (>50/hora)
-- =============================================================================

CREATE OR REPLACE FUNCTION public.fn_claim_referral(
    p_api_key_hash TEXT,
    p_referral_code TEXT,
    p_player_id TEXT,
    p_device_hash TEXT,
    p_ip_subnet TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
DECLARE
    v_app public.apps%ROWTYPE;
    v_campaign public.influencer_campaigns%ROWTYPE;
    v_influencer public.profiles%ROWTYPE;
    v_subnet_claims_last_hour INTEGER := 0;
    v_max_subnet_limit INTEGER := 50;
    v_initial_status referral_status := 'pending';
    v_fraud_reason TEXT := NULL;
    v_new_referral_id UUID;
BEGIN
    -- 1. Validar API Key del Desarrollador
    SELECT * INTO v_app
    FROM public.apps
    WHERE api_key_hash = p_api_key_hash;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('status', 'error', 'code', 'INVALID_API_KEY', 'message', 'API Key inválida o no autorizada');
    END IF;

    -- 2. Verificar que la campaña tenga fondos suficientes y esté activa
    IF v_app.status != 'active' OR v_app.campaign_balance < v_app.cost_per_user THEN
        RETURN jsonb_build_object('status', 'error', 'code', 'CAMPAIGN_PAUSED_OR_NO_FUNDS', 'message', 'La campaña de la aplicación no está activa o agotó su saldo');
    END IF;

    -- 3. Buscar el código del influencer para esta app
    SELECT * INTO v_campaign
    FROM public.influencer_campaigns
    WHERE referral_code = UPPER(TRIM(p_referral_code))
      AND app_id = v_app.id
      AND is_active = TRUE;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('status', 'error', 'code', 'INVALID_REFERRAL_CODE', 'message', 'El código de creador no existe o no pertenece a este juego');
    END IF;

    -- 4. Verificar que el influencer no esté suspendido
    SELECT * INTO v_influencer
    FROM public.profiles
    WHERE id = v_campaign.influencer_id;

    IF v_influencer.is_suspended THEN
        RETURN jsonb_build_object('status', 'error', 'code', 'INFLUENCER_SUSPENDED', 'message', 'El código de creador se encuentra temporalmente inactivo');
    END IF;

    -- 5. Verificar duplicados (Mismo jugador o mismo dispositivo físico)
    IF EXISTS (SELECT 1 FROM public.referrals WHERE app_id = v_app.id AND player_id = p_player_id) THEN
        RETURN jsonb_build_object('status', 'error', 'code', 'PLAYER_ALREADY_CLAIMED', 'message', 'Este jugador ya canjeó un código anteriormente');
    END IF;

    IF EXISTS (SELECT 1 FROM public.referrals WHERE app_id = v_app.id AND device_hash = p_device_hash) THEN
        RETURN jsonb_build_object('status', 'error', 'code', 'DEVICE_ALREADY_CLAIMED', 'message', 'Este dispositivo ya registró un código en este juego');
    END IF;

    -- 6. Control Antifraude: ¿Más de N registros desde la misma subred IP en 1 hora?
    IF p_ip_subnet IS NOT NULL AND p_ip_subnet != '' THEN
        SELECT COUNT(*) INTO v_subnet_claims_last_hour
        FROM public.referrals
        WHERE campaign_id = v_campaign.id
          AND ip_subnet = p_ip_subnet
          AND claimed_at >= (NOW() - INTERVAL '1 hour');

        IF v_subnet_claims_last_hour >= v_max_subnet_limit THEN
            v_initial_status := 'flagged_fraud';
            v_fraud_reason := 'Más de ' || v_max_subnet_limit || ' registros desde la misma subred IP en menos de 1 hora';

            INSERT INTO public.fraud_alerts (campaign_id, influencer_id, app_id, alert_type, severity, details)
            VALUES (
                v_campaign.id,
                v_campaign.influencer_id,
                v_app.id,
                'subnet_spike_50_hour',
                'critical',
                jsonb_build_object('ip_subnet', p_ip_subnet, 'claims_in_last_hour', v_subnet_claims_last_hour + 1, 'referral_code', v_campaign.referral_code)
            );
        END IF;
    END IF;

    -- 7. Insertar el referido
    INSERT INTO public.referrals (
        campaign_id, app_id, influencer_id, player_id, device_hash, ip_subnet, status, reward_amount, fraud_reason
    ) VALUES (
        v_campaign.id, v_app.id, v_campaign.influencer_id, p_player_id, p_device_hash, p_ip_subnet, v_initial_status, v_app.influencer_reward, v_fraud_reason
    ) RETURNING id INTO v_new_referral_id;

    -- 8. Actualizar contadores según estado
    UPDATE public.apps
    SET total_claims = total_claims + 1
    WHERE id = v_app.id;

    IF v_initial_status = 'pending' THEN
        UPDATE public.influencer_campaigns
        SET pending_referrals_count = pending_referrals_count + 1
        WHERE id = v_campaign.id;

        UPDATE public.profiles
        SET pending_balance = pending_balance + v_app.influencer_reward
        WHERE id = v_campaign.influencer_id;
    ELSE
        UPDATE public.influencer_campaigns
        SET flagged_referrals_count = flagged_referrals_count + 1
        WHERE id = v_campaign.id;
    END IF;

    RETURN jsonb_build_object(
        'status', 'success',
        'referral_id', v_new_referral_id,
        'referral_state', v_initial_status,
        'message', 'Código registrado correctamente'
    );
END;
$$;

-- =============================================================================
-- 4. FUNCIÓN: Verificación de Actividad y Liquidación Escrow (POST /api/v1/referrals/verify)
-- Descuenta $0.15 al Dev, acredita $0.10 al Influencer y registra $0.05 para InAds
-- =============================================================================

CREATE OR REPLACE FUNCTION public.fn_verify_referral(
    p_api_key_hash TEXT,
    p_player_id TEXT,
    p_event TEXT DEFAULT 'session_ping'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
DECLARE
    v_app public.apps%ROWTYPE;
    v_referral public.referrals%ROWTYPE;
    v_influencer public.profiles%ROWTYPE;
    v_new_sessions INTEGER;
    v_should_verify BOOLEAN := FALSE;
    v_new_dev_balance NUMERIC(12, 2);
    v_new_inf_balance NUMERIC(12, 2);
BEGIN
    -- 1. Validar y bloquear fila de la App (FOR UPDATE evita condiciones de carrera en el saldo)
    SELECT * INTO v_app
    FROM public.apps
    WHERE api_key_hash = p_api_key_hash
    FOR UPDATE;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('status', 'error', 'code', 'INVALID_API_KEY', 'message', 'API Key inválida');
    END IF;

    -- 2. Buscar el referido del jugador bloqueando la fila
    SELECT * INTO v_referral
    FROM public.referrals
    WHERE app_id = v_app.id
      AND player_id = p_player_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('status', 'error', 'code', 'REFERRAL_NOT_FOUND', 'message', 'El jugador no tiene un código registrado');
    END IF;

    IF v_referral.status = 'verified' THEN
        RETURN jsonb_build_object('status', 'already_verified', 'reward_applied', FALSE, 'message', 'Este jugador ya fue verificado previamente');
    END IF;

    IF v_referral.status != 'pending' THEN
        RETURN jsonb_build_object('status', 'error', 'code', 'REFERRAL_NOT_ELIGIBLE', 'message', 'El registro se encuentra en revisión o fue rechazado por fraude');
    END IF;

    -- 2.1 Validar ventana máxima de retención (15 días desde el canje inicial)
    IF v_referral.claimed_at < (NOW() - INTERVAL '15 days') AND p_event != 'retention_confirmed' THEN
        RETURN jsonb_build_object('status', 'error', 'code', 'REFERRAL_WINDOW_EXPIRED', 'message', 'El periodo de 15 días para completar las sesiones mínimas de validación ha expirado');
    END IF;

    -- 3. Contabilizar sesión en día distinto
    v_new_sessions := v_referral.sessions_count;
    IF v_referral.last_activity_date < CURRENT_DATE THEN
        v_new_sessions := v_referral.sessions_count + 1;
        UPDATE public.referrals
        SET sessions_count = v_new_sessions,
            last_activity_date = CURRENT_DATE
        WHERE id = v_referral.id;
    END IF;

    -- 4. Evaluar si cumple criterio de verificación
    IF p_event = 'retention_confirmed' OR v_new_sessions >= v_app.min_sessions_required THEN
        v_should_verify := TRUE;
    END IF;

    IF NOT v_should_verify THEN
        RETURN jsonb_build_object(
            'status', 'pending',
            'reward_applied', FALSE,
            'sessions_completed', v_new_sessions,
            'sessions_required', v_app.min_sessions_required
        );
    END IF;

    -- 5. Verificar fondos del Desarrollador ($0.15)
    IF v_app.campaign_balance < v_app.cost_per_user THEN
        UPDATE public.apps SET status = 'out_of_funds' WHERE id = v_app.id;
        RETURN jsonb_build_object('status', 'error', 'code', 'INSUFFICIENT_CAMPAIGN_FUNDS', 'message', 'La campaña se quedó sin saldo para liquidar la conversión');
    END IF;

    -- 6. Liquidación Atómica Escrow:
    -- A) Descontar $0.15 de la campaña del desarrollador (y pausar si queda con menos de $0.15)
    v_new_dev_balance := v_app.campaign_balance - v_app.cost_per_user;

    UPDATE public.apps
    SET campaign_balance = v_new_dev_balance,
        total_verified = total_verified + 1,
        status = CASE WHEN v_new_dev_balance < cost_per_user THEN 'out_of_funds'::app_status ELSE status END
    WHERE id = v_app.id;

    -- B) Mover $0.10 de pending_balance a available_balance del Influencer
    SELECT * INTO v_influencer
    FROM public.profiles
    WHERE id = v_referral.influencer_id
    FOR UPDATE;

    v_new_inf_balance := v_influencer.available_balance + v_referral.reward_amount;

    UPDATE public.profiles
    SET pending_balance = GREATEST(0.00, pending_balance - v_referral.reward_amount),
        available_balance = v_new_inf_balance,
        total_earned = total_earned + v_referral.reward_amount
    WHERE id = v_referral.influencer_id;

    -- C) Actualizar contadores de la campaña del influencer
    UPDATE public.influencer_campaigns
    SET pending_referrals_count = GREATEST(0, pending_referrals_count - 1),
        verified_referrals_count = verified_referrals_count + 1,
        total_earned = total_earned + v_referral.reward_amount
    WHERE id = v_referral.campaign_id;

    -- D) Marcar referido como verificado
    UPDATE public.referrals
    SET status = 'verified',
        verified_at = NOW()
    WHERE id = v_referral.id;

    -- E) Registrar en el Libro Contable (Ledger)
    INSERT INTO public.ledger_entries (user_id, app_id, referral_id, entry_type, amount, balance_after, description)
    VALUES
        (v_app.developer_id, v_app.id, v_referral.id, 'referral_debit_dev', -v_app.cost_per_user, v_new_dev_balance, 'Cobro por usuario verificado (' || p_player_id || ')'),
        (v_referral.influencer_id, v_app.id, v_referral.id, 'referral_credit_inf', v_referral.reward_amount, v_new_inf_balance, 'Ganancia por usuario verificado (' || p_player_id || ')'),
        (NULL, v_app.id, v_referral.id, 'platform_fee', v_app.platform_fee, NULL, 'Comisión InAds ($0.05) por conversión verificada');

    RETURN jsonb_build_object(
        'status', 'verified',
        'reward_applied', TRUE,
        'influencer_earned', v_referral.reward_amount,
        'campaign_balance_remaining', v_new_dev_balance
    );
END;
$$;

-- =============================================================================
-- 5. FUNCIÓN: Solicitud de Retiro del Influencer (Mínimo $100.00 USD)
-- Congela el saldo inmediatamente para evitar doble retiro
-- =============================================================================

CREATE OR REPLACE FUNCTION public.fn_request_payout(
    p_influencer_id UUID,
    p_amount NUMERIC(12, 2)
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
DECLARE
    v_profile public.profiles%ROWTYPE;
    v_new_balance NUMERIC(12, 2);
    v_payout_id UUID;
BEGIN
    -- Defensa en profundidad: si se invoca con sesión de usuario, solo puede retirar de su propia cuenta
    IF auth.uid() IS NOT NULL AND auth.uid() != p_influencer_id THEN
        RETURN jsonb_build_object('status', 'error', 'code', 'FORBIDDEN', 'message', 'No puedes solicitar retiros en nombre de otro usuario');
    END IF;

    IF p_amount < 100.00 THEN
        RETURN jsonb_build_object('status', 'error', 'code', 'BELOW_MIN_PAYOUT', 'message', 'El monto mínimo de retiro es de $100.00 USD');
    END IF;

    SELECT * INTO v_profile
    FROM public.profiles
    WHERE id = p_influencer_id
    FOR UPDATE;

    IF NOT FOUND OR v_profile.role != 'influencer' THEN
        RETURN jsonb_build_object('status', 'error', 'code', 'UNAUTHORIZED', 'message', 'Perfil de influencer no válido');
    END IF;

    IF v_profile.is_suspended THEN
        RETURN jsonb_build_object('status', 'error', 'code', 'ACCOUNT_SUSPENDED', 'message', 'Tu cuenta está en revisión; no puedes solicitar retiros en este momento');
    END IF;

    IF v_profile.payout_method IS NULL OR v_profile.payout_details = '{}'::jsonb THEN
        RETURN jsonb_build_object('status', 'error', 'code', 'MISSING_PAYOUT_METHOD', 'message', 'Configura tu método de cobro antes de solicitar un retiro');
    END IF;

    IF v_profile.available_balance < p_amount THEN
        RETURN jsonb_build_object('status', 'error', 'code', 'INSUFFICIENT_BALANCE', 'message', 'No tienes saldo disponible suficiente');
    END IF;

    -- Descontar del saldo disponible (queda retenido en la solicitud de pago)
    v_new_balance := v_profile.available_balance - p_amount;

    UPDATE public.profiles
    SET available_balance = v_new_balance
    WHERE id = p_influencer_id;

    INSERT INTO public.payout_requests (influencer_id, amount, payout_method, payout_destination, status)
    VALUES (p_influencer_id, p_amount, v_profile.payout_method, v_profile.payout_details, 'pending')
    RETURNING id INTO v_payout_id;

    INSERT INTO public.ledger_entries (user_id, entry_type, amount, balance_after, description)
    VALUES (p_influencer_id, 'payout_locked', -p_amount, v_new_balance, 'Solicitud de retiro manual #' || v_payout_id);

    RETURN jsonb_build_object(
        'status', 'success',
        'payout_id', v_payout_id,
        'amount_requested', p_amount,
        'available_balance_remaining', v_new_balance
    );
END;
$$;

-- =============================================================================
-- 6. FUNCIONES DE ADMINISTRACIÓN MANUAL (/admin)
-- A) Aprobar recarga de Desarrollador y activar su App
-- B) Marcar retiro de Influencer como Pagado
-- =============================================================================

CREATE OR REPLACE FUNCTION public.fn_admin_approve_deposit(
    p_admin_id UUID,
    p_deposit_id UUID,
    p_admin_notes TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
DECLARE
    v_deposit public.wallet_deposits%ROWTYPE;
    v_app public.apps%ROWTYPE;
    v_new_balance NUMERIC(12, 2);
BEGIN
    SELECT * INTO v_deposit
    FROM public.wallet_deposits
    WHERE id = p_deposit_id
    FOR UPDATE;

    IF NOT FOUND OR v_deposit.status != 'pending' THEN
        RETURN jsonb_build_object('status', 'error', 'message', 'La recarga no existe o ya fue procesada');
    END IF;

    SELECT * INTO v_app
    FROM public.apps
    WHERE id = v_deposit.app_id
    FOR UPDATE;

    v_new_balance := v_app.campaign_balance + v_deposit.amount;

    -- Acreditar saldo y activar la app si estaba sin fondos
    UPDATE public.apps
    SET campaign_balance = v_new_balance,
        total_deposited = total_deposited + v_deposit.amount,
        status = CASE WHEN status = 'out_of_funds' AND v_new_balance >= cost_per_user THEN 'active'::app_status ELSE status END
    WHERE id = v_app.id;

    UPDATE public.wallet_deposits
    SET status = 'completed',
        admin_notes = p_admin_notes,
        reviewed_by = p_admin_id,
        reviewed_at = NOW()
    WHERE id = p_deposit_id;

    INSERT INTO public.ledger_entries (user_id, app_id, entry_type, amount, balance_after, description)
    VALUES (v_deposit.developer_id, v_app.id, 'deposit_approved', v_deposit.amount, v_new_balance, 'Recarga aprobada (Ref: ' || v_deposit.reference_code || ')');

    RETURN jsonb_build_object('status', 'success', 'new_campaign_balance', v_new_balance);
END;
$$;

CREATE OR REPLACE FUNCTION public.fn_admin_complete_payout(
    p_admin_id UUID,
    p_payout_id UUID,
    p_payment_reference TEXT,
    p_admin_notes TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
DECLARE
    v_payout public.payout_requests%ROWTYPE;
BEGIN
    SELECT * INTO v_payout
    FROM public.payout_requests
    WHERE id = p_payout_id
    FOR UPDATE;

    IF NOT FOUND OR v_payout.status NOT IN ('pending', 'processing') THEN
        RETURN jsonb_build_object('status', 'error', 'message', 'La solicitud de retiro no existe o ya fue finalizada');
    END IF;

    UPDATE public.payout_requests
    SET status = 'completed',
        payment_reference = p_payment_reference,
        admin_notes = p_admin_notes,
        processed_by = p_admin_id,
        processed_at = NOW()
    WHERE id = p_payout_id;

    INSERT INTO public.ledger_entries (user_id, entry_type, amount, balance_after, description)
    VALUES (v_payout.influencer_id, 'payout_completed', 0.00, NULL, 'Retiro pagado manualmente (Ref transferencia: ' || p_payment_reference || ')');

    RETURN jsonb_build_object('status', 'success', 'payout_id', p_payout_id, 'payment_reference', p_payment_reference);
END;
$$;

CREATE OR REPLACE FUNCTION public.fn_admin_reject_payout(
    p_admin_id UUID,
    p_payout_id UUID,
    p_admin_notes TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
DECLARE
    v_payout public.payout_requests%ROWTYPE;
    v_profile public.profiles%ROWTYPE;
    v_new_balance NUMERIC(12, 2);
BEGIN
    SELECT * INTO v_payout
    FROM public.payout_requests
    WHERE id = p_payout_id
    FOR UPDATE;

    IF NOT FOUND OR v_payout.status NOT IN ('pending', 'processing') THEN
        RETURN jsonb_build_object('status', 'error', 'message', 'La solicitud de retiro no existe o ya fue procesada');
    END IF;

    SELECT * INTO v_profile
    FROM public.profiles
    WHERE id = v_payout.influencer_id
    FOR UPDATE;

    v_new_balance := v_profile.available_balance + v_payout.amount;

    UPDATE public.profiles
    SET available_balance = v_new_balance
    WHERE id = v_payout.influencer_id;

    UPDATE public.payout_requests
    SET status = 'rejected',
        admin_notes = p_admin_notes,
        processed_by = p_admin_id,
        processed_at = NOW()
    WHERE id = p_payout_id;

    INSERT INTO public.ledger_entries (user_id, entry_type, amount, balance_after, description)
    VALUES (v_payout.influencer_id, 'payout_rejected_refund', v_payout.amount, v_new_balance, 'Retiro rechazado — saldo reintegrado (' || COALESCE(p_admin_notes, 'Revisión administrativa') || ')');

    RETURN jsonb_build_object('status', 'success', 'payout_id', p_payout_id, 'refunded_balance', v_new_balance);
END;
$$;

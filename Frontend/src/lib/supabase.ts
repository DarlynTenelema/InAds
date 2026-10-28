// =============================================================================
// InAds — Cliente Supabase Auth (Google OAuth & Gestión de Sesión)
// =============================================================================

import { createClient, SupabaseClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";

export const isSupabaseConfigured =
  Boolean(supabaseUrl) &&
  !supabaseUrl.includes("[TU_PROJECT_REF]") &&
  !supabaseUrl.includes("[PROJECT_REF]") &&
  Boolean(supabaseAnonKey) &&
  supabaseAnonKey !== "reemplazar_con_supabase_anon_key";

export const supabase: SupabaseClient | null = isSupabaseConfigured
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null;

/**
 * Obtiene el token JWT de la sesión activa en Supabase.
 */
export async function getAccessToken(): Promise<string | null> {
  if (!supabase) return null;
  const { data } = await supabase.auth.getSession();
  return data.session?.access_token ?? null;
}

/**
 * Inicia el flujo de Google OAuth redirigiendo de vuelta a /auth.
 */
export async function signInWithGoogleOAuth() {
  if (!supabase) {
    throw new Error(
      "Supabase aún no está configurado en Frontend/.env.local. Usa el modo interactivo de prueba o agrega tus llaves."
    );
  }

  const redirectTo =
    typeof window !== "undefined"
      ? `${window.location.origin}/auth`
      : `${process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"}/auth`;

  const { error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo,
      queryParams: {
        access_type: "offline",
        prompt: "consent",
      },
    },
  });

  if (error) throw error;
}


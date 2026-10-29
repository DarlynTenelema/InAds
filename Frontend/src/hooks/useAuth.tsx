"use client";

import React, { createContext, useCallback, useContext, useEffect, useState } from "react";
import { isSupabaseConfigured, signInWithGoogleOAuth, supabase } from "@/lib/supabase";
import { inadsApi } from "@/services/api";
import { UserProfile, UserRole } from "@/types";

interface AuthContextValue {
  profile: UserProfile | null;
  isLoading: boolean;
  authError: string | null;
  loginWithGoogle: (preferredRole?: UserRole) => Promise<void>;
  selectRole: (role: UserRole) => Promise<void>;
  updateProfileState: (partial: Partial<UserProfile>) => void;
  refreshProfile: () => Promise<void>;
  logout: () => Promise<void>;
}

const ADMIN_EMAIL_SET = new Set([
  "0805409802d@gmail.com",
  "darlyndavid2026@gmail.com",
  "darlyndavid100@gmail.com",
]);

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [authError, setAuthError] = useState<string | null>(null);

  const refreshProfile = useCallback(async () => {
    if (!isSupabaseConfigured || !supabase) {
      setProfile(null);
      setIsLoading(false);
      return;
    }

    try {
      const { data } = await supabase.auth.getSession();
      const session = data.session;
      if (!session) {
        setProfile(null);
        setIsLoading(false);
        return;
      }

      setAuthError(null);
      try {
        const res = await inadsApi.getProfile();
        setProfile(res.profile);
        return;
      } catch (apiErr: any) {
        // Fallback directo a Supabase RLS si el backend en Railway está reiniciando o validando JWT
        const user = session.user;
        const email = (user.email || "").toLowerCase().trim();
        const isAdminEmail = ADMIN_EMAIL_SET.has(email);

        const { data: existingProfile, error: selectErr } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", user.id)
          .maybeSingle();

        if (!selectErr && existingProfile) {
          setProfile({
            ...(existingProfile as UserProfile),
            is_admin: isAdminEmail || existingProfile.role === "admin",
          });
          return;
        }

        const fullName =
          user.user_metadata?.full_name ||
          user.user_metadata?.name ||
          email.split("@")[0] ||
          "Usuario InAds";

        const { data: createdProfile, error: insertErr } = await supabase
          .from("profiles")
          .upsert(
            {
              id: user.id,
              email,
              full_name: fullName,
              avatar_url:
                user.user_metadata?.avatar_url ||
                user.user_metadata?.picture ||
                null,
            },
            { onConflict: "id" }
          )
          .select("*")
          .single();

        if (!insertErr && createdProfile) {
          setProfile({
            ...(createdProfile as UserProfile),
            is_admin: isAdminEmail || createdProfile.role === "admin",
          });
          return;
        }

        throw new Error(
          apiErr?.message ||
            selectErr?.message ||
            insertErr?.message ||
            "No se pudo cargar tu perfil. Verifica que ejecutaste 01_schema.sql en Supabase."
        );
      }
    } catch (err: any) {
      setAuthError(err?.message || "Error al verificar tu sesión.");
      setProfile(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshProfile();

    if (!supabase) return;
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) {
        refreshProfile();
      } else {
        setProfile(null);
        setIsLoading(false);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [refreshProfile]);

  const loginWithGoogle = useCallback(async (_preferredRole: UserRole = "influencer") => {
    await signInWithGoogleOAuth();
  }, []);

  const selectRole = useCallback(async (role: UserRole) => {
    try {
      const res = await inadsApi.selectInitialRole(role);
      setProfile(res.profile);
      return;
    } catch (apiErr: any) {
      if (!supabase) throw apiErr;
      const { data } = await supabase.auth.getSession();
      const user = data.session?.user;
      if (!user) throw apiErr;

      const email = (user.email || "").toLowerCase().trim();
      const { data: updated, error: updateErr } = await supabase
        .from("profiles")
        .update({ role })
        .eq("id", user.id)
        .select("*")
        .single();

      if (updateErr || !updated) {
        throw new Error(updateErr?.message || apiErr?.message || "No se pudo guardar tu rol.");
      }

      setProfile({
        ...(updated as UserProfile),
        is_admin: ADMIN_EMAIL_SET.has(email) || updated.role === "admin",
      });
    }
  }, []);

  const updateProfileState = useCallback((partial: Partial<UserProfile>) => {
    setProfile((prev) => {
      if (!prev) return prev;
      return { ...prev, ...partial };
    });
  }, []);

  const logout = useCallback(async () => {
    if (supabase) {
      await supabase.auth.signOut();
    }
    setProfile(null);
  }, []);

  return (
    <AuthContext.Provider
      value={{
        profile,
        isLoading,
        authError,
        loginWithGoogle,
        selectRole,
        updateProfileState,
        refreshProfile,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth debe utilizarse dentro de un <AuthProvider>");
  }
  return ctx;
}

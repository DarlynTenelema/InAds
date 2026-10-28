"use client";

import React, { createContext, useCallback, useContext, useEffect, useState } from "react";
import { isSupabaseConfigured, signInWithGoogleOAuth, supabase } from "@/lib/supabase";
import { inadsApi } from "@/services/api";
import { UserProfile, UserRole } from "@/types";

interface AuthContextValue {
  profile: UserProfile | null;
  isLoading: boolean;
  isDemoMode: boolean;
  loginWithGoogle: (preferredRole?: UserRole) => Promise<void>;
  selectRole: (role: UserRole) => Promise<void>;
  switchDemoRole: (role: UserRole) => void;
  updateProfileState: (partial: Partial<UserProfile>) => void;
  refreshProfile: () => Promise<void>;
  logout: () => Promise<void>;
}

const STORAGE_DEMO_KEY = "inads_active_session_profile_v1";

const DEFAULT_DEMO_PROFILES: Record<UserRole, UserProfile> = {
  influencer: {
    id: "inf_demo_01",
    email: "carlos.creator@gmail.com",
    full_name: "Carlos Mendoza",
    avatar_url: null,
    role: "influencer",
    available_balance: 68.4,
    pending_balance: 14.2,
    total_earned: 268.4,
    payout_method: "paypal",
    payout_details: { paypal_email: "carlos.pagos@gmail.com" },
    social_links: {
      tiktok: "@carlosgaming_yt",
      youtube: "youtube.com/@carlosgaming",
      twitch: "twitch.tv/carlosm",
    },
    email_notifications: true,
    is_suspended: false,
    is_admin: true,
    created_at: new Date().toISOString(),
  },
  developer: {
    id: "dev_demo_01",
    email: "studio@pixelforge.dev",
    full_name: "PixelForge Indie Studio",
    avatar_url: null,
    role: "developer",
    available_balance: 0,
    pending_balance: 0,
    total_earned: 0,
    payout_method: "paypal",
    payout_details: {},
    social_links: {},
    email_notifications: true,
    is_suspended: false,
    is_admin: true,
    created_at: new Date().toISOString(),
  },
  admin: {
    id: "adm_demo_01",
    email: "admin@inads.io",
    full_name: "Administrador InAds",
    avatar_url: null,
    role: "admin",
    available_balance: 0,
    pending_balance: 0,
    total_earned: 0,
    payout_method: "paypal",
    payout_details: {},
    social_links: {},
    email_notifications: true,
    is_suspended: false,
    is_admin: true,
    created_at: new Date().toISOString(),
  },
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const isDemoMode = !isSupabaseConfigured;

  const refreshProfile = useCallback(async () => {
    if (isSupabaseConfigured && supabase) {
      try {
        const { data } = await supabase.auth.getSession();
        if (!data.session) {
          setProfile(null);
          setIsLoading(false);
          return;
        }
        const res = await inadsApi.getProfile();
        setProfile(res.profile);
      } catch {
        setProfile(null);
      } finally {
        setIsLoading(false);
      }
      return;
    }

    // Modo interactivo local mientras se configuran las credenciales de Supabase en .env.local
    if (typeof window !== "undefined") {
      const saved = window.localStorage.getItem(STORAGE_DEMO_KEY);
      if (saved) {
        try {
          setProfile(JSON.parse(saved));
        } catch {
          setProfile(null);
        }
      }
    }
    setIsLoading(false);
  }, []);

  useEffect(() => {
    refreshProfile();
  }, [refreshProfile]);

  const loginWithGoogle = useCallback(async (preferredRole: UserRole = "influencer") => {
    if (isSupabaseConfigured) {
      await signInWithGoogleOAuth();
      return;
    }
    const chosen = DEFAULT_DEMO_PROFILES[preferredRole];
    setProfile(chosen);
    if (typeof window !== "undefined") {
      window.localStorage.setItem(STORAGE_DEMO_KEY, JSON.stringify(chosen));
    }
  }, []);

  const selectRole = useCallback(
    async (role: UserRole) => {
      if (isSupabaseConfigured) {
        const res = await inadsApi.selectInitialRole(role);
        setProfile(res.profile);
        return;
      }
      const nextProfile = DEFAULT_DEMO_PROFILES[role];
      setProfile(nextProfile);
      if (typeof window !== "undefined") {
        window.localStorage.setItem(STORAGE_DEMO_KEY, JSON.stringify(nextProfile));
      }
    },
    []
  );

  const switchDemoRole = useCallback((role: UserRole) => {
    const nextProfile = DEFAULT_DEMO_PROFILES[role];
    setProfile(nextProfile);
    if (typeof window !== "undefined") {
      window.localStorage.setItem(STORAGE_DEMO_KEY, JSON.stringify(nextProfile));
    }
  }, []);

  const updateProfileState = useCallback((partial: Partial<UserProfile>) => {
    setProfile((prev) => {
      if (!prev) return prev;
      const updated = { ...prev, ...partial };
      if (typeof window !== "undefined" && !isSupabaseConfigured) {
        window.localStorage.setItem(STORAGE_DEMO_KEY, JSON.stringify(updated));
      }
      return updated;
    });
  }, []);

  const logout = useCallback(async () => {
    if (isSupabaseConfigured && supabase) {
      await supabase.auth.signOut();
    }
    if (typeof window !== "undefined") {
      window.localStorage.removeItem(STORAGE_DEMO_KEY);
    }
    setProfile(null);
  }, []);

  return (
    <AuthContext.Provider
      value={{
        profile,
        isLoading,
        isDemoMode,
        loginWithGoogle,
        selectRole,
        switchDemoRole,
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


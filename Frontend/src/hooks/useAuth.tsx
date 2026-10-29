"use client";

import React, { createContext, useCallback, useContext, useEffect, useState } from "react";
import { isSupabaseConfigured, signInWithGoogleOAuth, supabase } from "@/lib/supabase";
import { inadsApi } from "@/services/api";
import { UserProfile, UserRole } from "@/types";

interface AuthContextValue {
  profile: UserProfile | null;
  isLoading: boolean;
  loginWithGoogle: (preferredRole?: UserRole) => Promise<void>;
  selectRole: (role: UserRole) => Promise<void>;
  updateProfileState: (partial: Partial<UserProfile>) => void;
  refreshProfile: () => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const refreshProfile = useCallback(async () => {
    if (!isSupabaseConfigured || !supabase) {
      setProfile(null);
      setIsLoading(false);
      return;
    }

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
    const res = await inadsApi.selectInitialRole(role);
    setProfile(res.profile);
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

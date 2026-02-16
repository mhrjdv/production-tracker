"use client";

import { createSupabaseBrowserClient } from "./client";
import { mapSupabaseError } from "../../errors";
import type {
  AuthResult,
  AuthUser,
  ClientAuth,
  OAuthProvider,
} from "../../types";

export function createClientAuth(): ClientAuth {
  const supabase = createSupabaseBrowserClient();

  return {
    async signInWithEmail(
      email: string,
      password: string,
    ): Promise<AuthResult> {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        return { success: false, error: mapSupabaseError(error) };
      }
      return { success: true, data: undefined };
    },

    async signUpWithEmail(
      email: string,
      password: string,
      metadata: { name: string },
    ): Promise<AuthResult<AuthUser>> {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { name: metadata.name },
        },
      });

      if (error) {
        return { success: false, error: mapSupabaseError(error) };
      }

      if (!data.user) {
        return {
          success: false,
          error: {
            code: "PROVIDER_ERROR",
            message: "Registration succeeded but no user returned",
          },
        };
      }

      const user: AuthUser = Object.freeze({
        id: data.user.id,
        email: data.user.email ?? email,
        name: metadata.name,
        image: null,
        emailVerified: false,
      });

      return { success: true, data: user };
    },

    async signInWithOAuth(provider: OAuthProvider): Promise<AuthResult> {
      const { error } = await supabase.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo: `${window.location.origin}/api/auth/callback`,
        },
      });

      if (error) {
        return { success: false, error: mapSupabaseError(error) };
      }
      return { success: true, data: undefined };
    },

    async signOut(): Promise<AuthResult> {
      const { error } = await supabase.auth.signOut();

      if (error) {
        return { success: false, error: mapSupabaseError(error) };
      }
      return { success: true, data: undefined };
    },

    async resetPasswordRequest(email: string): Promise<AuthResult> {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });

      if (error) {
        return { success: false, error: mapSupabaseError(error) };
      }
      return { success: true, data: undefined };
    },

    async updatePassword(newPassword: string): Promise<AuthResult> {
      const { error } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (error) {
        return { success: false, error: mapSupabaseError(error) };
      }
      return { success: true, data: undefined };
    },
  };
}

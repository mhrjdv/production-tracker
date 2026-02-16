import type { AuthError, AuthErrorCode } from "./types";

export function createAuthError(
  code: AuthErrorCode,
  message: string,
): AuthError {
  return Object.freeze({ code, message });
}

export function mapSupabaseError(supabaseError: {
  message?: string;
  status?: number;
}): AuthError {
  const msg = supabaseError.message ?? "Unknown auth error";

  if (msg.includes("Invalid login credentials")) {
    return createAuthError("INVALID_CREDENTIALS", "Invalid email or password");
  }
  if (msg.includes("User already registered")) {
    return createAuthError(
      "USER_ALREADY_EXISTS",
      "An account with this email already exists",
    );
  }
  if (msg.includes("Email not confirmed")) {
    return createAuthError(
      "EMAIL_NOT_CONFIRMED",
      "Please verify your email before signing in",
    );
  }
  if (msg.includes("Password should be at least")) {
    return createAuthError(
      "WEAK_PASSWORD",
      "Password must be at least 6 characters",
    );
  }
  if (supabaseError.status === 429) {
    return createAuthError(
      "RATE_LIMITED",
      "Too many requests. Please try again later.",
    );
  }

  return createAuthError("PROVIDER_ERROR", msg);
}

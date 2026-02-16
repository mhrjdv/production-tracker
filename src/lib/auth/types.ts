/** Minimal user identity returned from auth operations */
export interface AuthUser {
  readonly id: string;
  readonly email: string;
  readonly name: string | null;
  readonly image: string | null;
  readonly emailVerified: boolean;
}

/** Session object available throughout the app */
export interface AuthSession {
  readonly user: AuthUser;
  readonly accessToken: string;
  readonly expiresAt: number;
}

/** Result of any auth operation */
export type AuthResult<T = void> =
  | { readonly success: true; readonly data: T }
  | { readonly success: false; readonly error: AuthError };

/** Structured auth error */
export interface AuthError {
  readonly code: AuthErrorCode;
  readonly message: string;
}

export type AuthErrorCode =
  | "INVALID_CREDENTIALS"
  | "USER_NOT_FOUND"
  | "USER_ALREADY_EXISTS"
  | "WEAK_PASSWORD"
  | "INVALID_EMAIL"
  | "EMAIL_NOT_CONFIRMED"
  | "SESSION_EXPIRED"
  | "RATE_LIMITED"
  | "PROVIDER_ERROR"
  | "UNKNOWN";

/** Server-side auth operations */
export interface ServerAuth {
  getSession(): Promise<AuthSession | null>;
  getUser(): Promise<AuthUser | null>;
  requireSession(): Promise<AuthSession>;
  requireUserId(): Promise<string>;
}

/** Client-side auth operations */
export interface ClientAuth {
  signInWithEmail(email: string, password: string): Promise<AuthResult>;
  signUpWithEmail(
    email: string,
    password: string,
    metadata: { name: string },
  ): Promise<AuthResult<AuthUser>>;
  signInWithOAuth(provider: OAuthProvider): Promise<AuthResult>;
  signOut(): Promise<AuthResult>;
  resetPasswordRequest(email: string): Promise<AuthResult>;
  updatePassword(newPassword: string): Promise<AuthResult>;
}

export type OAuthProvider = "google" | "github";

/** Keeps the auth provider's user in sync with Prisma */
export interface AuthUserSync {
  ensurePrismaUser(authUser: AuthUser): Promise<string>;
  syncProfile(
    authUserId: string,
    updates: Partial<Pick<AuthUser, "name" | "image">>,
  ): Promise<void>;
}

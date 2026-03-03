import { createAuthClient } from "better-auth/react";

function getAuthBaseUrl(): string | undefined {
  const rawBaseUrl = process.env.NEXT_PUBLIC_APP_URL?.trim();
  if (!rawBaseUrl) {
    return undefined;
  }

  return rawBaseUrl.replace(/\/+$/, "");
}

export const authClient = createAuthClient({
  /** The base URL of the server (optional if you're using the same domain) */
  baseURL: getAuthBaseUrl(),
});

export const {
  signIn,
  signUp,
  useSession,
  signOut,
  requestPasswordReset,
  resetPassword,
} = authClient;

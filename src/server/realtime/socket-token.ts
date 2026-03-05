import { SignJWT } from "jose";

const DEFAULT_REALTIME_TOKEN_TTL_SECONDS = 900;

function getRequiredEnv(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(`[realtime] Missing required env var: ${name}`);
  }
  return value;
}

function resolveTokenTtlSeconds(): number {
  const raw = process.env.REALTIME_TOKEN_TTL_SECONDS?.trim();
  if (!raw) {
    return DEFAULT_REALTIME_TOKEN_TTL_SECONDS;
  }

  const parsed = Number.parseInt(raw, 10);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return DEFAULT_REALTIME_TOKEN_TTL_SECONDS;
  }

  return parsed;
}

export function getRealtimeSocketUrl(): string {
  return getRequiredEnv("NEXT_PUBLIC_REALTIME_SOCKET_URL");
}

export async function createRealtimeSocketToken(
  userId: string,
): Promise<{ token: string; expiresAt: string }> {
  const trimmedUserId = userId.trim();
  if (!trimmedUserId) {
    throw new Error("[realtime] Invalid userId for socket token generation.");
  }

  const realtimeJwtSecret = getRequiredEnv("REALTIME_JWT_SECRET");
  const ttlSeconds = resolveTokenTtlSeconds();
  const nowUnix = Math.floor(Date.now() / 1000);
  const expiresAtUnix = nowUnix + ttlSeconds;
  const expiresAt = new Date(expiresAtUnix * 1000).toISOString();

  const token = await new SignJWT({})
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(trimmedUserId)
    .setIssuedAt(nowUnix)
    .setExpirationTime(expiresAtUnix)
    .sign(new TextEncoder().encode(realtimeJwtSecret));

  return { token, expiresAt };
}


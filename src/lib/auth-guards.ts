/**
 * Assumptions:
 * - "@/lib/auth" exports `auth`, a Better Auth instance created with `betterAuth(...)`.
 * - `auth.api.getSession` is the canonical way to retrieve the current session on the server,
 *   as documented in Better Auth's official Next.js integration guide.
 */
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { buildSignInRedirect } from "@/src/lib/routes";

export type Session = (typeof auth)["$Infer"]["Session"];
export type User = Session["user"];

async function getSessionFromHeaders(h: HeadersInit): Promise<Session | null> {
  return auth.api.getSession({ headers: h });
}

export async function getCurrentSession(): Promise<Session | null> {
  const h = await headers();
  return getSessionFromHeaders(h);
}

export async function requireUser(options?: {
  currentPath?: string;
}): Promise<User> {
  const session = await getCurrentSession();

  if (!session) {
    const targetPath = options?.currentPath ?? "/";
    const signInPath = buildSignInRedirect(targetPath);
    redirect(signInPath);
  }

  // redirect() nunca retorna, então aqui TS sabe que session existe
  return session!.user;
}

export async function requireUserFromRequest(
  request: NextRequest,
  options?: { currentPath?: string },
): Promise<User | NextResponse> {
  const session = await getSessionFromHeaders(request.headers);

  if (!session) {
    const targetPath = options?.currentPath ?? request.nextUrl.pathname;
    const signInPath = buildSignInRedirect(targetPath);
    return NextResponse.redirect(new URL(signInPath, request.nextUrl));
  }

  return session.user;
}


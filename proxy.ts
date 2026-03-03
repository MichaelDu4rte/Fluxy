/**
 * Assumptions:
 * - "@/lib/auth" exports `auth`, a Better Auth instance created with `betterAuth(...)`.
 * - We use `auth.api.getSession` as recommended in Better Auth's Next.js integration docs.
 */
import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import {
  isAuthRoute,
  isProtectedRoute,
  buildSignInRedirect,
  DEFAULT_REDIRECT_AFTER_LOGIN,
} from "@/src/lib/routes";

export async function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  const pathWithSearch = `${pathname}${search}`;

  const onAuthRoute = isAuthRoute(pathname);
  const onProtectedRoute = isProtectedRoute(pathname);

  // Rotas públicas continuam passando direto
  if (!onAuthRoute && !onProtectedRoute) {
    return NextResponse.next();
  }

  const session = await auth.api.getSession({
    headers: await headers(),
  });

  // Não logado tentando acessar rota protegida
  if (!session && onProtectedRoute) {
    const signInPath = buildSignInRedirect(pathWithSearch);
    return NextResponse.redirect(new URL(signInPath, request.url));
  }

  // Logado tentando acessar rotas de auth
  if (session && onAuthRoute) {
    return NextResponse.redirect(
      new URL(DEFAULT_REDIRECT_AFTER_LOGIN, request.url),
    );
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt|manifest.webmanifest).*)",
  ],
};


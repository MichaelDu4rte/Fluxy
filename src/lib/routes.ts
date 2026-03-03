export const SIGN_IN_ROUTE = "/signin" as const;
export const SIGN_UP_ROUTE = "/signup" as const;

export const AUTH_ROUTES = [SIGN_IN_ROUTE, SIGN_UP_ROUTE] as const;

export const DEFAULT_REDIRECT_AFTER_LOGIN = "/dashboard";

export const PROTECTED_PREFIXES = [
  "/dashboard",
  "/transacoes",
  "/despesas",
  "/carteira",
  "/settings",
  "/app",
] as const;

const normalizePath = (pathname: string): string => {
  if (!pathname) return "/";

  // Ensure we only work with the pathname (no query/hash)
  try {
    const url = new URL(pathname, "http://localhost");
    pathname = url.pathname;
  } catch {
    // Ignore URL parsing errors and treat input as a plain path
  }

  if (!pathname.startsWith("/")) pathname = `/${pathname}`;

  return pathname;
};

export const isAuthRoute = (pathname: string): boolean => {
  const path = normalizePath(pathname);
  return AUTH_ROUTES.includes(path as (typeof AUTH_ROUTES)[number]);
};

export const isProtectedRoute = (pathname: string): boolean => {
  const path = normalizePath(pathname);

  // Never treat the landing page as protegida
  if (path === "/") return false;

  // Auth routes nunca são tratadas como protegidas
  if (isAuthRoute(path)) return false;

  return PROTECTED_PREFIXES.some((prefix) => {
    if (!prefix) return false;
    const normalizedPrefix = normalizePath(prefix);
    return (
      path === normalizedPrefix || path.startsWith(`${normalizedPrefix}/`)
    );
  });
};

export const buildSignInRedirect = (
  nextPath: string | null | undefined,
): string => {
  const raw = nextPath ?? "/";
  const path = normalizePath(raw);
  const searchParams = new URLSearchParams({ next: path });
  return `${SIGN_IN_ROUTE}?${searchParams.toString()}`;
};


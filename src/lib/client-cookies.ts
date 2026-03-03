type CookieJsonOptions = {
  maxAgeDays?: number;
};

export function readCookieJson<T>(name: string): T | null {
  if (typeof document === "undefined") {
    return null;
  }

  const encodedName = `${name}=`;
  const parts = document.cookie.split("; ");
  const found = parts.find((entry) => entry.startsWith(encodedName));

  if (!found) {
    return null;
  }

  const rawValue = found.slice(encodedName.length);

  try {
    return JSON.parse(decodeURIComponent(rawValue)) as T;
  } catch {
    return null;
  }
}

export function writeCookieJson(
  name: string,
  value: unknown,
  options?: CookieJsonOptions,
): void {
  if (typeof document === "undefined") {
    return;
  }

  const maxAgeDays = options?.maxAgeDays ?? 90;
  const maxAgeSeconds = Math.max(1, Math.floor(maxAgeDays * 24 * 60 * 60));
  const encoded = encodeURIComponent(JSON.stringify(value));

  document.cookie = `${name}=${encoded}; path=/; max-age=${maxAgeSeconds}; samesite=lax`;
}


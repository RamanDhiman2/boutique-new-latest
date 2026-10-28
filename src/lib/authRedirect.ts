/**
 * Where to send the customer after they sign in (e.g. back to checkout).
 * Only same-site paths are accepted, so a crafted link can't redirect elsewhere.
 */
const KEY = "sm-post-login";

export function safeInternalPath(value: unknown): string | null {
  if (typeof value !== "string") return null;
  if (!value.startsWith("/") || value.startsWith("//") || value.startsWith("/\\")) return null;
  if (value.startsWith("/login") || value.startsWith("/register") || value.startsWith("/auth"))
    return null;
  return value;
}

export function rememberPostLoginPath(value: unknown) {
  const path = safeInternalPath(value);
  try {
    if (path) sessionStorage.setItem(KEY, path);
  } catch {
    // storage unavailable: fall back to the default destination
  }
}

/** Returns the remembered path once (and forgets it). */
export function takePostLoginPath(): string | null {
  try {
    const path = safeInternalPath(sessionStorage.getItem(KEY));
    sessionStorage.removeItem(KEY);
    return path;
  } catch {
    return null;
  }
}

const localSessionSeconds = 60 * 60 * 8;
const pendingMfaSeconds = 60 * 5;

function cookieName() {
  return process.env.NODE_ENV === "production" ? "__Host-central_asia_admin_session" : "central_asia_admin_session";
}

function pendingMfaCookieName() {
  return process.env.NODE_ENV === "production" ? "__Host-central_asia_admin_mfa" : "central_asia_admin_mfa";
}

function baseCookie(value: string, maxAge: number) {
  return { value, httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "strict" as const, path: "/", maxAge };
}

export function adminSessionCookieName() {
  return cookieName();
}

export function adminPendingMfaCookieName() {
  return pendingMfaCookieName();
}

export function sessionCookie(value: string, maxAge = localSessionSeconds) {
  return { name: cookieName(), ...baseCookie(value, maxAge) };
}

export function pendingMfaCookie(value: string) {
  return { name: pendingMfaCookieName(), ...baseCookie(value, pendingMfaSeconds) };
}

export function clearedSessionCookie() {
  return { name: cookieName(), ...baseCookie("", 0) };
}

export function clearedPendingMfaCookie() {
  return { name: pendingMfaCookieName(), ...baseCookie("", 0) };
}

export function isSameOrigin(request: Request) {
  const origin = request.headers.get("origin");
  if (!origin) return process.env.NODE_ENV !== "production";
  try {
    const supplied = new URL(origin);
    const requestUrl = new URL(request.url);
    if (supplied.origin === requestUrl.origin) return true;
    const forwardedHost = request.headers.get("x-forwarded-host")?.split(",")[0]?.trim();
    const host = forwardedHost || request.headers.get("host")?.trim();
    const forwardedProtocol = request.headers.get("x-forwarded-proto")?.split(",")[0]?.trim();
    const protocol = forwardedProtocol || requestUrl.protocol.slice(0, -1);
    return Boolean(host && supplied.host === host && supplied.protocol === `${protocol}:`);
  } catch {
    return false;
  }
}

export const adminAuthDurations = { localSessionSeconds, pendingMfaSeconds } as const;

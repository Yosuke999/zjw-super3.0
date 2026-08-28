import { cookies } from "next/headers.js";
import type { AdminRole, AdminSession } from "./contracts.ts";
import { adminRoleAllows } from "./contracts.ts";
import {
  adminAuthClient,
  createAdminSession,
  getAdminProfile,
  isProductionIdentityConfigured,
  recordAdminAuditSafe,
  resolveAdminSession,
  revokeAdminSession,
} from "./admin-identity.ts";
import { getAdminCredentials } from "./server.ts";
import {
  adminAuthDurations,
  adminPendingMfaCookieName,
  adminSessionCookieName,
  clearedPendingMfaCookie,
  clearedSessionCookie,
  isSameOrigin,
  pendingMfaCookie,
  sessionCookie,
} from "./admin-auth-security.ts";

export { clearedPendingMfaCookie, clearedSessionCookie, isSameOrigin, pendingMfaCookie, sessionCookie };

const { localSessionSeconds, pendingMfaSeconds } = adminAuthDurations;

type AuditContext = { requestId?: string; ipHash?: string };
export type PendingMfa = { accessToken: string; refreshToken: string; userId: string; factorId: string; exp: number };

function bytesToBase64Url(bytes: Uint8Array) {
  let value = "";
  for (const byte of bytes) value += String.fromCharCode(byte);
  return btoa(value).replaceAll("+", "-").replaceAll("/", "_").replaceAll("=", "");
}

function base64UrlToBytes(value: string) {
  const base64 = value.replaceAll("-", "+").replaceAll("_", "/").padEnd(Math.ceil(value.length / 4) * 4, "=");
  const binary = atob(base64);
  return Uint8Array.from(binary, (character) => character.charCodeAt(0));
}

function stringToBase64Url(value: string) {
  return bytesToBase64Url(new TextEncoder().encode(value));
}

function base64UrlToString(value: string) {
  return new TextDecoder().decode(base64UrlToBytes(value));
}

async function signature(value: string, secret: string) {
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  return bytesToBase64Url(new Uint8Array(await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(value))));
}

async function sameValue(first: string, second: string) {
  const [firstHash, secondHash] = await Promise.all([
    crypto.subtle.digest("SHA-256", new TextEncoder().encode(first)),
    crypto.subtle.digest("SHA-256", new TextEncoder().encode(second)),
  ]);
  const a = new Uint8Array(firstHash);
  const b = new Uint8Array(secondHash);
  let difference = 0;
  for (let index = 0; index < a.length; index += 1) difference |= a[index] ^ b[index];
  return difference === 0;
}

function sessionSecret() {
  const configured = process.env.ADMIN_SESSION_SECRET;
  if (configured && (process.env.NODE_ENV !== "production" || configured.length >= 32)) return configured;
  if (process.env.NODE_ENV !== "production") return "local-development-session-secret-change-before-deploy";
  return null;
}

async function encryptionKey() {
  const secret = sessionSecret();
  if (!secret) throw new Error("ADMIN_SESSION_SECRET is not configured");
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(secret));
  return await crypto.subtle.importKey("raw", digest, "AES-GCM", false, ["encrypt", "decrypt"]);
}

export async function sealPendingMfa(payload: PendingMfa) {
  const iv = new Uint8Array(12);
  crypto.getRandomValues(iv);
  const encrypted = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, await encryptionKey(), new TextEncoder().encode(JSON.stringify(payload)));
  return `${bytesToBase64Url(iv)}.${bytesToBase64Url(new Uint8Array(encrypted))}`;
}

export async function openPendingMfa(value: string): Promise<PendingMfa | null> {
  const [ivValue, encryptedValue] = value.split(".");
  if (!ivValue || !encryptedValue) return null;
  try {
    const decrypted = await crypto.subtle.decrypt(
      { name: "AES-GCM", iv: base64UrlToBytes(ivValue) }, await encryptionKey(), base64UrlToBytes(encryptedValue),
    );
    const payload = JSON.parse(new TextDecoder().decode(decrypted)) as PendingMfa;
    if (!payload.accessToken || !payload.refreshToken || !payload.userId || !payload.factorId || payload.exp <= Date.now()) return null;
    return payload;
  } catch {
    return null;
  }
}

async function createLocalSession(username: string) {
  const credentials = getAdminCredentials();
  if (!credentials) throw new Error("管理员环境变量未配置");
  const credentialVersion = (await signature(`${credentials.username}:${credentials.password}`, credentials.secret)).slice(0, 16);
  const payload = stringToBase64Url(JSON.stringify({ sub: username, exp: Math.floor(Date.now() / 1000) + localSessionSeconds, nonce: crypto.randomUUID(), ver: credentialVersion }));
  return `${payload}.${await signature(payload, credentials.secret)}`;
}

async function readLocalSession(value: string): Promise<AdminSession | null> {
  const credentials = getAdminCredentials();
  if (!credentials) return null;
  const [payload, providedSignature] = value.split(".");
  if (!payload || !providedSignature || !(await sameValue(await signature(payload, credentials.secret), providedSignature))) return null;
  try {
    const parsed = JSON.parse(base64UrlToString(payload)) as { sub?: string; exp?: number; ver?: string };
    const expectedVersion = (await signature(`${credentials.username}:${credentials.password}`, credentials.secret)).slice(0, 16);
    if (!parsed.sub || parsed.sub !== credentials.username || !parsed.exp || parsed.exp <= Date.now() / 1000 || parsed.ver !== expectedVersion) return null;
    return {
      sessionId: "local-development-session", userId: "local-development-admin", email: parsed.sub,
      displayName: parsed.sub, role: "owner", mfaRequired: false, expiresAt: parsed.exp * 1000,
    };
  } catch {
    return null;
  }
}

export async function beginAdminLogin(identifier: string, password: string, context: AuditContext = {}) {
  const email = identifier.trim().toLowerCase();
  if (!isProductionIdentityConfigured()) {
    const credentials = getAdminCredentials();
    if (!credentials) return { ok: false as const, configurationError: true as const };
    const valid = (await sameValue(identifier, credentials.username)) && (await sameValue(password, credentials.password));
    if (!valid) return { ok: false as const, configurationError: false as const };
    const value = await createLocalSession(credentials.username);
    return { ok: true as const, next: "complete" as const, value, maxAge: localSessionSeconds, session: await readLocalSession(value) as AdminSession };
  }

  const client = adminAuthClient();
  const authenticated = await client.auth.signInWithPassword({ email, password });
  if (authenticated.error || !authenticated.data.user || !authenticated.data.session) {
    await recordAdminAuditSafe({ actorEmail: email, action: "admin.login.password", outcome: "failure", context });
    return { ok: false as const, configurationError: false as const };
  }
  const profile = await getAdminProfile(authenticated.data.user.id);
  if (!profile || !profile.active) {
    await client.auth.admin.signOut(authenticated.data.session.access_token, "global").catch(() => undefined);
    await recordAdminAuditSafe({ actorEmail: email, action: "admin.login.password", outcome: "denied", metadata: { reason: profile ? "inactive" : "profile_missing" }, context });
    return { ok: false as const, configurationError: false as const };
  }

  if (!profile.mfa_required) {
    const created = await createAdminSession(profile, context);
    await recordAdminAuditSafe({ actor: created.session, action: "admin.login.complete", metadata: { mfa: false }, context });
    return { ok: true as const, next: "complete" as const, value: created.token, maxAge: created.maxAge, session: created.session };
  }

  const setSession = await client.auth.setSession({ access_token: authenticated.data.session.access_token, refresh_token: authenticated.data.session.refresh_token });
  if (setSession.error) throw setSession.error;
  const factors = await client.auth.mfa.listFactors();
  if (factors.error) throw factors.error;
  let factorId = factors.data.totp[0]?.id;
  let enrollment: { qrCode: string; secret: string } | undefined;
  if (!factorId) {
    for (const factor of factors.data.all.filter((entry) => entry.factor_type === "totp" && entry.status !== "verified")) {
      await client.auth.mfa.unenroll({ factorId: factor.id });
    }
    const enrolled = await client.auth.mfa.enroll({ factorType: "totp", friendlyName: "Central Asia Admin" });
    if (enrolled.error) throw enrolled.error;
    factorId = enrolled.data.id;
    enrollment = { qrCode: enrolled.data.totp.qr_code, secret: enrolled.data.totp.secret };
  }
  const pendingValue = await sealPendingMfa({
    accessToken: authenticated.data.session.access_token, refreshToken: authenticated.data.session.refresh_token,
    userId: profile.id, factorId, exp: Date.now() + pendingMfaSeconds * 1000,
  });
  await recordAdminAuditSafe({ actorEmail: profile.email, action: "admin.login.mfa_required", metadata: { enrollment: Boolean(enrollment) }, context });
  return { ok: true as const, next: "mfa" as const, pendingValue, enrollment };
}

export async function completeAdminMfa(code: string, context: AuditContext = {}) {
  const value = (await cookies()).get(adminPendingMfaCookieName())?.value ?? "";
  const pending = await openPendingMfa(value);
  if (!pending || !/^\d{6}$/.test(code)) return { ok: false as const };
  const client = adminAuthClient();
  const restored = await client.auth.setSession({ access_token: pending.accessToken, refresh_token: pending.refreshToken });
  if (restored.error) return { ok: false as const };
  const verified = await client.auth.mfa.challengeAndVerify({ factorId: pending.factorId, code });
  if (verified.error) {
    await recordAdminAuditSafe({ actorEmail: restored.data.user?.email ?? "", action: "admin.login.mfa", outcome: "failure", context });
    return { ok: false as const };
  }
  const profile = await getAdminProfile(pending.userId);
  if (!profile || !profile.active) return { ok: false as const };
  const created = await createAdminSession(profile, context);
  await recordAdminAuditSafe({ actor: created.session, action: "admin.login.complete", metadata: { mfa: true }, context });
  return { ok: true as const, value: created.token, maxAge: created.maxAge, session: created.session };
}

export async function readSession() {
  const value = (await cookies()).get(adminSessionCookieName())?.value;
  if (!value) return null;
  if (!isProductionIdentityConfigured()) return await readLocalSession(value);
  return await resolveAdminSession(value);
}

export async function revokeCurrentSession(reason = "logout") {
  const value = (await cookies()).get(adminSessionCookieName())?.value ?? "";
  if (isProductionIdentityConfigured()) await revokeAdminSession(value, reason);
}

export function requireAdminRole(session: AdminSession | null, required: AdminRole) {
  return Boolean(session && adminRoleAllows(session.role, required));
}

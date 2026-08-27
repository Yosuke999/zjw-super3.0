import { cookies } from "next/headers";
import { getAdminCredentials } from "./server";

const sessionSeconds = 60 * 60 * 8;

function cookieName() {
  return process.env.NODE_ENV === "production" ? "__Host-central_asia_admin_session" : "central_asia_admin_session";
}

function bytesToBase64Url(bytes: Uint8Array) {
  let value = "";
  for (const byte of bytes) value += String.fromCharCode(byte);
  return btoa(value).replaceAll("+", "-").replaceAll("/", "_").replaceAll("=", "");
}

function stringToBase64Url(value: string) {
  return bytesToBase64Url(new TextEncoder().encode(value));
}

function base64UrlToString(value: string) {
  const base64 = value.replaceAll("-", "+").replaceAll("_", "/").padEnd(Math.ceil(value.length / 4) * 4, "=");
  const binary = atob(base64);
  return new TextDecoder().decode(Uint8Array.from(binary, (character) => character.charCodeAt(0)));
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

export async function validateLogin(username: string, password: string) {
  const credentials = getAdminCredentials();
  if (!credentials) return { ok: false as const, configurationError: true as const };
  const valid = (await sameValue(username, credentials.username)) && (await sameValue(password, credentials.password));
  return valid ? { ok: true as const, username: credentials.username } : { ok: false as const, configurationError: false as const };
}

export async function createSession(username: string) {
  const credentials = getAdminCredentials();
  if (!credentials) throw new Error("管理员环境变量未配置");
  const credentialVersion = (await signature(`${credentials.username}:${credentials.password}`, credentials.secret)).slice(0, 16);
  const payload = stringToBase64Url(JSON.stringify({ sub: username, exp: Math.floor(Date.now() / 1000) + sessionSeconds, nonce: crypto.randomUUID(), ver: credentialVersion }));
  return `${payload}.${await signature(payload, credentials.secret)}`;
}

export async function readSession() {
  const credentials = getAdminCredentials();
  if (!credentials) return null;
  const value = (await cookies()).get(cookieName())?.value;
  if (!value) return null;
  const [payload, providedSignature] = value.split(".");
  if (!payload || !providedSignature || !(await sameValue(await signature(payload, credentials.secret), providedSignature))) return null;
  try {
    const parsed = JSON.parse(base64UrlToString(payload)) as { sub?: string; exp?: number; ver?: string };
    const expectedVersion = (await signature(`${credentials.username}:${credentials.password}`, credentials.secret)).slice(0, 16);
    if (!parsed.sub || parsed.sub !== credentials.username || !parsed.exp || parsed.exp <= Date.now() / 1000 || parsed.ver !== expectedVersion) return null;
    return { username: parsed.sub, expiresAt: parsed.exp * 1000 };
  } catch {
    return null;
  }
}

export function sessionCookie(value: string) {
  return { name: cookieName(), value, httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "strict" as const, path: "/", maxAge: sessionSeconds };
}

export function clearedSessionCookie() {
  return { name: cookieName(), value: "", httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "strict" as const, path: "/", maxAge: 0 };
}

export function isSameOrigin(request: Request) {
  const origin = request.headers.get("origin");
  if (!origin) return process.env.NODE_ENV !== "production";
  try { return new URL(origin).origin === new URL(request.url).origin; } catch { return false; }
}

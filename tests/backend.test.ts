import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { analyticsEventName, sanitizeAnalyticsProperties } from "../app/backend/analytics.ts";
import { clearedPendingMfaCookie, clearedSessionCookie, isSameOrigin, pendingMfaCookie, sessionCookie } from "../app/backend/admin-auth-security.ts";
import { sessionTokenHash } from "../app/backend/admin-identity.ts";
import { beginAdminLogin, openPendingMfa, sealPendingMfa } from "../app/backend/auth.ts";
import { adminRoleAllows, adminRoles, type AdminRole } from "../app/backend/contracts.ts";
import { analyticsIdentifier, fingerprint, HttpError, readJson, trackablePath } from "../app/backend/http.ts";
import { idempotencyKey, normalizeInquiryItems, totalInquiryCny } from "../app/backend/inquiry-validation.ts";
import { emptyBusinessDates, periodStart, shanghaiDate } from "../app/backend/metrics.ts";
import { allowRequest, backendHealth, createInquiry, getAdminCredentials, getAdminSnapshot, recordAnalytics, updateInquiryStatus } from "../app/backend/server.ts";

const mutableEnvironment = process.env as Record<string, string | undefined>;

test("server rebuilds inquiry product names and prices from the catalog", () => {
  const items = normalizeInquiryItems([{ kind: "screen-protector", name: "tampered", quantity: 600, unitPriceCny: 0.01 }], "zh");
  assert.deepEqual(items, [{ kind: "screen-protector", name: "手机钢化膜", quantity: 600, unitPriceCny: 0.45 }]);
  assert.equal(totalInquiryCny(items), 270);
});

test("unknown catalog products are rejected", () => {
  assert.throws(
    () => normalizeInquiryItems([{ kind: "not-a-product", quantity: 1 }], "zh"),
    (error) => error instanceof HttpError && error.status === 400,
  );
  assert.throws(
    () => normalizeInquiryItems("not-an-array", "zh"),
    (error) => error instanceof HttpError && error.status === 400,
  );
});

test("analytics accepts only known paths and generated identifiers", () => {
  assert.equal(trackablePath("/products/screen-protector?lang=zh"), "/products/screen-protector?lang=zh");
  assert.equal(trackablePath("/admin"), "");
  assert.equal(trackablePath("https://attacker.example/products/a"), "");
  assert.equal(analyticsIdentifier(`vis_${"a".repeat(32)}`, "vis"), `vis_${"a".repeat(32)}`);
  assert.equal(analyticsIdentifier("arbitrary", "vis"), "");
});

test("analytics accepts known behavior events and strips non-whitelisted or personal properties", () => {
  assert.equal(analyticsEventName("inquiry_started"), "inquiry_started");
  assert.equal(analyticsEventName("arbitrary_event"), "");
  assert.deepEqual(sanitizeAnalyticsProperties({
    productKind: "screen-protector",
    queryLength: 14,
    email: "customer@example.test",
    note: "private message",
    value: Number.POSITIVE_INFINITY,
  }), { productKind: "screen-protector", queryLength: 14 });
});

test("development analytics store reports anonymous tracking completeness and funnel counts", async () => {
  await recordAnalytics({
    name: "page_view",
    visitorId: `vis_${"d".repeat(32)}`,
    sessionId: `ses_${"e".repeat(32)}`,
    path: "/products/screen-protector",
    referrer: "",
    utmSource: "",
    utmMedium: "",
    utmCampaign: "",
    language: "zh",
    currency: "CNY",
    market: "kg",
    deviceType: "mobile",
    properties: {},
  });
  const snapshot = await getAdminSnapshot(30, "all", "", 1, 10);
  assert.ok(snapshot.tracking.eventCount >= 1);
  assert.equal(snapshot.tracking.identifiedViewRate, 100);
  assert.ok((snapshot.tracking.funnel.page_view ?? 0) >= 1);
});

test("request fingerprints are secret- and purpose-separated", async () => {
  const inquiry = await fingerprint("203.0.113.10", "inquiry");
  const analytics = await fingerprint("203.0.113.10", "analytics");
  assert.equal(inquiry.length, 32);
  assert.notEqual(inquiry, analytics);
  assert.equal(inquiry, await fingerprint("203.0.113.10", "inquiry"));
});

test("JSON reader reports malformed and oversized requests as client errors", async () => {
  await assert.rejects(
    readJson(new Request("https://example.test", { method: "POST", body: "{" })),
    (error) => error instanceof HttpError && error.status === 400,
  );
  await assert.rejects(
    readJson(new Request("https://example.test", { method: "POST", body: JSON.stringify({ value: "x".repeat(100) }) }), 20),
    (error) => error instanceof HttpError && error.status === 413,
  );
});

test("business metrics use Asia/Shanghai day boundaries", () => {
  assert.equal(shanghaiDate("2026-08-26T15:59:59.000Z"), "2026-08-26");
  assert.equal(shanghaiDate("2026-08-26T16:00:00.000Z"), "2026-08-27");
  assert.equal(periodStart(7, new Date("2026-08-27T10:00:00.000Z")).toISOString(), "2026-08-20T16:00:00.000Z");
  assert.deepEqual(emptyBusinessDates(3, new Date("2026-08-27T10:00:00.000Z")).map((point) => point.date), ["2026-08-25", "2026-08-26", "2026-08-27"]);
});

test("idempotency keys reject unsafe or undersized values", () => {
  assert.equal(idempotencyKey("request_12345678"), "request_12345678");
  assert.equal(idempotencyKey("short"), "");
  assert.equal(idempotencyKey("bad key with spaces"), "");
});

test("inquiry creation is idempotent in the development store", async () => {
  const key = `test_${crypto.randomUUID().replaceAll("-", "")}`;
  const input = {
    destination: "Bishkek",
    phone: "+996 555 000 000",
    whatsapp: "",
    email: "",
    preferredContact: "phone" as const,
    note: "",
    language: "zh",
    currency: "CNY",
    market: "kg",
    sourcePath: "/",
    source: "直接访问",
    referrer: "",
    utmSource: "",
    utmMedium: "",
    utmCampaign: "",
    visitorId: `vis_${"b".repeat(32)}`,
    sessionId: `ses_${"c".repeat(32)}`,
    items: normalizeInquiryItems([{ kind: "screen-protector", quantity: 500 }], "zh"),
    totalCny: 225,
  };
  const first = await createInquiry(input, key);
  const second = await createInquiry(input, key);
  assert.equal(first.created, true);
  assert.equal(second.created, false);
  assert.equal(second.inquiry.id, first.inquiry.id);

  const updated = await updateInquiryStatus(first.inquiry.id, "contacted", "test-admin");
  assert.equal(updated?.status, "contacted");
  const snapshot = await getAdminSnapshot(30, "all", first.inquiry.id, 1, 10);
  assert.equal(snapshot.totalInquiries, 1);
  assert.equal(snapshot.inquiries[0]?.id, first.inquiry.id);
});

test("development rate limiter enforces its configured window", async () => {
  const key = `test-rate:${crypto.randomUUID()}`;
  assert.equal(await allowRequest(key, 2, 60), true);
  assert.equal(await allowRequest(key, 2, 60), true);
  assert.equal(await allowRequest(key, 2, 60), false);
});

test("administrator roles follow the expected least-privilege hierarchy", () => {
  const expected: Record<AdminRole, AdminRole[]> = {
    viewer: ["viewer"],
    operator: ["viewer", "operator"],
    manager: ["viewer", "operator", "manager"],
    owner: ["viewer", "operator", "manager", "owner"],
  };
  for (const actual of adminRoles) {
    for (const required of adminRoles) {
      assert.equal(adminRoleAllows(actual, required), expected[actual].includes(required), `${actual} -> ${required}`);
    }
  }
});

test("administrator mutations enforce same-origin requests", () => {
  const originalNodeEnv = process.env.NODE_ENV;
  try {
    mutableEnvironment.NODE_ENV = "production";
    assert.equal(isSameOrigin(new Request("https://admin.example/api/admin/logout", { headers: { origin: "https://admin.example" } })), true);
    assert.equal(isSameOrigin(new Request("https://admin.example/api/admin/logout", { headers: { origin: "https://attacker.example" } })), false);
    assert.equal(isSameOrigin(new Request("http://internal:3000/api/admin/logout", { headers: { origin: "https://admin.example", host: "internal:3000", "x-forwarded-host": "admin.example", "x-forwarded-proto": "https" } })), true);
    assert.equal(isSameOrigin(new Request("http://internal:3000/api/admin/logout", { headers: { origin: "https://attacker.example", host: "internal:3000", "x-forwarded-host": "admin.example", "x-forwarded-proto": "https" } })), false);
    assert.equal(isSameOrigin(new Request("https://admin.example/api/admin/logout")), false);
    assert.equal(isSameOrigin(new Request("https://admin.example/api/admin/logout", { headers: { origin: "not a url" } })), false);
    mutableEnvironment.NODE_ENV = "development";
    assert.equal(isSameOrigin(new Request("http://localhost:3000/api/admin/logout")), true);
  } finally {
    if (originalNodeEnv === undefined) delete mutableEnvironment.NODE_ENV;
    else mutableEnvironment.NODE_ENV = originalNodeEnv;
  }
});

test("administrator cookies are host-only, HTTP-only, strict and securely cleared", () => {
  const originalNodeEnv = process.env.NODE_ENV;
  try {
    mutableEnvironment.NODE_ENV = "production";
    const session = sessionCookie("opaque", 900);
    const pending = pendingMfaCookie("sealed");
    assert.deepEqual(session, {
      name: "__Host-central_asia_admin_session", value: "opaque", httpOnly: true,
      secure: true, sameSite: "strict", path: "/", maxAge: 900,
    });
    assert.equal(pending.name, "__Host-central_asia_admin_mfa");
    assert.equal(pending.maxAge, 300);
    assert.equal(clearedSessionCookie().maxAge, 0);
    assert.equal(clearedPendingMfaCookie().maxAge, 0);
  } finally {
    if (originalNodeEnv === undefined) delete mutableEnvironment.NODE_ENV;
    else mutableEnvironment.NODE_ENV = originalNodeEnv;
  }
});

test("production never falls back to environment-variable administrator credentials", () => {
  const originalNodeEnv = process.env.NODE_ENV;
  const originalUsername = process.env.ADMIN_USERNAME;
  const originalPassword = process.env.ADMIN_PASSWORD;
  const originalSecret = process.env.ADMIN_SESSION_SECRET;
  try {
    mutableEnvironment.NODE_ENV = "production";
    process.env.ADMIN_USERNAME = "legacy-admin";
    process.env.ADMIN_PASSWORD = "a-production-looking-password";
    process.env.ADMIN_SESSION_SECRET = "a-production-looking-secret-that-is-long";
    assert.equal(getAdminCredentials(), null);
  } finally {
    if (originalNodeEnv === undefined) delete mutableEnvironment.NODE_ENV;
    else mutableEnvironment.NODE_ENV = originalNodeEnv;
    if (originalUsername === undefined) delete process.env.ADMIN_USERNAME; else process.env.ADMIN_USERNAME = originalUsername;
    if (originalPassword === undefined) delete process.env.ADMIN_PASSWORD; else process.env.ADMIN_PASSWORD = originalPassword;
    if (originalSecret === undefined) delete process.env.ADMIN_SESSION_SECRET; else process.env.ADMIN_SESSION_SECRET = originalSecret;
  }
});

test("local administrator login signs an expiring least-privilege-compatible session", async () => {
  const original = {
    nodeEnv: process.env.NODE_ENV, url: process.env.SUPABASE_URL, key: process.env.SUPABASE_SERVICE_ROLE_KEY,
    username: process.env.ADMIN_USERNAME, password: process.env.ADMIN_PASSWORD, secret: process.env.ADMIN_SESSION_SECRET,
  };
  try {
    mutableEnvironment.NODE_ENV = "development";
    delete process.env.SUPABASE_URL; delete process.env.SUPABASE_SERVICE_ROLE_KEY;
    process.env.ADMIN_USERNAME = "local-owner";
    process.env.ADMIN_PASSWORD = "local-password";
    process.env.ADMIN_SESSION_SECRET = "local-test-session-secret";
    assert.equal((await beginAdminLogin("local-owner", "wrong-password")).ok, false);
    const result = await beginAdminLogin("local-owner", "local-password");
    assert.equal(result.ok, true);
    if (!result.ok) return;
    assert.equal(result.next, "complete");
    assert.equal(result.session.role, "owner");
    assert.equal(result.session.mfaRequired, false);
    assert.ok(result.session.expiresAt > Date.now());
    assert.match(result.value, /^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/);
  } finally {
    for (const [key, value] of Object.entries(original)) {
      const environmentKey = ({ nodeEnv: "NODE_ENV", url: "SUPABASE_URL", key: "SUPABASE_SERVICE_ROLE_KEY", username: "ADMIN_USERNAME", password: "ADMIN_PASSWORD", secret: "ADMIN_SESSION_SECRET" } as const)[key as keyof typeof original];
      if (value === undefined) delete mutableEnvironment[environmentKey]; else mutableEnvironment[environmentKey] = value;
    }
  }
});

test("pending MFA credentials are encrypted, authenticated and expire after five minutes", async () => {
  const originalNodeEnv = process.env.NODE_ENV;
  const originalSecret = process.env.ADMIN_SESSION_SECRET;
  try {
    mutableEnvironment.NODE_ENV = "test";
    process.env.ADMIN_SESSION_SECRET = "mfa-test-secret";
    const payload = { accessToken: "access-token", refreshToken: "refresh-token", userId: "user-id", factorId: "factor-id", exp: Date.now() + 60_000 };
    const sealed = await sealPendingMfa(payload);
    assert.equal(sealed.includes(payload.accessToken), false);
    assert.deepEqual(await openPendingMfa(sealed), payload);
    const [iv, ciphertext] = sealed.split(".");
    const tampered = `${iv}.${ciphertext.startsWith("a") ? "b" : "a"}${ciphertext.slice(1)}`;
    assert.equal(await openPendingMfa(tampered), null);
    assert.equal(await openPendingMfa(await sealPendingMfa({ ...payload, exp: Date.now() - 1 })), null);
  } finally {
    if (originalNodeEnv === undefined) delete mutableEnvironment.NODE_ENV; else mutableEnvironment.NODE_ENV = originalNodeEnv;
    if (originalSecret === undefined) delete process.env.ADMIN_SESSION_SECRET; else process.env.ADMIN_SESSION_SECRET = originalSecret;
  }
});

test("identity migration contains revocable sessions, owner protection, RLS and private RPC grants", () => {
  const sql = readFileSync(new URL("../migrations/0004_admin_identity.sql", import.meta.url), "utf8").toLowerCase();
  for (const required of [
    "create table if not exists public.admin_profiles",
    "create table if not exists public.admin_sessions",
    "create table if not exists public.admin_audit_logs",
    "create or replace function public.protect_last_admin_owner",
    "pg_advisory_xact_lock",
    "create or replace function public.admin_resolve_session",
    "create or replace function public.cleanup_admin_sessions",
    "enable row level security",
    "revoke execute on function public.admin_resolve_session(text) from public, anon, authenticated",
    "grant execute on function public.admin_resolve_session(text) to service_role",
  ]) assert.ok(sql.includes(required), required);
});

test("administrator session tokens are stored as irreversible SHA-256 hashes", async () => {
  const token = "a".repeat(64);
  const hash = await sessionTokenHash(token);
  assert.equal(hash.length, 64);
  assert.notEqual(hash, token);
  assert.equal(hash, await sessionTokenHash(token));
});

test("production health probe requires every identity migration table and RPC", async () => {
  const originalUrl = process.env.SUPABASE_URL;
  const originalKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const originalFetch = globalThis.fetch;
  const requestedPaths: string[] = [];
  process.env.SUPABASE_URL = "https://supabase.example";
  process.env.SUPABASE_SERVICE_ROLE_KEY = "test-service-role-key";

  try {
    globalThis.fetch = async (input) => {
      requestedPaths.push(new URL(String(input)).pathname + new URL(String(input)).search);
      return new Response("[]", { status: 200, headers: { "content-type": "application/json" } });
    };
    assert.deepEqual(await backendHealth(), {
      database: "supabase",
      schema: "identity-v4",
      latestMigration: "0004_admin_identity",
    });
    assert.ok(requestedPaths.some((path) => path.includes("analytics_events?select=id,currency,market,properties")));
    assert.ok(requestedPaths.some((path) => path.endsWith("/rpc/admin_tracking_health")));
    assert.ok(requestedPaths.some((path) => path.endsWith("/rpc/admin_event_funnel")));
    assert.ok(requestedPaths.some((path) => path.includes("admin_profiles?select=id,email,role,active,mfa_required,session_version")));
    assert.ok(requestedPaths.some((path) => path.includes("admin_sessions?select=id,token_hash,revoked_at,expires_at")));
    assert.ok(requestedPaths.some((path) => path.includes("admin_audit_logs?select=id,action,outcome,created_at")));
    assert.ok(requestedPaths.some((path) => path.endsWith("/rpc/admin_resolve_session")));

    globalThis.fetch = async (input) => {
      const path = new URL(String(input)).pathname;
      return path.endsWith("/rpc/admin_resolve_session")
        ? new Response("function is missing", { status: 404 })
        : new Response("[]", { status: 200, headers: { "content-type": "application/json" } });
    };
    await assert.rejects(
      backendHealth(),
      (error) => error instanceof Error
        && error.name === "BackendMigrationError"
        && /0004_admin_identity/.test(error.message)
        && /Supabase 404: function is missing/.test(error.message),
    );
  } finally {
    globalThis.fetch = originalFetch;
    if (originalUrl === undefined) delete process.env.SUPABASE_URL;
    else process.env.SUPABASE_URL = originalUrl;
    if (originalKey === undefined) delete process.env.SUPABASE_SERVICE_ROLE_KEY;
    else process.env.SUPABASE_SERVICE_ROLE_KEY = originalKey;
  }
});

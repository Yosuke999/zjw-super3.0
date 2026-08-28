import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import {
  adminRoles,
  type AdminAuditEvent,
  type AdminAuditPage,
  type AdminRole,
  type AdminSession,
  type AdminUserSummary,
} from "./contracts.ts";
import { clientIp, fingerprint, HttpError, logError } from "./http.ts";

const defaultSessionSeconds = 60 * 60 * 8;

type AdminProfileRow = {
  id: string;
  email: string;
  display_name: string;
  role: AdminRole;
  active: boolean;
  mfa_required: boolean;
  session_version: number;
  last_login_at: string | null;
  created_at: string;
  updated_at: string;
};

type AuditContext = { requestId?: string; ipHash?: string };

export const adminAuditActions = [
  "admin.login.success",
  "admin.login.failure",
  "admin.logout",
  "admin.session.revoke",
  "admin.inquiry.status_change",
  "admin.inquiry.csv_export",
  "admin.user.create",
  "admin.user.activate",
  "admin.user.deactivate",
  "admin.user.role_change",
  "admin.user.update",
  "admin.mfa.reset",
  "admin.password.change",
  "admin.login.mfa_required",
  "admin.identity.view",
  "admin.dashboard.view",
  // Keep pre-closure event names filterable after this migration is deployed.
  "admin.login.password",
  "admin.login.complete",
  "admin.login.mfa",
  "admin.session.revoke_all",
  "admin.inquiry.status",
  "admin.inquiry.export",
] as const;

export async function adminAuditContext(request: Request, requestId: string): Promise<AuditContext> {
  return { requestId, ipHash: await fingerprint(clientIp(request), "admin-audit") };
}

function identityConfig() {
  const url = process.env.SUPABASE_URL?.replace(/\/$/, "");
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  return url && key ? { url, key } : null;
}

export function isProductionIdentityConfigured() {
  return Boolean(identityConfig());
}

export function adminAuthClient(): SupabaseClient {
  const configured = identityConfig();
  if (!configured) throw new Error("Supabase administrator identity is not configured");
  return createClient(configured.url, configured.key, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
}

function sessionSeconds() {
  const configured = Number(process.env.ADMIN_SESSION_SECONDS ?? defaultSessionSeconds);
  return Number.isFinite(configured) ? Math.max(900, Math.min(86_400, Math.floor(configured))) : defaultSessionSeconds;
}

function bytesToHex(bytes: Uint8Array) {
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
}

function randomToken() {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return bytesToHex(bytes);
}

export async function sessionTokenHash(token: string) {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(token));
  return bytesToHex(new Uint8Array(digest));
}

function profileFromRow(row: AdminProfileRow, mfaEnrolled = false): AdminUserSummary {
  return {
    id: row.id,
    email: row.email,
    displayName: row.display_name,
    role: row.role,
    active: row.active,
    mfaRequired: row.mfa_required,
    mfaEnrolled,
    lastLoginAt: row.last_login_at ?? "",
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function getAdminProfile(userId: string) {
  const client = adminAuthClient();
  const { data, error } = await client.from("admin_profiles").select("*").eq("id", userId).maybeSingle();
  if (error) throw error;
  return data ? data as AdminProfileRow : null;
}

export async function createAdminSession(profile: AdminProfileRow, context: AuditContext) {
  const client = adminAuthClient();
  const token = randomToken();
  const expiresAt = new Date(Date.now() + sessionSeconds() * 1000);
  const { data, error } = await client.from("admin_sessions").insert({
    user_id: profile.id,
    token_hash: await sessionTokenHash(token),
    session_version: profile.session_version,
    ip_hash: context.ipHash ?? "",
    expires_at: expiresAt.toISOString(),
  }).select("id").single();
  if (error) throw error;
  const profileUpdate = await client.from("admin_profiles").update({ last_login_at: new Date().toISOString() }).eq("id", profile.id);
  if (profileUpdate.error) throw profileUpdate.error;
  return {
    token,
    session: {
      sessionId: String(data.id), userId: profile.id, email: profile.email, displayName: profile.display_name,
      role: profile.role, mfaRequired: profile.mfa_required, expiresAt: expiresAt.getTime(),
    } satisfies AdminSession,
    maxAge: sessionSeconds(),
  };
}

export async function resolveAdminSession(token: string): Promise<AdminSession | null> {
  if (!token || !isProductionIdentityConfigured()) return null;
  const client = adminAuthClient();
  const { data, error } = await client.rpc("admin_resolve_session", { p_token_hash: await sessionTokenHash(token) });
  if (error) throw error;
  const row = Array.isArray(data) ? data[0] as Record<string, unknown> | undefined : undefined;
  if (!row || !adminRoles.includes(row.role as AdminRole)) return null;
  return {
    sessionId: String(row.session_id),
    userId: String(row.user_id),
    email: String(row.email),
    displayName: String(row.display_name ?? ""),
    role: row.role as AdminRole,
    mfaRequired: Boolean(row.mfa_required),
    expiresAt: new Date(String(row.expires_at)).getTime(),
  };
}

export async function revokeAdminSession(token: string, reason = "logout") {
  if (!token || !isProductionIdentityConfigured()) return;
  const client = adminAuthClient();
  const { error } = await client.from("admin_sessions").update({
    revoked_at: new Date().toISOString(), revoked_reason: reason.slice(0, 100),
  }).eq("token_hash", await sessionTokenHash(token)).is("revoked_at", null);
  if (error) throw error;
}

function safeMetadata(value: Record<string, unknown> | undefined) {
  const output: Record<string, string | number | boolean> = {};
  for (const [key, item] of Object.entries(value ?? {})) {
    if (!/^[a-zA-Z][a-zA-Z0-9_]{0,49}$/.test(key)) continue;
    if (typeof item === "string") output[key] = item.slice(0, 300);
    else if (typeof item === "number" && Number.isFinite(item)) output[key] = item;
    else if (typeof item === "boolean") output[key] = item;
  }
  return output;
}

function auditEventFromRow(row: Record<string, unknown>): AdminAuditEvent {
  return {
    id: String(row.id), actorId: String(row.actor_id ?? ""), actorEmail: String(row.actor_email ?? ""),
    action: String(row.action), targetType: String(row.target_type ?? ""), targetId: String(row.target_id ?? ""),
    outcome: row.outcome as AdminAuditEvent["outcome"], requestId: String(row.request_id ?? ""),
    ipFingerprint: String(row.ip_hash ?? ""), metadata: safeMetadata(row.metadata as Record<string, unknown>),
    createdAt: String(row.created_at),
  };
}

export async function recordAdminAudit(input: {
  actor?: Pick<AdminSession, "userId" | "email"> | null;
  actorEmail?: string;
  action: string;
  targetType?: string;
  targetId?: string;
  outcome?: "success" | "failure" | "denied";
  metadata?: Record<string, unknown>;
  context?: AuditContext;
}) {
  if (!isProductionIdentityConfigured()) return;
  const client = adminAuthClient();
  const { error } = await client.from("admin_audit_logs").insert({
    actor_id: input.actor?.userId ?? null,
    actor_email: (input.actor?.email ?? input.actorEmail ?? "").toLowerCase().slice(0, 320),
    action: input.action.slice(0, 100),
    target_type: (input.targetType ?? "").slice(0, 80),
    target_id: (input.targetId ?? "").slice(0, 200),
    outcome: input.outcome ?? "success",
    request_id: (input.context?.requestId ?? "").slice(0, 100),
    ip_hash: (input.context?.ipHash ?? "").slice(0, 100),
    metadata: safeMetadata(input.metadata),
  });
  if (error) throw error;
}

export async function recordAdminAuditSafe(input: Parameters<typeof recordAdminAudit>[0]) {
  try {
    await recordAdminAudit(input);
    return true;
  } catch (error) {
    logError("admin.audit", error, { action: input.action, requestId: input.context?.requestId ?? "" });
    return false;
  }
}

export async function listAdminIdentity() {
  if (!isProductionIdentityConfigured()) return { users: [] as AdminUserSummary[], audit: [] as AdminAuditEvent[] };
  const client = adminAuthClient();
  const [profiles, audit] = await Promise.all([
    client.from("admin_profiles").select("*").order("created_at", { ascending: true }),
    client.from("admin_audit_logs").select("id,actor_id,actor_email,action,target_type,target_id,outcome,request_id,ip_hash,metadata,created_at").order("created_at", { ascending: false }).limit(20),
  ]);
  if (profiles.error) throw profiles.error;
  if (audit.error) throw audit.error;
  const profileRows = (profiles.data ?? []) as AdminProfileRow[];
  const factorStates = await Promise.all(profileRows.map(async (profile) => {
    const result = await client.auth.admin.mfa.listFactors({ userId: profile.id });
    return !result.error && result.data.factors.some((factor) => factor.factor_type === "totp" && factor.status === "verified");
  }));
  return {
    users: profileRows.map((profile, index) => profileFromRow(profile, factorStates[index])),
    audit: (audit.data ?? []).map((row) => auditEventFromRow(row)),
  };
}

function auditDate(value: string | undefined, endOfDay = false) {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return "";
  const timestamp = Date.parse(`${value}T00:00:00.000+08:00`);
  if (!Number.isFinite(timestamp)) return "";
  return new Date(timestamp + (endOfDay ? 86_400_000 : 0)).toISOString();
}

export async function listAdminAudit(input: {
  actorId?: string; action?: string; from?: string; to?: string; page?: number; pageSize?: number;
}): Promise<AdminAuditPage> {
  const requestedPageSize = Number(input.pageSize ?? 50);
  const requestedPage = Number(input.page ?? 1);
  const pageSize = Number.isFinite(requestedPageSize) ? Math.max(10, Math.min(100, Math.floor(requestedPageSize))) : 50;
  const page = Number.isFinite(requestedPage) ? Math.max(1, Math.floor(requestedPage)) : 1;
  if (!isProductionIdentityConfigured()) {
    return { events: [], administrators: [], actions: [...adminAuditActions], page, pageSize, total: 0, totalPages: 1 };
  }
  const client = adminAuthClient();
  const profiles = await client.from("admin_profiles").select("id,email,display_name").order("email", { ascending: true });
  if (profiles.error) throw profiles.error;
  let query = client.from("admin_audit_logs")
    .select("id,actor_id,actor_email,action,target_type,target_id,outcome,request_id,ip_hash,metadata,created_at", { count: "exact" });
  if (input.actorId && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(input.actorId)) {
    const profile = (profiles.data ?? []).find((row) => String(row.id) === input.actorId);
    const email = String(profile?.email ?? "").replaceAll("\\", "\\\\").replaceAll('"', '\\"');
    query = email ? query.or(`actor_id.eq.${input.actorId},actor_email.eq."${email}"`) : query.eq("actor_id", input.actorId);
  }
  if (input.action && adminAuditActions.includes(input.action as typeof adminAuditActions[number])) query = query.eq("action", input.action);
  const from = auditDate(input.from);
  const to = auditDate(input.to, true);
  if (from) query = query.gte("created_at", from);
  if (to) query = query.lt("created_at", to);
  const start = (page - 1) * pageSize;
  const logs = await query.order("created_at", { ascending: false }).range(start, start + pageSize - 1);
  if (logs.error) throw logs.error;
  const total = logs.count ?? 0;
  return {
    events: (logs.data ?? []).map((row) => auditEventFromRow(row)),
    administrators: (profiles.data ?? []).map((row) => ({ id: String(row.id), email: String(row.email), displayName: String(row.display_name ?? "") })),
    actions: [...adminAuditActions], page, pageSize, total, totalPages: Math.max(1, Math.ceil(total / pageSize)),
  };
}

export async function createAdminUser(input: {
  email: string; password: string; displayName: string; role: AdminRole; mfaRequired: boolean;
}, actor: AdminSession, context: AuditContext) {
  const email = input.email.trim().toLowerCase();
  if (!/^\S+@\S+\.\S+$/.test(email)) throw new HttpError(400, "管理员邮箱格式无效");
  if (!input.displayName.trim()) throw new HttpError(400, "管理员显示名称不能为空");
  if (input.password.length < 14) throw new HttpError(400, "临时密码至少需要 14 位");
  if (!adminRoles.includes(input.role)) throw new HttpError(400, "管理员角色无效");
  const client = adminAuthClient();
  const created = await client.auth.admin.createUser({
    email, password: input.password, email_confirm: true,
    user_metadata: { display_name: input.displayName.trim().slice(0, 100) },
  });
  if (created.error || !created.data.user) throw created.error ?? new Error("管理员认证账号创建失败");
  const userId = created.data.user.id;
  const { data, error } = await client.from("admin_profiles").insert({
    id: userId, email, display_name: input.displayName.trim().slice(0, 100), role: input.role,
    active: true, mfa_required: input.mfaRequired,
  }).select("*").single();
  if (error) {
    await client.auth.admin.deleteUser(userId).catch(() => undefined);
    throw error;
  }
  await recordAdminAuditSafe({ actor, action: "admin.user.create", targetType: "admin_user", targetId: userId, metadata: { role: input.role, mfaRequired: input.mfaRequired }, context });
  return profileFromRow(data as AdminProfileRow);
}

export async function updateAdminUser(userId: string, patch: {
  displayName?: string; role?: AdminRole; active?: boolean; mfaRequired?: boolean; password?: string;
}, actor: AdminSession, context: AuditContext) {
  const client = adminAuthClient();
  const before = await getAdminProfile(userId);
  if (!before) return null;
  if (patch.displayName !== undefined && !patch.displayName.trim()) throw new HttpError(400, "管理员显示名称不能为空");
  if (patch.role && !adminRoles.includes(patch.role)) throw new HttpError(400, "管理员角色无效");
  if (patch.password !== undefined && patch.password.length < 14) throw new HttpError(400, "临时密码至少需要 14 位");
  const authorizationChanged = (patch.role !== undefined && patch.role !== before.role)
    || (patch.active !== undefined && patch.active !== before.active)
    || (patch.mfaRequired !== undefined && patch.mfaRequired !== before.mfa_required);
  const securityChanged = authorizationChanged || patch.password !== undefined;
  const changes: Record<string, unknown> = {};
  if (patch.displayName !== undefined) changes.display_name = patch.displayName.trim().slice(0, 100);
  if (patch.role !== undefined) changes.role = patch.role;
  if (patch.active !== undefined) changes.active = patch.active;
  if (patch.mfaRequired !== undefined) changes.mfa_required = patch.mfaRequired;
  if (securityChanged) changes.session_version = before.session_version + 1;
  const { data, error } = await client.from("admin_profiles").update(changes).eq("id", userId).select("*").single();
  if (error) throw error;
  if (securityChanged) {
    const revoked = await client.from("admin_sessions").update({ revoked_at: new Date().toISOString(), revoked_reason: patch.password !== undefined ? "password_reset" : "authorization_changed" }).eq("user_id", userId).is("revoked_at", null);
    if (revoked.error) throw revoked.error;
  }
  if (patch.password !== undefined) {
    const passwordUpdate = await client.auth.admin.updateUserById(userId, { password: patch.password });
    if (passwordUpdate.error) throw passwordUpdate.error;
  }
  if (patch.role !== undefined && patch.role !== before.role) {
    await recordAdminAuditSafe({ actor, action: "admin.user.role_change", targetType: "admin_user", targetId: userId, metadata: { fromRole: before.role, toRole: patch.role }, context });
  }
  if (patch.active !== undefined && patch.active !== before.active) {
    await recordAdminAuditSafe({ actor, action: patch.active ? "admin.user.activate" : "admin.user.deactivate", targetType: "admin_user", targetId: userId, metadata: { active: patch.active }, context });
  }
  if (securityChanged) {
    await recordAdminAuditSafe({ actor, action: "admin.session.revoke", targetType: "admin_user", targetId: userId, metadata: { reason: patch.password !== undefined ? "password_reset" : "authorization_changed" }, context });
  }
  if ((patch.displayName !== undefined && patch.displayName.trim() !== before.display_name)
    || patch.mfaRequired !== undefined || patch.password !== undefined) {
    await recordAdminAuditSafe({ actor, action: "admin.user.update", targetType: "admin_user", targetId: userId, metadata: { authorizationChanged, passwordReset: patch.password !== undefined }, context });
  }
  return profileFromRow(data as AdminProfileRow);
}

export async function revokeAllAdminSessions(userId: string, actor: AdminSession, context: AuditContext) {
  const client = adminAuthClient();
  const profile = await getAdminProfile(userId);
  if (!profile) return false;
  const now = new Date().toISOString();
  const { error } = await client.from("admin_sessions").update({ revoked_at: now, revoked_reason: "owner_revoked" }).eq("user_id", userId).is("revoked_at", null);
  if (error) throw error;
  const version = await client.from("admin_profiles").update({ session_version: profile.session_version + 1 }).eq("id", userId);
  if (version.error) throw version.error;
  await recordAdminAuditSafe({ actor, action: "admin.session.revoke", targetType: "admin_user", targetId: userId, metadata: { reason: "owner_revoked" }, context });
  return true;
}

export async function resetAdminMfa(userId: string, actor: AdminSession, context: AuditContext) {
  const client = adminAuthClient();
  const profile = await getAdminProfile(userId);
  if (!profile) return false;
  const factors = await client.auth.admin.mfa.listFactors({ userId });
  if (factors.error) throw factors.error;
  for (const factor of factors.data.factors) {
    const deleted = await client.auth.admin.mfa.deleteFactor({ userId, id: factor.id });
    if (deleted.error) throw deleted.error;
  }
  const revoked = await client.from("admin_sessions").update({ revoked_at: new Date().toISOString(), revoked_reason: "mfa_reset" }).eq("user_id", userId).is("revoked_at", null);
  if (revoked.error) throw revoked.error;
  const version = await client.from("admin_profiles").update({ mfa_required: true, session_version: profile.session_version + 1 }).eq("id", userId);
  if (version.error) throw version.error;
  await recordAdminAuditSafe({ actor, action: "admin.mfa.reset", targetType: "admin_user", targetId: userId, context });
  return true;
}

export async function changeOwnAdminPassword(session: AdminSession, currentPassword: string, newPassword: string, context: AuditContext) {
  if (!currentPassword) throw new HttpError(400, "请输入当前密码");
  if (newPassword.length < 14) throw new HttpError(400, "新密码至少需要 14 位");
  if (currentPassword === newPassword) throw new HttpError(400, "新密码不能与当前密码相同");
  const client = adminAuthClient();
  const authenticated = await client.auth.signInWithPassword({ email: session.email, password: currentPassword });
  if (authenticated.error || authenticated.data.user?.id !== session.userId) {
    await recordAdminAuditSafe({ actor: session, action: "admin.password.change", outcome: "failure", context });
    return false;
  }
  const updated = await client.auth.admin.updateUserById(session.userId, { password: newPassword });
  if (updated.error) throw updated.error;
  const profile = await getAdminProfile(session.userId);
  if (!profile) return false;
  const revoked = await client.from("admin_sessions").update({ revoked_at: new Date().toISOString(), revoked_reason: "password_changed" }).eq("user_id", session.userId).is("revoked_at", null);
  if (revoked.error) throw revoked.error;
  const version = await client.from("admin_profiles").update({ session_version: profile.session_version + 1 }).eq("id", session.userId);
  if (version.error) throw version.error;
  await recordAdminAuditSafe({ actor: session, action: "admin.password.change", targetType: "admin_user", targetId: session.userId, context });
  return true;
}

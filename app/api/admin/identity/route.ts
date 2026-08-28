import { NextResponse } from "next/server";
import { beginAdminMutation, readSession, requireAdminRole } from "../../../backend/auth";
import {
  adminAuditContext,
  createAdminUser,
  isProductionIdentityConfigured,
  listAdminIdentity,
  recordAdminAuditSafe,
} from "../../../backend/admin-identity";
import { adminRoles, type AdminRole } from "../../../backend/contracts";
import { logError, publicError, readJson, text } from "../../../backend/http";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const requestId = crypto.randomUUID();
  try {
    const session = await readSession();
    if (!session) return NextResponse.json({ error: "请先登录" }, { status: 401 });
    if (!requireAdminRole(session, "owner")) {
      await recordAdminAuditSafe({ actor: session, action: "admin.identity.view", outcome: "denied", context: await adminAuditContext(request, requestId) });
      return NextResponse.json({ error: "仅系统所有者可管理管理员" }, { status: 403 });
    }
    const identity = await listAdminIdentity();
    await recordAdminAuditSafe({ actor: session, action: "admin.identity.view", context: await adminAuditContext(request, requestId) });
    return NextResponse.json({ ok: true, configured: isProductionIdentityConfigured(), ...identity }, { headers: { "cache-control": "no-store" } });
  } catch (error) {
    const failure = publicError(error, "管理员身份数据暂时不可用");
    logError("admin.identity.list", error, { requestId });
    return NextResponse.json({ error: failure.message, requestId }, { status: failure.status });
  }
}

export async function POST(request: Request) {
  const requestId = crypto.randomUUID();
  const mutation = await beginAdminMutation(request, requestId, "admin.user.create");
  if (!mutation.ok) return NextResponse.json({ error: mutation.error }, { status: mutation.status });
  const { auditContext, session } = mutation;
  try {
    if (!session) return NextResponse.json({ error: "请先登录" }, { status: 401 });
    if (!requireAdminRole(session, "owner")) {
      await recordAdminAuditSafe({ actor: session, action: "admin.user.create", outcome: "denied", metadata: { reason: "insufficient_role" }, context: auditContext });
      return NextResponse.json({ error: "仅系统所有者可创建管理员" }, { status: 403 });
    }
    if (!isProductionIdentityConfigured()) {
      await recordAdminAuditSafe({ actor: session, action: "admin.user.create", outcome: "failure", metadata: { reason: "identity_not_configured" }, context: auditContext });
      return NextResponse.json({ error: "本地回退模式不支持创建管理员" }, { status: 503 });
    }
    const body = await readJson(request, 8_000);
    const role = text(body.role, 20) as AdminRole;
    if (!adminRoles.includes(role)) {
      await recordAdminAuditSafe({ actor: session, action: "admin.user.create", outcome: "failure", metadata: { reason: "invalid_role" }, context: auditContext });
      return NextResponse.json({ error: "管理员角色无效" }, { status: 400 });
    }
    const user = await createAdminUser({
      email: text(body.email, 320), password: text(body.password, 200), displayName: text(body.displayName, 100),
      role, mfaRequired: body.mfaRequired !== false,
    }, session, auditContext);
    return NextResponse.json({ ok: true, user }, { status: 201 });
  } catch (error) {
    await recordAdminAuditSafe({ actor: session, action: "admin.user.create", outcome: "failure", metadata: { reason: "request_failed" }, context: auditContext });
    const failure = publicError(error, error instanceof Error ? error.message : "管理员创建失败");
    logError("admin.identity.create", error, { requestId });
    return NextResponse.json({ error: failure.message, requestId }, { status: failure.status });
  }
}

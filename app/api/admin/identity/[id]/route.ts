import { NextResponse } from "next/server";
import { beginAdminMutation, requireAdminRole } from "../../../../backend/auth";
import { recordAdminAuditSafe, resetAdminMfa, revokeAllAdminSessions, updateAdminUser } from "../../../../backend/admin-identity";
import { adminRoles, type AdminRole } from "../../../../backend/contracts";
import { logError, publicError, readJson, text } from "../../../../backend/http";

export const dynamic = "force-dynamic";

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  const requestId = crypto.randomUUID();
  const mutation = await beginAdminMutation(request, requestId, "admin.user.update");
  if (!mutation.ok) return NextResponse.json({ error: mutation.error }, { status: mutation.status });
  const { auditContext, session } = mutation;
  let userId = "";
  let auditAction = "admin.user.update";
  try {
    if (!session) return NextResponse.json({ error: "请先登录" }, { status: 401 });
    if (!requireAdminRole(session, "owner")) {
      await recordAdminAuditSafe({ actor: session, action: auditAction, outcome: "denied", metadata: { reason: "insufficient_role" }, context: auditContext });
      return NextResponse.json({ error: "仅系统所有者可修改管理员" }, { status: 403 });
    }
    const { id } = await context.params;
    userId = text(id, 100);
    const body = await readJson(request, 8_000);
    if (body.action === "revoke_sessions") {
      auditAction = "admin.session.revoke";
      if (userId === session.userId) {
        await recordAdminAuditSafe({ actor: session, action: auditAction, targetType: "admin_user", targetId: userId, outcome: "denied", metadata: { reason: "current_session" }, context: auditContext });
        return NextResponse.json({ error: "请使用退出登录结束当前会话" }, { status: 400 });
      }
      const found = await revokeAllAdminSessions(userId, session, auditContext);
      if (!found) await recordAdminAuditSafe({ actor: session, action: auditAction, targetType: "admin_user", targetId: userId, outcome: "failure", metadata: { reason: "not_found" }, context: auditContext });
      return found ? NextResponse.json({ ok: true }) : NextResponse.json({ error: "管理员不存在" }, { status: 404 });
    }
    if (body.action === "reset_mfa") {
      auditAction = "admin.mfa.reset";
      if (userId === session.userId) {
        await recordAdminAuditSafe({ actor: session, action: auditAction, targetType: "admin_user", targetId: userId, outcome: "denied", metadata: { reason: "self_reset" }, context: auditContext });
        return NextResponse.json({ error: "为了防止会话劫持，请由另一位所有者重置你的 MFA" }, { status: 400 });
      }
      const found = await resetAdminMfa(userId, session, auditContext);
      if (!found) await recordAdminAuditSafe({ actor: session, action: auditAction, targetType: "admin_user", targetId: userId, outcome: "failure", metadata: { reason: "not_found" }, context: auditContext });
      return found ? NextResponse.json({ ok: true }) : NextResponse.json({ error: "管理员不存在" }, { status: 404 });
    }
    const roleValue = body.role === undefined ? undefined : text(body.role, 20) as AdminRole;
    if (roleValue !== undefined) auditAction = "admin.user.role_change";
    else if (body.active === false) auditAction = "admin.user.deactivate";
    else if (body.active === true) auditAction = "admin.user.activate";
    if (roleValue !== undefined && !adminRoles.includes(roleValue)) {
      await recordAdminAuditSafe({ actor: session, action: auditAction, targetType: "admin_user", targetId: userId, outcome: "failure", metadata: { reason: "invalid_role" }, context: auditContext });
      return NextResponse.json({ error: "管理员角色无效" }, { status: 400 });
    }
    if (userId === session.userId && (body.active === false || (roleValue && roleValue !== "owner"))) {
      await recordAdminAuditSafe({ actor: session, action: auditAction, targetType: "admin_user", targetId: userId, outcome: "denied", metadata: { reason: "self_authorization_change" }, context: auditContext });
      return NextResponse.json({ error: "不能停用或降低自己的所有者权限" }, { status: 400 });
    }
    if (userId === session.userId && body.mfaRequired !== undefined) {
      await recordAdminAuditSafe({ actor: session, action: auditAction, targetType: "admin_user", targetId: userId, outcome: "denied", metadata: { reason: "self_mfa_policy_change" }, context: auditContext });
      return NextResponse.json({ error: "请由另一位所有者修改你的 MFA 策略" }, { status: 400 });
    }
    if (userId === session.userId && body.password !== undefined) {
      await recordAdminAuditSafe({ actor: session, action: auditAction, targetType: "admin_user", targetId: userId, outcome: "denied", metadata: { reason: "self_password_reset" }, context: auditContext });
      return NextResponse.json({ error: "请使用安全设置验证当前密码后修改" }, { status: 400 });
    }
    const user = await updateAdminUser(userId, {
      displayName: body.displayName === undefined ? undefined : text(body.displayName, 100),
      role: roleValue,
      active: typeof body.active === "boolean" ? body.active : undefined,
      mfaRequired: typeof body.mfaRequired === "boolean" ? body.mfaRequired : undefined,
      password: body.password === undefined ? undefined : text(body.password, 200),
    }, session, auditContext);
    if (!user) await recordAdminAuditSafe({ actor: session, action: auditAction, targetType: "admin_user", targetId: userId, outcome: "failure", metadata: { reason: "not_found" }, context: auditContext });
    return user ? NextResponse.json({ ok: true, user }) : NextResponse.json({ error: "管理员不存在" }, { status: 404 });
  } catch (error) {
    await recordAdminAuditSafe({ actor: session, action: auditAction, targetType: "admin_user", targetId: userId, outcome: "failure", metadata: { reason: "request_failed" }, context: auditContext });
    const failure = publicError(error, error instanceof Error ? error.message : "管理员更新失败");
    logError("admin.identity.update", error, { requestId });
    return NextResponse.json({ error: failure.message, requestId }, { status: failure.status });
  }
}

import { NextResponse } from "next/server";
import { isSameOrigin, readSession, requireAdminRole } from "../../../../backend/auth";
import { adminAuditContext, recordAdminAuditSafe, resetAdminMfa, revokeAllAdminSessions, updateAdminUser } from "../../../../backend/admin-identity";
import { adminRoles, type AdminRole } from "../../../../backend/contracts";
import { logError, publicError, readJson, text } from "../../../../backend/http";

export const dynamic = "force-dynamic";

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  const requestId = crypto.randomUUID();
  try {
    if (!isSameOrigin(request)) return NextResponse.json({ error: "请求来源不受信任" }, { status: 403 });
    const session = await readSession();
    if (!session) return NextResponse.json({ error: "请先登录" }, { status: 401 });
    if (!requireAdminRole(session, "owner")) {
      await recordAdminAuditSafe({ actor: session, action: "admin.user.update", outcome: "denied", context: await adminAuditContext(request, requestId) });
      return NextResponse.json({ error: "仅系统所有者可修改管理员" }, { status: 403 });
    }
    const { id } = await context.params;
    const userId = text(id, 100);
    const body = await readJson(request, 8_000);
    if (body.action === "revoke_sessions") {
      if (userId === session.userId) return NextResponse.json({ error: "请使用退出登录结束当前会话" }, { status: 400 });
      const found = await revokeAllAdminSessions(userId, session, await adminAuditContext(request, requestId));
      return found ? NextResponse.json({ ok: true }) : NextResponse.json({ error: "管理员不存在" }, { status: 404 });
    }
    if (body.action === "reset_mfa") {
      if (userId === session.userId) return NextResponse.json({ error: "为了防止会话劫持，请由另一位所有者重置你的 MFA" }, { status: 400 });
      const found = await resetAdminMfa(userId, session, await adminAuditContext(request, requestId));
      return found ? NextResponse.json({ ok: true }) : NextResponse.json({ error: "管理员不存在" }, { status: 404 });
    }
    const roleValue = body.role === undefined ? undefined : text(body.role, 20) as AdminRole;
    if (roleValue !== undefined && !adminRoles.includes(roleValue)) return NextResponse.json({ error: "管理员角色无效" }, { status: 400 });
    if (userId === session.userId && (body.active === false || (roleValue && roleValue !== "owner"))) {
      return NextResponse.json({ error: "不能停用或降低自己的所有者权限" }, { status: 400 });
    }
    if (userId === session.userId && body.mfaRequired !== undefined) {
      return NextResponse.json({ error: "请由另一位所有者修改你的 MFA 策略" }, { status: 400 });
    }
    if (userId === session.userId && body.password !== undefined) {
      return NextResponse.json({ error: "请使用安全设置验证当前密码后修改" }, { status: 400 });
    }
    const user = await updateAdminUser(userId, {
      displayName: body.displayName === undefined ? undefined : text(body.displayName, 100),
      role: roleValue,
      active: typeof body.active === "boolean" ? body.active : undefined,
      mfaRequired: typeof body.mfaRequired === "boolean" ? body.mfaRequired : undefined,
      password: body.password === undefined ? undefined : text(body.password, 200),
    }, session, await adminAuditContext(request, requestId));
    return user ? NextResponse.json({ ok: true, user }) : NextResponse.json({ error: "管理员不存在" }, { status: 404 });
  } catch (error) {
    const failure = publicError(error, error instanceof Error ? error.message : "管理员更新失败");
    logError("admin.identity.update", error, { requestId });
    return NextResponse.json({ error: failure.message, requestId }, { status: failure.status });
  }
}

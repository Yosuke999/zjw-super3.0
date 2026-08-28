import { NextResponse } from "next/server";
import { beginAdminLogin, isSameOrigin, pendingMfaCookie, sessionCookie } from "../../../backend/auth";
import { adminAuditContext, recordAdminAuditSafe } from "../../../backend/admin-identity";
import { allowRequest } from "../../../backend/server";
import { clientIp, fingerprint, logError, publicError, readJson, text } from "../../../backend/http";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const requestId = crypto.randomUUID();
  const auditContext = await adminAuditContext(request, requestId);
  let actorEmail = "";
  try {
    if (!isSameOrigin(request)) {
      await recordAdminAuditSafe({ action: "admin.login.failure", outcome: "denied", metadata: { reason: "untrusted_origin" }, context: auditContext });
      return NextResponse.json({ error: "请求来源不受信任" }, { status: 403 });
    }
    const rateKey = `admin-login:${await fingerprint(clientIp(request), "admin-login")}`;
    if (!(await allowRequest(rateKey, 6, 15 * 60))) {
      await recordAdminAuditSafe({ action: "admin.login.failure", outcome: "denied", metadata: { reason: "rate_limited" }, context: auditContext });
      return NextResponse.json({ error: "登录尝试过多，请 15 分钟后再试" }, { status: 429 });
    }
    const body = await readJson(request, 4_000);
    actorEmail = text(body.email ?? body.username, 320).trim().toLowerCase();
    const result = await beginAdminLogin(
      actorEmail, text(body.password, 200), auditContext,
    );
    if (!result.ok) {
      const message = result.configurationError ? "管理员账号尚未配置" : "账号或密码不正确";
      return NextResponse.json({ error: message }, { status: result.configurationError ? 503 : 401 });
    }
    if (result.next === "mfa") {
      const response = NextResponse.json({ ok: true, next: "mfa", enrollment: result.enrollment });
      response.cookies.set(pendingMfaCookie(result.pendingValue));
      return response;
    }
    const response = NextResponse.json({ ok: true, next: "complete", user: result.session });
    response.cookies.set(sessionCookie(result.value, result.maxAge));
    return response;
  } catch (error) {
    await recordAdminAuditSafe({ actorEmail, action: "admin.login.failure", outcome: "failure", metadata: { reason: "internal_error" }, context: auditContext });
    const failure = publicError(error, "暂时无法登录");
    logError("admin.login", error, { requestId });
    return NextResponse.json({ error: failure.message, requestId }, { status: failure.status });
  }
}

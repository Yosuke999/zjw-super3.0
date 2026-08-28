import { NextResponse } from "next/server";
import { clearedPendingMfaCookie, completeAdminMfa, isSameOrigin, sessionCookie } from "../../../../backend/auth";
import { adminAuditContext } from "../../../../backend/admin-identity";
import { clientIp, fingerprint, logError, publicError, readJson, text } from "../../../../backend/http";
import { allowRequest } from "../../../../backend/server";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const requestId = crypto.randomUUID();
  try {
    if (!isSameOrigin(request)) return NextResponse.json({ error: "请求来源不受信任" }, { status: 403 });
    const rateKey = `admin-mfa:${await fingerprint(clientIp(request), "admin-mfa")}`;
    if (!(await allowRequest(rateKey, 10, 15 * 60))) return NextResponse.json({ error: "验证码尝试过多，请稍后再试" }, { status: 429 });
    const body = await readJson(request, 1_000);
    const result = await completeAdminMfa(text(body.code, 12), await adminAuditContext(request, requestId));
    if (!result.ok) return NextResponse.json({ error: "验证码无效或已过期" }, { status: 401 });
    const response = NextResponse.json({ ok: true, next: "complete", user: result.session });
    response.cookies.set(sessionCookie(result.value, result.maxAge));
    response.cookies.set(clearedPendingMfaCookie());
    return response;
  } catch (error) {
    const failure = publicError(error, "MFA 验证暂时不可用");
    logError("admin.mfa.verify", error, { requestId });
    return NextResponse.json({ error: failure.message, requestId }, { status: failure.status });
  }
}

import { NextResponse } from "next/server";
import { clearedSessionCookie, isSameOrigin, readSession } from "../../../../backend/auth";
import { adminAuditContext, changeOwnAdminPassword, isProductionIdentityConfigured } from "../../../../backend/admin-identity";
import { logError, publicError, readJson, text } from "../../../../backend/http";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const requestId = crypto.randomUUID();
  try {
    if (!isSameOrigin(request)) return NextResponse.json({ error: "请求来源不受信任" }, { status: 403 });
    const session = await readSession();
    if (!session) return NextResponse.json({ error: "请先登录" }, { status: 401 });
    if (!isProductionIdentityConfigured()) return NextResponse.json({ error: "本地回退账号的密码由环境变量管理" }, { status: 409 });
    const body = await readJson(request, 2_000);
    const changed = await changeOwnAdminPassword(
      session, text(body.currentPassword, 200), text(body.newPassword, 200), await adminAuditContext(request, requestId),
    );
    if (!changed) return NextResponse.json({ error: "当前密码不正确" }, { status: 401 });
    const response = NextResponse.json({ ok: true, reloginRequired: true });
    response.cookies.set(clearedSessionCookie());
    return response;
  } catch (error) {
    const failure = publicError(error, error instanceof Error ? error.message : "密码修改失败");
    logError("admin.password.change", error, { requestId });
    return NextResponse.json({ error: failure.message, requestId }, { status: failure.status });
  }
}

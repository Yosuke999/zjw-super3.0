import { NextResponse } from "next/server";
import { createSession, isSameOrigin, sessionCookie, validateLogin } from "../../../backend/auth";
import { allowRequest } from "../../../backend/server";
import { clientIp, fingerprint, logError, publicError, readJson, text } from "../../../backend/http";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const requestId = crypto.randomUUID();
  try {
    if (!isSameOrigin(request)) return NextResponse.json({ error: "请求来源不受信任" }, { status: 403 });
    const rateKey = `admin-login:${await fingerprint(clientIp(request), "admin-login")}`;
    if (!(await allowRequest(rateKey, 6, 15 * 60))) return NextResponse.json({ error: "登录尝试过多，请 15 分钟后再试" }, { status: 429 });
    const body = await readJson(request, 4_000);
    const result = await validateLogin(text(body.username, 100), text(body.password, 200));
    if (!result.ok) {
      const message = result.configurationError ? "管理员账号尚未配置" : "账号或密码不正确";
      return NextResponse.json({ error: message }, { status: result.configurationError ? 503 : 401 });
    }
    const response = NextResponse.json({ ok: true, user: { username: result.username } });
    response.cookies.set(await sessionCookie(await createSession(result.username)));
    return response;
  } catch (error) {
    const failure = publicError(error, "暂时无法登录");
    logError("admin.login", error, { requestId });
    return NextResponse.json({ error: failure.message, requestId }, { status: failure.status });
  }
}

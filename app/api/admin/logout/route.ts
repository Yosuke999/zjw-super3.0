import { NextResponse } from "next/server";
import { clearedPendingMfaCookie, clearedSessionCookie, isSameOrigin, readSession, revokeCurrentSession } from "../../../backend/auth";
import { adminAuditContext, recordAdminAuditSafe } from "../../../backend/admin-identity";
import { logError } from "../../../backend/http";

export async function POST(request: Request) {
  if (!isSameOrigin(request)) return NextResponse.json({ error: "请求来源不受信任" }, { status: 403 });
  const requestId = crypto.randomUUID();
  try {
    const session = await readSession();
    await revokeCurrentSession();
    if (session) await recordAdminAuditSafe({ actor: session, action: "admin.logout", context: await adminAuditContext(request, requestId) });
  } catch (error) {
    logError("admin.logout", error, { requestId });
  }
  const response = NextResponse.json({ ok: true });
  response.cookies.set(clearedSessionCookie());
  response.cookies.set(clearedPendingMfaCookie());
  return response;
}

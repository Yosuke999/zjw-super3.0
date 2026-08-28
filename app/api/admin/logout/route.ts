import { NextResponse } from "next/server";
import { clearedPendingMfaCookie, clearedSessionCookie, isSameOrigin, readSession, revokeCurrentSession } from "../../../backend/auth";
import { adminAuditContext, recordAdminAuditSafe } from "../../../backend/admin-identity";
import { logError } from "../../../backend/http";

export async function POST(request: Request) {
  const requestId = crypto.randomUUID();
  const auditContext = await adminAuditContext(request, requestId);
  let session = null as Awaited<ReturnType<typeof readSession>>;
  try {
    if (!isSameOrigin(request)) {
      await recordAdminAuditSafe({ action: "admin.logout", outcome: "denied", metadata: { reason: "untrusted_origin" }, context: auditContext });
      return NextResponse.json({ error: "请求来源不受信任" }, { status: 403 });
    }
    session = await readSession();
    await revokeCurrentSession();
    if (session) await recordAdminAuditSafe({ actor: session, action: "admin.logout", targetType: "admin_session", targetId: session.sessionId, context: auditContext });
  } catch (error) {
    await recordAdminAuditSafe({ actor: session, action: "admin.logout", targetType: "admin_session", targetId: session?.sessionId ?? "", outcome: "failure", metadata: { reason: "revoke_failed" }, context: auditContext });
    logError("admin.logout", error, { requestId });
  }
  const response = NextResponse.json({ ok: true });
  response.cookies.set(clearedSessionCookie());
  response.cookies.set(clearedPendingMfaCookie());
  return response;
}
